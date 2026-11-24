import React, { useState } from 'react';
import { 
  Check, Search, Plus, Copy, Trash2, X, ChevronDown, 
  FileSpreadsheet, Printer, ShieldCheck, Database, Layers,
  Lock, RefreshCw, Sliders, ExternalLink, HardDrive, Info
} from 'lucide-react';
import { ModuleType } from '../types';

export interface JDEFormDefinition {
  code: string;
  formCode: string;
  title: string;
  category: string;
  breadcrumb: string;
  tableId: string;
}

export const JDE_FORM_REGISTRY: Record<string, JDEFormDefinition> = {
  'DASHBOARD': {
    code: 'P0000',
    formCode: 'W0000A',
    title: 'Work with Executive Dashboard & Asset Overview',
    category: 'System Foundation',
    breadcrumb: 'EnterpriseOne Menus > Foundation > P0000',
    tableId: 'F0000'
  },
  'TAREAS': {
    code: 'P0001',
    formCode: 'W0001A',
    title: 'Work with Workflow Tasks & Operational Approvals',
    category: 'Task Management',
    breadcrumb: 'EnterpriseOne Menus > Task Management > P0001',
    tableId: 'F0001'
  },
  'ORDENES': {
    code: 'P48201',
    formCode: 'W48201A',
    title: 'Work with Work Orders (Mantenimiento de OT)',
    category: 'Plant & Equipment Maintenance (G13)',
    breadcrumb: 'EnterpriseOne Menus > Plant Maintenance (G13) > Work Orders > P48201',
    tableId: 'F4801'
  },
  'APROBACIONES_JDE': {
    code: 'P43081',
    formCode: 'W43081A',
    title: 'Work with Held Orders Approval & SHA-256 Cryptographic Ledger',
    category: 'Procurement (G43)',
    breadcrumb: 'EnterpriseOne Menus > Procurement (G43) > Approvals > P43081',
    tableId: 'F4209'
  },
  'RECEPCION_OT': {
    code: 'P4312',
    formCode: 'W4312A',
    title: 'Purchase Order & Work Order Receipts (F4312)',
    category: 'Procurement (G43)',
    breadcrumb: 'EnterpriseOne Menus > Procurement (G43) > Receipts > P4312',
    tableId: 'F4312'
  },
  'PROPIEDADES': {
    code: 'P1501',
    formCode: 'W1501A',
    title: 'Work with Real Estate Properties & Living Units Master',
    category: 'Real Estate Management (G15)',
    breadcrumb: 'EnterpriseOne Menus > Real Estate Management (G15) > Property Master > P1501',
    tableId: 'F1501'
  },
  'CONTRATOS_ARRIENDO': {
    code: 'P15012',
    formCode: 'W15012A',
    title: 'Work with Real Estate Lease Contracts & Billing Master',
    category: 'Real Estate Management (G15)',
    breadcrumb: 'EnterpriseOne Menus > Real Estate Management (G15) > Lease Management > P15012',
    tableId: 'F15017'
  },
  'GARANTIAS': {
    code: 'P1540',
    formCode: 'W1540A',
    title: 'Work with Security Deposit Liquidation & Dossiers',
    category: 'Real Estate Management (G15)',
    breadcrumb: 'EnterpriseOne Menus > Real Estate Management (G15) > Deposits > P1540',
    tableId: 'F1540'
  },
  'TASACIONES': {
    code: 'P15401',
    formCode: 'W15401A',
    title: 'Work with Property Appraisals & Commercial Valuation',
    category: 'Real Estate Management (G15)',
    breadcrumb: 'EnterpriseOne Menus > Real Estate Management (G15) > Appraisals > P15401',
    tableId: 'F15401'
  },
  'SEGUROS': {
    code: 'P44H5004',
    formCode: 'W44H5004A',
    title: 'Work with Real Estate Insurance Policies Master',
    category: 'Real Estate Management (G15)',
    breadcrumb: 'EnterpriseOne Menus > Real Estate Management (G15) > Insurance > P44H5004',
    tableId: 'F44H5004'
  },
  'SOLICITUDES': {
    code: 'P18500',
    formCode: 'W18500A',
    title: 'Work with Tenant Service Requests & Incident Dispatch',
    category: 'Customer Service (G18)',
    breadcrumb: 'EnterpriseOne Menus > Customer Service (G18) > Requests > P18500',
    tableId: 'F18500'
  },
  'MANTENCIONES': {
    code: 'P13700',
    formCode: 'W13700A',
    title: 'Work with Physical Maintenance Expedientes & Inspections',
    category: 'Plant & Equipment (G13)',
    breadcrumb: 'EnterpriseOne Menus > Plant Maintenance (G13) > History > P13700',
    tableId: 'F13700'
  },
  'CONTABILIDAD_JDE': {
    code: 'P0911',
    formCode: 'W0911A',
    title: 'Work with Journal Entries & Ledger Inquiry (Diario General F0911)',
    category: 'General Accounting (G09)',
    breadcrumb: 'EnterpriseOne Menus > General Accounting (G09) > Journal Entries > P0911',
    tableId: 'F0911'
  },
  'BITACORA': {
    code: 'P0911B',
    formCode: 'W0911BA',
    title: 'General Ledger Journal Entry Inquiry & Auditing (F0911)',
    category: 'General Accounting (G09)',
    breadcrumb: 'EnterpriseOne Menus > General Accounting (G09) > Inquiries > P0911B',
    tableId: 'F0911'
  },
  'INGRESOS': {
    code: 'P03B11',
    formCode: 'W03B11A',
    title: 'Standard Invoice Entry (Cuentas por Cobrar RE)',
    category: 'Accounts Receivable (G03B)',
    breadcrumb: 'EnterpriseOne Menus > Accounts Receivable (G03B) > Invoices > P03B11',
    tableId: 'F03B11'
  },
  'EGRESOS': {
    code: 'P0411',
    formCode: 'W0411A',
    title: 'Standard Voucher Entry (Cuentas por Pagar AP)',
    category: 'Accounts Payable (G04)',
    breadcrumb: 'EnterpriseOne Menus > Accounts Payable (G04) > Vouchers > P0411',
    tableId: 'F0411'
  },
  'FINANZAS': {
    code: 'P092102',
    formCode: 'W092102A',
    title: 'Account Balance by Month & Ledger (F0902)',
    category: 'General Accounting (G09)',
    breadcrumb: 'EnterpriseOne Menus > General Accounting (G09) > Account Inquiries > P092102',
    tableId: 'F0902'
  },
  'CUENTAS': {
    code: 'P0901',
    formCode: 'W0901A',
    title: 'Revise Single Account (Chart of Accounts F0901)',
    category: 'General Accounting (G09)',
    breadcrumb: 'EnterpriseOne Menus > General Accounting (G09) > Setup > P0901',
    tableId: 'F0901'
  },
  'CONCILIACION': {
    code: 'P09131',
    formCode: 'W09131A',
    title: 'Manual & Automatic Bank Reconciliation (F09131)',
    category: 'General Accounting (G09)',
    breadcrumb: 'EnterpriseOne Menus > General Accounting (G09) > Banking > P09131',
    tableId: 'F09131'
  },
  'CAJA_CHICA': {
    code: 'P0002M',
    formCode: 'W0002MA',
    title: 'Petty Cash Fund Administration & Expenses (F0002M)',
    category: 'General Accounting (G09)',
    breadcrumb: 'EnterpriseOne Menus > General Accounting (G09) > Petty Cash > P0002M',
    tableId: 'F0002M'
  },
  'CONTROLLING': {
    code: 'P09210',
    formCode: 'W09210A',
    title: 'Financial Controlling & Balance Cross-Inquiry',
    category: 'General Accounting (G09)',
    breadcrumb: 'EnterpriseOne Menus > General Accounting (G09) > Controlling > P09210',
    tableId: 'F0902'
  },
  'CASH_FLOW_RUNWAY': {
    code: 'P09220',
    formCode: 'W09220A',
    title: 'Cash Flow Runway Consolidation & Treasury Runway (P09220)',
    category: 'General Accounting (G09)',
    breadcrumb: 'EnterpriseOne Menus > General Accounting (G09) > Cash Management > P09220',
    tableId: 'F09220'
  },
  'LIBROS_AUXILIARES': {
    code: 'P0912AUX',
    formCode: 'W0912AUXA',
    title: 'Subsidiary Ledger Inquiries (F0911 / F0411 / F03B11)',
    category: 'General Accounting (G09)',
    breadcrumb: 'EnterpriseOne Menus > General Accounting (G09) > Periodic > P0912AUX',
    tableId: 'F0911'
  },
  'PROVEEDORES': {
    code: 'P01012',
    formCode: 'W01012B',
    title: 'Work with Address Book & Supplier Master (F0101 / F0401 / F0111 / F0115 / F0030)',
    category: 'Address Book (G01)',
    breadcrumb: 'EnterpriseOne Menus > Address Book (G01) > Address Book Revision > P01012',
    tableId: 'F0101'
  },
  'DUE_DILIGENCIA': {
    code: 'P01012A',
    formCode: 'W01012AA',
    title: 'Supplier Due Diligence & Prevention Matrix (Ley 21.595 / UAF)',
    category: 'Compliance & Risk',
    breadcrumb: 'EnterpriseOne Menus > Compliance & Risk > P01012A',
    tableId: 'F01012A'
  },
  'DUE_DILIGENCIA_CONSULTA': {
    code: 'P01012B',
    formCode: 'W01012BA',
    title: 'Interconnected Supplier Cross-Inquiry & Dossier Review',
    category: 'Compliance & Risk',
    breadcrumb: 'EnterpriseOne Menus > Compliance & Risk > P01012B',
    tableId: 'F01012B'
  },
  'UAF_COMPLIANCE': {
    code: 'P0115U',
    formCode: 'W0115UA',
    title: 'UAF Final Beneficiary Declaration Forms (Ley 21.595)',
    category: 'Compliance & Risk',
    breadcrumb: 'EnterpriseOne Menus > Compliance & Risk > P0115U',
    tableId: 'F0115U'
  },
  'REVISION_PAGOS_SEMANALES': {
    code: 'P0411A',
    formCode: 'W0411AA',
    title: 'Weekly Payment Batch Audit & Dual Authorization',
    category: 'Accounts Payable (G04)',
    breadcrumb: 'EnterpriseOne Menus > Accounts Payable (G04) > Audit > P0411A',
    tableId: 'F0411'
  },
  'BOVEDA_DIGITAL': {
    code: 'P986110D',
    formCode: 'W986110DA',
    title: 'Work with Digital Vault & Sealed Archives (F986110D)',
    category: 'System Foundation (G96)',
    breadcrumb: 'EnterpriseOne Menus > System Foundation (G96) > Document Vault > P986110D',
    tableId: 'F986110D'
  },
  'SALUD_SISTEMA': {
    code: 'P986110',
    formCode: 'W986110A',
    title: 'Application Server Health & Architecture Status (AIS)',
    category: 'System Administration (G96)',
    breadcrumb: 'EnterpriseOne Menus > System Administration (G96) > Server Health > P986110',
    tableId: 'F986110'
  },
  'AUDITORIA': {
    code: 'P950000',
    formCode: 'W950000A',
    title: 'Audit Trail & Compliance Log (F950000 / SOX / Forense)',
    category: 'Security & Audit (G95)',
    breadcrumb: 'EnterpriseOne Menus > Security & Audit (G95) > Audit Logs > P950000',
    tableId: 'F950000'
  },
  'CONFIG': {
    code: 'P98OWSEC',
    formCode: 'W98OWSECA',
    title: 'Work with User Security, Roles & Channel Permissions',
    category: 'Security & Audit (G95)',
    breadcrumb: 'EnterpriseOne Menus > Security & Audit (G95) > Security > P98OWSEC',
    tableId: 'F98OWSEC'
  },
  'RUTAS_APROBACION': {
    code: 'P43008',
    formCode: 'W43008A',
    title: 'Approval Route Master Configuration (F43008)',
    category: 'Procurement (G43)',
    breadcrumb: 'EnterpriseOne Menus > Procurement (G43) > Setup > P43008',
    tableId: 'F43008'
  },
  'FACTURACION_DTE': {
    code: 'P4210DTE',
    formCode: 'W4210DTEA',
    title: 'Electronic Tax Invoice Generation (DTE / SII Exenciones)',
    category: 'Accounts Receivable (G03B)',
    breadcrumb: 'EnterpriseOne Menus > Accounts Receivable (G03B) > DTE Invoicing > P4210DTE',
    tableId: 'F4210DTE'
  },
  'IMPUESTOS_F29_F22': {
    code: 'P029F22',
    formCode: 'W029F22A',
    title: 'Tax Declarations F29 / F22 (SII Chile ProPyme)',
    category: 'General Accounting (G09)',
    breadcrumb: 'EnterpriseOne Menus > General Accounting (G09) > Tax Reporting > P029F22',
    tableId: 'F029F22'
  },
  'REGISTRO_PAGOS': {
    code: 'P03B20',
    formCode: 'W03B20A',
    title: 'Standard Receipt Entry & Cash Applications (F03B14)',
    category: 'Accounts Receivable (G03B)',
    breadcrumb: 'EnterpriseOne Menus > Accounts Receivable (G03B) > Receipts > P03B20',
    tableId: 'F03B14'
  },
  'REPORTE_B13': {
    code: 'R09321',
    formCode: 'W09321A',
    title: 'CMF Regulatory Report B.13 - Cartera & Morosidad Inmobiliaria',
    category: 'Regulatory Reports',
    breadcrumb: 'EnterpriseOne Menus > Regulatory Reports > R09321',
    tableId: 'F09321'
  },
  'REPORTE_B4': {
    code: 'R09322',
    formCode: 'W09322A',
    title: 'CMF Regulatory Report B.4 - Bienes Raíces e Inversiones',
    category: 'Regulatory Reports',
    breadcrumb: 'EnterpriseOne Menus > Regulatory Reports > R09322',
    tableId: 'F09322'
  },
  'NOTA_14': {
    code: 'R09314',
    formCode: 'W09314A',
    title: 'Note 14 Financial Statements Formulation (Circular 2.192 CMF)',
    category: 'Regulatory Reports',
    breadcrumb: 'EnterpriseOne Menus > Regulatory Reports > R09314',
    tableId: 'F09314'
  },
  'REPORTE_MENSUAL_GASTOS': {
    code: 'R09325',
    formCode: 'W09325A',
    title: 'Monthly Real Estate Expense Report AI & Anomaly Detection',
    category: 'Financial Reports',
    breadcrumb: 'EnterpriseOne Menus > Financial Reports > R09325',
    tableId: 'F09325'
  },
  'BENFORD_ANALYSIS': {
    code: 'P09BEN',
    formCode: 'W09BENA',
    title: 'Benford Law Forensic Analysis & Anomaly Detection',
    category: 'Audit & Control',
    breadcrumb: 'EnterpriseOne Menus > Audit & Control > P09BEN',
    tableId: 'F0911'
  },
  'CERTIFICADOS_DOMINIO': {
    code: 'P1505',
    formCode: 'W1505A',
    title: 'Work with Property Title Certificates & CBR Vigencia',
    category: 'Real Estate Management (G15)',
    breadcrumb: 'EnterpriseOne Menus > Real Estate Management (G15) > Titles > P1505',
    tableId: 'F1505'
  },
  'CARGA_INTELIGENTE': {
    code: 'R15011Z1I',
    formCode: 'W15011Z1IA',
    title: 'Batch Property Ingestion & EDI Interface (Z-Table F15011Z1)',
    category: 'Real Estate Management (G15)',
    breadcrumb: 'EnterpriseOne Menus > Real Estate Management (G15) > Batch Ingestion > R15011Z1I',
    tableId: 'F15011Z1'
  },
  'HISTORIAL_ARRIENDOS': {
    code: 'P1501HA',
    formCode: 'W1501HAA',
    title: 'Tenant Payment History & Credit Behavior Ledger',
    category: 'Real Estate Management (G15)',
    breadcrumb: 'EnterpriseOne Menus > Real Estate Management (G15) > History > P1501HA',
    tableId: 'F1501HA'
  },
  'REVISION_PROPIEDADES': {
    code: 'P1501RV',
    formCode: 'W1501RVA',
    title: 'Physical Property Inspection Records & Condition Reports',
    category: 'Real Estate Management (G15)',
    breadcrumb: 'EnterpriseOne Menus > Real Estate Management (G15) > Inspections > P1501RV',
    tableId: 'F1501RV'
  },
  'PROPIEDADES_INVERSION': {
    code: 'M0912',
    formCode: 'W0912MA',
    title: 'Month-End Subledger Integrity Control & Reconciliation',
    category: 'General Accounting (G09)',
    breadcrumb: 'EnterpriseOne Menus > General Accounting (G09) > Integrity > M0912',
    tableId: 'F0912'
  },
  'OFICIOS': {
    code: 'P0115',
    formCode: 'W0115A',
    title: 'Work with Official Communications & Formal Notices',
    category: 'Real Estate Management (G15)',
    breadcrumb: 'EnterpriseOne Menus > Real Estate Management (G15) > Communications > P0115',
    tableId: 'F0115'
  },
  'CENTRO_DESPACHO': {
    code: 'P0115M',
    formCode: 'W0115MA',
    title: 'Automated Dispatch Center & Verified Gmail Courier',
    category: 'Communications',
    breadcrumb: 'EnterpriseOne Menus > Communications > P0115M',
    tableId: 'F0115M'
  },
  'DEVELOPER_CONSOLE': {
    code: 'P980011D',
    formCode: 'W980011DA',
    title: 'Interactive Developer Command Console & Schema Diagnostics',
    category: 'System Administration (G96)',
    breadcrumb: 'EnterpriseOne Menus > System Administration (G96) > Developer > P980011D',
    tableId: 'F980011D'
  },
  'MANUAL_USUARIO': {
    code: 'P0000A',
    formCode: 'W0000AA',
    title: 'ERP User Manual, Training Syllabus & Help Reference',
    category: 'Help & Reference',
    breadcrumb: 'EnterpriseOne Menus > Help > P0000A',
    tableId: 'F0000A'
  },
  'BROCHURE': {
    code: 'P2026B',
    formCode: 'W2026BA',
    title: 'Commercial Brochure & Corporate PDF Generator',
    category: 'Marketing',
    breadcrumb: 'EnterpriseOne Menus > Marketing > P2026B',
    tableId: 'F2026B'
  },
  'CISO_REPORT': {
    code: 'R09OWSEC',
    formCode: 'W09OWSECA',
    title: 'CISO Executive Security Directives & Forensic Report',
    category: 'Security & Audit (G95)',
    breadcrumb: 'EnterpriseOne Menus > Security & Audit (G95) > CISO Report > R09OWSEC',
    tableId: 'F09OWSEC'
  },
  'PROJECTS_REPORT': {
    code: 'R09OWPRJ',
    formCode: 'W09OWPRJA',
    title: 'PMO Innovation & Technical Value Proposition Report',
    category: 'Project Management',
    breadcrumb: 'EnterpriseOne Menus > Project Management > R09OWPRJ',
    tableId: 'F09OWPRJ'
  },
  'MAPA_DATOS_LEGAL': {
    code: 'R09OWDAT',
    formCode: 'W09OWDATA',
    title: 'Personal Data Protection Map & Register (Ley 21.719 / GDPR)',
    category: 'Compliance & Risk',
    breadcrumb: 'EnterpriseOne Menus > Compliance & Risk > R09OWDAT',
    tableId: 'F09OWDAT'
  },
  'BUSQUEDA_EMPLEO': {
    code: 'P09OWJOB',
    formCode: 'W09OWJOBA',
    title: 'Job Search Portal Chile & Executive Competency Match CV',
    category: 'Human Resources',
    breadcrumb: 'EnterpriseOne Menus > Human Resources > P09OWJOB',
    tableId: 'F09OWJOB'
  },
  'REVISION_REPORTES': {
    code: 'P0911R',
    formCode: 'W0911RA',
    title: 'Batch Review & Correction (Batch Status Verification)',
    category: 'General Accounting (G09)',
    breadcrumb: 'EnterpriseOne Menus > General Accounting (G09) > Batch Review > P0911R',
    tableId: 'F0911'
  },
  'HELPDESK': {
    code: 'P17500',
    formCode: 'W17500A',
    title: 'Help Desk Service Center & Incident Ticketing',
    category: 'Customer Service (G18)',
    breadcrumb: 'EnterpriseOne Menus > Customer Service (G18) > Help Desk > P17500',
    tableId: 'F17500'
  },
  'LOGISTICA_WMS': {
    code: 'P4600',
    formCode: 'W4600A',
    title: 'Supply Chain & Warehouse Management System (Extra Item WMS)',
    category: 'Extra Item — Logistics & Warehousing (G46)',
    breadcrumb: 'EnterpriseOne Menus > Extra Item: Logistics & WMS (G46) > Control Center > P4600',
    tableId: 'F41021 / F4611'
  }
};

interface JDEFormContainerProps {
  activeModule: ModuleType;
  children: React.ReactNode;
  currentUser: string;
  userRole?: string;
  onSelect?: () => void;
  onFind?: () => void;
  onAdd?: () => void;
  onCopy?: () => void;
  onDelete?: () => void;
  onClose?: () => void;
  onExportExcel?: () => void;
  onPrintPdf?: () => void;
  onOpenAttachments?: () => void;
  onOpenAudit?: () => void;
  recordsCount?: number;
}

export const JDEFormContainer: React.FC<JDEFormContainerProps> = ({
  activeModule,
  children,
  currentUser,
  userRole = '*ALL',
  onSelect,
  onFind,
  onAdd,
  onCopy,
  onDelete,
  onClose,
  onExportExcel,
  onPrintPdf,
  onOpenAttachments,
  onOpenAudit,
  recordsCount
}) => {
  const formDef: JDEFormDefinition = JDE_FORM_REGISTRY[activeModule] || {
    code: 'P0000',
    formCode: 'W0000A',
    title: 'Work with Application',
    category: 'General',
    breadcrumb: `EnterpriseOne Menus > ${activeModule}`,
    tableId: 'F0000'
  };

  const [activeDropdown, setActiveDropdown] = useState<'FORM' | 'ROW' | 'TOOLS' | null>(null);
  const [showQueryFilterStrip, setShowQueryFilterStrip] = useState<boolean>(true);
  const [filterCompany, setFilterCompany] = useState('00001');
  const [filterMCU, setFilterMCU] = useState('100');
  const [filterPeriod, setFilterPeriod] = useState('11');
  const [filterYear, setFilterYear] = useState('2026');
  const [filterLedger, setFilterLedger] = useState('AA');

  const handleToolbarFind = () => {
    if (onFind) onFind();
    else {
      // Trigger default find on window
      window.dispatchEvent(new CustomEvent('jde:find', { detail: { module: activeModule } }));
    }
  };

  const handleToolbarAdd = () => {
    if (onAdd) onAdd();
    else {
      window.dispatchEvent(new CustomEvent('jde:add', { detail: { module: activeModule } }));
    }
  };

  const handleToolbarClose = () => {
    if (onClose) onClose();
    else {
      window.dispatchEvent(new CustomEvent('jde:close-active-tab'));
    }
  };

  return (
    <div className="flex flex-col h-full w-full min-h-0 bg-[#EBF0F5] border border-[#7FA6C7] rounded-none shadow-xs overflow-hidden select-none">
      {/* 
        ========================================================================
        JDE ENTERPRISEONE FORM HEADER BAR (Blue Bevel Strip)
        ========================================================================
      */}
      <div className="bg-gradient-to-b from-[#1C4E77] via-[#143E63] to-[#0D2D49] text-white px-3 py-1.5 border-b border-[#0A2238] flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-2 min-w-0">
          {/* JDE Form Icon */}
          <div className="w-4 h-4 bg-white/15 border border-white/30 rounded-xs flex items-center justify-center text-[10px] text-amber-300 font-bold shrink-0">
            ❖
          </div>

          {/* Form Title & Program ID */}
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="font-mono text-[11.5px] font-black text-amber-300 tracking-wider shrink-0">
              {formDef.code}_{formDef.formCode}
            </span>
            <span className="text-white/40 text-xs hidden sm:inline">•</span>
            <h1 className="text-[12px] font-sans font-bold text-white tracking-tight truncate max-w-[420px] md:max-w-xl">
              [{formDef.title}]
            </h1>
            <span className="hidden lg:inline bg-[#002D62] text-slate-200 border border-white/20 text-[8.5px] font-mono px-1 py-0.2 rounded-xs font-bold uppercase">
              TABLA: {formDef.tableId}
            </span>
          </div>
        </div>

        {/* Right: Breadcrumb & Window Controls */}
        <div className="flex items-center gap-2 text-[10px] text-slate-300 font-sans shrink-0 ml-auto">
          <span className="hidden xl:inline text-slate-300 font-medium truncate max-w-sm">
            {formDef.breadcrumb}
          </span>
          <span className="hidden xl:inline text-white/30">|</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setShowQueryFilterStrip(p => !p)}
              className="p-1 hover:bg-white/10 rounded-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
              title={showQueryFilterStrip ? "Ocultar Parámetros de Consulta" : "Mostrar Parámetros de Consulta"}
            >
              <Sliders size={12} className={showQueryFilterStrip ? "text-amber-300" : ""} />
            </button>
            <button
              type="button"
              onClick={handleToolbarClose}
              className="p-1 hover:bg-rose-600/80 rounded-xs text-slate-300 hover:text-white transition-colors cursor-pointer ml-1"
              title="Cerrar Formulario (Esc / Close)"
            >
              <X size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* 
        ========================================================================
        JDE ENTERPRISE ACTION TOOLBAR (Alta / Blue Heron Classic)
        ========================================================================
      */}
      <div className="bg-gradient-to-b from-[#FFFFFF] via-[#F4F8FC] to-[#DCE8F4] border-b border-[#A2BCCF] px-2.5 py-1 flex items-center justify-between gap-2 shrink-0 select-none shadow-3xs overflow-x-auto custom-scrollbar">
        {/* Left Action Buttons: Select, Find, Add, Copy, Delete, Close */}
        <div className="flex items-center gap-1 shrink-0">
          {/* 1. SELECT (Green Check) */}
          <button
            type="button"
            onClick={onSelect}
            className="jde-action-btn-styled bg-gradient-to-b from-white to-[#E7F3FA] hover:from-[#F0F8FF] hover:to-[#CFE4F5] border border-[#8FA8BE] hover:border-[#002D62] text-[#002D62] px-2 py-0.5 rounded-xs text-[10.5px] font-sans font-bold flex items-center gap-1 shadow-3xs cursor-pointer active:translate-y-0.2"
            title="Seleccionar Registro (Select / Enter)"
          >
            <span className="w-3.5 h-3.5 bg-emerald-600 rounded-xs flex items-center justify-center text-white text-[9px] font-black">
              ✓
            </span>
            <span>Select</span>
          </button>

          {/* 2. FIND (Search Magnifier) */}
          <button
            type="button"
            onClick={handleToolbarFind}
            className="jde-action-btn-styled bg-gradient-to-b from-white to-[#E7F3FA] hover:from-[#F0F8FF] hover:to-[#CFE4F5] border border-[#8FA8BE] hover:border-[#002D62] text-[#002D62] px-2 py-0.5 rounded-xs text-[10.5px] font-sans font-bold flex items-center gap-1 shadow-3xs cursor-pointer active:translate-y-0.2"
            title="Ejecutar Consulta de Grilla (Find / Alt+F)"
          >
            <Search size={12} className="text-[#005B94] stroke-[2.5]" />
            <span>Find</span>
          </button>

          {/* 3. ADD (Green Plus) */}
          <button
            type="button"
            onClick={handleToolbarAdd}
            className="jde-action-btn-styled bg-gradient-to-b from-white to-[#E7F3FA] hover:from-[#F0F8FF] hover:to-[#CFE4F5] border border-[#8FA8BE] hover:border-[#002D62] text-[#002D62] px-2 py-0.5 rounded-xs text-[10.5px] font-sans font-bold flex items-center gap-1 shadow-3xs cursor-pointer active:translate-y-0.2"
            title="Añadir Nuevo Registro (Add / Alt+A)"
          >
            <Plus size={13} className="text-emerald-700 stroke-[3]" />
            <span>Add</span>
          </button>

          {/* 4. COPY (Dual Document) */}
          <button
            type="button"
            onClick={onCopy}
            className="jde-action-btn-styled bg-gradient-to-b from-white to-[#E7F3FA] hover:from-[#F0F8FF] hover:to-[#CFE4F5] border border-[#8FA8BE] hover:border-[#002D62] text-[#002D62] px-2 py-0.5 rounded-xs text-[10.5px] font-sans font-bold hidden sm:flex items-center gap-1 shadow-3xs cursor-pointer active:translate-y-0.2"
            title="Copiar Registro Seleccionado (Copy)"
          >
            <Copy size={12} className="text-indigo-700 stroke-[2.5]" />
            <span>Copy</span>
          </button>

          {/* 5. DELETE (Red Cross) */}
          <button
            type="button"
            onClick={onDelete}
            className="jde-action-btn-styled bg-gradient-to-b from-white to-[#E7F3FA] hover:from-[#F0F8FF] hover:to-[#CFE4F5] border border-[#8FA8BE] hover:border-[#002D62] text-rose-800 px-2 py-0.5 rounded-xs text-[10.5px] font-sans font-bold hidden sm:flex items-center gap-1 shadow-3xs cursor-pointer active:translate-y-0.2"
            title="Eliminar Registro (Delete)"
          >
            <Trash2 size={12} className="text-rose-700 stroke-[2.5]" />
            <span>Delete</span>
          </button>

          {/* 6. CLOSE (Red X) */}
          <button
            type="button"
            onClick={handleToolbarClose}
            className="jde-action-btn-styled bg-gradient-to-b from-white to-[#E7F3FA] hover:from-[#FFF0F0] hover:to-[#FFDCDC] border border-[#8FA8BE] hover:border-rose-600 text-rose-900 px-2 py-0.5 rounded-xs text-[10.5px] font-sans font-bold flex items-center gap-1 shadow-3xs cursor-pointer active:translate-y-0.2"
            title="Cerrar Formulario (Close / Esc)"
          >
            <span className="w-3.5 h-3.5 bg-rose-600 rounded-xs flex items-center justify-center text-white text-[9px] font-black">
              ✕
            </span>
            <span>Close</span>
          </button>

          <span className="h-5 w-[1px] bg-[#9DB2C3] mx-1"></span>

          {/* FORM EXIT DROPDOWN */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveDropdown(p => p === 'FORM' ? null : 'FORM')}
              className="bg-white hover:bg-[#EBF3FB] border border-[#9DB2C3] text-[#002D62] px-2 py-0.5 rounded-xs text-[10.5px] font-sans font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>Form Exit</span>
              <ChevronDown size={10} />
            </button>

            {activeDropdown === 'FORM' && (
              <div 
                className="absolute left-0 top-full mt-1 w-56 bg-white border border-[#002D62] shadow-xl z-50 text-slate-800 text-[10.5px] font-sans divide-y divide-slate-100"
                onClick={() => setActiveDropdown(null)}
              >
                <div className="bg-[#002D62] text-white px-3 py-1 text-[9.5px] font-mono font-bold uppercase">
                  Acciones de Formulario ({formDef.code})
                </div>
                <button
                  type="button"
                  onClick={onExportExcel}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#FFFCDD] hover:text-[#002D62] flex items-center justify-between"
                >
                  <span>Exportar Formulario a Excel</span>
                  <span className="font-mono text-[9px] text-emerald-700 font-bold">.XLSX</span>
                </button>
                <button
                  type="button"
                  onClick={onPrintPdf}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#FFFCDD] hover:text-[#002D62] flex items-center justify-between"
                >
                  <span>Generar Informe Oficial PDF</span>
                  <span className="font-mono text-[9px] text-rose-700 font-bold">.PDF</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenAudit}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#FFFCDD] hover:text-[#002D62] flex items-center justify-between"
                >
                  <span>Auditoría de Registro (F986110)</span>
                  <span className="font-mono text-[9px] text-indigo-700 font-bold">SOX</span>
                </button>
              </div>
            )}
          </div>

          {/* ROW EXIT DROPDOWN */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveDropdown(p => p === 'ROW' ? null : 'ROW')}
              className="bg-white hover:bg-[#EBF3FB] border border-[#9DB2C3] text-[#002D62] px-2 py-0.5 rounded-xs text-[10.5px] font-sans font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>Row Exit</span>
              <ChevronDown size={10} />
            </button>

            {activeDropdown === 'ROW' && (
              <div 
                className="absolute left-0 top-full mt-1 w-56 bg-white border border-[#002D62] shadow-xl z-50 text-slate-800 text-[10.5px] font-sans divide-y divide-slate-100"
                onClick={() => setActiveDropdown(null)}
              >
                <div className="bg-[#002D62] text-white px-3 py-1 text-[9.5px] font-mono font-bold uppercase">
                  Acciones de Fila Activa
                </div>
                <button
                  type="button"
                  onClick={onOpenAttachments}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#FFFCDD] hover:text-[#002D62] flex items-center justify-between"
                >
                  <span>Expediente & Soportes (Bóveda)</span>
                  <span className="font-mono text-[9px] text-indigo-700 font-bold">F986110D</span>
                </button>
                <button
                  type="button"
                  onClick={() => alert(`Consulta de Mayor Contable F0911 vinculada al registro actual.`)}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#FFFCDD] hover:text-[#002D62] flex items-center justify-between"
                >
                  <span>Mayor Auxiliar de Cuenta</span>
                  <span className="font-mono text-[9px] text-indigo-700 font-bold">P09200</span>
                </button>
                <button
                  type="button"
                  onClick={() => alert(`Cadena de Aprobaciones F4209 y firma SHA-256 intacta.`)}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#FFFCDD] hover:text-[#002D62] flex items-center justify-between"
                >
                  <span>Trazabilidad de Aprobación</span>
                  <span className="font-mono text-[9px] text-emerald-700 font-bold">F4209</span>
                </button>
              </div>
            )}
          </div>

          {/* TOOLS DROPDOWN */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveDropdown(p => p === 'TOOLS' ? null : 'TOOLS')}
              className="bg-white hover:bg-[#EBF3FB] border border-[#9DB2C3] text-[#002D62] px-2 py-0.5 rounded-xs text-[10.5px] font-sans font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>Tools</span>
              <ChevronDown size={10} />
            </button>

            {activeDropdown === 'TOOLS' && (
              <div 
                className="absolute left-0 top-full mt-1 w-56 bg-white border border-[#002D62] shadow-xl z-50 text-slate-800 text-[10.5px] font-sans divide-y divide-slate-100"
                onClick={() => setActiveDropdown(null)}
              >
                <div className="bg-[#002D62] text-white px-3 py-1 text-[9.5px] font-mono font-bold uppercase">
                  Herramientas de Grilla
                </div>
                <button
                  type="button"
                  onClick={onExportExcel}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#FFFCDD] hover:text-[#002D62]"
                >
                  Exportar Datos a Formato Excel
                </button>
                <button
                  type="button"
                  onClick={() => alert(`Secuencia de Ordenamiento JDE EnterpriseOne (P986110S) activa en las cabeceras de columnas.`)}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#FFFCDD] hover:text-[#002D62]"
                >
                  Secuencia de Ordenamiento (P986110S)
                </button>
                <button
                  type="button"
                  onClick={() => alert(`Formato de Grilla restablecido a los valores por defecto del sistema EnterpriseOne.`)}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#FFFCDD] hover:text-[#002D62]"
                >
                  Restablecer Formato de Grilla
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Action Fast Buttons */}
        <div className="flex items-center gap-1 shrink-0 font-sans text-[10px]">
          {onExportExcel && (
            <button
              type="button"
              onClick={onExportExcel}
              className="bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-800 px-2 py-0.5 rounded-xs font-bold flex items-center gap-1 cursor-pointer shadow-3xs"
              title="Exportar Grilla Activa a Excel"
            >
              <FileSpreadsheet size={12} />
              <span className="hidden sm:inline">Exportar Excel</span>
            </button>
          )}

          {onPrintPdf && (
            <button
              type="button"
              onClick={onPrintPdf}
              className="bg-[#002D62] hover:bg-[#001D42] text-white border border-blue-950 px-2 py-0.5 rounded-xs font-bold flex items-center gap-1 cursor-pointer shadow-3xs"
              title="Imprimir Formulario / Generar Documento Oficial"
            >
              <Printer size={12} className="text-amber-300" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
          )}
        </div>
      </div>

      {/* 
        ========================================================================
        JDE QUERY PARAMETER FORM BOX (Header Filter Strip)
        ========================================================================
      */}
      {showQueryFilterStrip && (
        <div className="bg-[#FAFBFD] border-b border-[#CBD5E1] px-3 py-1.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10.5px] font-sans text-slate-700 shrink-0">
          <div className="flex items-center gap-1">
            <span className="font-bold text-[#002D62] font-mono text-[10px]">Compañía:</span>
            <input
              type="text"
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
              className="w-14 px-1.5 py-0.2 bg-white border border-[#9DB2C3] font-mono font-bold text-[#002D62] text-[10.5px] text-center focus:outline-none focus:border-[#005B94] focus:bg-[#FFFFE1]"
            />
            <span className="text-slate-500 text-[10px] hidden md:inline">[Mutucar Inversiones]</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="font-bold text-[#002D62] font-mono text-[10px]">Unidad Negocio (MCU):</span>
            <input
              type="text"
              value={filterMCU}
              onChange={(e) => setFilterMCU(e.target.value)}
              className="w-14 px-1.5 py-0.2 bg-white border border-[#9DB2C3] font-mono font-bold text-[#002D62] text-[10.5px] text-center focus:outline-none focus:border-[#005B94] focus:bg-[#FFFFE1]"
            />
            <span className="text-slate-500 text-[10px] hidden md:inline">[Edificio Central]</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="font-bold text-[#002D62] font-mono text-[10px]">Año / Periodo:</span>
            <input
              type="text"
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="w-12 px-1 py-0.2 bg-white border border-[#9DB2C3] font-mono font-bold text-[#002D62] text-[10.5px] text-center focus:outline-none"
            />
            <span className="text-slate-400">/</span>
            <input
              type="text"
              value={filterPeriod}
              onChange={(e) => setFilterPeriod(e.target.value)}
              className="w-9 px-1 py-0.2 bg-white border border-[#9DB2C3] font-mono font-bold text-[#002D62] text-[10.5px] text-center focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1">
            <span className="font-bold text-[#002D62] font-mono text-[10px]">Tipo Libro (LT):</span>
            <input
              type="text"
              value={filterLedger}
              onChange={(e) => setFilterLedger(e.target.value)}
              className="w-10 px-1 py-0.2 bg-white border border-[#9DB2C3] font-mono font-bold text-[#002D62] text-[10.5px] text-center focus:outline-none"
            />
            <span className="text-slate-500 text-[10px] hidden lg:inline">[AA - Actual Amounts]</span>
          </div>

          <div className="ml-auto flex items-center gap-2 text-[10px] font-mono text-slate-500">
            <span className="hidden sm:inline">QBE Activo: <strong className="text-emerald-700">SI</strong></span>
            <span className="text-slate-300 hidden sm:inline">|</span>
            <span className="hidden sm:inline">Moneda: <strong className="text-[#002D62]">CLP</strong></span>
          </div>
        </div>
      )}

      {/* 
        ========================================================================
        FORM BODY (Active Module View Container)
        ========================================================================
      */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto bg-white p-2">
        {children}
      </div>

      {/* 
        ========================================================================
        JDE STATUS FOOTER (Form & Session Information)
        ========================================================================
      */}
      <div className="bg-[#D8E4F1] border-t border-[#9DB2C3] px-3 py-1 text-[10px] font-mono text-[#002D62] flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="font-bold">Formulario: {formDef.code}_{formDef.formCode}</span>
          </div>
          <span className="text-slate-400 hidden sm:inline">|</span>
          <div className="hidden sm:flex items-center gap-1 text-slate-600">
            <span>Tabla: <strong>{formDef.tableId}</strong></span>
          </div>
          <span className="text-slate-400 hidden md:inline">|</span>
          <div className="hidden md:flex items-center gap-1 text-slate-600">
            <Lock size={10} className="text-emerald-700" />
            <span>Firma Criptográfica SHA-256: <strong>CONFORME</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-3 ml-auto text-[9.5px]">
          {recordsCount !== undefined && (
            <span className="font-bold bg-white/70 px-1.5 py-0.2 border border-[#A2BCCF] rounded-xs">
              Registros: {recordsCount}
            </span>
          )}
          <span className="text-slate-400 hidden sm:inline">|</span>
          <span className="text-slate-600 hidden sm:inline">Entorno: <strong>JD910_PD</strong></span>
          <span className="text-slate-400 hidden md:inline">|</span>
          <span className="text-slate-600 hidden md:inline">Usuario: <strong>{currentUser}</strong> [{userRole}]</span>
        </div>
      </div>
    </div>
  );
};
