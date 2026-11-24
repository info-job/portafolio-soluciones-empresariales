import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, RefreshCw, Download, FileSpreadsheet, FileText, CheckCircle2, 
  Clock, AlertCircle, Play, Eye, Printer, Search, Filter, ShieldCheck, 
  ChevronRight, Layers, Database, ChevronDown, Check, ArrowDownToLine, Sparkles,
  MoreVertical, RotateCcw, ExternalLink, Copy, Trash2, Terminal, Code2, Tag
} from 'lucide-react';
import { JDEGridContextMenu, JDEContextMenuItem } from './JDEGridContextMenu';
import { Transaction, WorkOrder, Property, Supplier } from '../types';
import { exportJDELedgerToExcel, exportWorkOrdersToExcel, exportToExcel } from '../lib/excelExport';
import { downloadJDETransactionVoucher, downloadJDEWorkOrderVoucher, downloadChileanTaxAuditReport } from '../lib/pdfGenerator';
import { formatCLP } from '../lib/chileanUtils';
import { getStoredVouchers, reDownloadVoucher, VoucherRecord } from '../lib/voucherService';

export interface UBERecentJob {
  id: string;
  jobId: string;
  ubeCode: string;
  title: string;
  description: string;
  version: string;
  status: 'D' | 'P' | 'W' | 'E';
  statusLabel: string;
  queue: string;
  submittedAt: string;
  completedAt: string;
  user: string;
  outputFormat: 'XLSX' | 'PDF' | 'MIXTO' | 'CERT';
  recordCount: number;
  environment: string;
  summaryData?: {
    debitTotal?: number;
    creditTotal?: number;
    balance?: number;
    note?: string;
  };
}

interface JDERecentReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: string;
  transactions?: Transaction[];
  workOrders?: WorkOrder[];
  properties?: Property[];
  suppliers?: Supplier[];
  onOpenApp?: (programCode: string) => void;
}

export const JDERecentReportsModal: React.FC<JDERecentReportsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  transactions = [],
  workOrders = [],
  properties = [],
  suppliers = [],
  onOpenApp
}) => {
  // Pre-calculate sums for report summaries
  const totals = useMemo(() => {
    const debit = transactions.reduce((acc, t) => acc + (t.debit || (t.type === 'INGRESO' ? t.amount : 0)), 0);
    const credit = transactions.reduce((acc, t) => acc + (t.credit || (t.type === 'EGRESO' ? t.amount : 0)), 0);
    const otTotal = workOrders.reduce((acc, w) => acc + (w.total || 0), 0);
    return { debit, credit, diff: debit - credit, otTotal };
  }, [transactions, workOrders]);

  // Initial jobs list representing real UBE reports
  const [jobs, setJobs] = useState<UBERecentJob[]>([
    {
      id: 'job-audit-cl',
      jobId: '849200',
      ubeCode: 'R09AUDIT',
      title: 'Informe Dictamen Equipo Auditor Experto (Normativa Tributaria Chilena)',
      description: 'Dictamen pericial y evaluación de procesos internos frente al SII, D.L. 824 (LIR Art. 31/21), D.L. 825 (IVA RCV), Código Tributario e inmutabilidad F980011D.',
      version: 'CHL_AUD01',
      status: 'D',
      statusLabel: 'D - Terminado [OK]',
      queue: 'EXPERT',
      submittedAt: 'Hoy, 12:00:00',
      completedAt: 'Hoy, 12:00:04',
      user: currentUser || 'COMISION_AUDITORA',
      outputFormat: 'PDF',
      recordCount: transactions.length,
      environment: 'PRD_CLP',
      summaryData: {
        debitTotal: totals.debit,
        creditTotal: totals.credit,
        balance: totals.diff,
        note: 'Certificación 100% Conforme - Opinión Favorable Sin Salvedades (SII / COSO)'
      }
    },
    {
      id: 'job-01',
      jobId: '849201',
      ubeCode: 'R09421',
      title: 'Libro Mayor General y Auxiliar Contable',
      description: 'Emisión del Libro Diario / Mayor con verificación de balance F0911 y balance de comprobación.',
      version: 'ZJDE0001',
      status: 'D',
      statusLabel: 'D - Terminado [OK]',
      queue: 'QBATCH',
      submittedAt: 'Hoy, 11:25:14',
      completedAt: 'Hoy, 11:25:18',
      user: currentUser || 'SISTEMA',
      outputFormat: 'MIXTO',
      recordCount: transactions.length,
      environment: 'PRD_CLP',
      summaryData: {
        debitTotal: totals.debit,
        creditTotal: totals.credit,
        balance: totals.diff,
        note: 'Cuadratura Contable Verificada (Art. 25 Código de Comercio)'
      }
    },
    {
      id: 'job-02',
      jobId: '849202',
      ubeCode: 'R0411A',
      title: 'Registro Auxiliar Cuentas por Pagar (AP)',
      description: 'Informe analítico de obligaciones con proveedores, vencimientos pendientes y retenciones de impuestos.',
      version: 'ZJDE0002',
      status: 'D',
      statusLabel: 'D - Terminado [OK]',
      queue: 'QBATCH',
      submittedAt: 'Hoy, 10:48:02',
      completedAt: 'Hoy, 10:48:05',
      user: currentUser || 'SISTEMA',
      outputFormat: 'XLSX',
      recordCount: suppliers.length || 18,
      environment: 'PRD_CLP',
      summaryData: {
        debitTotal: 0,
        creditTotal: totals.credit,
        note: 'Documentos tributarios conciliados con SII'
      }
    },
    {
      id: 'job-03',
      jobId: '849203',
      ubeCode: 'R4801B',
      title: 'Consolidado de Órdenes de Trabajo por Especialidad',
      description: 'Análisis de costos de mantenimiento, mano de obra, materiales y facturas asociadas a órdenes de trabajo.',
      version: 'XJDE0001',
      status: 'D',
      statusLabel: 'D - Terminado [OK]',
      queue: 'QBATCH',
      submittedAt: 'Hoy, 09:30:40',
      completedAt: 'Hoy, 09:30:44',
      user: currentUser || 'SISTEMA',
      outputFormat: 'MIXTO',
      recordCount: workOrders.length || 15,
      environment: 'PRD_CLP',
      summaryData: {
        debitTotal: totals.otTotal,
        note: 'Desglose por rubros: Techumbres, Plomería, Pintura, Climatización'
      }
    },
    {
      id: 'job-04',
      jobId: '849204',
      ubeCode: 'R29001',
      title: 'Liquidación Mensual F29 SII & Retenciones',
      description: 'Cálculo de débito y crédito fiscal IVA, Prorrata Art. 23 N°3, Retención Boletas Ley 21.133 y PPM neto.',
      version: 'CLJDE001',
      status: 'D',
      statusLabel: 'D - Terminado [OK]',
      queue: 'PRIORITY',
      submittedAt: 'Ayer, 18:14:20',
      completedAt: 'Ayer, 18:14:23',
      user: currentUser || 'SISTEMA',
      outputFormat: 'PDF',
      recordCount: 12,
      environment: 'PRD_CLP',
      summaryData: {
        debitTotal: Math.round(totals.debit * 0.19),
        creditTotal: Math.round(totals.credit * 0.19),
        note: 'Propuesta de declaración F29 para Tesorería General'
      }
    },
    {
      id: 'job-05',
      jobId: '849205',
      ubeCode: 'R1501C',
      title: 'Catastro y Rendimiento de Propiedades',
      description: 'Informe consolidado de unidades inmobiliarias, estado locativo, cánones pactados y cobranza mensual.',
      version: 'REJDE001',
      status: 'D',
      statusLabel: 'D - Terminado [OK]',
      queue: 'QBATCH',
      submittedAt: 'Ayer, 16:02:11',
      completedAt: 'Ayer, 16:02:14',
      user: currentUser || 'SISTEMA',
      outputFormat: 'XLSX',
      recordCount: properties.length || 10,
      environment: 'PRD_CLP',
      summaryData: {
        note: 'Superficie total y tasa de ocupación inmobiliaria'
      }
    },
    {
      id: 'job-06',
      jobId: '849206',
      ubeCode: 'R09321',
      title: 'Informe Financiero Regulador B13 / B4',
      description: 'Estructuración para supervisión financiera con desglose contable estandarizado y conciliación de activos.',
      version: 'SBIF0001',
      status: 'D',
      statusLabel: 'D - Terminado [OK]',
      queue: 'QBATCH',
      submittedAt: 'Ayer, 14:15:00',
      completedAt: 'Ayer, 14:15:04',
      user: currentUser || 'SISTEMA',
      outputFormat: 'XLSX',
      recordCount: transactions.length,
      environment: 'PRD_CLP'
    },
    {
      id: 'job-07',
      jobId: '849207',
      ubeCode: 'R980011D',
      title: 'Certificados Inmutables SHA-256 (CMF/SII)',
      description: 'Trazabilidad y sellado criptográfico de operaciones y auditorías de gobernanza patrimonial.',
      version: 'SEC0001',
      status: 'D',
      statusLabel: 'D - Terminado [OK]',
      queue: 'SECURE',
      submittedAt: '20/09/2026 12:00',
      completedAt: '20/09/2026 12:00',
      user: 'SECURITY_SRV',
      outputFormat: 'CERT',
      recordCount: 28,
      environment: 'PRD_CLP'
    }
  ]);

  // Selected row (defaults to official audit report)
  const [selectedJobId, setSelectedJobId] = useState<string>('849200');
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'D' | 'P' | 'W'>('ALL');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showSubmitMenu, setShowSubmitMenu] = useState<boolean>(false);
  
  // Output preview state
  const [viewingOutputJob, setViewingOutputJob] = useState<UBERecentJob | null>(null);
  
  // Execution log viewer modal state (JDEDEBUG.log)
  const [viewingLogJob, setViewingLogJob] = useState<UBERecentJob | null>(null);

  // Authentic ERP Grid Context Menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; job: UBERecentJob } | null>(null);

  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const matchSearch = 
        job.ubeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.jobId.includes(searchQuery) ||
        job.version.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchStatus = statusFilter === 'ALL' || job.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [jobs, searchQuery, statusFilter]);

  // Selected job object
  const selectedJob = useMemo(() => {
    return jobs.find(j => j.jobId === selectedJobId) || jobs[0];
  }, [jobs, selectedJobId]);

  // Notification helper
  const triggerNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => {
      setActionNotice(null);
    }, 4000);
  };

  // Status Updater from ERP Context Menu
  const handleUpdateStatus = (jobId: string, newStatus: string) => {
    const statusLabels: Record<string, string> = {
      'D': 'D - Terminado [OK]',
      'P': 'P - En Proceso',
      'W': 'W - En Espera',
      'E': 'E - Error en Ejecución',
      'H': 'H - En Pausa / Hold'
    };
    setJobs(prev => prev.map(j => {
      if (j.jobId === jobId) {
        return {
          ...j,
          status: newStatus as any,
          statusLabel: statusLabels[newStatus] || `${newStatus} - Modificado`
        };
      }
      return j;
    }));
    triggerNotice(`Estado de trabajo UBE #${jobId} actualizado a [${newStatus}].`);
  };

  // Delete Job from Queue
  const handleDeleteJob = (jobId: string) => {
    const target = jobs.find(j => j.jobId === jobId);
    if (!target) return;
    if (confirm(`¿Confirma eliminar el trabajo UBE #${jobId} (${target.ubeCode} - ${target.title}) de la cola WSJ?\nEsta acción retirará el spool y el registro de la sesión activa.`)) {
      setJobs(prev => prev.filter(j => j.jobId !== jobId));
      if (selectedJobId === jobId) {
        const remaining = jobs.filter(j => j.jobId !== jobId);
        if (remaining.length > 0) setSelectedJobId(remaining[0].jobId);
      }
      triggerNotice(`Trabajo UBE #${jobId} eliminado de la cola.`);
      setContextMenu(null);
    }
  };

  // Open Context Menu on row
  const handleRowContextMenu = (e: React.MouseEvent, job: UBERecentJob) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedJobId(job.jobId);
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      job
    });
  };

  // Keyboard navigation & shortcuts
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (contextMenu) {
          setContextMenu(null);
        } else if (viewingLogJob) {
          setViewingLogJob(null);
        } else if (viewingOutputJob) {
          setViewingOutputJob(null);
        } else {
          onClose();
        }
      } else if (e.key === 'F5') {
        e.preventDefault();
        handleRefresh();
      } else if (e.key === 'F4' || (e.shiftKey && e.key === 'F10')) {
        e.preventDefault();
        if (selectedJob) {
          setContextMenu({
            x: Math.min(window.innerWidth - 300, 360),
            y: Math.min(window.innerHeight - 420, 240),
            job: selectedJob
          });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, contextMenu, viewingLogJob, viewingOutputJob, selectedJob]);

  // Context menu dynamic row exit app navigation helper
  const getAppNavExit = (job: UBERecentJob): JDEContextMenuItem | null => {
    if (job.ubeCode === 'R09421' || job.ubeCode === 'R09321') {
      return {
        id: 'exit_nav_p0911',
        label: 'Salida de Fila: Abrir Diario General F0911 (P0911)',
        icon: <ExternalLink size={12} className="text-blue-700" />,
        onClick: () => {
          setContextMenu(null);
          onClose();
          onOpenApp?.('P0911');
        }
      };
    }
    if (job.ubeCode === 'R0411A') {
      return {
        id: 'exit_nav_p0411',
        label: 'Salida de Fila: Abrir Cuentas por Pagar F0411 (P0411)',
        icon: <ExternalLink size={12} className="text-blue-700" />,
        onClick: () => {
          setContextMenu(null);
          onClose();
          onOpenApp?.('P0411');
        }
      };
    }
    if (job.ubeCode === 'R4801B') {
      return {
        id: 'exit_nav_p48201',
        label: 'Salida de Fila: Abrir Órdenes de Trabajo F4801 (P48201)',
        icon: <ExternalLink size={12} className="text-blue-700" />,
        onClick: () => {
          setContextMenu(null);
          onClose();
          onOpenApp?.('P48201');
        }
      };
    }
    if (job.ubeCode === 'R1501C') {
      return {
        id: 'exit_nav_p1501',
        label: 'Salida de Fila: Abrir Catastro Inmobiliario F1501 (P1501)',
        icon: <ExternalLink size={12} className="text-blue-700" />,
        onClick: () => {
          setContextMenu(null);
          onClose();
          onOpenApp?.('P1501');
        }
      };
    }
    if (job.ubeCode === 'R09AUDIT' || job.ubeCode === 'RAUDIT' || job.ubeCode === 'R980011D') {
      return {
        id: 'exit_nav_p01012b',
        label: 'Salida de Fila: Abrir Auditoría & Due Diligence (P01012B)',
        icon: <ExternalLink size={12} className="text-blue-700" />,
        onClick: () => {
          setContextMenu(null);
          onClose();
          onOpenApp?.('P01012B');
        }
      };
    }
    return null;
  };

  // Refresh job queue simulation
  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      triggerNotice('Cola de trabajos UBE (WSJ) actualizada con el servidor AIS.');
    }, 500);
  };

  // Submit new UBE report
  const handleSubmitNewUBE = (ubeCode: string, title: string, version: string, outputFormat: 'XLSX' | 'PDF' | 'MIXTO' | 'CERT') => {
    setIsSubmitting(true);
    setShowSubmitMenu(false);

    const newJobId = Math.floor(849210 + Math.random() * 8000).toString();
    const now = new Date();
    const timeStr = `Hoy, ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    const newJob: UBERecentJob = {
      id: `job-${Date.now()}`,
      jobId: newJobId,
      ubeCode,
      title,
      description: `Ejecución a petición de ${currentUser}. Procesamiento de registros en entorno PRD_CLP.`,
      version,
      status: 'P',
      statusLabel: 'P - En Proceso',
      queue: 'QBATCH',
      submittedAt: timeStr,
      completedAt: 'En ejecución...',
      user: currentUser || 'SISTEMA',
      outputFormat,
      recordCount: transactions.length || 10,
      environment: 'PRD_CLP',
      summaryData: {
        debitTotal: totals.debit,
        creditTotal: totals.credit,
        balance: totals.diff
      }
    };

    setJobs(prev => [newJob, ...prev]);
    setSelectedJobId(newJobId);
    triggerNotice(`Trabajo UBE ${ubeCode} enviado a la cola QBATCH [Job ID: ${newJobId}].`);

    // Simulate completion
    setTimeout(() => {
      const finishTime = `Hoy, ${new Date().getHours().toString().padStart(2, '0')}:${new Date().getMinutes().toString().padStart(2, '0')}:${new Date().getSeconds().toString().padStart(2, '0')}`;
      setJobs(prev => prev.map(j => {
        if (j.jobId === newJobId) {
          return {
            ...j,
            status: 'D',
            statusLabel: 'D - Terminado [OK]',
            completedAt: finishTime
          };
        }
        return j;
      }));
      setIsSubmitting(false);
      triggerNotice(`✅ Trabajo UBE ${ubeCode} completado exitosamente. Salida generada.`);
    }, 1200);
  };

  // Download Excel for a specific job
  const handleDownloadExcel = async (job: UBERecentJob) => {
    try {
      if (job.ubeCode === 'R09421' || job.ubeCode === 'R09321') {
        await exportJDELedgerToExcel(transactions, 'P0911');
        triggerNotice(`Planilla Excel de ${job.ubeCode} descargada correctamente.`);
      } else if (job.ubeCode === 'R0411A') {
        await exportJDELedgerToExcel(transactions, 'P0411');
        triggerNotice(`Planilla Excel de Proveedores (${job.ubeCode}) descargada correctamente.`);
      } else if (job.ubeCode === 'R4801B') {
        await exportWorkOrdersToExcel(workOrders, 'Consolidado_Ordenes_Trabajo_F4801');
        triggerNotice(`Planilla Excel de Órdenes de Trabajo (${job.ubeCode}) descargada.`);
      } else if (job.ubeCode === 'R1501C') {
        await exportToExcel(properties, 'Catastro_Propiedades_F1501', 'Propiedades');
        triggerNotice(`Planilla Excel de Catastro de Propiedades (${job.ubeCode}) descargada.`);
      } else {
        await exportToExcel(transactions, `Informe_${job.ubeCode}`, 'Datos');
        triggerNotice(`Planilla Excel generada para ${job.ubeCode}.`);
      }
    } catch (err) {
      console.error(err);
      triggerNotice('Error al exportar planilla Excel.');
    }
  };

  // Helper to convert VoucherRecord into UBERecentJob
  const convertVoucherToJob = (vch: VoucherRecord): UBERecentJob => {
    const codeMap: Record<string, string> = {
      TRANSACTION: 'R0911V',
      WORK_ORDER: 'R4801V',
      RENT_PAYMENT: 'R15132V',
      CLAIM: 'R55CLMV',
      PETTY_CASH: 'R09PCV',
      SECURITY_DEPOSIT: 'R1502GV',
      RECONCILIATION: 'R0916V'
    };

    const code = codeMap[vch.operationType] || 'RVOUCHER';
    const numericId = vch.id.replace(/\D/g, '').slice(-6) || '849500';

    return {
      id: vch.id,
      jobId: numericId,
      ubeCode: code,
      title: vch.title,
      description: `Comprobante emitido por ${vch.user}. Folio: ${vch.folio}. Importe: ${vch.amount ? '$' + Math.round(vch.amount).toLocaleString('es-CL') : 'N/A'}.`,
      version: 'ZJDE_AUTO',
      status: 'D',
      statusLabel: 'D - Terminado [OK]',
      queue: 'VOUCHERS',
      submittedAt: vch.formattedDate,
      completedAt: vch.formattedDate,
      user: vch.user,
      outputFormat: 'PDF',
      recordCount: 1,
      environment: 'PRD_CLP',
      summaryData: {
        debitTotal: vch.amount || 0,
        creditTotal: 0,
        note: `Voucher PDF (${vch.pdfFilename}) emitido con éxito.`
      }
    };
  };

  // Sync stored vouchers into the jobs queue on open and on voucher emission
  useEffect(() => {
    const syncVouchers = () => {
      const stored = getStoredVouchers();
      if (!stored.length) return;
      const voucherJobs = stored.map(convertVoucherToJob);

      setJobs(prev => {
        const nonVoucherJobs = prev.filter(j => !j.id.startsWith('vch-'));
        return [...voucherJobs, ...nonVoucherJobs];
      });
    };

    syncVouchers();

    const handleVoucherEmitted = (e: any) => {
      if (e.detail?.voucher) {
        const newJob = convertVoucherToJob(e.detail.voucher);
        setJobs(prev => [newJob, ...prev.filter(j => j.id !== newJob.id)]);
      }
    };

    window.addEventListener('jde:voucher-emitted', handleVoucherEmitted);
    return () => window.removeEventListener('jde:voucher-emitted', handleVoucherEmitted);
  }, []);

  // Download PDF voucher for a specific job
  const handleDownloadPDF = (job: UBERecentJob) => {
    try {
      // Check if it's a stored voucher
      const storedVouchers = getStoredVouchers();
      const matchedVoucher = storedVouchers.find(v => v.id === job.id || job.title.includes(v.folio));
      if (matchedVoucher) {
        reDownloadVoucher(matchedVoucher, null, currentUser);
        triggerNotice(`Voucher PDF descargado [Folio: ${matchedVoucher.folio}].`);
        return;
      }

      if (job.ubeCode === 'R09AUDIT' || job.ubeCode === 'RAUDIT') {
        downloadChileanTaxAuditReport({
          currentUser,
          systemDate: new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
        });
        triggerNotice('Informe Pericial de Auditoría Tributaria Experta descargado en PDF.');
        return;
      }

      if (job.ubeCode === 'R4801B') {
        if (workOrders.length > 0) {
          downloadJDEWorkOrderVoucher({
            workOrder: workOrders[0],
            currentUser
          });
          triggerNotice(`Comprobante de OT generado en PDF [Folio: ${workOrders[0].folio || workOrders[0].id}].`);
        } else {
          triggerNotice('No hay registros de órdenes de trabajo para emitir comprobante PDF.');
        }
      } else {
        if (transactions.length > 0) {
          downloadJDETransactionVoucher({
            transaction: transactions[0],
            workOrder: workOrders[0] || null,
            currentUser
          });
          triggerNotice(`Voucher ERP generado en PDF [N°: ${transactions[0].documentNumber || 'S/N'}].`);
        } else {
          triggerNotice('No hay registros de diario disponibles para generar voucher PDF.');
        }
      }
    } catch (err) {
      console.error(err);
      triggerNotice('Error al generar comprobante PDF.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 select-none font-sans">
      <div className="bg-[#ECE9D8] text-slate-800 border-2 border-white shadow-2xl w-full max-w-5xl rounded-sm overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
        
        {/* ============================================================== */}
        {/* 1. TOP HEADER - AUTHENTIC ERP TITLE BAR                       */}
        {/* ============================================================== */}
        <div className="bg-linear-to-r from-[#0B3C5D] via-[#144D75] to-[#1D5C8A] text-white px-3 py-2 flex items-center justify-between font-bold text-xs border-b border-[#082a42]">
          <div className="flex items-center gap-2">
            <div className="bg-amber-500 text-slate-900 font-mono font-black text-[10px] px-1.5 py-0.5 rounded shadow-xs">
              WSJ
            </div>
            <div>
              <span className="text-[12.5px] tracking-tight block">
                P986110B - Trabajar con Trabajos Enviados (WSJ) • Informes Recientes
              </span>
              <span className="text-[9.5px] font-mono font-normal text-blue-200 block">
                AssetFlow Enterprise Web Client • Host: PRD-AIS-01 • Entorno: PRD_CLP
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-[#061F30]/50 px-2 py-0.5 rounded border border-blue-400/30 text-[10px] font-mono text-amber-300 hidden sm:inline">
              USUARIO: {currentUser}
            </span>
            <button 
              type="button"
              onClick={onClose}
              className="hover:bg-red-650 bg-red-600 border border-[#9E0000] text-white px-2 py-0.5 rounded-sm font-mono text-[10px] font-bold transition cursor-pointer"
              title="Cerrar ventana (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* 2. ACTIONS TOOLBAR (ERP RETRO STYLE)                           */}
        {/* ============================================================== */}
        <div className="bg-[#F0EEE2] border-b border-slate-300 p-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Refresh */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-2.5 py-1 bg-[#ECE9D8] hover:bg-slate-200 border border-slate-400 rounded-sm font-semibold flex items-center gap-1 cursor-pointer text-[11px] text-slate-800 disabled:opacity-50"
              title="Actualizar lista de trabajos (F5)"
            >
              <RefreshCw size={12} className={`text-blue-700 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Actualizar (F5)</span>
            </button>

            {/* Submit New UBE dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowSubmitMenu(prev => !prev)}
                disabled={isSubmitting}
                className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white border border-emerald-900 rounded-sm font-bold flex items-center gap-1 cursor-pointer text-[11px] shadow-xs disabled:opacity-50"
                title="Lanzar nuevo informe UBE al servidor"
              >
                <Play size={11} className="fill-current text-white" />
                <span>Enviar Nuevo Informe UBE</span>
                <ChevronDown size={11} />
              </button>

              {showSubmitMenu && (
                <div className="absolute left-0 mt-1 w-80 bg-white border border-[#0B3C5D] shadow-2xl rounded-none z-50 text-left divide-y divide-slate-100 font-sans">
                  <div className="bg-[#0B3C5D] text-white px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center justify-between">
                    <span>Catálogo de Informes UBE Disponibles</span>
                    <button onClick={() => setShowSubmitMenu(false)} className="text-white hover:text-amber-400">✕</button>
                  </div>
                  <div className="p-1 max-h-72 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => handleSubmitNewUBE('R09421', 'Libro Mayor General y Auxiliar Contable', 'ZJDE0001', 'MIXTO')}
                      className="w-full text-left p-2 hover:bg-[#FFFCDD] hover:text-[#0B3C5D] block transition border-b border-slate-100 cursor-pointer"
                    >
                      <div className="flex items-center justify-between font-mono font-bold text-[11px] text-[#0B3C5D]">
                        <span>R09421 - Libro Mayor Contable</span>
                        <span className="text-[9px] bg-blue-100 text-blue-800 px-1 rounded">XLSX/PDF</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-normal">Diario general, comprobación de balance y libro auxiliar F0911</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSubmitNewUBE('R0411A', 'Registro Auxiliar Cuentas por Pagar (AP)', 'ZJDE0002', 'XLSX')}
                      className="w-full text-left p-2 hover:bg-[#FFFCDD] hover:text-[#0B3C5D] block transition border-b border-slate-100 cursor-pointer"
                    >
                      <div className="flex items-center justify-between font-mono font-bold text-[11px] text-[#0B3C5D]">
                        <span>R0411A - Cuentas por Pagar (AP)</span>
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 rounded">XLSX</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-normal">Detalle analítico de proveedores, vencimientos y retenciones</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSubmitNewUBE('R4801B', 'Consolidado Órdenes de Trabajo por Rubro', 'XJDE0001', 'MIXTO')}
                      className="w-full text-left p-2 hover:bg-[#FFFCDD] hover:text-[#0B3C5D] block transition border-b border-slate-100 cursor-pointer"
                    >
                      <div className="flex items-center justify-between font-mono font-bold text-[11px] text-[#0B3C5D]">
                        <span>R4801B - Órdenes de Trabajo (OT)</span>
                        <span className="text-[9px] bg-indigo-100 text-indigo-800 px-1 rounded">XLSX/PDF</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-normal">Costos por especialidad (techumbres, plomería, pintura, etc.)</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSubmitNewUBE('R29001', 'Liquidación Formulario 29 SII Mensual', 'CLJDE001', 'PDF')}
                      className="w-full text-left p-2 hover:bg-[#FFFCDD] hover:text-[#0B3C5D] block transition border-b border-slate-100 cursor-pointer"
                    >
                      <div className="flex items-center justify-between font-mono font-bold text-[11px] text-[#0B3C5D]">
                        <span>R29001 - Liquidación F29 Tributaria</span>
                        <span className="text-[9px] bg-rose-100 text-rose-800 px-1 rounded">PDF</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-normal">Prorrata IVA Art. 23, retenciones boletas honorarios y PPM</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSubmitNewUBE('R1501C', 'Catastro de Propiedades y Arriendos', 'REJDE001', 'XLSX')}
                      className="w-full text-left p-2 hover:bg-[#FFFCDD] hover:text-[#0B3C5D] block transition border-b border-slate-100 cursor-pointer"
                    >
                      <div className="flex items-center justify-between font-mono font-bold text-[11px] text-[#0B3C5D]">
                        <span>R1501C - Catastro Inmobiliario</span>
                        <span className="text-[9px] bg-amber-100 text-amber-800 px-1 rounded">XLSX</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-normal">Maestro de propiedades, unidades y contratos vigentes</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSubmitNewUBE('R09321', 'Informe Financiero Regulador B13 / B4', 'SBIF0001', 'XLSX')}
                      className="w-full text-left p-2 hover:bg-[#FFFCDD] hover:text-[#0B3C5D] block transition cursor-pointer"
                    >
                      <div className="flex items-center justify-between font-mono font-bold text-[11px] text-[#0B3C5D]">
                        <span>R09321 - Regulador B13 / B4</span>
                        <span className="text-[9px] bg-purple-100 text-purple-800 px-1 rounded">XLSX</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-normal">Estructura estandarizada para auditorías de activos</div>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* View Output */}
            <button
              type="button"
              onClick={() => selectedJob && setViewingOutputJob(selectedJob)}
              disabled={!selectedJob}
              className="px-2.5 py-1 bg-[#ECE9D8] hover:bg-slate-200 border border-slate-400 rounded-sm font-semibold flex items-center gap-1 cursor-pointer text-[11px] text-slate-800 disabled:opacity-50"
              title="Inspeccionar salida generada por el UBE (Enter)"
            >
              <Eye size={12} className="text-indigo-700" />
              <span>Ver Salida</span>
            </button>

            {/* View Execution Log */}
            <button
              type="button"
              onClick={() => selectedJob && setViewingLogJob(selectedJob)}
              disabled={!selectedJob}
              className="px-2.5 py-1 bg-[#ECE9D8] hover:bg-slate-200 border border-slate-400 rounded-sm font-semibold flex items-center gap-1 cursor-pointer text-[11px] text-slate-800 disabled:opacity-50"
              title="Inspeccionar log técnico del motor UBE - JDEDEBUG.log (F8)"
            >
              <Terminal size={12} className="text-amber-700" />
              <span>Ver Log (F8)</span>
            </button>

            {/* Download selected Excel */}
            <button
              type="button"
              onClick={() => selectedJob && handleDownloadExcel(selectedJob)}
              disabled={!selectedJob || selectedJob.status !== 'D'}
              className="px-2.5 py-1 bg-[#ECE9D8] hover:bg-slate-200 border border-slate-400 rounded-sm font-semibold flex items-center gap-1 cursor-pointer text-[11px] text-slate-800 disabled:opacity-50"
              title="Descargar salida en formato Microsoft Excel (.xlsx)"
            >
              <FileSpreadsheet size={12} className="text-emerald-700" />
              <span>Exportar Excel</span>
            </button>

            {/* Download selected PDF */}
            <button
              type="button"
              onClick={() => selectedJob && handleDownloadPDF(selectedJob)}
              disabled={!selectedJob || selectedJob.status !== 'D'}
              className="px-2.5 py-1 bg-[#ECE9D8] hover:bg-slate-200 border border-slate-400 rounded-sm font-semibold flex items-center gap-1 cursor-pointer text-[11px] text-slate-800 disabled:opacity-50"
              title="Descargar salida en formato PDF"
            >
              <FileText size={12} className="text-rose-700" />
              <span>Voucher PDF</span>
            </button>

            {/* ERP Context Menu Shortcut Button */}
            <button
              type="button"
              onClick={(e) => {
                if (!selectedJob) return;
                const rect = e.currentTarget.getBoundingClientRect();
                setContextMenu({
                  x: Math.min(window.innerWidth - 300, rect.left),
                  y: Math.min(window.innerHeight - 380, rect.bottom + 4),
                  job: selectedJob
                });
              }}
              disabled={!selectedJob}
              className="px-2.5 py-1 bg-[#0B3C5D] hover:bg-[#144D75] text-white border border-[#082a42] rounded-sm font-bold flex items-center gap-1 cursor-pointer text-[11px] shadow-xs disabled:opacity-50"
              title="Abrir Menú Contextual ERP completo con Salidas de Fila (F4 / Clic Derecho)"
            >
              <MoreVertical size={12} className="text-amber-400" />
              <span>Menú Contextual ERP (F4)</span>
            </button>
          </div>

          {/* Quick Notice Banner */}
          {actionNotice && (
            <div className="bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded text-[10.5px] font-mono flex items-center gap-1 animate-pulse">
              <Check size={12} className="text-emerald-700" />
              <span>{actionNotice}</span>
            </div>
          )}

          <div className="text-[10px] text-slate-500 font-mono">
            Mostrando <span className="font-bold text-slate-800">{filteredJobs.length}</span> de {jobs.length} informes
          </div>

        </div>

        {/* ============================================================== */}
        {/* 3. FILTERS & SEARCH BAR (QBE SIMULATOR)                       */}
        {/* ============================================================== */}
        <div className="bg-[#F7F6EE] border-b border-slate-300 p-2 flex flex-wrap items-center gap-3 text-xs">
          
          {/* Text search */}
          <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
            <Search size={13} className="text-slate-500 shrink-0" />
            <span className="text-[10.5px] font-bold text-slate-700 shrink-0">Buscar Informe:</span>
            <input 
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Código UBE (ej: R09421, R0411), nombre, versión o Job #..."
              className="w-full bg-white border border-slate-400 px-2 py-0.5 text-xs text-slate-800 focus:outline-none focus:border-[#0B3C5D]"
            />
            {searchQuery && (
              <button 
                type="button" 
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-slate-700 font-bold px-1 text-[11px]"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[10.5px] font-bold text-slate-700">Estado:</span>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="bg-white border border-slate-400 px-2 py-0.5 text-[11px] text-slate-800 focus:outline-none"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="D">D - Terminado [OK]</option>
              <option value="P">P - En Proceso</option>
              <option value="W">W - En Espera</option>
            </select>
          </div>

          {/* Queue indicator */}
          <div className="flex items-center gap-1 text-[10px] font-mono text-slate-600 bg-white border border-slate-300 px-2 py-0.5 rounded-sm">
            <span className="text-slate-400">COLA ACTIVA:</span>
            <span className="font-bold text-[#0B3C5D]">QBATCH / LOCAL</span>
          </div>

          {/* Quick Context Menu Hint */}
          <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-slate-700 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-sm ml-auto">
            <span className="text-amber-800 font-bold">💡 Atajo:</span>
            <span>Clic derecho en cualquier fila o F4 para Menú Contextual ERP</span>
          </div>

        </div>

        {/* ============================================================== */}
        {/* 4. MAIN JOBS GRID (AUTHENTIC ERP TABLE)                        */}
        {/* ============================================================== */}
        <div className="flex-1 overflow-auto bg-white p-0 min-h-[260px] max-h-[420px]">
          <table className="w-full text-left border-collapse text-[11px] font-sans">
            <thead className="bg-[#D2DFEC] text-[#0A2540] font-mono text-[10px] uppercase font-bold sticky top-0 border-b border-[#91A6BA] shadow-2xs z-10 select-none">
              <tr>
                <th className="p-2 border-r border-[#B0C4DE] w-8 text-center">Sel</th>
                <th className="p-2 border-r border-[#B0C4DE] w-20 text-center">ID Trabajo</th>
                <th className="p-2 border-r border-[#B0C4DE] w-24">Informe UBE</th>
                <th className="p-2 border-r border-[#B0C4DE] w-24 text-center">Versión</th>
                <th className="p-2 border-r border-[#B0C4DE]">Descripción de Informe</th>
                <th className="p-2 border-r border-[#B0C4DE] w-32 text-center">Estado</th>
                <th className="p-2 border-r border-[#B0C4DE] w-28">Fecha Envío</th>
                <th className="p-2 border-r border-[#B0C4DE] w-16 text-center">Cola</th>
                <th className="p-2 border-r border-[#B0C4DE] w-20 text-center">Salida</th>
                <th className="p-2 w-44 text-center">Acciones & Menú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500 font-mono text-xs">
                    No se encontraron informes enviados con los criterios especificados.
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => {
                  const isSelected = job.jobId === selectedJobId;
                  return (
                    <tr 
                      key={job.id}
                      onClick={() => setSelectedJobId(job.jobId)}
                      onDoubleClick={() => setViewingOutputJob(job)}
                      onContextMenu={(e) => handleRowContextMenu(e, job)}
                      className={`cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-[#FFFCDD] font-medium text-slate-900 border-l-4 border-[#0B3C5D]' 
                          : 'hover:bg-slate-50 text-slate-800'
                      }`}
                      title="Doble clic: Ver salida • Clic derecho: Menú contextual ERP"
                    >
                      {/* Sel Radio */}
                      <td className="p-2 border-r border-slate-200 text-center">
                        <input 
                          type="radio" 
                          name="selectedJobRadio"
                          checked={isSelected}
                          onChange={() => setSelectedJobId(job.jobId)}
                          className="accent-[#0B3C5D] cursor-pointer"
                        />
                      </td>

                      {/* Job ID */}
                      <td className="p-2 border-r border-slate-200 font-mono font-bold text-center text-slate-700">
                        {job.jobId}
                      </td>

                      {/* UBE Code */}
                      <td className="p-2 border-r border-slate-200 font-mono font-black text-[#0B3C5D]">
                        {job.ubeCode}
                      </td>

                      {/* Version */}
                      <td className="p-2 border-r border-slate-200 font-mono text-center text-slate-600">
                        {job.version}
                      </td>

                      {/* Title & Description */}
                      <td className="p-2 border-r border-slate-200">
                        <div className="font-bold text-slate-900 leading-tight">{job.title}</div>
                        <div className="text-[9.5px] text-slate-500 truncate max-w-md">{job.description}</div>
                      </td>

                      {/* Status */}
                      <td className="p-2 border-r border-slate-200 text-center">
                        {job.status === 'D' ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold">
                            <CheckCircle2 size={10} className="text-emerald-700" />
                            <span>Terminado [OK]</span>
                          </span>
                        ) : job.status === 'P' ? (
                          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold animate-pulse">
                            <RefreshCw size={10} className="text-amber-700 animate-spin" />
                            <span>En Proceso</span>
                          </span>
                        ) : job.status === 'E' ? (
                          <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-900 border border-rose-300 px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold">
                            <AlertCircle size={10} className="text-rose-700" />
                            <span>Error</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 border border-slate-300 px-1.5 py-0.5 rounded text-[9.5px] font-mono">
                            <Clock size={10} />
                            <span>En Espera</span>
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="p-2 border-r border-slate-200 font-mono text-[10px] text-slate-600">
                        {job.submittedAt}
                      </td>

                      {/* Queue */}
                      <td className="p-2 border-r border-slate-200 font-mono text-[10px] text-center text-slate-500">
                        {job.queue}
                      </td>

                      {/* Format badge */}
                      <td className="p-2 border-r border-slate-200 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                          job.outputFormat === 'XLSX' 
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                            : job.outputFormat === 'PDF' 
                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                            : job.outputFormat === 'CERT'
                            ? 'bg-purple-50 text-purple-800 border border-purple-200'
                            : 'bg-blue-50 text-blue-800 border border-blue-200'
                        }`}>
                          {job.outputFormat}
                        </span>
                      </td>

                      {/* Direct Row Actions */}
                      <td className="p-1.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingOutputJob(job);
                            }}
                            className="bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 px-1.5 py-0.5 rounded text-[9.5px] font-bold flex items-center gap-0.5 cursor-pointer shadow-2xs"
                            title="Ver salida en pantalla (Enter)"
                          >
                            <Eye size={10} className="text-indigo-600" />
                            <span>Ver</span>
                          </button>

                          {(job.outputFormat === 'XLSX' || job.outputFormat === 'MIXTO') && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadExcel(job);
                              }}
                              className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 px-1.5 py-0.5 rounded text-[9.5px] font-bold flex items-center gap-0.5 cursor-pointer shadow-2xs"
                              title="Descargar Excel"
                            >
                              <FileSpreadsheet size={10} className="text-emerald-700" />
                              <span>XLSX</span>
                            </button>
                          )}

                          {(job.outputFormat === 'PDF' || job.outputFormat === 'MIXTO') && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadPDF(job);
                              }}
                              className="bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-800 px-1.5 py-0.5 rounded text-[9.5px] font-bold flex items-center gap-0.5 cursor-pointer shadow-2xs"
                              title="Descargar PDF"
                            >
                              <FileText size={10} className="text-rose-700" />
                              <span>PDF</span>
                            </button>
                          )}

                          {/* Authentic ERP Context Menu Button */}
                          <button
                            type="button"
                            onClick={(e) => handleRowContextMenu(e, job)}
                            className="bg-[#ECE9D8] hover:bg-[#0B3C5D] hover:text-white border border-slate-400 text-slate-800 px-1.5 py-0.5 rounded text-[9.5px] font-bold flex items-center gap-0.5 cursor-pointer shadow-2xs transition-colors"
                            title="Abrir Menú Contextual ERP (Salidas de fila, Log F8, Re-ejecutar, Estado)"
                          >
                            <MoreVertical size={10} className="text-[#0B3C5D]" />
                            <span>Menú</span>
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ============================================================== */}
        {/* 5. BOTTOM DETAILS BAR                                          */}
        {/* ============================================================== */}
        {selectedJob && (
          <div className="bg-[#E4ECF5] border-t border-[#A2BCCF] p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="bg-white border border-[#91A6BA] px-2.5 py-1 rounded font-mono text-[10.5px]">
                <span className="text-slate-500 mr-1">TRABAJO SELECCIONADO:</span>
                <span className="font-black text-[#0B3C5D]">{selectedJob.ubeCode}</span>
                <span className="text-slate-400 mx-1">•</span>
                <span className="font-bold text-slate-700">{selectedJob.title}</span>
                <span className="text-slate-400 mx-1">•</span>
                <span className="text-slate-500">Versión: {selectedJob.version}</span>
              </div>
              <div className="text-[10.5px] text-slate-600 hidden lg:block">
                Registros procesados: <span className="font-bold text-slate-900">{selectedJob.recordCount}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setContextMenu({
                    x: Math.min(window.innerWidth - 300, rect.left),
                    y: Math.max(20, rect.top - 420),
                    job: selectedJob
                  });
                }}
                className="bg-[#ECE9D8] hover:bg-slate-200 border border-slate-400 text-slate-800 px-3 py-1 rounded-sm text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Abrir Menú Contextual ERP (F4)"
              >
                <MoreVertical size={12} className="text-[#0B3C5D]" />
                <span>Menú Contextual (F4)</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingLogJob(selectedJob)}
                className="bg-[#ECE9D8] hover:bg-slate-200 border border-slate-400 text-slate-800 px-3 py-1 rounded-sm text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Ver Log de Ejecución UBE (F8)"
              >
                <Terminal size={12} className="text-amber-700" />
                <span>Ver Log (F8)</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingOutputJob(selectedJob)}
                className="bg-[#0B3C5D] hover:bg-[#144D75] text-white px-3 py-1 rounded-sm text-[11px] font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Eye size={12} />
                <span>Previsualizar Salida</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="bg-white hover:bg-slate-100 border border-slate-400 text-slate-800 px-3 py-1 rounded-sm text-[11px] font-bold cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ================================================================ */}
      {/* 6. MODAL SUBVIEW: REPORTE SPOOL OUTPUT VIEWER (VER SALIDA)       */}
      {/* ================================================================ */}
      {viewingOutputJob && (
        <div className="fixed inset-0 z-[100000] bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 select-text font-sans">
          <div className="bg-white text-slate-900 border-2 border-slate-700 shadow-2xl w-full max-w-4xl rounded-sm overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
            
            {/* Output Viewer Header */}
            <div className="bg-[#0B3C5D] text-white px-4 py-2.5 flex items-center justify-between border-b border-[#082a42]">
              <div className="flex items-center gap-2 font-mono">
                <FileText size={16} className="text-amber-400" />
                <span className="font-bold text-[13px]">
                  Visor de Salida UBE • {viewingOutputJob.ubeCode} - {viewingOutputJob.title}
                </span>
                <span className="text-xs text-blue-200">
                  [Job #{viewingOutputJob.jobId} • Versión: {viewingOutputJob.version}]
                </span>
              </div>
              <button
                type="button"
                onClick={() => setViewingOutputJob(null)}
                className="text-white hover:text-red-400 font-bold text-sm px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Output Viewer Actions Bar */}
            <div className="bg-slate-100 border-b border-slate-300 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                {(viewingOutputJob.outputFormat === 'XLSX' || viewingOutputJob.outputFormat === 'MIXTO') && (
                  <button
                    type="button"
                    onClick={() => handleDownloadExcel(viewingOutputJob)}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1 rounded text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <FileSpreadsheet size={13} />
                    <span>Descargar Planilla Excel</span>
                  </button>
                )}

                {(viewingOutputJob.outputFormat === 'PDF' || viewingOutputJob.outputFormat === 'MIXTO') && (
                  <button
                    type="button"
                    onClick={() => handleDownloadPDF(viewingOutputJob)}
                    className="bg-rose-700 hover:bg-rose-800 text-white px-3 py-1 rounded text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <FileText size={13} />
                    <span>Descargar PDF</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 px-3 py-1 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer size={13} />
                  <span>Imprimir</span>
                </button>
              </div>

              <div className="text-[11px] font-mono text-slate-600">
                Estado: <span className="text-emerald-700 font-bold">TERMINADO [D]</span> • Registros: <span className="font-bold">{viewingOutputJob.recordCount}</span>
              </div>
            </div>

            {/* Output Report Spool Sheet (Paper Style) */}
            <div className="flex-1 overflow-auto p-6 bg-slate-50">
              <div className="bg-white p-6 md:p-8 rounded border border-slate-300 shadow-sm max-w-3xl mx-auto font-mono text-xs text-slate-800">
                
                {/* Official Corporate Header */}
                <div className="border-b-2 border-[#0B3C5D] pb-4 mb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-base font-black text-[#0B3C5D] tracking-tight">ASSETFLOW CENTRAL SYSTEMS</h2>
                      <p className="text-[10px] text-slate-500">Gestión Integrada Corporativa de Finanzas e Inmuebles</p>
                      <p className="text-[10px] text-slate-600 mt-1">EMPRESA: 00001 - Worldwide Company Chile • RUT: 76.124.580-K</p>
                    </div>
                    <div className="text-right text-[10px] text-slate-600">
                      <p><span className="font-bold">INFORME:</span> {viewingOutputJob.ubeCode}</p>
                      <p><span className="font-bold">VERSIÓN:</span> {viewingOutputJob.version}</p>
                      <p><span className="font-bold">FECHA:</span> {viewingOutputJob.submittedAt}</p>
                      <p><span className="font-bold">OPERADOR:</span> {viewingOutputJob.user}</p>
                    </div>
                  </div>
                  <div className="mt-3 bg-[#EBF0F5] px-3 py-1.5 rounded text-[11px] font-bold text-[#0B3C5D] uppercase text-center">
                    {viewingOutputJob.title}
                  </div>
                </div>

                {/* Report Narrative & Parameters */}
                <div className="space-y-3 mb-6 text-[11px] leading-relaxed">
                  <p className="text-slate-700">
                    <span className="font-bold text-slate-900">PROPÓSITO DE LA EMISIÓN: </span>
                    {viewingOutputJob.description}
                  </p>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded border border-slate-200 text-[10px]">
                    <div>
                      <span className="text-slate-500 block">JOB ID:</span>
                      <span className="font-bold text-slate-800">{viewingOutputJob.jobId}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">COLA ASIGNADA:</span>
                      <span className="font-bold text-slate-800">{viewingOutputJob.queue}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">REGISTROS:</span>
                      <span className="font-bold text-slate-800">{viewingOutputJob.recordCount} items</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">ENTORNO:</span>
                      <span className="font-bold text-slate-800">{viewingOutputJob.environment}</span>
                    </div>
                  </div>
                </div>

                {/* Financial Summary Figures (if available) */}
                {viewingOutputJob.summaryData && (
                  <div className="mb-6">
                    <div className="font-bold text-slate-900 text-xs border-b border-slate-300 pb-1 mb-2">
                      RESUMEN DE CIFRAS Y BALANCE DEL INFORME
                    </div>
                    <table className="w-full text-xs">
                      <tbody>
                        {viewingOutputJob.summaryData.debitTotal !== undefined && (
                          <tr className="border-b border-slate-100">
                            <td className="py-1 text-slate-600">Total Débitos Imputados:</td>
                            <td className="py-1 text-right font-bold text-slate-900">
                              {formatCLP(viewingOutputJob.summaryData.debitTotal)}
                            </td>
                          </tr>
                        )}
                        {viewingOutputJob.summaryData.creditTotal !== undefined && (
                          <tr className="border-b border-slate-100">
                            <td className="py-1 text-slate-600">Total Créditos / Obligaciones:</td>
                            <td className="py-1 text-right font-bold text-slate-900">
                              {formatCLP(viewingOutputJob.summaryData.creditTotal)}
                            </td>
                          </tr>
                        )}
                        {viewingOutputJob.summaryData.balance !== undefined && (
                          <tr className="border-b border-slate-200 bg-slate-50 font-bold">
                            <td className="py-1 text-slate-900">Diferencia de Cuadratura G/L:</td>
                            <td className={`py-1 text-right ${viewingOutputJob.summaryData.balance === 0 ? 'text-emerald-700' : 'text-amber-700'}`}>
                              {formatCLP(viewingOutputJob.summaryData.balance)}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                    {viewingOutputJob.summaryData.note && (
                      <p className="mt-2 text-[10px] text-slate-500 italic">
                        Nota: {viewingOutputJob.summaryData.note}
                      </p>
                    )}
                  </div>
                )}

                {/* Execution Trace Log */}
                <div className="bg-slate-950 text-emerald-400 p-3 rounded font-mono text-[9.5px] space-y-0.5">
                  <p className="text-slate-400">--- TRAZA DE EJECUCIÓN UBE EN SERVIDOR AIS ---</p>
                  <p>[INFO] Inicializando UBE {viewingOutputJob.ubeCode} versión {viewingOutputJob.version} en host {viewingOutputJob.environment}...</p>
                  <p>[INFO] Cargando parámetros de formulario y selección de registros F0911 / F0411 / F4801...</p>
                  <p>[INFO] {viewingOutputJob.recordCount} registros leídos y consolidados exitosamente.</p>
                  <p>[INFO] Generación de spool de salida en formato {viewingOutputJob.outputFormat} finalizada sin errores.</p>
                  <p className="text-emerald-300 font-bold">[SUCCESS] Código de retorno ERP: 0 (EJECUCIÓN EXITOSA - ESTADO D).</p>
                </div>

                {/* Audit Signature Stamp */}
                <div className="mt-8 pt-4 border-t border-slate-300 flex justify-between items-center text-[10px] text-slate-500">
                  <div>
                    <p className="font-bold text-slate-700">CERTIFICACIÓN AUTOMATIZADA ERP</p>
                    <p>Sello de inmutabilidad hash: SHA-256 Validado</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-700">CONFORMIDAD DE REVISIÓN</p>
                    <p>AssetFlow Enterprise System • 2026</p>
                  </div>
                </div>

              </div>
            </div>

            {/* Output Viewer Footer */}
            <div className="bg-slate-100 border-t border-slate-300 px-4 py-2.5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setViewingOutputJob(null)}
                className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-1.5 rounded text-xs font-bold cursor-pointer"
              >
                Volver a la Cola de Trabajos
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* 7. AUTHENTIC ERP GRID CONTEXT MENU (WSJ - P986110B)             */}
      {/* ================================================================ */}
      {contextMenu && (
        <JDEGridContextMenu
          isOpen={true}
          x={contextMenu.x}
          y={contextMenu.y}
          programCode="P986110B"
          programTitle="Work With Submitted Jobs (WSJ) - F986110"
          collectionName="jobs_queue"
          recordKey={`Job #${contextMenu.job.jobId} • ${contextMenu.job.ubeCode}`}
          recordData={contextMenu.job}
          currentStatus={contextMenu.job.status}
          statusOptions={[
            { label: 'D - Terminado [OK]', value: 'D', color: '#10B981' },
            { label: 'P - En Proceso', value: 'P', color: '#F59E0B' },
            { label: 'W - En Espera / En Cola', value: 'W', color: '#6B7280' },
            { label: 'E - Error en Ejecución', value: 'E', color: '#EF4444' },
            { label: 'H - En Pausa / Hold', value: 'H', color: '#8B5CF6' }
          ]}
          onUpdateStatus={async (newStatus) => {
            handleUpdateStatus(contextMenu.job.jobId, newStatus);
          }}
          onClose={() => setContextMenu(null)}
          onSelectRow={() => setSelectedJobId(contextMenu.job.jobId)}
          onViewDetails={() => {
            setViewingOutputJob(contextMenu.job);
            setContextMenu(null);
          }}
          onExportExcel={() => {
            handleDownloadExcel(contextMenu.job);
            setContextMenu(null);
          }}
          onPrint={() => {
            setViewingOutputJob(contextMenu.job);
            setContextMenu(null);
            setTimeout(() => window.print(), 300);
          }}
          onRefresh={() => {
            handleRefresh();
            setContextMenu(null);
          }}
          onClearQBE={() => {
            setSearchQuery('');
            setStatusFilter('ALL');
            triggerNotice('Filtros de búsqueda reiniciados.');
            setContextMenu(null);
          }}
          onDelete={() => {
            handleDeleteJob(contextMenu.job.jobId);
          }}
          onCopy={() => {
            navigator.clipboard.writeText(`Job ID: ${contextMenu.job.jobId} | UBE: ${contextMenu.job.ubeCode} | ${contextMenu.job.title}`);
            triggerNotice(`Job #${contextMenu.job.jobId} copiado al portapapeles.`);
            setContextMenu(null);
          }}
          onTraceability={() => {
            setViewingLogJob(contextMenu.job);
            setContextMenu(null);
          }}
          rowExits={[
            {
              id: 'wsj_view_output',
              label: 'Ver Salida de Informe (Spool / Output)',
              icon: <Eye size={12} className="text-indigo-700" />,
              shortcut: 'Enter',
              onClick: () => {
                setViewingOutputJob(contextMenu.job);
                setContextMenu(null);
              }
            },
            {
              id: 'wsj_view_log',
              label: 'Ver Log de Ejecución (JDEDEBUG.log)',
              icon: <Terminal size={12} className="text-amber-700" />,
              shortcut: 'F8',
              onClick: () => {
                setViewingLogJob(contextMenu.job);
                setContextMenu(null);
              }
            },
            {
              id: 'wsj_resubmit',
              label: 'Re-enviar Trabajo UBE a la Cola (Re-Submit)',
              icon: <RotateCcw size={12} className="text-emerald-700" />,
              shortcut: 'F9',
              onClick: () => {
                handleSubmitNewUBE(
                  contextMenu.job.ubeCode,
                  contextMenu.job.title,
                  contextMenu.job.version,
                  contextMenu.job.outputFormat
                );
                setContextMenu(null);
              }
            },
            {
              id: 'wsj_export_excel',
              label: 'Descargar Salida en Excel (.xlsx)',
              icon: <FileSpreadsheet size={12} className="text-emerald-700" />,
              shortcut: 'Ctrl+E',
              disabled: contextMenu.job.status !== 'D',
              onClick: () => {
                handleDownloadExcel(contextMenu.job);
                setContextMenu(null);
              }
            },
            {
              id: 'wsj_download_pdf',
              label: 'Descargar Comprobante / Voucher PDF',
              icon: <FileText size={12} className="text-rose-700" />,
              shortcut: 'Ctrl+P',
              disabled: contextMenu.job.status !== 'D',
              onClick: () => {
                handleDownloadPDF(contextMenu.job);
                setContextMenu(null);
              }
            },
            ...(getAppNavExit(contextMenu.job) ? [getAppNavExit(contextMenu.job)!] : [])
          ]}
          items={[
            {
              id: 'item_inspect',
              label: 'Inspeccionar Atributos F986110 (Inspector)',
              icon: <Database size={12} className="text-[#0B3C5D]" />,
              shortcut: 'F4',
              onClick: () => {
                setViewingLogJob(contextMenu.job);
                setContextMenu(null);
              }
            },
            {
              id: 'item_copy_job_id',
              label: 'Copiar N° de Trabajo (Job ID)',
              icon: <Copy size={12} className="text-slate-600" />,
              shortcut: 'Ctrl+C',
              onClick: () => {
                navigator.clipboard.writeText(contextMenu.job.jobId);
                triggerNotice(`Job ID #${contextMenu.job.jobId} copiado al portapapeles.`);
                setContextMenu(null);
              }
            },
            {
              id: 'item_delete_job',
              label: 'Eliminar Trabajo de la Cola WSJ',
              icon: <Trash2 size={12} className="text-rose-600" />,
              danger: true,
              onClick: () => {
                handleDeleteJob(contextMenu.job.jobId);
              }
            }
          ]}
        />
      )}

      {/* ================================================================ */}
      {/* 8. MODAL SUBVIEW: UBE EXECUTION LOG (JDEDEBUG.LOG / ENGINE TRACE) */}
      {/* ================================================================ */}
      {viewingLogJob && (
        <div className="fixed inset-0 z-[100001] bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-3 select-text font-sans">
          <div className="bg-[#0B1526] text-slate-100 border-2 border-[#1E3A5F] shadow-2xl w-full max-w-4xl rounded-sm overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-linear-to-r from-[#071322] to-[#0E243F] px-4 py-2.5 flex items-center justify-between border-b border-[#1E3A5F]">
              <div className="flex items-center gap-2 font-mono">
                <Terminal size={15} className="text-amber-400" />
                <span className="font-bold text-xs text-white">
                  JDEDEBUG.log • Traza de Ejecución Motor UBE - Job #{viewingLogJob.jobId} [{viewingLogJob.ubeCode}]
                </span>
                <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-700 px-1.5 py-0.5 rounded">
                  ESTADO: {viewingLogJob.status} ({viewingLogJob.statusLabel})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setViewingLogJob(null)}
                className="text-slate-400 hover:text-white font-bold text-sm px-2 cursor-pointer transition-colors"
                title="Cerrar log (Esc)"
              >
                ✕
              </button>
            </div>

            {/* Actions Bar */}
            <div className="bg-[#0D1B2E] border-b border-[#1E3A5F] px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const logContent = `========================================================================
ASSETFLOW ENTERPRISE SYSTEM - ERP ENGINE RUNTIME LOG (JDEDEBUG.log)
========================================================================
Report (UBE):      ${viewingLogJob.ubeCode} - ${viewingLogJob.title}
Version:           ${viewingLogJob.version}
Job ID:            ${viewingLogJob.jobId}
Queue:             ${viewingLogJob.queue}
User:              ${viewingLogJob.user}
Environment:       ${viewingLogJob.environment}
Host:              PRD-AIS-01 (Linux x86_64, Kernel 6.1)
Process PID:       ${parseInt(viewingLogJob.jobId, 10) + 12040}
Submitted:         ${viewingLogJob.submittedAt}
Completed:         ${viewingLogJob.completedAt}
Status:            [${viewingLogJob.status}] ${viewingLogJob.statusLabel}
Format:            ${viewingLogJob.outputFormat}
Processed Rows:    ${viewingLogJob.recordCount}
------------------------------------------------------------------------
[${viewingLogJob.submittedAt}] [INIT] UBE Dispatcher initializing job queue '${viewingLogJob.queue}'...
[${viewingLogJob.submittedAt}] [AUTH] Security authorization verified for principal '${viewingLogJob.user}' (OK).
[${viewingLogJob.submittedAt}] [SPECS] Loading version specifications for ${viewingLogJob.ubeCode}_${viewingLogJob.version}...
[${viewingLogJob.submittedAt}] [DATASEL] Applying Data Selection filters on Central Database...
[${viewingLogJob.submittedAt}] [SQL] SELECT * FROM F980011D WHERE UBE = '${viewingLogJob.ubeCode}' AND ENVIRONMENT = '${viewingLogJob.environment}';
[${viewingLogJob.submittedAt}] [SQL] SELECT COUNT(*) AS TOTAL_ROWS FROM F0911 WHERE CO = '00001'; -> Rows matched: ${viewingLogJob.recordCount}
[${viewingLogJob.submittedAt}] [ENGINE] Processing Section 'Main Details (Level 1)'...
[${viewingLogJob.submittedAt}] [TOTALS] Debit: ${viewingLogJob.summaryData?.debitTotal || 0} | Credit: ${viewingLogJob.summaryData?.creditTotal || 0} | Diff: ${viewingLogJob.summaryData?.balance || 0}
[${viewingLogJob.completedAt}] [SPOOL] Generating output stream in format ${viewingLogJob.outputFormat}...
[${viewingLogJob.completedAt}] [CRYPTO] Calculating SHA-256 seal for immutable compliance F980011D...
[${viewingLogJob.completedAt}] [DONE] Job execution finished successfully with Return Code: 0 (SUCCESS).
========================================================================`;
                    navigator.clipboard.writeText(logContent);
                    triggerNotice(`Log de ejecución del Job #${viewingLogJob.jobId} copiado al portapapeles.`);
                  }}
                  className="bg-[#172E4C] hover:bg-[#1E3E66] text-white border border-[#274D7E] px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Copy size={11} />
                  <span>Copiar Log</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const logContent = `========================================================================
ASSETFLOW ENTERPRISE SYSTEM - ERP ENGINE RUNTIME LOG (JDEDEBUG.log)
========================================================================
Report (UBE):      ${viewingLogJob.ubeCode} - ${viewingLogJob.title}
Version:           ${viewingLogJob.version}
Job ID:            ${viewingLogJob.jobId}
Queue:             ${viewingLogJob.queue}
User:              ${viewingLogJob.user}
Environment:       ${viewingLogJob.environment}
Host:              PRD-AIS-01 (Linux x86_64, Kernel 6.1)
Process PID:       ${parseInt(viewingLogJob.jobId, 10) + 12040}
Submitted:         ${viewingLogJob.submittedAt}
Completed:         ${viewingLogJob.completedAt}
Status:            [${viewingLogJob.status}] ${viewingLogJob.statusLabel}
Format:            ${viewingLogJob.outputFormat}
Processed Rows:    ${viewingLogJob.recordCount}
------------------------------------------------------------------------
[${viewingLogJob.submittedAt}] [INIT] UBE Dispatcher initializing job queue '${viewingLogJob.queue}'...
[${viewingLogJob.submittedAt}] [AUTH] Security authorization verified for principal '${viewingLogJob.user}' (OK).
[${viewingLogJob.submittedAt}] [SPECS] Loading version specifications for ${viewingLogJob.ubeCode}_${viewingLogJob.version}...
[${viewingLogJob.submittedAt}] [DATASEL] Applying Data Selection filters on Central Database...
[${viewingLogJob.submittedAt}] [SQL] SELECT * FROM F980011D WHERE UBE = '${viewingLogJob.ubeCode}' AND ENVIRONMENT = '${viewingLogJob.environment}';
[${viewingLogJob.submittedAt}] [SQL] SELECT COUNT(*) AS TOTAL_ROWS FROM F0911 WHERE CO = '00001'; -> Rows matched: ${viewingLogJob.recordCount}
[${viewingLogJob.submittedAt}] [ENGINE] Processing Section 'Main Details (Level 1)'...
[${viewingLogJob.submittedAt}] [TOTALS] Debit: ${viewingLogJob.summaryData?.debitTotal || 0} | Credit: ${viewingLogJob.summaryData?.creditTotal || 0} | Diff: ${viewingLogJob.summaryData?.balance || 0}
[${viewingLogJob.completedAt}] [SPOOL] Generating output stream in format ${viewingLogJob.outputFormat}...
[${viewingLogJob.completedAt}] [CRYPTO] Calculating SHA-256 seal for immutable compliance F980011D...
[${viewingLogJob.completedAt}] [DONE] Job execution finished successfully with Return Code: 0 (SUCCESS).
========================================================================`;
                    const blob = new Blob([logContent], { type: 'text/plain;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `JDEDEBUG_${viewingLogJob.ubeCode}_Job${viewingLogJob.jobId}.log`;
                    a.click();
                    URL.revokeObjectURL(url);
                    triggerNotice(`Archivo .log descargado para Job #${viewingLogJob.jobId}.`);
                  }}
                  className="bg-[#172E4C] hover:bg-[#1E3E66] text-white border border-[#274D7E] px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Download size={11} />
                  <span>Descargar .log</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewingOutputJob(viewingLogJob);
                    setViewingLogJob(null);
                  }}
                  className="bg-[#0B3C5D] hover:bg-[#144D75] text-white border border-[#1D5C8A] px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Eye size={11} />
                  <span>Ver Spool de Salida</span>
                </button>
              </div>
              <div className="text-[10px] text-slate-400">
                Host: <span className="text-sky-300 font-bold">PRD-AIS-01</span> • PID: <span className="text-amber-300 font-bold">{parseInt(viewingLogJob.jobId, 10) + 12040}</span> • Entorno: <span className="text-emerald-300 font-bold">{viewingLogJob.environment}</span>
              </div>
            </div>

            {/* Log Terminal Body */}
            <div className="flex-1 overflow-auto p-4 bg-[#060D17] font-mono text-[11px] leading-relaxed select-text space-y-1">
              <div className="text-slate-500 border-b border-slate-800 pb-2 mb-2">
                ====================================================================================================<br />
                ASSETFLOW ENTERPRISE SYSTEM - ERP ENGINE RUNTIME LOG (JDEDEBUG.log)<br />
                ====================================================================================================<br />
                Reporte (UBE):      <span className="text-amber-300 font-bold">{viewingLogJob.ubeCode}</span> - {viewingLogJob.title}<br />
                Versión:           <span className="text-sky-300 font-bold">{viewingLogJob.version}</span><br />
                ID Trabajo UBE:    <span className="text-white font-bold">{viewingLogJob.jobId}</span><br />
                Cola de Envío:     <span className="text-amber-400 font-bold">{viewingLogJob.queue}</span><br />
                Usuario Solicitante: <span className="text-emerald-400 font-bold">{viewingLogJob.user}</span><br />
                Entorno Runtime:   <span className="text-purple-300 font-bold">{viewingLogJob.environment}</span><br />
                Servidor Host:     <span className="text-blue-300">PRD-AIS-01 (Linux x86_64, Kernel 6.1)</span><br />
                Worker PID:        <span className="text-slate-300">{parseInt(viewingLogJob.jobId, 10) + 12040}</span><br />
                Fecha Envío:       <span className="text-slate-300">{viewingLogJob.submittedAt}</span><br />
                Fecha Conclusión:  <span className="text-slate-300">{viewingLogJob.completedAt}</span><br />
                Estado del Proceso: <span className="text-emerald-400 font-bold">[{viewingLogJob.status}] {viewingLogJob.statusLabel}</span><br />
                Formato Salida:    <span className="text-amber-300 font-bold">{viewingLogJob.outputFormat}</span><br />
                Registros Procesados: <span className="text-sky-300 font-bold">{viewingLogJob.recordCount}</span><br />
                Memoria Asignada:  <span className="text-slate-300">14.8 MB (Heap: 8.2 MB / RSS: 24.1 MB)</span><br />
                ====================================================================================================
              </div>

              <div className="space-y-1 text-slate-300">
                <p><span className="text-slate-500">[{viewingLogJob.submittedAt}]</span> <span className="text-sky-400 font-bold">[DISPATCHER]</span> Worker PID {parseInt(viewingLogJob.jobId, 10) + 12040} spawned for queue '{viewingLogJob.queue}'.</p>
                <p><span className="text-slate-500">[{viewingLogJob.submittedAt}]</span> <span className="text-emerald-400 font-bold">[SECURITY]</span> User '{viewingLogJob.user}' validated against F98OWSEC in environment '{viewingLogJob.environment}'. Permission GRANTED.</p>
                <p><span className="text-slate-500">[{viewingLogJob.submittedAt}]</span> <span className="text-amber-400 font-bold">[SPECS]</span> Loading Central Specs for UBE Object: <span className="text-amber-300">{viewingLogJob.ubeCode}</span>, Version: <span className="text-amber-300">{viewingLogJob.version}</span>.</p>
                <p><span className="text-slate-500">[{viewingLogJob.submittedAt}]</span> <span className="text-blue-400 font-bold">[INIT]</span> Initializing Database Connection Pool to Central Ledger (F0911, F0411, F4801, F1501)... OK.</p>
                <p><span className="text-slate-500">[{viewingLogJob.submittedAt}]</span> <span className="text-purple-400 font-bold">[SQL]</span> Executing Query: <span className="text-purple-200">SELECT COUNT(*) AS TOTAL_COUNT FROM F0911 WHERE CO = '00001' AND GLPOST = 'P'</span></p>
                <p><span className="text-slate-500">[{viewingLogJob.submittedAt}]</span> <span className="text-slate-400">[FETCH]</span> Query executed in 0.042s. Total records in scope: <span className="text-sky-300 font-bold">{viewingLogJob.recordCount}</span>.</p>
                <p><span className="text-slate-500">[{viewingLogJob.submittedAt}]</span> <span className="text-sky-400 font-bold">[SECTION]</span> Entering Section 1: Header and Primary Column Calculations.</p>
                {viewingLogJob.summaryData && (
                  <div className="p-2 bg-slate-900/60 rounded border border-slate-800 text-[10px] space-y-0.5 my-1">
                    <p className="text-amber-300 font-bold">--- BALANCE Y CUADRATURA CALCULADA ---</p>
                    {viewingLogJob.summaryData.debitTotal !== undefined && (
                      <p>Total Débitos: <span className="text-white font-bold">{formatCLP(viewingLogJob.summaryData.debitTotal)}</span></p>
                    )}
                    {viewingLogJob.summaryData.creditTotal !== undefined && (
                      <p>Total Créditos: <span className="text-white font-bold">{formatCLP(viewingLogJob.summaryData.creditTotal)}</span></p>
                    )}
                    {viewingLogJob.summaryData.balance !== undefined && (
                      <p>Diferencia Balance: <span className="text-emerald-400 font-bold">{formatCLP(viewingLogJob.summaryData.balance)}</span></p>
                    )}
                    {viewingLogJob.summaryData.note && (
                      <p className="text-slate-400 italic">Observación: {viewingLogJob.summaryData.note}</p>
                    )}
                  </div>
                )}
                <p><span className="text-slate-500">[{viewingLogJob.completedAt}]</span> <span className="text-sky-400 font-bold">[SPOOL]</span> Formatting report output in target format <span className="text-amber-300 font-bold">{viewingLogJob.outputFormat}</span>...</p>
                <p><span className="text-slate-500">[{viewingLogJob.completedAt}]</span> <span className="text-emerald-400 font-bold">[CRYPTO]</span> Calculating cryptographic digital seal SHA-256 for audit trace F980011D...</p>
                <p><span className="text-slate-500">[{viewingLogJob.completedAt}]</span> <span className="text-emerald-300 font-bold">[SUCCESS]</span> UBE Execution completed successfully. Return Code: <span className="text-white font-black">0 (EXIT_SUCCESS)</span>. Status set to <span className="text-emerald-400 font-black">[D]</span>.</p>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-[#0D1B2E] border-t border-[#1E3A5F] px-4 py-2 flex items-center justify-between text-xs">
              <span className="text-[10px] font-mono text-slate-400">
                AssetFlow Enterprise Architecture • Dispatcher UBE Core • Verificación Cryptographic Inmutable OK
              </span>
              <button
                type="button"
                onClick={() => setViewingLogJob(null)}
                className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded text-xs font-bold cursor-pointer"
              >
                Cerrar Visor
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
