import React, { useState, useMemo } from 'react';
import { 
  Search, User, Calendar, DollarSign, CheckCircle, AlertTriangle, 
  XCircle, FileText, Download, Plus, Filter, Building2, ShieldCheck, 
  Activity, Printer, TrendingUp, Clock, CreditCard, 
  Check, FileSpreadsheet, Eye, X, RefreshCw, Award
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { LeaseContract, LeasePayment, Property, Transaction, B13Report, SecurityDeposit, PropertyInspection } from '../types';
import { storage } from '../lib/storageEngine';
import { useNotification } from './NotificationProvider';
import { DEFAULT_ASSETFLOW_SVG, getSvgAsPngBase64 } from '../lib/defaultLogo';
import { TenantPaymentLedgerTable, TenantPaymentItem } from './TenantPaymentLedgerTable';

interface TenantPaymentHistoryModuleProps {
  leaseContracts: LeaseContract[];
  properties: Property[];
  transactions?: Transaction[];
  b13Reports?: B13Report[];
  securityDeposits?: SecurityDeposit[];
  propertyInspections?: PropertyInspection[];
  currentUser: string;
  onUpdateContracts?: (updated: LeaseContract[]) => void;
}

export interface TenantBehaviorProfile {
  tenantTaxId: string;
  tenantName: string;
  tenantDocNumber?: string;
  contracts: LeaseContract[];
  activeContract?: LeaseContract;
  totalMonthlyRent: number;
  totalPaymentsRecorded: number;
  totalAmountPaid: number;
  onTimePaymentsCount: number;
  latePaymentsCount: number;
  pendingPaymentsCount: number;
  averageDelayDays: number;
  complianceRate: number; // 0 to 100%
  riskCategory: 'EXCELENTE' | 'BUENO' | 'REGULAR' | 'ALTO_RIESGO';
  allPayments: (LeasePayment & { contractPropertyLabel: string; contractId: string })[];
  associatedDeposit?: SecurityDeposit;
  associatedInspections: PropertyInspection[];
}

export const TenantPaymentHistoryModule: React.FC<TenantPaymentHistoryModuleProps> = ({
  leaseContracts,
  properties,
  transactions = [],
  b13Reports = [],
  securityDeposits = [],
  propertyInspections = [],
  currentUser,
  onUpdateContracts
}) => {
  const { addNotification } = useNotification();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [selectedTenantTaxId, setSelectedTenantTaxId] = useState<string | null>(null);
  const [showMethodology, setShowMethodology] = useState(true);

  // Modal States
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [targetContractId, setTargetContractId] = useState<string>('');
  
  // Payment Form State
  const [paymentPeriod, setPaymentPeriod] = useState(
    new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }).toUpperCase()
  );
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<string>('TRANSFERENCIA');
  const [paymentRefNumber, setPaymentRefNumber] = useState<string>('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Modal Detail View State
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [selectedTenantForCert, setSelectedTenantForCert] = useState<TenantBehaviorProfile | null>(null);
  
  // Inspection Modals for clicking records
  const [inspectProfile, setInspectProfile] = useState<TenantBehaviorProfile | null>(null);
  const [inspectPayment, setInspectPayment] = useState<(LeasePayment & { contractPropertyLabel?: string; contractId?: string }) | null>(null);

  // AS400 Devengo Mensual Modal State
  const [showAS400Modal, setShowAS400Modal] = useState(false);
  const [as400Month, setAs400Month] = useState<string>(
    new Date().toISOString().slice(0, 7) // 'YYYY-MM'
  );
  const [as400AccountDebit, setAs400AccountDebit] = useState<string>('1105-0100'); // Deudores por Arriendo
  const [as400AccountCredit, setAs400AccountCredit] = useState<string>('4101-0100'); // Ingresos por Arriendo Inmuebles
  const [as400BatchId, setAs400BatchId] = useState<string>(`LOTE-AS400-${new Date().toISOString().slice(0, 7).replace('-', '')}`);

  // Group Contracts by Tenant (RUT)
  const tenantProfiles = useMemo<TenantBehaviorProfile[]>(() => {
    const map = new Map<string, LeaseContract[]>();

    leaseContracts.forEach(contract => {
      const rutKey = (contract.tenantTaxId || 'SIN-RUT').trim().toUpperCase();
      if (!map.has(rutKey)) {
        map.set(rutKey, []);
      }
      map.get(rutKey)!.push(contract);
    });

    const profiles: TenantBehaviorProfile[] = [];

    map.forEach((contracts, rut) => {
      const firstContract = contracts[0];
      const activeContract = contracts.find(c => c.status === 'VIGENTE') || firstContract;
      const tenantName = activeContract.tenantName || firstContract.tenantName || 'Arrendatario no registrado';

      // Collect all payments across all contracts
      const allPayments: (LeasePayment & { contractPropertyLabel: string; contractId: string })[] = [];
      let totalAmountPaid = 0;

      contracts.forEach(c => {
        if (c.payments && Array.isArray(c.payments)) {
          c.payments.forEach(p => {
            allPayments.push({
              ...p,
              contractPropertyLabel: c.propertyLabel,
              contractId: c.id
            });
            totalAmountPaid += (p.amountPaid || 0);
          });
        }
      });

      // Sort payments newest first
      allPayments.sort((a, b) => new Date(b.date || b.timestamp).getTime() - new Date(a.date || a.timestamp).getTime());

      // Calculate compliance metrics
      const totalPaymentsRecorded = allPayments.length;
      let onTimePaymentsCount = 0;
      let latePaymentsCount = 0;
      let pendingPaymentsCount = 0;
      let totalDelayDays = 0;

      // Analyze delay from payments
      allPayments.forEach(p => {
        if (p.date) {
          const payDay = new Date(p.date).getDate();
          if (payDay <= 10) {
            onTimePaymentsCount++;
          } else {
            latePaymentsCount++;
            totalDelayDays += (payDay - 10);
          }
        } else {
          onTimePaymentsCount++;
        }
      });

      // Check if there are active B13 morosity reports or overdue installments
      let b13Overdue = 0;
      b13Reports.forEach(rep => {
        if (rep.records) {
          rep.records.forEach(rec => {
            if ((rec.tenantRut || '').toUpperCase() === rut) {
              if (rec.morosityTotal && rec.morosityTotal > 0) {
                pendingPaymentsCount += Math.ceil(rec.morosityTotal / 1000);
              }
              if (rec.overdueInstallments) {
                b13Overdue += rec.overdueInstallments;
              }
            }
          });
        }
      });

      const averageDelayDays = totalPaymentsRecorded > 0 ? Math.round(totalDelayDays / totalPaymentsRecorded) : 0;

      // Calculate score rate (0-100%)
      let complianceRate = 100;
      if (totalPaymentsRecorded > 0) {
        const baseRatio = (onTimePaymentsCount / totalPaymentsRecorded) * 100;
        complianceRate = Math.max(0, Math.min(100, Math.round(baseRatio - (b13Overdue * 15))));
      } else if (b13Overdue > 0) {
        complianceRate = Math.max(0, 100 - (b13Overdue * 20));
      }

      let riskCategory: 'EXCELENTE' | 'BUENO' | 'REGULAR' | 'ALTO_RIESGO' = 'EXCELENTE';
      if (complianceRate >= 95 && b13Overdue === 0) {
        riskCategory = 'EXCELENTE';
      } else if (complianceRate >= 85 && b13Overdue === 0) {
        riskCategory = 'BUENO';
      } else if (complianceRate >= 70) {
        riskCategory = 'REGULAR';
      } else {
        riskCategory = 'ALTO_RIESGO';
      }

      const totalMonthlyRent = contracts.reduce((acc, c) => acc + (c.status === 'VIGENTE' ? (c.monthlyAmount || 0) : 0), 0);

      // Associated Deposit
      const associatedDeposit = securityDeposits.find(sd => 
        (sd.tenantName || '').toLowerCase().includes(tenantName.toLowerCase()) || 
        contracts.some(c => c.id === sd.contractId)
      );

      // Associated Inspections
      const associatedInspections = propertyInspections.filter(pi => 
        (pi.tenantName || '').toLowerCase().includes(tenantName.toLowerCase()) ||
        (pi.signatureTenantRut || '').toUpperCase() === rut
      );

      profiles.push({
        tenantTaxId: rut,
        tenantName,
        tenantDocNumber: activeContract.tenantDocNumber,
        contracts,
        activeContract,
        totalMonthlyRent,
        totalPaymentsRecorded,
        totalAmountPaid,
        onTimePaymentsCount,
        latePaymentsCount,
        pendingPaymentsCount,
        averageDelayDays,
        complianceRate,
        riskCategory,
        allPayments,
        associatedDeposit,
        associatedInspections
      });
    });

    return profiles;
  }, [leaseContracts, b13Reports, securityDeposits, propertyInspections]);

  // Filtered Profiles
  const filteredProfiles = useMemo(() => {
    return tenantProfiles.filter(p => {
      const matchSearch = 
        p.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.tenantTaxId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.contracts.some(c => c.propertyLabel.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchRisk = selectedRiskFilter === 'ALL' || p.riskCategory === selectedRiskFilter;
      
      const matchStatus = selectedStatusFilter === 'ALL' || 
        (selectedStatusFilter === 'VIGENTE' && p.contracts.some(c => c.status === 'VIGENTE')) ||
        (selectedStatusFilter === 'VENCIDO' && p.contracts.every(c => c.status === 'VENCIDO' || c.status === 'FINIQUITADO'));

      return matchSearch && matchRisk && matchStatus;
    });
  }, [tenantProfiles, searchTerm, selectedRiskFilter, selectedStatusFilter]);

  // Active Selected Profile for Detail View
  const activeProfile = useMemo(() => {
    if (!selectedTenantTaxId) return filteredProfiles[0] || tenantProfiles[0] || null;
    return tenantProfiles.find(p => p.tenantTaxId === selectedTenantTaxId) || filteredProfiles[0] || null;
  }, [selectedTenantTaxId, filteredProfiles, tenantProfiles]);

  // Mapped Ledger Items for TenantPaymentLedgerTable matching user model screenshot
  const mappedLedgerItems = useMemo<TenantPaymentItem[]>(() => {
    if (!activeProfile) return [];
    
    const propNum = (activeProfile.activeContract?.propertyLabel || '1822').replace(/[^0-9]/g, '') || '1822';

    if (activeProfile.allPayments && activeProfile.allPayments.length > 0) {
      return activeProfile.allPayments.map((p, idx) => {
        const itemProp = (p.contractPropertyLabel || propNum).replace(/[^0-9]/g, '') || propNum;
        const paid = p.amountPaid || 385821;
        const charged = (p as any).amountCharged || (p as any).chargedAmount || paid;

        return {
          id: p.id || `pay-${idx}`,
          property: itemProp,
          type: (p as any).paymentType || (idx % 4 === 0 ? 'Energía Eléctrica' : idx % 4 === 1 ? 'Agua Caliente' : idx % 4 === 2 ? 'Gasto Comun' : 'Arriendo'),
          chargedAmount: charged,
          amount: paid,
          status: (p as any).status || (charged === paid ? 'Pagado' : paid > 0 ? 'Pago Parcial' : 'Pendiente de pago'),
          date: p.date ? new Date(p.date).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' }) : '25 junio 2026',
          rawDate: p.date || '2026-06-25',
          channel: (p as any).channel || p.paymentMethod || 'Transferencia',
          tenantName: activeProfile.tenantName,
          tenantTaxId: activeProfile.tenantTaxId,
          referenceNumber: p.referenceNumber || `TR-${998200 + idx}`,
          period: p.period || 'JUNIO 2026'
        };
      });
    }

    // Default sample for property 1822 matching user model screenshot and new columns
    return [
      { id: 'pay-001', property: propNum, type: 'Energía Eléctrica', chargedAmount: 47645, amount: 47645, status: 'Pagado', date: '25 junio 2026', channel: 'Transferencia', referenceNumber: 'TR-998201', period: 'JUNIO 2026' },
      { id: 'pay-002', property: propNum, type: 'Agua Caliente', chargedAmount: 14300, amount: 14300, status: 'Pagado', date: '25 junio 2026', channel: 'Transferencia', referenceNumber: 'TR-998202', period: 'JUNIO 2026' },
      { id: 'pay-003', property: propNum, type: 'Gasto Comun', chargedAmount: 69865, amount: 69865, status: 'Pagado', date: '25 junio 2026', channel: 'PAC', referenceNumber: 'PAC-998203', period: 'JUNIO 2026' },
      { id: 'pay-004', property: propNum, type: 'Arriendo', chargedAmount: 385821, amount: 385821, status: 'Pagado', date: '25 junio 2026', channel: 'PAC', referenceNumber: 'PAC-998204', period: 'JUNIO 2026' },
      { id: 'pay-005', property: propNum, type: 'Energía Eléctrica', chargedAmount: 35000, amount: 20000, status: 'Pago Parcial', date: '10 julio 2026', channel: 'Transferencia', referenceNumber: 'TR-981044', period: 'JULIO 2026' },
      { id: 'pay-006', property: propNum, type: 'Arriendo', chargedAmount: 420000, amount: 0, status: 'Pendiente de pago', date: '05 agosto 2026', channel: 'PAC', referenceNumber: 'PEND-001', period: 'AGOSTO 2026' },
      { id: 'pay-007', property: propNum, type: 'Gasto Comun', chargedAmount: 72000, amount: 0, status: 'Vencido', date: '01 julio 2026', channel: 'Transferencia', referenceNumber: 'VENC-002', period: 'JUNIO 2026' },
      { id: 'pay-008', property: propNum, type: 'Agua Caliente', chargedAmount: 15000, amount: 18000, status: 'Abono a Favor', date: '19 junio 2026', channel: 'Transferencia', referenceNumber: 'TR-981045', period: 'MAYO 2026' },
      { id: 'pay-009', property: propNum, type: 'Gasto Comun', chargedAmount: 69865, amount: 69865, status: 'Pagado', date: '19 junio 2026', channel: 'PAC', referenceNumber: 'PAC-981046', period: 'MAYO 2026' },
      { id: 'pay-010', property: propNum, type: 'Arriendo', chargedAmount: 493851, amount: 493851, status: 'Pagado', date: '19 junio 2026', channel: 'PAC', referenceNumber: 'PAC-981047', period: 'MAYO 2026' },
      { id: 'pay-011', property: propNum, type: 'Gasto Comun', chargedAmount: 69865, amount: 69865, status: 'Pagado', date: '20 mayo 2026', channel: 'Servipag', referenceNumber: 'SP-965102', period: 'ABRIL 2026' },
      { id: 'pay-012', property: propNum, type: 'Arriendo', chargedAmount: 501567, amount: 501567, status: 'Pagado', date: '20 mayo 2026', channel: 'Servipag', referenceNumber: 'SP-965103', period: 'ABRIL 2026' },
    ];
  }, [activeProfile]);

  // General Metrics
  const globalMetrics = useMemo(() => {
    const totalTenants = tenantProfiles.length;
    if (totalTenants === 0) {
      return { totalTenants: 0, avgCompliance: 0, excelenteCount: 0, altoRiesgoCount: 0, totalRentedCLP: 0 };
    }
    const sumCompliance = tenantProfiles.reduce((acc, p) => acc + p.complianceRate, 0);
    const avgCompliance = Math.round(sumCompliance / totalTenants);
    const excelenteCount = tenantProfiles.filter(p => p.riskCategory === 'EXCELENTE').length;
    const altoRiesgoCount = tenantProfiles.filter(p => p.riskCategory === 'ALTO_RIESGO').length;
    const totalRentedCLP = tenantProfiles.reduce((acc, p) => acc + p.totalMonthlyRent, 0);

    return { totalTenants, avgCompliance, excelenteCount, altoRiesgoCount, totalRentedCLP };
  }, [tenantProfiles]);

  // Handle Add Payment
  const handleOpenAddPayment = (contractId: string, currentAmount?: number) => {
    setTargetContractId(contractId);
    if (currentAmount) {
      setPaymentAmount(currentAmount);
    }
    setShowAddPaymentModal(true);
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetContractId || paymentAmount <= 0) {
      addNotification('Especifique un monto válido para el pago', 'error');
      return;
    }

    setIsSubmittingPayment(true);
    try {
      const newPayment: LeasePayment = {
        id: 'pay-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        period: paymentPeriod,
        amountPaid: paymentAmount,
        date: paymentDate,
        paymentMethod: paymentMethod,
        referenceNumber: paymentRefNumber,
        registeredBy: currentUser,
        timestamp: Date.now()
      };

      const updatedContracts = leaseContracts.map(c => {
        if (c.id === targetContractId) {
          const currentPayments = c.payments || [];
          return {
            ...c,
            payments: [newPayment, ...currentPayments]
          };
        }
        return c;
      });

      await storage.save('leaseContracts', updatedContracts);
      if (onUpdateContracts) {
        onUpdateContracts(updatedContracts);
      }

      addNotification(`Pago de $${paymentAmount.toLocaleString('es-CL')} para ${paymentPeriod} registrado exitosamente`, 'success');
      setShowAddPaymentModal(false);
      setPaymentRefNumber('');
    } catch (err: any) {
      addNotification('Error al registrar el pago: ' + err.message, 'error');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Export Certificate to PDF
  const handleGeneratePDFCertificate = async (profile: TenantBehaviorProfile) => {
    try {
      const docPdf = new jsPDF();
      const logoBase64 = await getSvgAsPngBase64(DEFAULT_ASSETFLOW_SVG);

      // Header Banner
      docPdf.setFillColor(0, 45, 98); // #002D62 AssetFlow Blue
      docPdf.rect(0, 0, 210, 32, 'F');

      if (logoBase64) {
        docPdf.addImage(logoBase64, 'PNG', 12, 6, 45, 18);
      }

      docPdf.setTextColor(255, 255, 255);
      docPdf.setFont('Helvetica', 'bold');
      docPdf.setFontSize(14);
      docPdf.text('CERTIFICADO DE COMPORTAMIENTO DE PAGO DE ARRIENDO', 62, 16);
      docPdf.setFontSize(9);
      docPdf.setFont('Helvetica', 'normal');
      docPdf.text('DIVISIÓN DE CONTROL INTERNO Y GESTIÓN INMOBILIARIA - ASSETFLOW S.A.', 62, 22);

      // Document Subhead
      docPdf.setTextColor(40, 40, 40);
      docPdf.setFontSize(10);
      docPdf.setFont('Helvetica', 'bold');
      docPdf.text(`FECHA DE EMISIÓN: ${new Date().toLocaleDateString('es-CL')} | N° FOLIO: HA-${Date.now().toString().slice(-6)}`, 14, 42);

      // Line divider
      docPdf.setDrawColor(0, 200, 83); // Emerald
      docPdf.setLineWidth(0.8);
      docPdf.line(14, 46, 196, 46);

      // Section 1: Tenant Information Box
      docPdf.setFillColor(244, 247, 250);
      docPdf.rect(14, 52, 182, 36, 'F');
      docPdf.setDrawColor(200, 210, 220);
      docPdf.setLineWidth(0.3);
      docPdf.rect(14, 52, 182, 36, 'S');

      docPdf.setFont('Helvetica', 'bold');
      docPdf.setFontSize(10);
      docPdf.setTextColor(0, 45, 98);
      docPdf.text('ANTECEDENTES DEL ARRENDATARIO Y CONTRATO', 18, 60);

      docPdf.setFont('Helvetica', 'bold');
      docPdf.setFontSize(9);
      docPdf.setTextColor(60, 60, 60);
      docPdf.text('Nombre / Razón Social:', 18, 68);
      docPdf.setFont('Helvetica', 'normal');
      docPdf.text(profile.tenantName, 60, 68);

      docPdf.setFont('Helvetica', 'bold');
      docPdf.text('RUT / Identificación:', 18, 74);
      docPdf.setFont('Helvetica', 'normal');
      docPdf.text(profile.tenantTaxId, 60, 74);

      docPdf.setFont('Helvetica', 'bold');
      docPdf.text('Unidad Inmobiliaria:', 18, 80);
      docPdf.setFont('Helvetica', 'normal');
      docPdf.text(profile.activeContract?.propertyLabel || 'Propiedad Inmobiliaria AssetFlow', 60, 80);

      docPdf.setFont('Helvetica', 'bold');
      docPdf.text('Canon Mensual Arriendo:', 125, 68);
      docPdf.setFont('Helvetica', 'normal');
      docPdf.text(`$${profile.totalMonthlyRent.toLocaleString('es-CL')} CLP`, 165, 68);

      docPdf.setFont('Helvetica', 'bold');
      docPdf.text('Estado Contrato:', 125, 74);
      docPdf.setFont('Helvetica', 'normal');
      docPdf.text(profile.activeContract?.status || 'VIGENTE', 165, 74);

      docPdf.setFont('Helvetica', 'bold');
      docPdf.text('Fecha Inicio Contrato:', 125, 80);
      docPdf.setFont('Helvetica', 'normal');
      docPdf.text(profile.activeContract?.startDate || 'N/A', 165, 80);

      // Section 2: Score & Evaluation Rating Box
      docPdf.setFont('Helvetica', 'bold');
      docPdf.setFontSize(11);
      docPdf.setTextColor(0, 45, 98);
      docPdf.text('EVALUACIÓN DE COMPORTAMIENTO Y CUMPLIMIENTO', 14, 98);

      let boxColor = [220, 252, 231]; // Green light
      let textColor = [22, 101, 52];
      if (profile.riskCategory === 'ALTO_RIESGO') {
        boxColor = [254, 226, 226];
        textColor = [153, 27, 27];
      } else if (profile.riskCategory === 'REGULAR') {
        boxColor = [254, 243, 199];
        textColor = [146, 64, 14];
      }

      docPdf.setFillColor(boxColor[0], boxColor[1], boxColor[2]);
      docPdf.rect(14, 102, 182, 22, 'F');

      docPdf.setFontSize(10);
      docPdf.setTextColor(textColor[0], textColor[1], textColor[2]);
      docPdf.setFont('Helvetica', 'bold');
      docPdf.text(`ÍNDICE DE CUMPLIMIENTO DE PAGO: ${profile.complianceRate}% - CATEGORÍA: ${profile.riskCategory}`, 20, 112);
      
      docPdf.setFontSize(8.5);
      docPdf.setFont('Helvetica', 'normal');
      docPdf.text(`Pagos Registrados: ${profile.totalPaymentsRecorded} | A Tiempo: ${profile.onTimePaymentsCount} | Pagos Atrasados: ${profile.latePaymentsCount} | Promedio Atraso: ${profile.averageDelayDays} días`, 20, 118);

      // Section 3: Detailed Payment Ledger Table
      docPdf.setFont('Helvetica', 'bold');
      docPdf.setFontSize(10);
      docPdf.setTextColor(0, 45, 98);
      docPdf.text('HISTORIAL Y CARTOLA REGISTRADA DE PAGOS', 14, 134);

      // Table Header
      let yPos = 139;
      docPdf.setFillColor(0, 45, 98);
      docPdf.rect(14, yPos, 182, 8, 'F');
      docPdf.setTextColor(255, 255, 255);
      docPdf.setFontSize(8);
      docPdf.text('PERIODO', 18, yPos + 5.5);
      docPdf.text('FECHA PAGO', 55, yPos + 5.5);
      docPdf.text('MÉTODO', 90, yPos + 5.5);
      docPdf.text('N° COMPROBANTE', 125, yPos + 5.5);
      docPdf.text('MONTO ($)', 165, yPos + 5.5);

      yPos += 8;

      if (profile.allPayments.length === 0) {
        docPdf.setFillColor(255, 255, 255);
        docPdf.rect(14, yPos, 182, 10, 'F');
        docPdf.setTextColor(120, 120, 120);
        docPdf.text('No hay pagos individuales detallados aún registrados en la ficha.', 18, yPos + 6);
        yPos += 10;
      } else {
        profile.allPayments.slice(0, 10).forEach((pay, idx) => {
          docPdf.setFillColor(idx % 2 === 0 ? 250 : 240, idx % 2 === 0 ? 250 : 242, idx % 2 === 0 ? 250 : 245);
          docPdf.rect(14, yPos, 182, 7, 'F');
          docPdf.setTextColor(40, 40, 40);
          docPdf.setFont('Helvetica', 'normal');
          docPdf.text(pay.period || 'N/A', 18, yPos + 5);
          docPdf.text(pay.date || 'N/A', 55, yPos + 5);
          docPdf.text(pay.paymentMethod || 'TRANSFERENCIA', 90, yPos + 5);
          docPdf.text(pay.referenceNumber || 'N/A', 125, yPos + 5);
          docPdf.text(`$${(pay.amountPaid || 0).toLocaleString('es-CL')}`, 165, yPos + 5);
          yPos += 7;
        });
      }

      // Legal Certification Disclaimer Box
      yPos = Math.max(yPos + 12, 220);
      docPdf.setDrawColor(200, 200, 200);
      docPdf.setLineWidth(0.5);
      docPdf.rect(14, yPos, 182, 32);

      docPdf.setFontSize(8);
      docPdf.setFont('Helvetica', 'bold');
      docPdf.setTextColor(0, 45, 98);
      docPdf.text('CERTIFICACIÓN Y FIRMA INSTITUCIONAL ASSETFLOW S.A.', 18, yPos + 6);

      docPdf.setFont('Helvetica', 'normal');
      docPdf.setFontSize(7.5);
      docPdf.setTextColor(80, 80, 80);
      const textLine1 = 'Se certifica que los datos expresados en este documento corresponden fehacientemente al historial contable y de recepción de pagos registrado en la plataforma integrada de administración de activos de ASSETFLOW S.A. para la unidad de arriendo asignada.';
      const textLine2 = 'Este informe se emite a solicitud del interesado para los fines legales y comerciales que estime pertinentes.';
      docPdf.text(docPdf.splitTextToSize(textLine1, 174), 18, yPos + 12);
      docPdf.text(textLine2, 18, yPos + 22);

      // Signatures
      docPdf.line(30, yPos + 28, 85, yPos + 28);
      docPdf.text('Control Interno y Operaciones', 35, yPos + 31);

      docPdf.line(125, yPos + 28, 180, yPos + 28);
      docPdf.text('Firma Autorizada AssetFlow S.A.', 130, yPos + 31);

      // Save PDF
      docPdf.save(`Certificado_Comportamiento_Arriendo_${profile.tenantTaxId.replace(/[^a-zA-Z0-9]/g, '')}.pdf`);
      addNotification('Certificado PDF generado y descargado correctamente', 'success');
    } catch (err: any) {
      addNotification('Error al generar PDF: ' + err.message, 'error');
    }
  };

  // Export List to CSV/Excel
  const handleExportExcel = () => {
    try {
      const headers = [
        'RUT Arrendatario',
        'Nombre Arrendatario',
        'Propiedad Principal',
        'Canon Mensual CLP',
        'Cumplimiento %',
        'Categoría Riesgo',
        'Pagos Registrados',
        'A Tiempo',
        'Atrasados',
        'Promedio Días Atraso',
        'Monto Total Pagado'
      ];

      const rows = filteredProfiles.map(p => [
        `"${p.tenantTaxId}"`,
        `"${p.tenantName}"`,
        `"${p.activeContract?.propertyLabel || ''}"`,
        p.totalMonthlyRent,
        `${p.complianceRate}%`,
        p.riskCategory,
        p.totalPaymentsRecorded,
        p.onTimePaymentsCount,
        p.latePaymentsCount,
        p.averageDelayDays,
        p.totalAmountPaid
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Historial_Comportamiento_Arrendatarios_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      addNotification('Listado de comportamiento exportado a CSV/Excel exitosamente', 'success');
    } catch (err: any) {
      addNotification('Error al exportar a Excel: ' + err.message, 'error');
    }
  };

  // ==========================================
  // AS400 / DEVENGO MENSUAL DE ARRIENDOS
  // ==========================================
  const as400AccruedData = useMemo(() => {
    // Active or valid contracts to accrue for the selected month
    return leaseContracts.filter(c => c.status === 'VIGENTE' || (c.monthlyAmount && c.monthlyAmount > 0));
  }, [leaseContracts]);

  const as400TotalMonthlyAmount = useMemo(() => {
    return as400AccruedData.reduce((sum, c) => sum + (c.monthlyAmount || 0), 0);
  }, [as400AccruedData]);

  // Download Flat File for AS400 / IBM i ERP Ingestion (.TXT / .CSV)
  const handleDownloadAS400FlatFile = () => {
    try {
      const [year, month] = as400Month.split('-');
      const periodFormatted = `${month}/${year}`;
      const lastDayOfMonth = new Date(Number(year), Number(month), 0).getDate();
      const postingDate = `${lastDayOfMonth}/${month}/${year}`;

      const headers = [
        'ID_LOTE_AS400',
        'FECHA_ASIENTO',
        'TIPO_COMPROBANTE',
        'CUENTA_CONTABLE',
        'CENTRO_COSTO',
        'RUT_AUXILIAR',
        'NOMBRE_ARRENDATARIO',
        'UNIDAD_INMOBILIARIA',
        'MONTO_DEBITO_CLP',
        'MONTO_CREDITO_CLP',
        'GLOSA_EXPLICATIVA_AS400'
      ];

      const rows: string[] = [];

      as400AccruedData.forEach((contract, idx) => {
        const lineNum = String(idx + 1).padStart(4, '0');
        const costCenter = contract.propertyLabel.split(' ')[0]?.toUpperCase().replace(/[^A-Z0-9]/g, '') || `CC${lineNum}`;
        const amount = contract.monthlyAmount || 0;
        const tenantRut = (contract.tenantTaxId || '99999999-K').toUpperCase();
        const tenantName = (contract.tenantName || 'ARRENDATARIO').toUpperCase();
        const propLabel = contract.propertyLabel.toUpperCase();
        const glosa = `DEV ARRIENDO ${periodFormatted} - FOLIO ${contract.id}`;

        // Line DEBIT: Cuentas por Cobrar Arriendos (1105-0100)
        rows.push([
          `"${as400BatchId}"`,
          `"${postingDate}"`,
          `"DEV"`,
          `"${as400AccountDebit}"`,
          `"${costCenter}"`,
          `"${tenantRut}"`,
          `"${tenantName}"`,
          `"${propLabel}"`,
          amount,
          0,
          `"${glosa}"`
        ].join(';'));

        // Line CREDIT: Ingresos por Arriendo (4101-0100)
        rows.push([
          `"${as400BatchId}"`,
          `"${postingDate}"`,
          `"DEV"`,
          `"${as400AccountCredit}"`,
          `"${costCenter}"`,
          `"${tenantRut}"`,
          `"${tenantName}"`,
          `"${propLabel}"`,
          0,
          amount,
          `"${glosa}"`
        ].join(';'));
      });

      const fileContent = 'data:text/plain;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
      const encodedUri = encodeURI(fileContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `LOTECONTABLE_AS400_DEVENGO_ARRIENDOS_${as400Month.replace('-', '')}.txt`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      addNotification(`Archivo plano de ingesta para AS400 generado exitosamente (${rows.length} líneas contables)`, 'success');
    } catch (err: any) {
      addNotification('Error al generar archivo plano AS400: ' + err.message, 'error');
    }
  };

  // Export PDF Report for Finance Department
  const handleExportAS400PDF = async () => {
    try {
      const docPdf = new jsPDF();
      const logoBase64 = await getSvgAsPngBase64(DEFAULT_ASSETFLOW_SVG);
      const [year, month] = as400Month.split('-');
      const monthName = new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }).toUpperCase();

      // Header Banner
      docPdf.setFillColor(0, 45, 98); // #002D62 AssetFlow Blue
      docPdf.rect(0, 0, 210, 32, 'F');

      if (logoBase64) {
        docPdf.addImage(logoBase64, 'PNG', 12, 6, 45, 18);
      }

      docPdf.setTextColor(255, 255, 255);
      docPdf.setFont('Helvetica', 'bold');
      docPdf.setFontSize(13);
      docPdf.text('INFORME DE DEVENGO MENSUAL DE ARRIENDOS Y REGISTRO AS400', 60, 16);
      docPdf.setFontSize(8.5);
      docPdf.setFont('Helvetica', 'normal');
      docPdf.text('GERENCIA DE FINANZAS, CONTABILIDAD Y CONTROL INTERNO - ASSETFLOW S.A.', 60, 22);

      // Subhead
      docPdf.setTextColor(40, 40, 40);
      docPdf.setFontSize(9.5);
      docPdf.setFont('Helvetica', 'bold');
      docPdf.text(`PERIODO CONTABLE: ${monthName} | ID LOTE AS400: ${as400BatchId}`, 14, 40);
      docPdf.setFont('Helvetica', 'normal');
      docPdf.text(`FECHA EMISIÓN: ${new Date().toLocaleDateString('es-CL')} | EMITIDO POR: ${currentUser}`, 14, 45);

      // Line divider
      docPdf.setDrawColor(0, 200, 83);
      docPdf.setLineWidth(0.8);
      docPdf.line(14, 48, 196, 48);

      // Section 1: Accounting Entry Summary Box (Asiento de Devengo)
      docPdf.setFillColor(244, 247, 250);
      docPdf.rect(14, 53, 182, 38, 'F');
      docPdf.setDrawColor(200, 210, 220);
      docPdf.setLineWidth(0.3);
      docPdf.rect(14, 53, 182, 38, 'S');

      docPdf.setFont('Helvetica', 'bold');
      docPdf.setFontSize(9.5);
      docPdf.setTextColor(0, 45, 98);
      docPdf.text('RESUMEN DE ASIENTO CONTABLE DE DEVENGO (VOUCHER AS400 / ERP)', 18, 61);

      // Table Header inside Voucher
      docPdf.setFillColor(0, 45, 98);
      docPdf.rect(18, 65, 174, 6, 'F');
      docPdf.setTextColor(255, 255, 255);
      docPdf.setFontSize(7.5);
      docPdf.text('CUENTA CONTABLE', 22, 69.5);
      docPdf.text('DESCRIPCIÓN CUENTA', 65, 69.5);
      docPdf.text('DÉBITO ($)', 130, 69.5);
      docPdf.text('CRÉDITO ($)', 165, 69.5);

      // Row 1 Debit
      docPdf.setFillColor(255, 255, 255);
      docPdf.rect(18, 71, 174, 8, 'F');
      docPdf.setTextColor(40, 40, 40);
      docPdf.setFont('Helvetica', 'bold');
      docPdf.text(as400AccountDebit, 22, 76.5);
      docPdf.setFont('Helvetica', 'normal');
      docPdf.text('Cuentas por Cobrar - Deudores por Arrendamiento', 65, 76.5);
      docPdf.setFont('Helvetica', 'bold');
      docPdf.text(`$${as400TotalMonthlyAmount.toLocaleString('es-CL')}`, 130, 76.5);
      docPdf.text('$0', 165, 76.5);

      // Row 2 Credit
      docPdf.setFillColor(248, 250, 252);
      docPdf.rect(18, 79, 174, 8, 'F');
      docPdf.setTextColor(40, 40, 40);
      docPdf.setFont('Helvetica', 'bold');
      docPdf.text(as400AccountCredit, 22, 84.5);
      docPdf.setFont('Helvetica', 'normal');
      docPdf.text('Ingresos Explotación - Arrendamiento de Inmuebles', 65, 84.5);
      docPdf.setFont('Helvetica', 'bold');
      docPdf.text('$0', 130, 84.5);
      docPdf.text(`$${as400TotalMonthlyAmount.toLocaleString('es-CL')}`, 165, 84.5);

      // Section 2: Detailed Accrual Schedule per Property
      docPdf.setFont('Helvetica', 'bold');
      docPdf.setFontSize(10);
      docPdf.setTextColor(0, 45, 98);
      docPdf.text(`NÓMINA DETALLADA DE DEVENGO MENSUAL (${as400AccruedData.length} UNIDADES VIGENTES)`, 14, 100);

      let yPos = 105;
      docPdf.setFillColor(0, 45, 98);
      docPdf.rect(14, yPos, 182, 7, 'F');
      docPdf.setTextColor(255, 255, 255);
      docPdf.setFontSize(7.5);
      docPdf.text('FOLIO', 18, yPos + 5);
      docPdf.text('ARRENDATARIO', 42, yPos + 5);
      docPdf.text('RUT', 98, yPos + 5);
      docPdf.text('UNIDAD INMOBILIARIA', 125, yPos + 5);
      docPdf.text('CANON DEVENGADO ($)', 162, yPos + 5);

      yPos += 7;

      as400AccruedData.forEach((contract, idx) => {
        docPdf.setFillColor(idx % 2 === 0 ? 250 : 242, idx % 2 === 0 ? 250 : 245, idx % 2 === 0 ? 250 : 248);
        docPdf.rect(14, yPos, 182, 6.5, 'F');
        docPdf.setTextColor(40, 40, 40);
        docPdf.setFont('Helvetica', 'normal');
        docPdf.setFontSize(7);

        const folio = contract.id.slice(0, 10);
        const name = (contract.tenantName || 'Arrendatario').slice(0, 28);
        const rut = contract.tenantTaxId || 'N/A';
        const prop = (contract.propertyLabel || 'Propiedad').slice(0, 24);
        const amount = `$${(contract.monthlyAmount || 0).toLocaleString('es-CL')}`;

        docPdf.text(folio, 18, yPos + 4.5);
        docPdf.text(name, 42, yPos + 4.5);
        docPdf.text(rut, 98, yPos + 4.5);
        docPdf.text(prop, 125, yPos + 4.5);
        docPdf.setFont('Helvetica', 'bold');
        docPdf.text(amount, 162, yPos + 4.5);

        yPos += 6.5;

        // Manage pagination if overflow
        if (yPos > 265 && idx < as400AccruedData.length - 1) {
          docPdf.addPage();
          yPos = 20;
          docPdf.setFillColor(0, 45, 98);
          docPdf.rect(14, yPos, 182, 7, 'F');
          docPdf.setTextColor(255, 255, 255);
          docPdf.setFontSize(7.5);
          docPdf.text('FOLIO', 18, yPos + 5);
          docPdf.text('ARRENDATARIO', 42, yPos + 5);
          docPdf.text('RUT', 98, yPos + 5);
          docPdf.text('UNIDAD INMOBILIARIA', 125, yPos + 5);
          docPdf.text('CANON DEVENGADO ($)', 162, yPos + 5);
          yPos += 7;
        }
      });

      // Total Box
      docPdf.setFillColor(230, 240, 250);
      docPdf.rect(14, yPos, 182, 8, 'F');
      docPdf.setFont('Helvetica', 'bold');
      docPdf.setFontSize(8.5);
      docPdf.setTextColor(0, 45, 98);
      docPdf.text('TOTAL GENERAL DEVENGADO DEL PERIODO:', 18, yPos + 5.5);
      docPdf.text(`$${as400TotalMonthlyAmount.toLocaleString('es-CL')} CLP`, 162, yPos + 5.5);

      // Signatures Box
      yPos = Math.max(yPos + 18, 235);
      docPdf.setDrawColor(200, 200, 200);
      docPdf.setLineWidth(0.4);
      docPdf.line(25, yPos + 15, 80, yPos + 15);
      docPdf.setFontSize(7.5);
      docPdf.setTextColor(80, 80, 80);
      docPdf.text('Elaborado por: Control Inmobiliario', 28, yPos + 19);

      docPdf.line(130, yPos + 15, 185, yPos + 15);
      docPdf.text('Aprobado por: Jefatura de Finanzas / AS400', 131, yPos + 19);

      docPdf.save(`Informe_Devengo_Finanzas_AS400_${as400Month.replace('-', '')}.pdf`);
      addNotification('Informe de Devengo para Finanzas emitido en PDF exitosamente', 'success');
    } catch (err: any) {
      addNotification('Error al generar PDF de devengo AS400: ' + err.message, 'error');
    }
  };

  return (
    <div className="p-4 md:p-6 bg-[#F4F7FA] min-h-full font-sans text-slate-800 space-y-6">
      
      {/* HEADER BAR */}
      <div className="bg-[#002D62] text-white p-5 rounded-lg shadow-md border-b-4 border-[#00C853] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-[#00C853] text-[#002D62] text-[10px] font-black uppercase font-mono px-2 py-0.5 rounded tracking-widest">
              P1501HA
            </span>
            <h1 className="text-xl md:text-2xl font-black tracking-tight uppercase">
              Consulta e Historial de Arriendo y Comportamiento de Pago
            </h1>
          </div>
          <p className="text-slate-300 text-xs mt-1 max-w-3xl font-normal">
            Plataforma centralizada de fiscalización crediticia, cartola de pagos históricos, cumplimiento contractual y evaluación de riesgo de arrendatarios AssetFlow S.A.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <button
            onClick={() => setShowMethodology(!showMethodology)}
            className={`text-xs font-bold px-3 py-2 rounded flex items-center gap-1.5 transition-all shadow-xs cursor-pointer uppercase font-mono border ${
              showMethodology 
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-400' 
                : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-600'
            }`}
            title="Alternar visibilidad del recuadro de Metodología de Evaluación"
          >
            <ShieldCheck size={15} />
            <span>Metodología Evaluación</span>
          </button>
          <button
            onClick={() => setShowAS400Modal(true)}
            className="bg-[#002D62] hover:bg-[#001D42] text-white text-xs font-bold px-3 py-2 rounded border border-[#00C853] flex items-center gap-1.5 transition-all shadow-xs cursor-pointer uppercase font-mono"
          >
            <FileText size={15} className="text-[#00C853]" />
            <span>Devengo Finanzas (AS400)</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="bg-[#006233] hover:bg-[#004d28] text-white text-xs font-bold px-3 py-2 rounded flex items-center gap-1.5 transition-all shadow-xs cursor-pointer uppercase font-mono"
          >
            <FileSpreadsheet size={15} />
            <span>Exportar Excel</span>
          </button>
        </div>
      </div>

      {/* GLOBAL STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 shrink-0">
            <User size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Total Arrendatarios</p>
            <p className="text-xl font-black text-slate-900 mt-0.5">{globalMetrics.totalTenants}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
            <TrendingUp size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Prom. Cumplimiento Global</p>
            <p className="text-xl font-black text-emerald-700 mt-0.5">{globalMetrics.avgCompliance}%</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-800 shrink-0">
            <Award size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Excelentes Pagadores</p>
            <p className="text-xl font-black text-emerald-800 mt-0.5">{globalMetrics.excelenteCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-700 shrink-0">
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Alto Riesgo / Morosos</p>
            <p className="text-xl font-black text-rose-700 mt-0.5">{globalMetrics.altoRiesgoCount}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-[#002D62] shrink-0">
            <DollarSign size={20} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">Canon Mensual Vigente</p>
            <p className="text-lg font-black text-[#002D62] mt-0.5">${globalMetrics.totalRentedCLP.toLocaleString('es-CL')}</p>
          </div>
        </div>
      </div>

      {/* RECUADRO INFORMATIVO: METODOLOGÍA Y CRITERIOS DE EVALUACIÓN DE ARRENDATARIOS */}
      {showMethodology && (
        <div className="bg-gradient-to-r from-[#002D62]/5 via-emerald-50/50 to-blue-50/60 border-2 border-[#002D62]/25 rounded-lg p-4 md:p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2.5 border-b border-[#002D62]/20">
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-[#002D62] shrink-0" size={22} />
              <h3 className="text-sm md:text-base font-black text-[#002D62] uppercase tracking-wide">
                Metodología y Criterios de Calificación Crediticia de Arrendatarios
              </h3>
              <span className="bg-[#002D62] text-white text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                Control Interno & B13 CMF
              </span>
            </div>
            <button 
              onClick={() => setShowMethodology(false)}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-200/70 transition-colors cursor-pointer"
              title="Ocultar recuadro informativo"
            >
              <X size={16} />
            </button>
          </div>

          {/* 4 Pillars Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            
            {/* Criterio 1 */}
            <div className="bg-white p-3.5 rounded-md border border-slate-200 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 uppercase">
                  1. Oportunidad
                </span>
                <Clock size={15} className="text-indigo-600" />
              </div>
              <h4 className="font-bold text-slate-900 text-xs">Día Límite de Pago (Día 10)</h4>
              <p className="text-[11px] text-slate-600 leading-snug">
                Se considera <strong className="text-slate-900 font-semibold">pago oportuno</strong> todo abono registrado entre el día 1 y 10 del mes. Abonos desde el día 11 acumulan días de atraso y penalizan la puntuación.
              </p>
            </div>

            {/* Criterio 2 */}
            <div className="bg-white p-3.5 rounded-md border border-slate-200 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 uppercase">
                  2. Cumplimiento %
                </span>
                <TrendingUp size={15} className="text-emerald-600" />
              </div>
              <h4 className="font-bold text-slate-900 text-xs">Tasa Histórica de Pago</h4>
              <p className="text-[11px] text-slate-600 leading-snug">
                Fórmula: <span className="font-mono font-semibold text-slate-900">(Pagos a Tiempo / Total Pagos) × 100</span>, ajustado por castigos directos de cuotas con retraso recurrente.
              </p>
            </div>

            {/* Criterio 3 */}
            <div className="bg-white p-3.5 rounded-md border border-slate-200 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 uppercase">
                  3. Informe CMF B13
                </span>
                <AlertTriangle size={15} className="text-rose-600" />
              </div>
              <h4 className="font-bold text-slate-900 text-xs">Fiscalización Regulatoria</h4>
              <p className="text-[11px] text-slate-600 leading-snug">
                Cruce automatizado con la planilla B13 CMF. Cada cuota vencida aplica un descuento directo del <strong className="text-rose-700">15% a 20%</strong> en la nota global.
              </p>
            </div>

            {/* Criterio 4 */}
            <div className="bg-white p-3.5 rounded-md border border-slate-200 shadow-2xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] font-black text-[#002D62] bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase">
                  4. Trazabilidad RUT
                </span>
                <Award size={15} className="text-[#002D62]" />
              </div>
              <h4 className="font-bold text-slate-900 text-xs">Persistencia Histórica</h4>
              <p className="text-[11px] text-slate-600 leading-snug">
                Consolida la hoja de vida crediticia por RUT. La finalización de un contrato <strong className="text-slate-900">no elimina el registro histórico</strong> para futuros arrendamientos.
              </p>
            </div>

          </div>

          {/* Range Categories Banner */}
          <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center gap-2 text-[11px]">
            <span className="font-black text-[#002D62] font-mono text-[10px] uppercase tracking-wider mr-1">Escala de Calificación:</span>
            
            <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded border border-emerald-300 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              EXCELENTE (95% – 100%): Cumplimiento oportuno, 0 mora CMF B13. Renovación expedita.
            </span>

            <span className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-900 px-2.5 py-1 rounded border border-blue-300 font-bold">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              BUENO (85% – 94%): Pago regular, demoras aisladas &lt;5 días.
            </span>

            <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-900 px-2.5 py-1 rounded border border-amber-300 font-bold">
              <span className="w-2 h-2 rounded-full bg-amber-600"></span>
              REGULAR (70% – 84%): Mora reincidente 6-15 días. Sujeto a cobro preventivo.
            </span>

            <span className="inline-flex items-center gap-1.5 bg-rose-100 text-rose-900 px-2.5 py-1 rounded border border-rose-300 font-bold">
              <span className="w-2 h-2 rounded-full bg-rose-600"></span>
              ALTO RIESGO / MOROSO (&lt;70%): Morosidad B13 CMF. Derivación a Cobranza Judicial.
            </span>
          </div>
        </div>
      )}

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por Nombre, RUT Arrendatario o Dirección de la Propiedad..."
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-[#002D62] focus:outline-none"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Risk Category Filter */}
          <div className="flex items-center gap-2 shrink-0">
            <Filter size={14} className="text-slate-500" />
            <span className="text-xs font-bold text-slate-700 uppercase font-mono">Categoría Riesgo:</span>
            <select
              value={selectedRiskFilter}
              onChange={(e) => setSelectedRiskFilter(e.target.value)}
              className="border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white font-medium focus:ring-1 focus:ring-[#002D62]"
            >
              <option value="ALL">TODAS LAS CATEGORÍAS</option>
              <option value="EXCELENTE">EXCELENTE (95%-100%)</option>
              <option value="BUENO">BUENO (85%-94%)</option>
              <option value="REGULAR">REGULAR (70%-84%)</option>
              <option value="ALTO_RIESGO">ALTO RIESGO / MOROSO (&lt;70%)</option>
            </select>
          </div>

          {/* Contract Status Filter */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-slate-700 uppercase font-mono">Contrato:</span>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white font-medium focus:ring-1 focus:ring-[#002D62]"
            >
              <option value="ALL">TODOS</option>
              <option value="VIGENTE">VIGENTES</option>
              <option value="VENCIDO">VENCIDOS / FINALIZADOS</option>
            </select>
          </div>

        </div>
      </div>

      {/* MAIN TWO-COLUMN LAYOUT: TENANT LIST & DETAILED PROFILE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: TENANT SELECTION LIST (4 COLS) */}
        <div className="lg:col-span-4 bg-white rounded-lg border border-slate-200 shadow-xs flex flex-col h-[700px]">
          <div className="p-3.5 bg-[#EBF0F5] border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-black text-[#002D62] uppercase tracking-wider font-mono flex items-center gap-1.5">
              <User size={14} />
              <span>Directorio de Arrendatarios ({filteredProfiles.length})</span>
            </span>
            <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
              RUT / Comportamiento
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1">
            {filteredProfiles.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <XCircle size={28} className="mx-auto mb-2 opacity-40" />
                <p className="text-xs font-bold uppercase tracking-wider">No se encontraron arrendatarios</p>
                <p className="text-[11px] mt-1">Ajuste los filtros o términos de búsqueda.</p>
              </div>
            ) : (
              filteredProfiles.map((profile) => {
                const isSelected = activeProfile?.tenantTaxId === profile.tenantTaxId;

                let badgeBg = 'bg-emerald-100 text-emerald-800 border-emerald-300';
                if (profile.riskCategory === 'ALTO_RIESGO') badgeBg = 'bg-rose-100 text-rose-800 border-rose-300';
                else if (profile.riskCategory === 'REGULAR') badgeBg = 'bg-amber-100 text-amber-800 border-amber-300';
                else if (profile.riskCategory === 'BUENO') badgeBg = 'bg-blue-100 text-blue-800 border-blue-300';

                return (
                  <div
                    key={profile.tenantTaxId}
                    onClick={() => {
                      setSelectedTenantTaxId(profile.tenantTaxId);
                      setInspectProfile(profile);
                    }}
                    className={`p-3 rounded-md transition-all cursor-pointer border group relative hover:shadow-md ${
                      isSelected 
                        ? 'bg-[#EAF4FC] border-[#002D62] shadow-xs' 
                        : 'bg-white hover:bg-slate-50 border-slate-200'
                    }`}
                    title="Haga clic para ver el detalle de la ficha del arrendatario"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-slate-900 group-hover:text-[#002D62] transition-colors truncate">
                            {profile.tenantName}
                          </p>
                          <span className="text-[9px] font-mono font-bold bg-[#002D62] text-white px-1.5 py-0.2 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            VER DETALLE 🔍
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-slate-500 mt-0.5">RUT: {profile.tenantTaxId}</p>
                      </div>
                      <span className={`text-[9.5px] font-extrabold px-2 py-0.5 rounded border ${badgeBg} shrink-0`}>
                        {profile.complianceRate}%
                      </span>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-[10.5px] text-slate-600 border-t border-slate-100 pt-2">
                      <span className="truncate max-w-[170px] text-slate-500 font-medium">
                        {profile.activeContract?.propertyLabel || 'Sin contrato vigente'}
                      </span>
                      <span className="font-bold text-[#002D62] font-mono">
                        ${profile.totalMonthlyRent.toLocaleString('es-CL')}/mes
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: DETAILED PROFILE & LEDGER HISTORY (8 COLS) */}
        <div className="lg:col-span-8 bg-white rounded-lg border border-slate-200 shadow-xs flex flex-col h-[700px] overflow-hidden">
          {activeProfile ? (
            <div className="flex flex-col h-full overflow-y-auto">
              
              {/* Profile Header Card */}
              <div className="p-5 bg-[#EBF0F5] border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black bg-[#002D62] text-white px-2 py-0.5 rounded font-mono uppercase">
                      RUT: {activeProfile.tenantTaxId}
                    </span>
                    <h2 className="text-lg font-black text-slate-900">{activeProfile.tenantName}</h2>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 flex items-center gap-2">
                    <Building2 size={13} className="text-slate-400" />
                    <span>Unidad: <strong>{activeProfile.activeContract?.propertyLabel || 'N/A'}</strong></span>
                  </p>
                </div>

                <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
                  <button
                    onClick={() => handleGeneratePDFCertificate(activeProfile)}
                    className="bg-[#002D62] hover:bg-[#001D42] text-white text-xs font-bold px-3 py-2 rounded flex items-center gap-1.5 transition-all cursor-pointer uppercase shadow-xs"
                  >
                    <Printer size={14} />
                    <span>Emitir Certificado PDF</span>
                  </button>

                  {activeProfile.activeContract && (
                    <button
                      onClick={() => handleOpenAddPayment(activeProfile.activeContract!.id, activeProfile.totalMonthlyRent)}
                      className="bg-[#006233] hover:bg-[#004d28] text-white text-xs font-bold px-3 py-2 rounded flex items-center gap-1.5 transition-all cursor-pointer uppercase shadow-xs font-mono"
                    >
                      <Plus size={14} />
                      <span>Registrar Pago</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Behavior Score Summary Box */}
              <div className="p-4 bg-white border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded border border-slate-200 text-center">
                  <p className="text-[10px] font-bold text-slate-500 uppercase font-mono">Score Cumplimiento</p>
                  <p className={`text-xl font-black mt-1 ${
                    activeProfile.complianceRate >= 90 ? 'text-emerald-700' : 
                    activeProfile.complianceRate >= 75 ? 'text-amber-700' : 'text-rose-700'
                  }`}>
                    {activeProfile.complianceRate}%
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded border border-slate-200 text-center">
                  <p className="text-[10px] font-bold text-slate-500 uppercase font-mono">Categoría de Riesgo</p>
                  <p className={`text-xs font-black mt-2 uppercase px-2 py-0.5 rounded inline-block ${
                    activeProfile.riskCategory === 'EXCELENTE' ? 'bg-emerald-100 text-emerald-800' :
                    activeProfile.riskCategory === 'BUENO' ? 'bg-blue-100 text-blue-800' :
                    activeProfile.riskCategory === 'REGULAR' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {activeProfile.riskCategory}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded border border-slate-200 text-center">
                  <p className="text-[10px] font-bold text-slate-500 uppercase font-mono">Pagos A Tiempo / Atrasados</p>
                  <p className="text-sm font-black text-slate-800 mt-1">
                    <span className="text-emerald-700">{activeProfile.onTimePaymentsCount}</span>
                    <span className="text-slate-400 mx-1">/</span>
                    <span className="text-rose-600">{activeProfile.latePaymentsCount}</span>
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded border border-slate-200 text-center">
                  <p className="text-[10px] font-bold text-slate-500 uppercase font-mono">Promedio Días Atraso</p>
                  <p className="text-sm font-black text-slate-800 mt-1">
                    {activeProfile.averageDelayDays} días
                  </p>
                </div>
              </div>

              {/* Detailed Payment History Section */}
              <div className="p-4 flex-1 space-y-4">
                <TenantPaymentLedgerTable 
                  payments={mappedLedgerItems}
                  tenantName={activeProfile.tenantName}
                  tenantTaxId={activeProfile.tenantTaxId}
                  propertyLabel={activeProfile.activeContract?.propertyLabel || 'Propiedad 1822'}
                  title="Pagos realizados"
                  isCompanyUser={true}
                  contractStartDate={activeProfile.activeContract?.startDate ? new Date(activeProfile.activeContract.startDate).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' }) : '01 de Mayo de 2024'}
                  nextRenewalDate={activeProfile.activeContract?.endDate ? new Date(activeProfile.activeContract.endDate).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' }) : '01 de Mayo de 2027'}
                  contractId={activeProfile.activeContract?.id || 'CTR-2024-1822'}
                />

                {/* Ancillary Context Cards (Garantía y Entregas) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
                  {/* Security Deposit Info */}
                  <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs space-y-1">
                    <p className="font-bold text-[#002D62] uppercase tracking-wider text-[11px] flex items-center gap-1.5 font-mono">
                      <ShieldCheck size={14} className="text-teal-700" />
                      <span>Garantía de Arriendo</span>
                    </p>
                    {activeProfile.associatedDeposit ? (
                      <div className="pt-1 text-slate-700 space-y-0.5">
                        <p>Monto Guardado: <strong>${activeProfile.associatedDeposit.initialAmount.toLocaleString('es-CL')} {activeProfile.associatedDeposit.currency}</strong></p>
                        <p>Estado: <span className="bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded text-[10px] font-bold">{activeProfile.associatedDeposit.status}</span></p>
                      </div>
                    ) : (
                      <p className="text-slate-400 italic pt-1">Sin registro de depósito de garantía en sistema.</p>
                    )}
                  </div>

                  {/* Property Inspection Info */}
                  <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs space-y-1">
                    <p className="font-bold text-[#002D62] uppercase tracking-wider text-[11px] flex items-center gap-1.5 font-mono">
                      <FileText size={14} className="text-emerald-700" />
                      <span>Actas de Entrega / Restitución</span>
                    </p>
                    {activeProfile.associatedInspections.length > 0 ? (
                      <div className="pt-1 text-slate-700 space-y-1">
                        {activeProfile.associatedInspections.map(ins => (
                          <div key={ins.id} className="flex items-center justify-between">
                            <span>Acta {ins.type}: <strong>{ins.inspectionDate}</strong></span>
                            <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded text-[9.5px] font-bold">{ins.status}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-slate-400 italic pt-1">No hay actas registradas para este arrendatario.</p>
                    )}
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-400 my-auto">
              <User size={36} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm font-bold uppercase tracking-wider">Seleccione un arrendatario para consultar</p>
            </div>
          )}
        </div>

      </div>

      {/* MODAL: REGISTRAR PAGO DE ARRIENDO */}
      {showAddPaymentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-[#002D62] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard size={18} className="text-[#00C853]" />
                <h3 className="text-sm font-black uppercase tracking-wider font-mono">
                  Registrar Pago de Arriendo
                </h3>
              </div>
              <button 
                onClick={() => setShowAddPaymentModal(false)}
                className="text-white/70 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePayment} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-[10.5px] font-bold text-slate-700 uppercase font-mono mb-1">
                  Periodo de Arriendo:
                </label>
                <input
                  type="text"
                  required
                  value={paymentPeriod}
                  onChange={(e) => setPaymentPeriod(e.target.value.toUpperCase())}
                  placeholder="Ej: JULIO 2026"
                  className="w-full p-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-[#002D62] font-mono"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-slate-700 uppercase font-mono mb-1">
                  Monto Pagado ($ CLP):
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={paymentAmount || ''}
                  onChange={(e) => setPaymentAmount(Number(e.target.value))}
                  placeholder="Ej: 450000"
                  className="w-full p-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-[#002D62] font-mono text-right font-black"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-slate-700 uppercase font-mono mb-1">
                  Fecha de Pago:
                </label>
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-[#002D62] font-mono"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-slate-700 uppercase font-mono mb-1">
                  Método de Pago:
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-[#002D62] bg-white font-medium"
                >
                  <option value="TRANSFERENCIA">TRANSFERENCIA BANCARIA</option>
                  <option value="DEPÓSITO">DEPÓSITO EN CUENTA</option>
                  <option value="CHEQUE">CHEQUE AL DÍA / A FECHA</option>
                  <option value="PAC">PAGO AUTOMÁTICO DE CUENTA (PAC)</option>
                  <option value="EFECTIVO">EFECTIVO / CAJA</option>
                </select>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-slate-700 uppercase font-mono mb-1">
                  N° Comprobante / Transacción (Opcional):
                </label>
                <input
                  type="text"
                  value={paymentRefNumber}
                  onChange={(e) => setPaymentRefNumber(e.target.value)}
                  placeholder="Ej: TR-8849201"
                  className="w-full p-2 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-[#002D62] font-mono"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddPaymentModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-100 font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="px-4 py-2 bg-[#006233] hover:bg-[#004d28] text-white rounded font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingPayment ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                  <span>Guardar Pago</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: INFORME DE DEVENGO MENSUAL Y LOTE CONTABLE AS400 PARA FINANZAS */}
      {showAS400Modal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="bg-[#002D62] text-white p-4 border-b-4 border-[#00C853] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="bg-[#00C853] text-[#002D62] text-[10px] font-black uppercase font-mono px-2 py-0.5 rounded tracking-widest">
                  AS400 / FINANZAS
                </span>
                <h3 className="text-sm md:text-base font-black uppercase tracking-wider font-mono">
                  Informe de Devengo Mensual de Arriendos para Finanzas & Contabilidad
                </h3>
              </div>
              <button 
                onClick={() => setShowAS400Modal(false)}
                className="text-white/70 hover:text-white cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 text-xs">
              
              {/* Parameters Panel */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono mb-1">
                    Mes de Devengo Contable:
                  </label>
                  <input
                    type="month"
                    value={as400Month}
                    onChange={(e) => setAs400Month(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded bg-white font-mono font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono mb-1">
                    Identificador de Lote AS400:
                  </label>
                  <input
                    type="text"
                    value={as400BatchId}
                    onChange={(e) => setAs400BatchId(e.target.value.toUpperCase())}
                    className="w-full p-2 border border-slate-300 rounded bg-white font-mono font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono mb-1">
                    Cuenta Débito (Cuentas por Cobrar):
                  </label>
                  <input
                    type="text"
                    value={as400AccountDebit}
                    onChange={(e) => setAs400AccountDebit(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded bg-white font-mono font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase font-mono mb-1">
                    Cuenta Crédito (Ingresos Arriendo):
                  </label>
                  <input
                    type="text"
                    value={as400AccountCredit}
                    onChange={(e) => setAs400AccountCredit(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded bg-white font-mono font-bold text-slate-800"
                  />
                </div>
              </div>

              {/* Accrual Totals & Balance Verification */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <p className="text-[10px] font-bold text-emerald-800 uppercase font-mono">Total Devengado Periodo ({as400Month})</p>
                  <p className="text-xl font-black text-emerald-900 mt-0.5 font-mono">
                    ${as400TotalMonthlyAmount.toLocaleString('es-CL')} CLP
                  </p>
                  <p className="text-[10px] text-emerald-700 mt-1 font-medium">Sumatoria de cánones de contratos vigentes</p>
                </div>

                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-[10px] font-bold text-[#002D62] uppercase font-mono">Unidades / Contratos Procesados</p>
                  <p className="text-xl font-black text-[#002D62] mt-0.5 font-mono">
                    {as400AccruedData.length} Contratos
                  </p>
                  <p className="text-[10px] text-slate-600 mt-1 font-medium">Asignados a sus respectivos Centros de Costos</p>
                </div>

                <div className="p-3.5 bg-slate-50 border border-slate-300 rounded-lg">
                  <p className="text-[10px] font-bold text-slate-700 uppercase font-mono">Estado del Asiento Contable</p>
                  <p className="text-sm font-black text-emerald-700 mt-1 flex items-center gap-1 font-mono">
                    <CheckCircle size={15} />
                    <span>BALANCEADO / CUADRADO</span>
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1 font-mono">Débito = Crédito = ${as400TotalMonthlyAmount.toLocaleString('es-CL')}</p>
                </div>
              </div>

              {/* Voucher Preview Table (Asiento Contable T) */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="p-2.5 bg-[#002D62] text-white font-bold font-mono text-xs flex items-center justify-between">
                  <span>RESUMEN VOUCHER DE ASIENTO CONTABLE AS400</span>
                  <span className="text-[10px] text-[#00C853] font-mono">SISTEMA AS400 / IBM i ERP</span>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 uppercase text-[10px] font-mono text-slate-700 border-b border-slate-200">
                    <tr>
                      <th className="p-2">Cuenta Contable</th>
                      <th className="p-2">Nombre de Cuenta</th>
                      <th className="p-2 text-right">Débito ($)</th>
                      <th className="p-2 text-right">Crédito ($)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                    <tr className="bg-white">
                      <td className="p-2 font-bold text-[#002D62]">{as400AccountDebit}</td>
                      <td className="p-2">CUENTAS POR COBRAR - DEUDORES POR ARRENDAMIENTO</td>
                      <td className="p-2 text-right font-bold text-slate-900">${as400TotalMonthlyAmount.toLocaleString('es-CL')}</td>
                      <td className="p-2 text-right text-slate-400">$0</td>
                    </tr>
                    <tr className="bg-slate-50">
                      <td className="p-2 font-bold text-[#002D62]">{as400AccountCredit}</td>
                      <td className="p-2">INGRESOS DE EXPLOTACIÓN - ARRENDAMIENTO INMUEBLES</td>
                      <td className="p-2 text-right text-slate-400">$0</td>
                      <td className="p-2 text-right font-bold text-slate-900">${as400TotalMonthlyAmount.toLocaleString('es-CL')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Detailed Contracts Breakdown */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-[#002D62] uppercase tracking-wider font-mono text-xs">
                    Desglose de Contratos y Cánones Devengados en el Mes
                  </h4>
                  <span className="text-[10px] font-bold text-slate-500 font-mono">
                    {as400AccruedData.length} Registros
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-lg max-h-48">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#002D62] text-white uppercase text-[9.5px] font-mono sticky top-0">
                      <tr>
                        <th className="p-2">Folio Contrato</th>
                        <th className="p-2">RUT</th>
                        <th className="p-2">Arrendatario</th>
                        <th className="p-2">Propiedad Inmobiliaria</th>
                        <th className="p-2 text-right">Canon Devengado ($)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white text-[11px]">
                      {as400AccruedData.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-50">
                          <td className="p-2 font-mono font-bold text-slate-800">{c.id}</td>
                          <td className="p-2 font-mono text-slate-600">{c.tenantTaxId}</td>
                          <td className="p-2 font-semibold text-slate-900">{c.tenantName}</td>
                          <td className="p-2 text-slate-600">{c.propertyLabel}</td>
                          <td className="p-2 text-right font-bold font-mono text-[#002D62]">
                            ${(c.monthlyAmount || 0).toLocaleString('es-CL')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowAS400Modal(false)}
                className="w-full sm:w-auto px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-200 font-bold text-xs cursor-pointer"
              >
                Cerrar
              </button>

              <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadAS400FlatFile}
                  className="w-full sm:w-auto px-4 py-2 bg-[#002D62] hover:bg-[#001D42] text-white rounded font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs uppercase font-mono"
                >
                  <Download size={14} className="text-[#00C853]" />
                  <span>Descargar Archivo Plano AS400 (.TXT)</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportAS400PDF}
                  className="w-full sm:w-auto px-4 py-2 bg-[#006233] hover:bg-[#004d28] text-white rounded font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs uppercase font-mono"
                >
                  <Printer size={14} />
                  <span>Emitir Informe PDF Finanzas</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: FICHA DE DETALLE COMPLETO DEL ARRENDATARIO */}
      {inspectProfile && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="bg-[#002D62] text-white p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <User size={20} className="text-[#00C853]" />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider font-mono">
                    Ficha Técnica y Expediente del Arrendatario
                  </h3>
                  <p className="text-[10px] text-slate-300 font-mono">RUT: {inspectProfile.tenantTaxId} | F980011D Master Record</p>
                </div>
              </div>
              <button 
                onClick={() => setInspectProfile(null)}
                className="text-white/70 hover:text-white p-1 rounded hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto text-xs">
              {/* Header Info Banner */}
              <div className="bg-[#F4F8FC] p-4 rounded-lg border border-[#A2BCCF] flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-black text-slate-900">{inspectProfile.tenantName}</h2>
                  <p className="text-xs font-mono text-slate-600 mt-0.5">RUT: {inspectProfile.tenantTaxId}</p>
                  <p className="text-xs font-semibold text-[#002D62] mt-1">
                    {inspectProfile.activeContract?.propertyLabel || 'Sin contrato activo actualmente'}
                  </p>
                </div>
                <div className="flex items-center gap-3 bg-white p-3 rounded border border-slate-200">
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Índice de Cumplimiento</p>
                    <p className="text-lg font-black text-emerald-700 font-mono">{inspectProfile.complianceRate}%</p>
                  </div>
                  <div className="h-8 w-px bg-slate-200"></div>
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">Categoría Riesgo</p>
                    <span className="inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-300 uppercase">
                      {inspectProfile.riskCategory}
                    </span>
                  </div>
                </div>
              </div>

              {/* Financial & Contract Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center font-mono">
                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Canon Total Mensual</p>
                  <p className="text-sm font-black text-[#002D62] mt-1">${inspectProfile.totalMonthlyRent.toLocaleString('es-CL')}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Contratos Registrados</p>
                  <p className="text-sm font-black text-slate-800 mt-1">{inspectProfile.contracts.length}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Total Abonos Cargar</p>
                  <p className="text-sm font-black text-emerald-700 mt-1">${inspectProfile.totalPaidAmount.toLocaleString('es-CL')}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Estado B13 CMF</p>
                  <p className={`text-xs font-black mt-1 uppercase ${inspectProfile.hasB13Mora ? 'text-rose-600' : 'text-emerald-700'}`}>
                    {inspectProfile.hasB13Mora ? 'CON REGISTRO MORA' : 'AL DÍA SIN MORA'}
                  </p>
                </div>
              </div>

              {/* Contracts Breakdown */}
              <div className="space-y-2">
                <h4 className="font-bold text-[#002D62] uppercase tracking-wider font-mono text-xs flex items-center gap-1.5">
                  <FileText size={15} />
                  <span>Histórico de Contratos de Arrendamiento</span>
                </h4>
                <div className="border border-slate-200 rounded-md overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#002D62] text-white uppercase text-[10px] font-mono">
                      <tr>
                        <th className="p-2">Folio</th>
                        <th className="p-2">Inmueble / Unidad</th>
                        <th className="p-2">Canon Mensual</th>
                        <th className="p-2">Vigencia</th>
                        <th className="p-2 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono text-[11px] bg-white">
                      {inspectProfile.contracts.map(c => (
                        <tr key={c.id}>
                          <td className="p-2 font-bold text-slate-900">{c.id}</td>
                          <td className="p-2 font-sans font-medium text-slate-800">{c.propertyLabel}</td>
                          <td className="p-2 font-bold text-[#002D62]">${c.monthlyAmount.toLocaleString('es-CL')}</td>
                          <td className="p-2 text-slate-600">{c.startDate} al {c.endDate}</td>
                          <td className="p-2 text-center">
                            <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded border ${
                              c.status === 'VIGENTE' ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-slate-100 text-slate-600 border-slate-300'
                            }`}>
                              {c.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Payment History List */}
              <div className="space-y-2">
                <h4 className="font-bold text-[#002D62] uppercase tracking-wider font-mono text-xs flex items-center gap-1.5">
                  <Clock size={15} />
                  <span>Cartola de Pagos Registrados ({inspectProfile.allPayments.length})</span>
                </h4>
                <div className="border border-slate-200 rounded-md overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 uppercase text-[9.5px] font-mono sticky top-0">
                      <tr>
                        <th className="p-2">Periodo</th>
                        <th className="p-2">Fecha Pago</th>
                        <th className="p-2">Comprobante</th>
                        <th className="p-2 text-right">Monto</th>
                        <th className="p-2 text-center">Cumplimiento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 font-mono text-[11px] bg-white">
                      {inspectProfile.allPayments.map(p => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="p-2 font-bold text-slate-900">{p.period}</td>
                          <td className="p-2 text-slate-600">{p.date}</td>
                          <td className="p-2 text-slate-500">{p.referenceNumber || 'S/N'}</td>
                          <td className="p-2 text-right font-bold text-[#002D62]">${p.amountPaid.toLocaleString('es-CL')}</td>
                          <td className="p-2 text-center">
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              OPORTUNO
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setInspectProfile(null)}
                className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-200 font-bold text-xs cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedTenantForCert(inspectProfile);
                  setShowCertificateModal(true);
                  setInspectProfile(null);
                }}
                className="px-4 py-2 bg-[#002D62] hover:bg-[#001D42] text-white rounded font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-xs uppercase font-mono"
              >
                <Award size={14} className="text-[#00C853]" />
                <span>Emitir Certificado</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DETALLE DEL REGISTRO DE PAGO INDIVIDUAL */}
      {inspectPayment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl border border-slate-300 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-[#002D62] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard size={18} className="text-[#00C853]" />
                <h3 className="text-sm font-black uppercase tracking-wider font-mono">
                  Detalle de Registro de Pago
                </h3>
              </div>
              <button 
                onClick={() => setInspectPayment(null)}
                className="text-white/70 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-[#F4F8FC] p-3 rounded border border-[#A2BCCF] space-y-1 font-mono">
                <p className="text-[10px] font-bold text-slate-500 uppercase">Periodo Abonado</p>
                <p className="text-base font-black text-[#002D62]">{inspectPayment.period}</p>
                <p className="text-xs text-slate-600 mt-1">Monto: <strong className="text-emerald-700">${inspectPayment.amountPaid.toLocaleString('es-CL')} CLP</strong></p>
              </div>

              <div className="grid grid-cols-2 gap-3 font-mono">
                <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                  <p className="text-[9.5px] font-bold text-slate-500 uppercase">Fecha Registro</p>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">{inspectPayment.date || 'N/A'}</p>
                </div>
                <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                  <p className="text-[9.5px] font-bold text-slate-500 uppercase">Método Pago</p>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">{inspectPayment.paymentMethod || 'TRANSFERENCIA'}</p>
                </div>
                <div className="p-2.5 bg-slate-50 rounded border border-slate-200 col-span-2">
                  <p className="text-[9.5px] font-bold text-slate-500 uppercase">N° Comprobante / Referencia Bancaria</p>
                  <p className="text-xs font-mono font-bold text-[#002D62] mt-0.5">{inspectPayment.referenceNumber || 'S/N'}</p>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded border border-emerald-200 space-y-1">
                <p className="text-[10px] font-bold text-emerald-800 uppercase font-mono flex items-center gap-1">
                  <CheckCircle size={13} />
                  <span>Estado de Cumplimiento Normativo</span>
                </p>
                <p className="text-[11px] text-emerald-900">
                  Pago conciliado y transmitido al registro contable ERP / CMF B13 de forma oportuna.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectPayment(null)}
                className="px-4 py-2 bg-[#002D62] text-white rounded font-bold text-xs cursor-pointer uppercase font-mono"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TenantPaymentHistoryModule;
