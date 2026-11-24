import React, { useState } from 'react';
import { 
  ShieldCheck, Plus, Search, Filter, Calendar, 
  DollarSign, User, Building2, Clock, CheckCircle, 
  AlertCircle, Download, Trash2, Edit3, X, FileText, Info,
  ArrowRightLeft, MinusCircle, PlusCircle, Printer, Save, FileCheck,
  Paperclip, FileDown, Receipt, Sparkles, FolderCheck, Archive, FileArchive, CheckSquare,
  Mail
} from 'lucide-react';
import { SecurityDeposit, LeaseContract, Property, SecurityDepositSettlement, SettlementDeduction, Transaction, OfficialDocument } from '../types';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { drawPdfAssetFlowLogo } from '../lib/defaultLogo';
import { useNotification } from './NotificationProvider';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { maskMoneyCLP } from '../lib/inputMasks';
import { useResizableColumns } from '../lib/useResizableColumns';
import { GridDimensionControls } from './common/GridDimensionControls';
import { JDEGridContextMenu } from './JDEGridContextMenu';

interface SecurityDepositModuleProps {
  deposits: SecurityDeposit[];
  contracts: LeaseContract[];
  properties: Property[];
  onSave: (deposit: SecurityDeposit) => void;
  onDelete: (id: string) => void;
  onAddTransaction?: (t: Transaction) => void;
  onAddOfficialDocument?: (doc: OfficialDocument) => void;
  onAddLeaseContract?: (c: LeaseContract) => void;
  onAddProperty?: (p: Property) => void;
  onAddBulkDemoData?: (
    newDeposits: SecurityDeposit[],
    newContracts: LeaseContract[],
    newProperties: Property[],
    newTransactions: Transaction[]
  ) => void;
  currentUser: string;
  companyLogo: string | null;
}

const SecurityDepositModule: React.FC<SecurityDepositModuleProps> = ({
  deposits = [],
  contracts = [],
  properties = [],
  onSave,
  onDelete,
  onAddTransaction,
  onAddOfficialDocument,
  onAddLeaseContract,
  onAddProperty,
  onAddBulkDemoData,
  currentUser,
  companyLogo
}) => {
  const [activeTab, setActiveTab] = useState<'deposits' | 'settlements'>('deposits');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSettlementOpen, setIsSettlementOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeposit, setSelectedDeposit] = useState<SecurityDeposit | null>(null);
  
  const [consolidationSuccess, setConsolidationSuccess] = useState<{
    title: string;
    tenant: string;
    property: string;
    folio: string;
    refundAmount: number;
    actions: string[];
    emailDispatch?: {
      smtpHost: string;
      sender: string;
      recipients: string[];
      subject: string;
      timestamp: string;
      messageId: string;
      status: string;
    };
  } | null>(null);

  const [consolidationError, setConsolidationError] = useState<{
    title: string;
    message: string;
    solutions: string[];
  } | null>(null);

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [showConsolidateConfirm, setShowConsolidateConfirm] = useState<boolean>(false);
  const [selectedDossierDeposit, setSelectedDossierDeposit] = useState<SecurityDeposit | null>(null);

  // Context Menu state
  const [gridContextMenu, setGridContextMenu] = useState<{
    x: number;
    y: number;
    deposit: SecurityDeposit;
  } | null>(null);

  // Resizable columns & rows
  const {
    widths,
    onMouseDown,
    onColumnDoubleClick,
    onRowMouseDown,
    onRowDoubleClick,
    getRowHeight,
    defaultRowHeight,
    setDefaultRowHeight,
    resetWidths,
    resetHeights,
    resetAll
  } = useResizableColumns({
    initialWidths: {
      id: 110,
      arrendatario: 220,
      propiedad: 220,
      fecha: 120,
      monto: 140,
      estado: 140,
      operacion: 160,
      acciones: 80
    },
    initialRowHeight: 46,
    storageKey: 'jde_security_deposits_grid'
  });
  
  const { notify } = useNotification();

  const [formData, setFormData] = useState<Partial<SecurityDeposit>>({
    contractId: '',
    initialAmount: 0,
    currency: 'CLP',
    depositDate: new Date().toISOString().split('T')[0],
    status: 'RESGUARDADA'
  });

  const [settlementData, setSettlementData] = useState<Partial<SecurityDepositSettlement>>({
    settlementDate: new Date().toISOString().split('T')[0],
    deductions: [],
    observations: '',
    folio: ''
  });

  // Safe default and filter for deposits
  const safeDeposits = deposits || [];

  // Filter deposits
  const filteredDeposits = safeDeposits.filter(d => {
    const tenant = d?.tenantName || '';
    const label = d?.propertyLabel || '';
    return tenant.toLowerCase().includes(searchQuery.toLowerCase()) ||
           label.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Filter settlements (deposits with settlement data)
  const settledDeposits = safeDeposits.filter(d => {
    if (!d || !d.settlement) return false;
    const tenant = d.tenantName || '';
    const label = d.propertyLabel || '';
    const folio = d.settlement.folio || '';
    return tenant.toLowerCase().includes(searchQuery.toLowerCase()) ||
           label.toLowerCase().includes(searchQuery.toLowerCase()) ||
           folio.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleCreateDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.contractId) return;

    const contract = contracts.find(c => c.id === formData.contractId);
    if (!contract) return;

    const newDeposit: SecurityDeposit = {
      id: `sd-${Date.now()}`,
      contractId: contract.id,
      propertyId: contract.propertyId,
      propertyLabel: contract.propertyLabel,
      tenantName: contract.tenantName,
      initialAmount: formData.initialAmount || 0,
      currency: formData.currency as 'CLP' | 'UF',
      depositDate: formData.depositDate || new Date().toISOString().split('T')[0],
      status: 'RESGUARDADA',
      userCreator: currentUser,
      timestamp: Date.now()
    };

    onSave(newDeposit);
    
    // Create an income transaction for the deposit
    if (onAddTransaction) {
      const transaction: Transaction = {
        id: `t-sd-${Date.now()}`,
        description: `GARANTÍA DE ARRIENDO: ${contract.tenantName} - ${contract.propertyLabel}`,
        amount: newDeposit.initialAmount,
        category: 'ARRIENDOS',
        type: 'INCOME',
        documentType: 'DEPÓSITO',
        documentNumber: 'G-' + Date.now().toString().slice(-6),
        date: newDeposit.depositDate,
        invoiceDate: newDeposit.depositDate,
        user: currentUser,
        timestamp: Date.now(),
        propertyId: newDeposit.propertyId,
        insuranceCompany: 'GENERALES',
        relatedEntityId: newDeposit.id,
        relatedEntityType: 'GARANTIA',
        lockedBy: null,
        lockedAt: null
      };
      onAddTransaction(transaction);
    }

    notify("Garantía registrada correctamente", 'success');
    setIsFormOpen(false);
    resetForm();
  };

  const handleGenerateDemoData = async () => {
    // Check if demo is already generated; if so, clear them so they can be regenerated cleanly
    if (!onAddBulkDemoData) {
      const hasDemo = deposits.some(d => d.id.startsWith('sd-demo-'));
      if (hasDemo) {
        const demoDepositIds = deposits.filter(d => d.id.startsWith('sd-demo-')).map(d => d.id);
        for (const id of demoDepositIds) {
          onDelete(id);
        }
      }
    }

    // Generate matching properties and contracts first for total interconnectivity
    const demoProperties: Property[] = [
      {
        id: 'p-demo-1',
        code: 'PROV-502',
        building: 'EDIFICIO PROVIDENCIA',
        floor: '5',
        address: 'Av. Providencia 1420, Depto 502',
        commune: 'Providencia',
        type: 'DEPARTAMENTO',
        propertyRole: '312-502',
        appraisalValue: 120000000,
        isTest: true
      },
      {
        id: 'p-demo-2',
        code: 'ALER-4',
        building: 'CONDOMINIO LOS ALERCES',
        floor: '1',
        address: 'Condominio Los Alerces 450, Casa 4',
        commune: 'Peñalolén',
        type: 'CASA',
        propertyRole: '154-4',
        appraisalValue: 210000000,
        isTest: true
      },
      {
        id: 'p-demo-3',
        code: 'SISI-1408',
        building: 'EDIFICIO SAN ISIDRO',
        floor: '14',
        address: 'San Isidro 350, Depto 1408',
        commune: 'Santiago Centro',
        type: 'DEPARTAMENTO',
        propertyRole: '109-1408',
        appraisalValue: 75000000,
        isTest: true
      },
      {
        id: 'p-demo-4',
        code: 'VITA-1104',
        building: 'EDIFICIO VITACURA 5600',
        floor: '11',
        address: 'Av. Vitacura 5600, Depto 1104',
        commune: 'Vitacura',
        type: 'DEPARTAMENTO',
        propertyRole: '815-1104',
        appraisalValue: 290000000,
        isTest: true
      },
      {
        id: 'p-demo-5',
        code: 'SSEB-301',
        building: 'EDIFICIO SAN SEBASTIAN',
        floor: '3',
        address: 'San Sebastián 2800, Depto 301',
        commune: 'Las Condes',
        type: 'DEPARTAMENTO',
        propertyRole: '224-301',
        appraisalValue: 185000000,
        isTest: true
      },
      {
        id: 'p-demo-6',
        code: 'HUER-909',
        building: 'EDIFICIO HUERFANOS',
        floor: '9',
        address: 'Huérfanos 1400, Depto 909',
        commune: 'Santiago Centro',
        type: 'DEPARTAMENTO',
        propertyRole: '124-909',
        appraisalValue: 80000000,
        isTest: true
      },
      {
        id: 'p-demo-7',
        code: 'LILA-12',
        building: 'CONDOMINIO LAS LILAS',
        floor: '1',
        address: 'Calle Las Lilas 880, Casa 12',
        commune: 'La Reina',
        type: 'CASA',
        propertyRole: '210-12',
        appraisalValue: 320000000,
        isTest: true
      },
      {
        id: 'p-demo-8',
        code: 'KENN-1702',
        building: 'EDIFICIO PARQUE KENNEDY',
        floor: '17',
        address: 'Av. Kennedy 4800, Depto 1702',
        commune: 'Vitacura',
        type: 'DEPARTAMENTO',
        propertyRole: '655-1702',
        appraisalValue: 340000000,
        isTest: true
      },
      {
        id: 'p-demo-9',
        code: 'GOLF-604',
        building: 'AV. EL GOLF',
        floor: '6',
        address: 'Av. El Golf 99, Depto 604',
        commune: 'Las Condes',
        type: 'DEPARTAMENTO',
        propertyRole: '512-604',
        appraisalValue: 310000000,
        isTest: true
      },
      {
        id: 'p-demo-10',
        code: 'MARIN-403',
        building: 'EDIFICIO MARIN 450',
        floor: '4',
        address: 'Marin 450, Depto 403',
        commune: 'Santiago Centro',
        type: 'DEPARTAMENTO',
        propertyRole: '315-403',
        appraisalValue: 85000000,
        isTest: true
      }
    ];

    const demoContracts: LeaseContract[] = [
      {
        id: 'c-demo-1',
        propertyId: 'p-demo-1',
        propertyLabel: 'PROV-502 - Depto 502, Av. Providencia 1420, Providencia',
        tenantName: 'Carolina Soto Sanhueza',
        tenantTaxId: '15.678.901-2',
        startDate: '2025-03-10',
        endDate: '2026-03-09',
        monthlyAmount: 650000,
        currency: 'CLP',
        status: 'VIGENTE',
        userCreator: currentUser,
        timestamp: Date.now()
      },
      {
        id: 'c-demo-2',
        propertyId: 'p-demo-2',
        propertyLabel: 'ALER-4 - Condominio Los Alerces 450, Casa 4, Peñalolén',
        tenantName: 'Alejandro Muñoz Vergara',
        tenantTaxId: '12.345.678-9',
        startDate: '2024-06-15',
        endDate: '2025-06-14',
        monthlyAmount: 1200000,
        currency: 'CLP',
        status: 'VIGENTE',
        userCreator: currentUser,
        timestamp: Date.now()
      },
      {
        id: 'c-demo-3',
        propertyId: 'p-demo-3',
        propertyLabel: 'SISI-1408 - San Isidro 350, Depto 1408, Santiago Centro',
        tenantName: 'Valentina Rojas Oyarzún',
        tenantTaxId: '18.456.789-0',
        startDate: '2025-01-20',
        endDate: '2026-01-19',
        monthlyAmount: 450000,
        currency: 'CLP',
        status: 'VIGENTE',
        userCreator: currentUser,
        timestamp: Date.now()
      },
      {
        id: 'c-demo-4',
        propertyId: 'p-demo-4',
        propertyLabel: 'VITA-1104 - Av. Vitacura 5600, Depto 1104, Vitacura',
        tenantName: 'Gonzalo Fuentes Henríquez',
        tenantTaxId: '14.987.654-3',
        startDate: '2024-01-10',
        endDate: '2025-01-09',
        monthlyAmount: 1500000,
        currency: 'CLP',
        status: 'VIGENTE',
        userCreator: currentUser,
        timestamp: Date.now()
      },
      {
        id: 'c-demo-5',
        propertyId: 'p-demo-5',
        propertyLabel: 'SSEB-301 - San Sebastián 2800, Depto 301, Las Condes',
        tenantName: 'María José Alessandri',
        tenantTaxId: '16.123.456-k',
        startDate: '2024-11-01',
        endDate: '2025-10-31',
        monthlyAmount: 950000,
        currency: 'CLP',
        status: 'VIGENTE',
        userCreator: currentUser,
        timestamp: Date.now()
      },
      {
        id: 'c-demo-6',
        propertyId: 'p-demo-6',
        propertyLabel: 'HUER-909 - Huérfanos 1400, Depto 909, Santiago Centro',
        tenantName: 'Sebastián Astaburuaga Lira',
        tenantTaxId: '17.789.123-4',
        startDate: '2025-05-12',
        endDate: '2026-05-11',
        monthlyAmount: 380000,
        currency: 'CLP',
        status: 'VIGENTE',
        userCreator: currentUser,
        timestamp: Date.now()
      },
      {
        id: 'c-demo-7',
        propertyId: 'p-demo-7',
        propertyLabel: 'LILA-12 - Calle Las Lilas 880, Casa 12, La Reina',
        tenantName: 'Javiera Toledo Galdames',
        tenantTaxId: '15.987.123-0',
        startDate: '2023-12-01',
        endDate: '2024-11-30',
        monthlyAmount: 1800000,
        currency: 'CLP',
        status: 'VIGENTE',
        userCreator: currentUser,
        timestamp: Date.now()
      },
      {
        id: 'c-demo-8',
        propertyId: 'p-demo-8',
        propertyLabel: 'KENN-1702 - Av. Kennedy 4800, Depto 1702, Vitacura',
        tenantName: 'Pedro Pablo Errázuriz',
        tenantTaxId: '10.342.123-5',
        startDate: '2024-03-01',
        endDate: '2025-02-28',
        monthlyAmount: 2200000,
        currency: 'CLP',
        status: 'VIGENTE',
        userCreator: currentUser,
        timestamp: Date.now()
      },
      {
        id: 'c-demo-9',
        propertyId: 'p-demo-9',
        propertyLabel: 'GOLF-604 - Av. El Golf 99, Depto 604, Las Condes',
        tenantName: 'Camila Ignacia Benavides',
        tenantTaxId: '19.124.532-6',
        startDate: '2025-02-15',
        endDate: '2026-02-14',
        monthlyAmount: 1100000,
        currency: 'CLP',
        status: 'VIGENTE',
        userCreator: currentUser,
        timestamp: Date.now()
      },
      {
        id: 'c-demo-10',
        propertyId: 'p-demo-10',
        propertyLabel: 'MARIN-403 - Marin 450, Depto 403, Santiago Centro',
        tenantName: 'Felipe Ignacio Carrasco',
        tenantTaxId: '18.987.654-k',
        startDate: '2025-06-01',
        endDate: '2026-05-31',
        monthlyAmount: 400000,
        currency: 'CLP',
        status: 'VIGENTE',
        userCreator: currentUser,
        timestamp: Date.now()
      }
    ];

    // Seed properties
    if (!onAddBulkDemoData && onAddProperty) {
      for (const p of demoProperties) {
        if (!properties.some(existP => existP.id === p.id)) {
          onAddProperty(p);
        }
      }
    }

    // Seed contracts
    if (!onAddBulkDemoData && onAddLeaseContract) {
      for (const c of demoContracts) {
        if (!contracts.some(existC => existC.id === c.id)) {
          onAddLeaseContract(c);
        }
      }
    }

    const MINIMAL_PDF_BASE64 = "data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iagogIDw8L1R5cGUgL0NhdGFsb2cgL1BhZ2VzIDIgMCBSPj4gZW5kb2JqCjIgMCBvYmogIDw8L1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDE+PiBlbmRvYmoKMyAwIG9iagogIDw8L1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCA1OTUgODQyXSAvQ29udGVudHMgNCAwIFI+PiBlbmRvYmoKNCAwIG9iagogIDw8L0xlbmd0aCA2MD4+IHN0cmVhbQpCVAovRjEgMTIgVGYKNzAgNzg2IFRkCihDb21wcm9iYW50ZSBkZSBHYXN0byAtIE1VVFVDQVIgRVJQKSBUagpFVAplbmRzdHJlYW0gZW5kb2JqCnhyZWYKMCA1CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxOCAwMDAwMCBuIAowMDAwMDAwMDc3IDAwMDAwIG4gCjAwMDAwMDAxMzYgMDAwMDAgbiAKMDAwMDAwMDIzMSAwMDAwMCBuIAp0cmFpbGVyCiAgPDwvU2l6ZSA1IC9Sb290IDEgMCBSPj4Kc3RhcnR4cmVmCiAzNDAKJSVFT0Y=";

    const demoDeposits: SecurityDeposit[] = [
      {
        id: 'sd-demo-1',
        contractId: 'c-demo-1',
        propertyId: 'p-demo-1',
        propertyLabel: 'Depto 502, Av. Providencia 1420, Providencia',
        tenantName: 'Carolina Soto Sanhueza',
        initialAmount: 650000,
        currency: 'CLP',
        depositDate: '2025-03-10',
        status: 'RESGUARDADA',
        userCreator: currentUser,
        timestamp: Date.now() - 10 * 24 * 3600 * 1000
      },
      {
        id: 'sd-demo-2',
        contractId: 'c-demo-2',
        propertyId: 'p-demo-2',
        propertyLabel: 'Casa 4, Condominio Los Alerces 450, Peñalolén',
        tenantName: 'Alejandro Muñoz Vergara',
        initialAmount: 1200000,
        currency: 'CLP',
        depositDate: '2024-06-15',
        status: 'RESGUARDADA',
        userCreator: currentUser,
        timestamp: Date.now() - 15 * 24 * 3600 * 1000
      },
      {
        id: 'sd-demo-3',
        contractId: 'c-demo-3',
        propertyId: 'p-demo-3',
        propertyLabel: 'Depto 1408, San Isidro 350, Santiago Centro',
        tenantName: 'Valentina Rojas Oyarzún',
        initialAmount: 450000,
        currency: 'CLP',
        depositDate: '2025-01-20',
        status: 'RESGUARDADA',
        userCreator: currentUser,
        timestamp: Date.now() - 20 * 24 * 3600 * 1000
      },
      {
        id: 'sd-demo-4',
        contractId: 'c-demo-4',
        propertyId: 'p-demo-4',
        propertyLabel: 'Depto 1104, Av. Vitacura 5600, Vitacura',
        tenantName: 'Gonzalo Fuentes Henríquez',
        initialAmount: 1500000,
        currency: 'CLP',
        depositDate: '2024-01-10',
        status: 'EN_LIQUIDACION',
        userCreator: currentUser,
        timestamp: Date.now() - 30 * 24 * 3600 * 1000,
        settlement: {
          id: 'set-demo-4',
          depositId: 'sd-demo-4',
          settlementDate: '2026-06-25',
          originalAmount: 1500000,
          deductions: [
            {
              id: 'ded-demo-4-1',
              concept: 'Limpieza y desengrasado cocina',
              amount: 65000,
              description: 'Limpieza profunda de campana y horno por entrega en malas condiciones.'
            },
            {
              id: 'ded-demo-4-2',
              concept: 'Vidrio quebrado terraza',
              amount: 45000,
              description: 'Reposición de panel de vidrio templado dañado.'
            }
          ],
          totalDeductions: 110000,
          refundAmount: 1390000,
          status: 'BORRADOR',
          userCreator: currentUser,
          timestamp: Date.now() - 5 * 24 * 3600 * 1000,
          observations: 'Entrega física realizada. Quedan reparaciones menores pendientes por ejecutar.',
          folio: 'LG-2026-4402'
        }
      },
      {
        id: 'sd-demo-5',
        contractId: 'c-demo-5',
        propertyId: 'p-demo-5',
        propertyLabel: 'Depto 301, San Sebastián 2800, Las Condes',
        tenantName: 'María José Alessandri',
        initialAmount: 950000,
        currency: 'CLP',
        depositDate: '2024-11-01',
        status: 'LIQUIDADA',
        userCreator: currentUser,
        timestamp: Date.now() - 100 * 24 * 3600 * 1000,
        settlement: {
          id: 'set-demo-5',
          depositId: 'sd-demo-5',
          settlementDate: '2026-06-10',
          originalAmount: 950000,
          deductions: [
            {
              id: 'ded-demo-5-1',
              concept: 'Luz Chilquinta Pendiente',
              amount: 38500,
              description: 'Boleta de electricidad mes de Mayo pendiente de pago por el arrendatario.',
              attachmentName: 'boleta_luz_mayo.pdf',
              attachmentData: MINIMAL_PDF_BASE64
            },
            {
              id: 'ded-demo-5-2',
              concept: 'Pintura Muros Dormitorio',
              amount: 120000,
              description: 'Repintado completo por manchas de humedad no ventilada.',
              attachmentName: 'factura_pintor_soto.pdf',
              attachmentData: MINIMAL_PDF_BASE64
            }
          ],
          totalDeductions: 158500,
          refundAmount: 791500,
          status: 'FINALIZADA',
          userCreator: currentUser,
          timestamp: Date.now() - 20 * 24 * 3600 * 1000,
          observations: 'Se descuentan consumos de luz y mano de obra de pintura de dormitorio. Acta firmada conforme.',
          folio: 'LG-2026-1029'
        }
      },
      {
        id: 'sd-demo-6',
        contractId: 'c-demo-6',
        propertyId: 'p-demo-6',
        propertyLabel: 'Depto 909, Huérfanos 1400, Santiago Centro',
        tenantName: 'Sebastián Astaburuaga Lira',
        initialAmount: 380000,
        currency: 'CLP',
        depositDate: '2025-05-12',
        status: 'RESGUARDADA',
        userCreator: currentUser,
        timestamp: Date.now() - 40 * 24 * 3600 * 1000
      },
      {
        id: 'sd-demo-7',
        contractId: 'c-demo-7',
        propertyId: 'p-demo-7',
        propertyLabel: 'Casa 12, Calle Las Lilas 880, La Reina',
        tenantName: 'Javiera Toledo Galdames',
        initialAmount: 1800000,
        currency: 'CLP',
        depositDate: '2023-12-01',
        status: 'LIQUIDADA',
        userCreator: currentUser,
        timestamp: Date.now() - 500 * 24 * 3600 * 1000,
        settlement: {
          id: 'set-demo-7',
          depositId: 'sd-demo-7',
          settlementDate: '2026-06-18',
          originalAmount: 1800000,
          deductions: [],
          totalDeductions: 0,
          refundAmount: 1800000,
          status: 'FINALIZADA',
          userCreator: currentUser,
          timestamp: Date.now() - 12 * 24 * 3600 * 1000,
          observations: 'Propiedad entregada en excelentes condiciones, idénticas al inventario inicial. Devolución de garantía al 100%.',
          folio: 'LG-2026-2248'
        }
      },
      {
        id: 'sd-demo-8',
        contractId: 'c-demo-8',
        propertyId: 'p-demo-8',
        propertyLabel: 'Depto 1702, Av. Kennedy 4800, Vitacura',
        tenantName: 'Pedro Pablo Errázuriz',
        initialAmount: 2200000,
        currency: 'CLP',
        depositDate: '2024-03-01',
        status: 'LIQUIDADA',
        userCreator: currentUser,
        timestamp: Date.now() - 300 * 24 * 3600 * 1000,
        settlement: {
          id: 'set-demo-8',
          depositId: 'sd-demo-8',
          settlementDate: '2026-06-20',
          originalAmount: 2200000,
          deductions: [
            {
              id: 'ded-demo-8-1',
              concept: 'Reparación Piso Flotante',
              amount: 340000,
              description: 'Cambio de tablas dañadas por filtración de macetero.',
              attachmentName: 'comprobante_reparacion_piso.pdf',
              attachmentData: MINIMAL_PDF_BASE64
            },
            {
              id: 'ded-demo-8-2',
              concept: 'Gastos Comunes Pendientes',
              amount: 185000,
              description: 'Gasto común de Mayo cobrado retroactivamente.',
              attachmentName: 'boleta_ggcc_mayo.pdf',
              attachmentData: MINIMAL_PDF_BASE64
            },
            {
              id: 'ded-demo-8-3',
              concept: 'Boleta de Gas Gasco',
              amount: 42300,
              description: 'Consumo de gas pendiente.',
              attachmentName: 'boleta_gasco_pendiente.pdf',
              attachmentData: MINIMAL_PDF_BASE64
            }
          ],
          totalDeductions: 567300,
          refundAmount: 1632700,
          status: 'FINALIZADA',
          userCreator: currentUser,
          timestamp: Date.now() - 10 * 24 * 3600 * 1000,
          observations: 'Liquidación de garantía con deducción de daños severos al piso y consumos pendientes. Respaldo fotográfico adjunto en bitácora.',
          folio: 'LG-2026-9051'
        }
      },
      {
        id: 'sd-demo-9',
        contractId: 'c-demo-9',
        propertyId: 'p-demo-9',
        propertyLabel: 'Depto 604, Av. El Golf 99, Las Condes',
        tenantName: 'Camila Ignacia Benavides',
        initialAmount: 1100000,
        currency: 'CLP',
        depositDate: '2025-02-15',
        status: 'EN_LIQUIDACION',
        userCreator: currentUser,
        timestamp: Date.now() - 150 * 24 * 3600 * 1000,
        settlement: {
          id: 'set-demo-9',
          depositId: 'sd-demo-9',
          settlementDate: '2026-06-28',
          originalAmount: 1100000,
          deductions: [
            {
              id: 'ded-demo-9-1',
              concept: 'Limpieza Alfombras',
              amount: 75000,
              description: 'Lavado de alfombras dormitorio principal por manchas de café.'
            }
          ],
          totalDeductions: 75000,
          refundAmount: 1025000,
          status: 'BORRADOR',
          userCreator: currentUser,
          timestamp: Date.now() - 2 * 24 * 3600 * 1000,
          observations: 'Pendiente boleta de agua para cálculo final.',
          folio: 'LG-2026-3104'
        }
      },
      {
        id: 'sd-demo-10',
        contractId: 'c-demo-10',
        propertyId: 'p-demo-10',
        propertyLabel: 'Depto 403, Marin 450, Santiago Centro',
        tenantName: 'Felipe Ignacio Carrasco',
        initialAmount: 400000,
        currency: 'CLP',
        depositDate: '2025-06-01',
        status: 'LIQUIDADA',
        userCreator: currentUser,
        timestamp: Date.now() - 30 * 24 * 3600 * 1000,
        settlement: {
          id: 'set-demo-10',
          depositId: 'sd-demo-10',
          settlementDate: '2026-06-15',
          originalAmount: 400000,
          deductions: [
            {
              id: 'ded-demo-10-1',
              concept: 'Reparación Chapa de Entrada',
              amount: 55000,
              description: 'Cambio de cerradura de acceso principal dañada.',
              attachmentName: 'boleta_cerrajero_marin.pdf',
              attachmentData: MINIMAL_PDF_BASE64
            }
          ],
          totalDeductions: 55000,
          refundAmount: 345000,
          status: 'FINALIZADA',
          userCreator: currentUser,
          timestamp: Date.now() - 15 * 24 * 3600 * 1000,
          observations: 'Cerradura rota por uso inadecuado. Descuento validado.',
          folio: 'LG-2026-5561'
        }
      }
    ];

    if (onAddBulkDemoData) {
      const demoTransactions: Transaction[] = [];
      for (const d of demoDeposits) {
        // Register income transaction
        const incomeTx: Transaction = {
          id: `t-sd-${d.id}`,
          description: `GARANTÍA DE ARRIENDO (DEMO): ${d.tenantName} - ${d.propertyLabel}`,
          amount: d.initialAmount,
          category: 'ARRIENDOS',
          type: 'INCOME',
          documentType: 'DEPÓSITO',
          documentNumber: 'G-' + d.id.slice(-4),
          date: d.depositDate,
          invoiceDate: d.depositDate,
          user: currentUser,
          timestamp: Date.now(),
          propertyId: d.propertyId,
          insuranceCompany: 'GENERALES',
          relatedEntityId: d.id,
          relatedEntityType: 'GARANTIA',
          lockedBy: null,
          lockedAt: null
        };
        demoTransactions.push(incomeTx);

        // Register expense transaction if finalized
        if (d.status === 'LIQUIDADA' && d.settlement && d.settlement.refundAmount > 0) {
          const refundTx: Transaction = {
            id: `t-refund-${d.id}`,
            description: `DEVOLUCIÓN DE GARANTÍA (DEMO): ${d.tenantName} - ${d.propertyLabel}`,
            amount: d.settlement.refundAmount,
            category: 'LIQUIDACIÓN DE GARANTÍA',
            type: 'EXPENSE',
            documentType: 'LIQUIDACIÓN DE GARANTÍA',
            documentNumber: d.settlement.folio || 'REF-' + d.id.slice(-4),
            date: d.settlement.settlementDate,
            invoiceDate: d.settlement.settlementDate,
            user: currentUser,
            timestamp: Date.now(),
            propertyId: d.propertyId,
            insuranceCompany: 'GENERALES',
            relatedEntityId: d.id,
            relatedEntityType: 'GARANTIA',
            lockedBy: null,
            lockedAt: null
          };
          demoTransactions.push(refundTx);
        }
      }

      onAddBulkDemoData(demoDeposits, demoContracts, demoProperties, demoTransactions);
      notify("10 Registros de prueba generados exitosamente con sus transacciones y folios.", 'success');
      return;
    }

    // Save each deposit (triggers firestore save and audit log entry)
    for (const d of demoDeposits) {
      onSave(d);
      
      // Register income transaction
      if (onAddTransaction) {
        const incomeTx: Transaction = {
          id: `t-sd-${d.id}`,
          description: `GARANTÍA DE ARRIENDO (DEMO): ${d.tenantName} - ${d.propertyLabel}`,
          amount: d.initialAmount,
          category: 'ARRIENDOS',
          type: 'INCOME',
          documentType: 'DEPÓSITO',
          documentNumber: 'G-' + d.id.slice(-4),
          date: d.depositDate,
          invoiceDate: d.depositDate,
          user: currentUser,
          timestamp: Date.now(),
          propertyId: d.propertyId,
          insuranceCompany: 'GENERALES',
          relatedEntityId: d.id,
          relatedEntityType: 'GARANTIA',
          lockedBy: null,
          lockedAt: null
        };
        onAddTransaction(incomeTx);

        // Register expense transaction if finalized
        if (d.status === 'LIQUIDADA' && d.settlement && d.settlement.refundAmount > 0) {
          const refundTx: Transaction = {
            id: `t-refund-${d.id}`,
            description: `DEVOLUCIÓN DE GARANTÍA (DEMO): ${d.tenantName} - ${d.propertyLabel}`,
            amount: d.settlement.refundAmount,
            category: 'LIQUIDACIÓN DE GARANTÍA',
            type: 'EXPENSE',
            documentType: 'LIQUIDACIÓN DE GARANTÍA',
            documentNumber: d.settlement.folio || 'REF-' + d.id.slice(-4),
            date: d.settlement.settlementDate,
            invoiceDate: d.settlement.settlementDate,
            user: currentUser,
            timestamp: Date.now(),
            propertyId: d.propertyId,
            insuranceCompany: 'GENERALES',
            relatedEntityId: d.id,
            relatedEntityType: 'GARANTIA',
            lockedBy: null,
            lockedAt: null
          };
          onAddTransaction(refundTx);
        }
      }
    }

    notify("10 Registros de prueba generados exitosamente con sus transacciones y folios.", 'success');
  };

  const handleOpenSettlement = (deposit: SecurityDeposit) => {
    setSelectedDeposit(deposit);
    // Generate an elegant sequential/random default Folio LG if none exists yet
    const generatedFolio = deposit.settlement?.folio || `LG-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    setSettlementData({
      id: deposit.settlement?.id || `set-${Date.now()}`,
      depositId: deposit.id,
      settlementDate: deposit.settlement?.settlementDate || new Date().toISOString().split('T')[0],
      originalAmount: deposit.initialAmount,
      deductions: deposit.settlement?.deductions || [],
      totalDeductions: deposit.settlement?.totalDeductions || 0,
      refundAmount: deposit.settlement?.refundAmount || deposit.initialAmount,
      status: deposit.settlement?.status || 'BORRADOR',
      observations: deposit.settlement?.observations || '',
      folio: generatedFolio
    });
    setIsSettlementOpen(true);
  };

  const addDeduction = () => {
    const newDeduction: SettlementDeduction = {
      id: `ded-${Date.now()}`,
      concept: '',
      amount: 0,
      description: ''
    };
    setSettlementData(prev => ({
      ...prev,
      deductions: [...(prev.deductions || []), newDeduction]
    }));
  };

  const removeDeduction = (id: string) => {
    setSettlementData(prev => {
      const updatedDeductions = (prev.deductions || []).filter(d => d.id !== id);
      const totalDeductions = updatedDeductions.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
      const originalAmount = prev.originalAmount || 0;
      return {
        ...prev,
        deductions: updatedDeductions,
        totalDeductions,
        refundAmount: originalAmount - totalDeductions
      };
    });
  };

  const updateDeduction = (id: string, field: keyof SettlementDeduction, value: any) => {
    setSettlementData(prev => {
      const updatedDeductions = (prev.deductions || []).map(d => 
        d.id === id ? { ...d, [field]: value } : d
      );
      const totalDeductions = updatedDeductions.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
      const originalAmount = prev.originalAmount || 0;
      
      return {
        ...prev,
        deductions: updatedDeductions,
        totalDeductions,
        refundAmount: originalAmount - totalDeductions
      };
    });
  };

  const handleFileChange = (deductionId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Data = e.target?.result as string;
      updateDeduction(deductionId, 'attachmentName', file.name);
      updateDeduction(deductionId, 'attachmentData', base64Data);
      notify(`Comprobante "${file.name}" adjuntado correctamente`, 'success');
    };
    reader.readAsDataURL(file);
  };

  const getUserEmail = (username: string) => {
    if (username === 'DEVELOPER') return 'samaheim@gmail.com';
    if (username === 'CRISTIAN MUÑOZ R.') return 'cristian.munoz@inmobiliariapro.cl';
    if (username === 'JMARCO CALDERON MORAGA') return 'j.calderon@inmobiliariapro.cl';
    if (username === 'LUIS GUTIERREZ SEVERINO') return 'l.gutierrez@inmobiliariapro.cl';
    if (username === 'DIEGO DIAZ') return 'd.diaz@inmobiliariapro.cl';
    if (username === 'ALFREDO COVARRUBIAS') return 'a.covarrubias@inmobiliariapro.cl';
    if (username === 'FRANCISCO MARDONES') return 'f.mardones@inmobiliariapro.cl';
    if (username === 'CARLOS ULLOA') return 'c.ulloa@inmobiliariapro.cl';
    return `${username.toLowerCase().replace(/\s+/g, '')}@inmobiliariapro.cl`;
  };

  const handleSaveSettlement = (finalStatus: 'BORRADOR' | 'FINALIZADA') => {
    if (!selectedDeposit) return;

    try {
      // Input validation for safety
      if (finalStatus === 'FINALIZADA' && !settlementData.folio) {
        throw new Error("El número de folio de liquidación es requerido para consolidar y finalizar formalmente.");
      }

      const finalSettlement: SecurityDepositSettlement = {
        id: settlementData.id!,
        depositId: selectedDeposit.id,
        settlementDate: settlementData.settlementDate!,
        originalAmount: settlementData.originalAmount!,
        deductions: settlementData.deductions!,
        totalDeductions: settlementData.totalDeductions!,
        refundAmount: settlementData.refundAmount!,
        status: finalStatus,
        userCreator: currentUser,
        timestamp: Date.now(),
        observations: settlementData.observations,
        folio: settlementData.folio || `LG-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
      };

      const updatedDeposit: SecurityDeposit = {
        ...selectedDeposit,
        status: finalStatus === 'FINALIZADA' ? 'LIQUIDADA' : 'EN_LIQUIDACION',
        settlement: finalSettlement
      };

      // Perform primary save
      onSave(updatedDeposit);
      
      let isTxAdded = false;
      // If finalized and there's a refund, create an expense transaction
      if (finalStatus === 'FINALIZADA' && finalSettlement.refundAmount > 0 && onAddTransaction) {
          const transaction: Transaction = {
            id: `t-refund-${Date.now()}`,
            description: `DEVOLUCIÓN DE GARANTÍA: ${selectedDeposit.tenantName} - ${selectedDeposit.propertyLabel}`,
            amount: finalSettlement.refundAmount,
            category: 'LIQUIDACIÓN DE GARANTÍA',
            type: 'EXPENSE',
            documentType: 'LIQUIDACIÓN DE GARANTÍA',
            documentNumber: finalSettlement.folio || 'REF-' + Date.now().toString().slice(-6),
            date: finalSettlement.settlementDate,
            invoiceDate: finalSettlement.settlementDate,
            user: currentUser,
            timestamp: Date.now(),
            propertyId: selectedDeposit.propertyId,
            insuranceCompany: 'GENERALES',
            relatedEntityId: selectedDeposit.id,
            relatedEntityType: 'GARANTIA',
            lockedBy: null,
            lockedAt: null
          };
          onAddTransaction(transaction);
          isTxAdded = true;
      }

      if (finalStatus === 'FINALIZADA') {
          // Generar automáticamente el dossier ZIP y guardarlo en la Bóveda Digital
          setTimeout(() => {
            handleSyncDossierToVault(updatedDeposit, finalSettlement);
          }, 500);

          const tenantEmail = `${selectedDeposit.tenantName.toLowerCase().replace(/\s+/g, '')}@inmobiliariapro.cl`;
          const executiveEmail = 'a.covarrubias@inmobiliariapro.cl';
          const operatorEmail = getUserEmail(currentUser);

          // Show interactive summary modal
          setConsolidationSuccess({
            title: "CONSOLIDACIÓN Y FINALIZACIÓN EXITOSA",
            tenant: selectedDeposit.tenantName,
            property: selectedDeposit.propertyLabel,
            folio: finalSettlement.folio,
            refundAmount: finalSettlement.refundAmount,
            actions: [
              "Cambio de estado del depósito de garantía a 'LIQUIDADA' de forma irrevocable.",
              `Asignación y registro de Folio del documento: ${finalSettlement.folio}.`,
              isTxAdded 
                ? `Imputación y registro automático de transacción de egreso por ${finalSettlement.refundAmount.toLocaleString()} CLP en el Libro Auxiliar contable para devolución.`
                : "Se consolida sin egreso (el total de descuentos aplicados cubre el 100% de la garantía).",
              "Cambio de estado del contrato de arriendo respectivo a 'FINIQUITADO' de forma automática.",
              "Liberación del inmueble correspondiente, quedando la propiedad en estado 'DISPONIBLE'.",
              "Envío y certificación de correo SMTP transaccional de cierre a las partes interesadas.",
              "Sincronización segura de la ficha de resguardo en Firestore / Base de Datos de Gestión Integrada.",
              "Generación de comprobante PDF foliado y timbrado digitalmente listo para el arrendatario.",
              "Compilación y empaquetado del Set Consolidado de Documentos (.ZIP) en la Bóveda Digital para auditorías."
            ],
            emailDispatch: {
              smtpHost: "smtp.assetflow-secure.cl",
              sender: "sistema.jde@inmobiliariapro.cl",
              recipients: [operatorEmail, tenantEmail, executiveEmail],
              subject: `[LIQUIDACIÓN COMPLETA] Cierre del Proceso de Garantía - Folio ${finalSettlement.folio} - ${selectedDeposit.tenantName}`,
              timestamp: new Date().toLocaleString('es-CL'),
              messageId: `SMTP-MSG-LG-${finalSettlement.folio}-${Date.now().toString().slice(-4)}`,
              status: "ENTREGADO (200 OK)"
            }
          });
          notify("Liquidación consolidada con éxito", 'success');
      } else {
          notify("Borrador de liquidación guardado", 'success');
      }

      setIsSettlementOpen(false);
      setSelectedDeposit(null);
    } catch (err: any) {
      setConsolidationError({
        title: "ERROR DE CONSOLIDACIÓN Y PROTOCOLO",
        message: err?.message || "Ocurrió un error inesperado al escribir en la base de datos de Gestión Integrada.",
        solutions: [
          "Verifique su conexión de red o credenciales de operador financiero.",
          "Asegúrese de que el número de folio sea único y respete la codificación 'LG-AAAA-NNNN'.",
          "Confirme que todos los montos de descuentos y boletas ingresados sean números válidos.",
          "Si el error persiste, contacte con Soporte de Tecnología AssetFlow."
        ]
      });
    }
  };

  const resetForm = () => {
    setFormData({
      contractId: '',
      initialAmount: 0,
      currency: 'CLP',
      depositDate: new Date().toISOString().split('T')[0],
      status: 'RESGUARDADA'
    });
  };

  const generateSettlementPDFInstance = (depositToUse?: SecurityDeposit, settlementToUse?: Partial<SecurityDepositSettlement>) => {
    const activeDeposit = depositToUse || selectedDeposit;
    const activeSettlement = settlementToUse || settlementData;
    if (!activeDeposit || !activeSettlement) return null;

    const doc = new jsPDF() as any;
    const margin = 20;
    
    // Header Logo
    const isCustomLogo = companyLogo && (
      companyLogo.startsWith('data:image/png') || 
      companyLogo.startsWith('data:image/jpeg') || 
      companyLogo.startsWith('data:image/webp')
    );

    if (isCustomLogo) {
      try {
        const format = companyLogo!.toLowerCase().includes('png') ? 'PNG' : 
                       companyLogo!.toLowerCase().includes('webp') ? 'WEBP' : 'JPEG';
        doc.addImage(companyLogo!, format, margin, 12, 32, 11, undefined, 'FAST');
      } catch (e) {
        console.warn("Could not add custom logo to settlement PDF, drawing vector fallback:", e);
        drawPdfAssetFlowLogo(doc, margin, 12, 0.35);
      }
    } else {
      drawPdfAssetFlowLogo(doc, margin, 12, 0.35);
    }

    // Header Content
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text('ASSETFLOW ASSETFLOW GESTIÓN INTEGRADA', margin, margin + 14);
    
    // Folio Number right-aligned (Very prominent)
    doc.setFontSize(13);
    doc.setTextColor(220, 38, 38); // Red-600
    doc.text(`N° FOLIO: ${activeSettlement.folio || 'S/F'}`, 190, margin + 14, { align: 'right' });
    doc.setTextColor(30, 41, 59); // Reset

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('COMPROBANTE DE LIQUIDACIÓN DE GARANTÍA', margin, margin + 22);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha de Emisión: ${activeSettlement.settlementDate}`, margin, margin + 29);
    doc.text(`Estado: ${activeSettlement.status === 'FINALIZADA' ? 'CONSOLIDADA / FINALIZADA' : 'BORRADOR'}`, margin, margin + 34);
    doc.text(`Fecha de Impresión: ${new Date().toLocaleString('es-CL')}`, margin, margin + 39);
    doc.text(`Operador ERP: ${currentUser || 'SISTEMA'}`, margin, margin + 44);

    // Context box (slate background)
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin, margin + 48, 170, 42, 2, 2, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('INFORMACIÓN GENERAL DEL CONTRATO', margin + 5, margin + 55);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Arrendatario: ${activeDeposit.tenantName}`, margin + 5, margin + 62);
    doc.text(`Propiedad: ${activeDeposit.propertyLabel}`, margin + 5, margin + 68);
    doc.text(`Fecha de Custodia Original: ${activeDeposit.depositDate}`, margin + 5, margin + 74);
    doc.text(`Monto Garantía Original: ${activeDeposit.currency} ${activeDeposit.initialAmount.toLocaleString()}`, margin + 5, margin + 80);

    // Deductions Table
    const tableData = (activeSettlement.deductions || []).map(d => [
      d.concept,
      d.description || '-',
      d.attachmentName ? `📄 ${d.attachmentName}` : 'No acompañado',
      `${activeDeposit.currency} ${d.amount.toLocaleString()}`
    ]);

    doc.autoTable({
      startY: margin + 96,
      head: [['Concepto de Descuento', 'Descripción / Justificación', 'Comprobante Soporte', 'Monto']],
      body: tableData.length > 0 ? tableData : [['Sin descuentos aplicados', 'Devolución del fondo de garantía en su totalidad', '-', `${activeDeposit.currency} 0`]],
      theme: 'grid',
      headStyles: { fillColor: [15, 118, 110], textColor: [255, 255, 255], fontStyle: 'bold' }, // teal-700
      styles: { fontSize: 8.5, cellPadding: 4 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 10;

    // Totals Section
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMEN DE LIQUIDACIÓN', margin, finalY);
    
    doc.setFontSize(9.5);
    doc.text(`Monto Garantía Original:`, margin, finalY + 8);
    doc.text(`${activeDeposit.currency} ${activeDeposit.initialAmount.toLocaleString()}`, 190, finalY + 8, { align: 'right' });
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Descuentos / Deducciones:`, margin, finalY + 15);
    doc.text(`- ${activeDeposit.currency} ${activeSettlement.totalDeductions?.toLocaleString()}`, 190, finalY + 15, { align: 'right' });
    
    doc.line(margin, finalY + 19, 190, finalY + 19);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`TOTAL NETO A REEMBOLSAR:`, margin, finalY + 26);
    doc.text(`${activeDeposit.currency} ${activeSettlement.refundAmount?.toLocaleString()}`, 190, finalY + 26, { align: 'right' });

    if (activeSettlement.observations) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.text('OBSERVACIONES:', margin, finalY + 38);
        doc.setFont('helvetica', 'normal');
        doc.text(doc.splitTextToSize(activeSettlement.observations, 170), margin, finalY + 44);
    }

    // Signatures
    const sigY = Math.min(finalY + 75, 250);
    doc.line(margin, sigY, margin + 60, sigY);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('Firma Responsable ASSETFLOW', margin, sigY + 4);
    doc.setFont('helvetica', 'normal');
    doc.text(`RUN Operador: ${currentUser}`, margin, sigY + 8);
    
    doc.line(130, sigY, 190, sigY);
    doc.setFont('helvetica', 'bold');
    doc.text('Firma Conforme Arrendatario', 130, sigY + 4);
    doc.setFont('helvetica', 'normal');
    doc.text(`RUN / Nombre: ${activeDeposit.tenantName}`, 130, sigY + 8);

    // Dynamic Page Numbering and Footer Folio
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`ASSETFLOW Liquidación de Garantía | Folio: ${activeSettlement.folio || 'S/F'}`, margin, 287);
      doc.text(`Página ${i} de ${pageCount}`, 190, 287, { align: 'right' });
    }

    return doc;
  };

  const exportSettlementPDF = (depositToUse?: SecurityDeposit, settlementToUse?: Partial<SecurityDepositSettlement>) => {
    const doc = generateSettlementPDFInstance(depositToUse, settlementToUse);
    if (!doc) return;
    const activeDeposit = depositToUse || selectedDeposit;
    const activeSettlement = settlementToUse || settlementData;
    doc.save(`Liquidacion_Garantia_${activeSettlement.folio}_${activeDeposit!.tenantName.replace(/\s+/g, '_')}.pdf`);
    notify("Documento de liquidación foliado descargado", 'success');
  };

  const generateDossierZIP = async (deposit: SecurityDeposit, settlement: SecurityDepositSettlement) => {
    const zip = new JSZip();
    
    // 1. Generate the main settlement PDF
    const doc = generateSettlementPDFInstance(deposit, settlement);
    if (doc) {
      const pdfBlob = doc.output('blob');
      const pdfName = `01_Liquidacion_Garantia_${settlement.folio || 'S-F'}_${deposit.tenantName.replace(/\s+/g, '_')}.pdf`;
      zip.file(pdfName, pdfBlob);
    }
    
    // 2. Add each attachment from the deductions
    let index = 2;
    (settlement.deductions || []).forEach(d => {
      if (d.attachmentData && d.attachmentName) {
        const commaIndex = d.attachmentData.indexOf(',');
        if (commaIndex !== -1) {
          const base64Content = d.attachmentData.substring(commaIndex + 1);
          const formattedIndex = index < 10 ? `0${index}` : `${index}`;
          const cleanConcept = d.concept.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_');
          const filename = `${formattedIndex}_Comprobante_${cleanConcept}_${d.attachmentName}`;
          zip.file(filename, base64Content, { base64: true });
          index++;
        }
      }
    });
    
    return zip;
  };

  const handleDownloadDossier = async (deposit: SecurityDeposit, settlement: SecurityDepositSettlement) => {
    try {
      const zip = await generateDossierZIP(deposit, settlement);
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const filename = `Set_Documentos_Liquidacion_${settlement.folio || 'S-F'}_${deposit.tenantName.replace(/\s+/g, '_')}.zip`;
      saveAs(zipBlob, filename);
      notify("¡Set completo de documentos (ZIP) descargado exitosamente!", 'success');
    } catch (err) {
      console.error("Error generating zip dossier:", err);
      notify("Error al generar el archivo consolidado ZIP", 'error');
    }
  };

  const handleSyncDossierToVault = async (deposit: SecurityDeposit, settlement: SecurityDepositSettlement) => {
    if (!onAddOfficialDocument) {
      notify("Módulo de Bóveda Digital no vinculado", 'error');
      return;
    }
    
    try {
      const zip = await generateDossierZIP(deposit, settlement);
      const zipBase64 = await zip.generateAsync({ type: 'base64' });
      const dataUri = `data:application/zip;base64,${zipBase64}`;
      const docName = `Set_Documentos_Liquidacion_${settlement.folio || 'S-F'}_${deposit.tenantName.replace(/\s+/g, '_')}.zip`;
      
      const docId = `doc-lg-${settlement.id}`;
      const newDoc: OfficialDocument = {
        id: docId,
        type: 'SALIENTE',
        docNumber: settlement.folio || `LG-${Date.now().toString().slice(-4)}`,
        date: settlement.settlementDate,
        arrivalDate: settlement.settlementDate,
        systemLoadDate: new Date().toISOString().split('T')[0],
        subject: `SET CONSOLIDADO: LIQUIDACIÓN ${settlement.folio || 'S-F'} - ${deposit.tenantName}`,
        synthesis: `Expediente de Liquidación de Garantía empaquetado para Auditoría. Contrato: ${deposit.tenantName} - Unidad: ${deposit.propertyLabel}. Incluye ${1 + (settlement.deductions?.filter(d => d.attachmentName).length || 0)} documentos totales (comprobante foliado y respaldos originales de egresos).`,
        status: 'ARCHIVADO',
        statusUpdatedAt: Date.now(),
        sender: 'ASSETFLOW ASSETFLOW',
        recipient: deposit.tenantName,
        attachments: [dataUri],
        userCreator: currentUser,
        timestamp: Date.now(),
        documentUrl: dataUri,
        documentName: docName,
        accountCode: '210502'
      };
      
      onAddOfficialDocument(newDoc);
      notify("¡Dossier registrado en la Bóveda Digital!", 'success');
      
      const updatedDeposit: SecurityDeposit = {
        ...deposit,
        settlement: {
          ...settlement,
          documentSetUrl: dataUri,
          documentSetName: docName,
          documentSetCount: 1 + (settlement.deductions?.filter(d => d.attachmentName).length || 0)
        }
      };
      onSave(updatedDeposit);
    } catch (err) {
      console.error("Error syncing dossier to vault:", err);
      notify("Error al registrar expediente consolidado", 'error');
    }
  };

  const downloadDeductionAttachment = (deduction: SettlementDeduction) => {
    if (!deduction.attachmentData || !deduction.attachmentName) return;
    const link = document.createElement('a');
    link.href = deduction.attachmentData;
    link.download = deduction.attachmentName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify(`Comprobante descargado: ${deduction.attachmentName}`, 'success');
  };

  return (
    <div className="h-full flex flex-col bg-slate-50/50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-teal-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-teal-600/20">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Módulo de Liquidación de Garantías</h2>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Liquidación foliada en PDF y control de documentos soporte</p>
                <span className="hidden sm:inline text-slate-300">|</span>
                <div className="flex items-center gap-1 text-teal-600 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                  <AlertCircle size={11} />
                  <p className="text-[9px] font-black uppercase tracking-wider">Políticas ERP exentas</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <button 
              onClick={handleGenerateDemoData}
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-all shadow-md shadow-slate-800/10 active:scale-95"
            >
              <Sparkles size={16} className="text-amber-400 animate-pulse" /> Generar 10 Datos Demo
            </button>
            <button 
              onClick={() => setIsFormOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-teal-700 transition-all shadow-md shadow-teal-600/10 active:scale-95"
            >
              <Plus size={16} /> Registrar Garantía
            </button>
          </div>
        </div>

        {/* Tab System & Search Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2 border-t border-slate-100">
          <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('deposits')}
              className={`px-4 py-2 rounded-lg font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
                activeTab === 'deposits' 
                  ? 'bg-white text-teal-700 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShieldCheck size={14} />
              Garantías en Custodia ({deposits.filter(d => d.status !== 'LIQUIDADA').length})
            </button>
            <button
              onClick={() => setActiveTab('settlements')}
              className={`px-4 py-2 rounded-lg font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 ${
                activeTab === 'settlements' 
                  ? 'bg-white text-teal-700 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Receipt size={14} />
              Liquidaciones / Historial ({deposits.filter(d => d.settlement).length})
            </button>
          </div>

          <div className="relative w-full max-w-md">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search size={16} className="text-slate-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'deposits' ? "Buscar por arrendatario o propiedad..." : "Buscar por folio, arrendatario o propiedad..."}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-xl py-2.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Content area based on selected tab */}
      <div className="flex-1 overflow-auto p-8">
        {activeTab === 'deposits' ? (
          /* TAB 1: ACTIVE DEPOSITS - ERP GRID TABLE */
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck size={16} className="text-teal-600" />
                Control de Garantías en Custodia / Resguardo
              </h3>
              <div className="flex items-center gap-2">
                <GridDimensionControls
                  defaultRowHeight={defaultRowHeight}
                  onSetRowHeight={setDefaultRowHeight}
                  onResetColumns={resetWidths}
                  onResetRows={resetHeights}
                  onResetAll={resetAll}
                />
                <span className="text-[10px] font-mono font-bold bg-teal-100 text-teal-800 px-2.5 py-1 rounded-md uppercase">
                  {filteredDeposits.length} Garantía(s) Activa(s)
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[950px] table-fixed">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/20 select-none">
                    <th style={{ width: widths.id }} className="px-4 py-3 relative border-r border-slate-100">
                      ID Registro
                      <div 
                        onMouseDown={(e) => onMouseDown('id', e)}
                        onDoubleClick={() => onColumnDoubleClick('id', 110)}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-teal-600"
                      />
                    </th>
                    <th style={{ width: widths.arrendatario }} className="px-4 py-3 relative border-r border-slate-100">
                      Arrendatario
                      <div 
                        onMouseDown={(e) => onMouseDown('arrendatario', e)}
                        onDoubleClick={() => onColumnDoubleClick('arrendatario', 220)}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-teal-600"
                      />
                    </th>
                    <th style={{ width: widths.propiedad }} className="px-4 py-3 relative border-r border-slate-100">
                      Propiedad de Custodia
                      <div 
                        onMouseDown={(e) => onMouseDown('propiedad', e)}
                        onDoubleClick={() => onColumnDoubleClick('propiedad', 220)}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-teal-600"
                      />
                    </th>
                    <th style={{ width: widths.fecha }} className="px-4 py-3 relative border-r border-slate-100">
                      Fecha Depósito
                      <div 
                        onMouseDown={(e) => onMouseDown('fecha', e)}
                        onDoubleClick={() => onColumnDoubleClick('fecha', 120)}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-teal-600"
                      />
                    </th>
                    <th style={{ width: widths.monto }} className="px-4 py-3 text-right relative border-r border-slate-100">
                      Monto Garantía
                      <div 
                        onMouseDown={(e) => onMouseDown('monto', e)}
                        onDoubleClick={() => onColumnDoubleClick('monto', 140)}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-teal-600"
                      />
                    </th>
                    <th style={{ width: widths.estado }} className="px-4 py-3 text-center relative border-r border-slate-100">
                      Estado
                      <div 
                        onMouseDown={(e) => onMouseDown('estado', e)}
                        onDoubleClick={() => onColumnDoubleClick('estado', 140)}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-teal-600"
                      />
                    </th>
                    <th style={{ width: widths.operacion }} className="px-4 py-3 text-center relative border-r border-slate-100">
                      Operación
                      <div 
                        onMouseDown={(e) => onMouseDown('operacion', e)}
                        onDoubleClick={() => onColumnDoubleClick('operacion', 160)}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-teal-600"
                      />
                    </th>
                    <th style={{ width: widths.acciones }} className="px-4 py-3 text-center relative">
                      Eliminar
                      <div 
                        onMouseDown={(e) => onMouseDown('acciones', e)}
                        onDoubleClick={() => onColumnDoubleClick('acciones', 80)}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-teal-600"
                      />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredDeposits.map(deposit => (
                    <tr 
                      key={deposit.id} 
                      style={{ height: `${getRowHeight(deposit.id)}px` }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setGridContextMenu({ x: e.clientX, y: e.clientY, deposit });
                      }}
                      className="hover:bg-slate-50/50 transition-colors cursor-pointer select-none relative group"
                      onDoubleClick={() => handleOpenSettlement(deposit)}
                      title="Clic derecho para Menú Contextual ERP • Doble clic para ver liquidación"
                    >
                      <td className="px-4 py-2 font-mono font-bold text-slate-500 uppercase truncate relative">
                        {deposit.id}
                        <div
                          onMouseDown={(e) => onRowMouseDown(deposit.id, e)}
                          onDoubleClick={() => onRowDoubleClick(deposit.id, defaultRowHeight)}
                          className="absolute left-0 right-0 bottom-0 h-1 cursor-row-resize hover:bg-teal-600"
                        />
                      </td>
                      <td className="px-4 py-2 truncate">
                        <div className="font-bold text-slate-800 truncate">{deposit.tenantName}</div>
                      </td>
                      <td className="px-4 py-2 truncate">
                        <div className="text-xs text-slate-700 font-medium truncate">{deposit.propertyLabel}</div>
                      </td>
                      <td className="px-4 py-2 font-mono text-slate-500 truncate">
                        {deposit.depositDate}
                      </td>
                      <td className="px-4 py-2 text-right font-black text-slate-900 truncate">
                        {deposit.currency} {deposit.initialAmount.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-center truncate">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[8.5px] font-black uppercase tracking-wider border ${
                          deposit.status === 'RESGUARDADA' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          deposit.status === 'LIQUIDADA' ? 'bg-slate-100 text-slate-700 border-slate-200' :
                          'bg-amber-50 text-amber-700 border-amber-100'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            deposit.status === 'RESGUARDADA' ? 'bg-emerald-500' :
                            deposit.status === 'LIQUIDADA' ? 'bg-slate-500' : 'bg-amber-500'
                          }`} />
                          {deposit.status === 'RESGUARDADA' ? 'RESGUARDADA' : 
                           deposit.status === 'LIQUIDADA' ? 'LIQUIDADA' : 'EN LIQUIDACIÓN'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button 
                          onClick={() => handleOpenSettlement(deposit)}
                          className={`flex items-center gap-1.5 mx-auto px-3.5 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${
                            deposit.status === 'LIQUIDADA' 
                              ? 'bg-slate-100 text-teal-600 border border-teal-200/40 hover:bg-teal-50'
                              : 'bg-teal-600 text-white hover:bg-teal-700 shadow-sm shadow-teal-600/10'
                          }`}
                        >
                          <ArrowRightLeft size={12} />
                          {deposit.status === 'LIQUIDADA' ? 'Ver Liquidación' : 'Iniciar Liquidación'}
                        </button>
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button 
                          onClick={() => setDeleteTargetId(deposit.id)}
                          className="no-jde-override p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all mx-auto block"
                          title="Eliminar de la base de datos"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {filteredDeposits.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-20 text-center text-slate-400">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-3 text-slate-300 mx-auto">
                          <ShieldCheck size={32} />
                        </div>
                        <p className="font-bold uppercase tracking-widest text-xs">No se encontraron garantías registradas</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* TAB 2: SETTLEMENTS LEDGER (Liquidaciones Realizadas) */
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Receipt size={16} className="text-teal-600" />
                Registro Histórico de Liquidaciones de Garantía
              </h3>
              <span className="text-[10px] font-mono font-bold bg-teal-100 text-teal-800 px-2.5 py-1 rounded-md uppercase">
                {settledDeposits.length} LIQUIDACIÓN(ES)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[950px]">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/20">
                    <th className="px-6 py-4">N° Folio</th>
                    <th className="px-6 py-4">Arrendatario / Propiedad</th>
                    <th className="px-6 py-4">Fecha Liq.</th>
                    <th className="px-6 py-4 text-right">Garantía Inicial</th>
                    <th className="px-6 py-4 text-right">Descuentos</th>
                    <th className="px-6 py-4 text-right">Monto Devuelto</th>
                    <th className="px-6 py-4 text-center">Estado</th>
                    <th className="px-6 py-4 text-center">Comprobantes Soporte</th>
                    <th className="px-6 py-4 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {settledDeposits.map(deposit => {
                    const settlement = deposit.settlement!;
                    const hasDeductionsWithAttachments = settlement.deductions.some(d => d.attachmentName);
                    
                    return (
                      <tr 
                        key={deposit.id} 
                        className="hover:bg-slate-50/50 transition-colors cursor-pointer select-none"
                        onDoubleClick={() => handleOpenSettlement(deposit)}
                        title="Doble clic para ver detalles de la garantía / liquidación"
                      >
                        <td className="px-6 py-4 font-mono font-black text-rose-600 uppercase">
                          {settlement.folio || 'SIN_FOLIO'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-800">{deposit.tenantName}</div>
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1 mt-0.5">
                            <Building2 size={10} />
                            {deposit.propertyLabel}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-500">{settlement.settlementDate}</td>
                        <td className="px-6 py-4 text-right font-bold text-slate-700">
                          {deposit.currency} {settlement.originalAmount?.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right font-black text-amber-600">
                          - {deposit.currency} {settlement.totalDeductions?.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right font-black text-teal-600">
                          {deposit.currency} {settlement.refundAmount?.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[8.5px] font-black uppercase tracking-wider border ${
                            settlement.status === 'FINALIZADA' 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                              : 'bg-amber-50 text-amber-700 border-amber-100'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${settlement.status === 'FINALIZADA' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                            {settlement.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {hasDeductionsWithAttachments ? (
                            <div className="flex flex-col gap-1 items-center">
                              {settlement.deductions.filter(d => d.attachmentName).map((d) => (
                                <button 
                                  key={d.id}
                                  onClick={() => downloadDeductionAttachment(d)}
                                  className="inline-flex items-center gap-1 bg-teal-50 border border-teal-100 text-teal-700 hover:bg-teal-100 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition-all"
                                  title={`Descargar comprobante para ${d.concept}`}
                                >
                                  <Download size={10} />
                                  {d.attachmentName}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Sin adjuntos</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedDossierDeposit(deposit)}
                              className="px-2.5 py-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-50 border border-amber-200/40 rounded-xl transition-all flex items-center gap-1.5 font-bold text-[9px] uppercase tracking-wider"
                              title="Ver Dossier de Documentos Consolidado para Auditoría"
                            >
                              <FileArchive size={12} />
                              <span>Dossier</span>
                            </button>
                            <button
                              onClick={() => exportSettlementPDF(deposit, settlement)}
                              className="p-1.5 text-teal-600 hover:text-teal-800 hover:bg-teal-50 border border-teal-200/40 rounded-xl transition-all"
                              title="Descargar Comprobante PDF de Liquidación"
                            >
                              <Printer size={13} />
                            </button>
                            <button
                              onClick={() => handleOpenSettlement(deposit)}
                              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all"
                              title="Revisar / Modificar datos"
                            >
                              <Edit3 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {settledDeposits.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-20 text-center text-slate-400">
                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-2 mx-auto text-slate-300">
                          <Receipt size={24} />
                        </div>
                        <p className="font-bold uppercase tracking-widest text-[10px]">No hay liquidaciones registradas en el historial</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Registrar Garantía Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl overflow-hidden flex flex-col">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center text-white">
                  <Plus size={20} />
                </div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Registrar Garantía de Arriendo</h3>
              </div>
              <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateDeposit} className="p-8 space-y-6">
              <div className="bg-teal-50 border border-teal-100/60 rounded-2xl p-4 flex gap-3 items-start">
                <Info size={18} className="text-teal-600 mt-0.5 shrink-0" />
                <p className="text-[10px] font-bold text-teal-800 leading-relaxed uppercase tracking-tight">
                  POLÍTICA INTERNA: De acuerdo a la política de AssetFlow Gestión Integrada, sólo aquellos contratos celebrados con personal de PDI están sujetos a la retención de garantías.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contrato de Arriendo de Propiedad</label>
                  <select
                    required
                    value={formData.contractId}
                    onChange={(e) => setFormData({...formData, contractId: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all font-semibold"
                  >
                    <option value="">Seleccionar Contrato...</option>
                    {contracts.filter(c => c.status === 'VIGENTE').map(c => (
                      <option key={c.id} value={c.id}>{c.tenantName} - {c.propertyLabel}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Monto de Garantía</label>
                      {formData.currency === 'CLP' && formData.initialAmount > 0 && (
                        <span className="text-[9px] font-mono font-bold text-teal-700">
                          $ {formData.initialAmount.toLocaleString('es-CL')}
                        </span>
                      )}
                    </div>
                    <input
                      required
                      type="text"
                      value={formData.currency === 'CLP' ? (formData.initialAmount ? formData.initialAmount.toLocaleString('es-CL') : '') : (formData.initialAmount || '')}
                      onChange={(e) => {
                        if (formData.currency === 'CLP') {
                          const { rawNumber } = maskMoneyCLP(e.target.value);
                          setFormData({...formData, initialAmount: rawNumber});
                        } else {
                          setFormData({...formData, initialAmount: Number(e.target.value)});
                        }
                      }}
                      placeholder={formData.currency === 'CLP' ? '$ 0' : '0 UF'}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all font-black text-slate-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Moneda del Fondo</label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({...formData, currency: e.target.value as 'CLP' | 'UF'})}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all font-bold text-slate-700"
                    >
                      <option value="CLP">Pesos (CLP)</option>
                      <option value="UF">UF (Unidad de Fomento)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha de Ingreso de Custodia</label>
                  <input
                    required
                    type="date"
                    value={formData.depositDate}
                    onChange={(e) => setFormData({...formData, depositDate: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsFormOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">
                  Cancelar
                </button>
                <button type="submit" className="flex-[2] py-4 bg-teal-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-teal-700 transition-all shadow-lg shadow-teal-600/20 flex items-center justify-center gap-2">
                  <Save size={16} /> Guardar Garantía
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Liquidación de Garantía Modal */}
      {isSettlementOpen && selectedDeposit && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-rose-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-rose-600/20">
                  <ArrowRightLeft size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Proceso de Liquidación de Garantía</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                    {selectedDeposit.tenantName} - {selectedDeposit.propertyLabel}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsSettlementOpen(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-10 bg-slate-50/30">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                
                {/* Deducciones Section */}
                <div className="lg:col-span-2 space-y-8">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-slate-900 uppercase tracking-tight text-sm">Descuentos o Cargos Aplicados</h4>
                      <button 
                        onClick={addDeduction}
                        className="flex items-center gap-2 text-rose-600 font-black text-[10px] uppercase tracking-widest hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-all"
                      >
                        <PlusCircle size={14} /> Añadir Descuento / Consumo
                      </button>
                    </div>

                    <div className="space-y-4">
                      {(settlementData.deductions || []).map((deduction) => (
                        <div key={deduction.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 relative group hover:border-slate-300 transition-all">
                          <button 
                            onClick={() => removeDeduction(deduction.id)}
                            className="absolute top-4 right-4 text-slate-300 hover:text-rose-600 p-1 hover:bg-rose-50 rounded-lg transition-all"
                            title="Eliminar este ítem"
                          >
                            <Trash2 size={16} />
                          </button>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="sm:col-span-2 space-y-2">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Concepto del Descuento</label>
                              <input 
                                type="text"
                                value={deduction.concept}
                                onChange={(e) => updateDeduction(deduction.id, 'concept', e.target.value)}
                                placeholder="Ej: Pintura de living, Reparación de chapa, Consumo de agua..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/10 transition-all font-semibold"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Monto ({selectedDeposit.currency})</label>
                              <input 
                                type="number"
                                value={deduction.amount}
                                onChange={(e) => updateDeduction(deduction.id, 'amount', Number(e.target.value))}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/10 transition-all font-black text-slate-800"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Descripción / Justificación Técnica</label>
                            <input 
                              type="text"
                              value={deduction.description}
                              onChange={(e) => updateDeduction(deduction.id, 'description', e.target.value)}
                              placeholder="Ej: Desgaste excesivo de muros por mascotas o boleta de agua vencida periodo Mayo..."
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/10 transition-all text-slate-600"
                            />
                          </div>

                          {/* File Attachment Area per Deduction */}
                          <div className="flex flex-col gap-2 bg-slate-50/50 border border-slate-200/60 rounded-xl p-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Documento Soporte / Comprobante de Gasto (PDF o Imagen)</span>
                              {deduction.attachmentName && (
                                <button
                                  onClick={() => {
                                    updateDeduction(deduction.id, 'attachmentName', undefined);
                                    updateDeduction(deduction.id, 'attachmentData', undefined);
                                  }}
                                  className="text-rose-500 hover:text-rose-700 text-[10px] font-black uppercase tracking-widest transition-colors"
                                >
                                  Eliminar Adjunto
                                </button>
                              )}
                            </div>
                            
                            {deduction.attachmentName ? (
                              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 rounded-xl p-3">
                                <div className="flex items-center gap-2">
                                  <FileText size={16} className="text-emerald-600 shrink-0" />
                                  <div className="text-left">
                                    <p className="text-xs font-bold text-slate-800 line-clamp-1">{deduction.attachmentName}</p>
                                    <p className="text-[8px] font-mono font-bold text-emerald-600 uppercase">DOCUMENTO VERIFICADO Y REGISTRADO</p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => downloadDeductionAttachment(deduction)}
                                  className="p-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg transition-all flex items-center gap-1 text-[10px] font-bold"
                                  title="Descargar comprobante"
                                >
                                  <Download size={12} /> Descargar
                                </button>
                              </div>
                            ) : (
                              <div className="relative border border-dashed border-slate-300 rounded-xl hover:bg-slate-50 hover:border-slate-400 transition-all">
                                <input 
                                  type="file"
                                  accept="application/pdf,image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleFileChange(deduction.id, file);
                                  }}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div className="py-4 text-center flex flex-col items-center justify-center gap-1">
                                  <Paperclip size={14} className="text-slate-400" />
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Adjuntar Comprobante Digital (PDF)</span>
                                  <span className="text-[8px] text-slate-400 uppercase">Haz clic aquí o arrastra tu archivo</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      {(settlementData.deductions || []).length === 0 && (
                        <div className="py-12 border-2 border-dashed border-slate-200 rounded-3xl text-center text-slate-400 bg-white">
                          <p className="text-[10px] font-black uppercase tracking-widest">Sin descuentos - Devolución del 100% de la garantía</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Observaciones Finales / Acta de Entrega</label>
                    <textarea 
                      value={settlementData.observations}
                      onChange={(e) => setSettlementData({...settlementData, observations: e.target.value})}
                      className="w-full h-24 bg-white border border-slate-200 rounded-2xl p-4 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition-all resize-none shadow-sm"
                      placeholder="Registra comentarios adicionales sobre el estado de la vivienda o las cuentas básicas..."
                    />
                  </div>
                </div>

                {/* Resumen Financiero lateral */}
                <div className="space-y-6">
                  {/* Folio Control Section */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Control de Folio Gestión Integrada</h4>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">N° de Folio de Liquidación</label>
                      <input 
                        type="text"
                        value={settlementData.folio}
                        onChange={(e) => setSettlementData({...settlementData, folio: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/10 font-mono font-black text-rose-600"
                        placeholder="Escribe el folio de liquidación..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha de Liquidación</label>
                      <input 
                        type="date"
                        value={settlementData.settlementDate}
                        onChange={(e) => setSettlementData({...settlementData, settlementDate: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/10 font-mono font-bold"
                      />
                    </div>
                  </div>

                  {/* Totals Box */}
                  <div className="bg-rose-900 rounded-[32px] p-8 text-white shadow-xl shadow-rose-950/20">
                    <h4 className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-6">Cómputo Financiero ERP</h4>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center opacity-85">
                        <span className="text-[10px] font-bold uppercase tracking-widest">Fondo Custodiado</span>
                        <span className="text-sm font-black">{selectedDeposit.currency} {settlementData.originalAmount?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-rose-200">
                        <span className="text-[10px] font-bold uppercase tracking-widest">Total Descuentos</span>
                        <span className="text-sm font-black">- {selectedDeposit.currency} {settlementData.totalDeductions?.toLocaleString()}</span>
                      </div>
                      
                      <div className="pt-6 border-t border-white/20 mt-6">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-60 block mb-1">Monto Neto a Devolver</span>
                        <span className="text-2xl font-black">{selectedDeposit.currency} {settlementData.refundAmount?.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions buttons */}
                  <div className="space-y-2 pt-2">
                    <button 
                      onClick={() => handleSaveSettlement('BORRADOR')}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
                    >
                      <Save size={15} /> Guardar Borrador
                    </button>
                    
                    <button 
                      onClick={() => exportSettlementPDF()}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 text-teal-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:border-teal-300 hover:bg-teal-50 transition-all shadow-sm"
                    >
                      <Printer size={15} /> Descargar Comprobante PDF (Foliado)
                    </button>
                    
                    <button 
                       onClick={() => setShowConsolidateConfirm(true)}
                      className="w-full flex items-center justify-center gap-2 py-4 bg-teal-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-teal-700 transition-all shadow-lg shadow-teal-600/20 active:scale-[0.98]"
                    >
                      <FileCheck size={18} /> Consolidar y Finalizar
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONSOLIDATION SUCCESS SUMMARY MODAL */}
      {consolidationSuccess && (
        <div className="fixed inset-0 bg-[#0B253A]/80 backdrop-blur-xs flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-white rounded-[32px] border-2 border-teal-500 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-[#0055E4] text-[#FFCC00] px-6 py-4 flex items-center justify-between border-b border-[#002EAD] font-sans font-bold">
              <div className="flex items-center gap-2.5">
                <ShieldCheck size={20} className="text-[#FFCC00] animate-pulse" />
                <span className="text-[13px] uppercase tracking-wider">{consolidationSuccess.title}</span>
              </div>
              <button 
                onClick={() => setConsolidationSuccess(null)}
                className="text-[#A6C5DB] hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-8 space-y-6 overflow-y-auto max-h-[75vh]">
              <div className="flex flex-col items-center text-center pb-4 border-b border-slate-100">
                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-3 text-emerald-600 border border-emerald-100 shadow-inner">
                  <CheckCircle size={36} />
                </div>
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Proceso de Liquidación Completado</h3>
                <p className="text-xs text-slate-400 mt-1 font-bold">ASSETFLOW GESTIÓN INTEGRADA • PROTOCOLO AUTOMATIZADO</p>
              </div>

              {/* General details in ERP Read-only format */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 font-mono text-xs">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="font-bold text-slate-500 uppercase">Arrendatario:</span>
                  <span className="font-black text-slate-800">{consolidationSuccess.tenant}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="font-bold text-slate-500 uppercase">Propiedad Custodia:</span>
                  <span className="font-black text-slate-700">{consolidationSuccess.property}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="font-bold text-slate-500 uppercase">N° Folio Asignado:</span>
                  <span className="font-black text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded">{consolidationSuccess.folio}</span>
                </div>
                <div className="flex justify-between items-center pb-1">
                  <span className="font-bold text-slate-500 uppercase">Reembolso Neto a Devolver:</span>
                  <span className="font-black text-teal-700 text-sm">{consolidationSuccess.refundAmount.toLocaleString()} CLP</span>
                </div>
              </div>

              {/* List of system actions performed */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Acciones del Sistema Ejecutadas:</h4>
                <div className="space-y-2">
                  {consolidationSuccess.actions.map((action, i) => (
                    <div key={i} className="flex gap-2.5 items-start text-xs font-medium text-slate-700 bg-emerald-50/40 p-3 rounded-xl border border-emerald-100/40">
                      <span className="text-emerald-600 font-bold mt-0.5">✔</span>
                      <span>{action}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Certificado de Transmisión SMTP */}
              {consolidationSuccess.emailDispatch && (
                <div className="bg-slate-50 text-slate-800 rounded-3xl p-6 border-2 border-slate-300 space-y-4 shadow-sm">
                  <div className="flex items-center gap-2.5 border-b border-slate-200 pb-3">
                    <Mail size={18} className="text-teal-700" />
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-700">Certificado de Transmisión SMTP Integrado</h4>
                      <p className="text-[9px] text-slate-500 font-mono font-bold">STATUS: ENTREGADO DE FORMA SEGURA • PROCESO AUTO-NOTIFICADO</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-[11px] font-mono leading-relaxed text-slate-800">
                    <div>
                      <span className="text-slate-600 block uppercase text-[9px] font-bold">Servidor SMTP de Origen:</span>
                      <span className="text-teal-800 font-bold">{consolidationSuccess.emailDispatch.smtpHost}</span>
                    </div>
                    <div>
                      <span className="text-slate-600 block uppercase text-[9px] font-bold">Dirección Remitente:</span>
                      <span className="text-slate-900 font-bold">{consolidationSuccess.emailDispatch.sender}</span>
                    </div>
                    <div>
                      <span className="text-slate-600 block uppercase text-[9px] font-bold">Asunto de Notificación:</span>
                      <span className="text-slate-900 font-bold">{consolidationSuccess.emailDispatch.subject}</span>
                    </div>
                    <div>
                      <span className="text-slate-600 block uppercase text-[9px] font-bold">Destinatarios Notificados:</span>
                      <div className="space-y-1.5 mt-1">
                        {consolidationSuccess.emailDispatch.recipients.map((email, idx) => (
                          <div key={idx} className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-300 shadow-xs">
                            <span className="text-slate-900 font-bold">{email}</span>
                            <span className="text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-black border border-emerald-300">
                              ENTREGADO (250 OK)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-slate-200 text-[10px] text-slate-600 font-bold">
                      <span>SMTP Message-ID: <span className="text-slate-800 font-bold">{consolidationSuccess.emailDispatch.messageId}</span></span>
                      <span>{consolidationSuccess.emailDispatch.timestamp}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setConsolidationSuccess(null)}
                className="px-6 py-3 bg-teal-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-teal-700 transition-all shadow-sm"
              >
                Entendido, Cerrar Resumen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONSOLIDATION ERROR MODAL */}
      {consolidationError && (
        <div className="fixed inset-0 bg-[#0B253A]/85 backdrop-blur-xs flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-white rounded-[32px] border-2 border-rose-500 shadow-2xl max-w-xl w-full overflow-hidden flex flex-col">
            {/* Header */}
            <div className="bg-rose-900 text-white px-6 py-4 flex items-center justify-between font-sans font-bold">
              <div className="flex items-center gap-2.5">
                <AlertCircle size={20} className="text-amber-400 animate-pulse" />
                <span className="text-[13px] uppercase tracking-wider">{consolidationError.title}</span>
              </div>
              <button 
                onClick={() => setConsolidationError(null)}
                className="text-rose-200 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-8 space-y-6">
              <div className="flex flex-col items-center text-center pb-4 border-b border-slate-100">
                <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-3 text-rose-600 border border-rose-100 shadow-inner">
                  <AlertCircle size={36} />
                </div>
                <h3 className="text-base font-black text-rose-800 uppercase tracking-tight">Fallo en Validación Contable</h3>
                <p className="text-xs text-slate-400 mt-1 font-bold">ASSETFLOW GESTIÓN INTEGRADA • PROTOCOLO DE EXCEPCIÓN</p>
              </div>

              {/* Error message */}
              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 space-y-1.5 text-xs text-rose-900">
                <span className="font-bold uppercase tracking-wider block text-[10px] text-rose-500">Mensaje de Error Devuelto:</span>
                <p className="font-semibold leading-relaxed font-mono">{consolidationError.message}</p>
              </div>

              {/* Recommended solutions */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Propuestas de Solución Sugeridas:</h4>
                <div className="space-y-2">
                  {consolidationError.solutions.map((sol, i) => (
                    <div key={i} className="flex gap-2.5 items-start text-xs font-medium text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                      <span className="text-rose-600 font-bold mt-0.5">ℹ</span>
                      <span>{sol}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setConsolidationError(null)}
                className="px-6 py-3 bg-rose-800 hover:bg-rose-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-sm"
              >
                Corregir y Reintentar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTargetId && (() => {
        const targetDep = deposits.find(d => d.id === deleteTargetId);
        return (
          <div className="fixed inset-0 bg-[#0B253A]/85 backdrop-blur-xs flex items-center justify-center z-[100] p-4 animate-fade-in">
            <div className="bg-white rounded-[32px] border-2 border-rose-600 shadow-2xl max-w-md w-full overflow-hidden flex flex-col">
              {/* Header */}
              <div className="bg-rose-900 text-white px-6 py-4 flex items-center justify-between font-sans font-bold">
                <div className="flex items-center gap-2.5">
                  <AlertCircle size={20} className="text-white animate-pulse" />
                  <span className="text-[13px] uppercase tracking-wider">Confirmación de Eliminación</span>
                </div>
                <button 
                  onClick={() => setDeleteTargetId(null)}
                  className="text-rose-200 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="p-8 space-y-6">
                <div className="flex flex-col items-center text-center pb-4 border-b border-slate-100">
                  <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-3 text-rose-600 border border-rose-100 shadow-inner">
                    <Trash2 size={36} />
                  </div>
                  <h3 className="text-base font-black text-rose-900 uppercase tracking-tight">¿Eliminar esta garantía?</h3>
                  <p className="text-xs text-slate-400 mt-1 font-bold">ESTA ACCIÓN ES TOTALMENTE IRREVERSIBLE</p>
                </div>

                {targetDep ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3 font-mono text-xs text-slate-800">
                    <div className="flex justify-between items-start border-b border-slate-200 pb-2">
                      <span className="font-bold text-slate-500 uppercase">ID Registro:</span>
                      <span className="font-black text-slate-900">{targetDep.id}</span>
                    </div>
                    <div className="flex justify-between items-start border-b border-slate-200 pb-2">
                      <span className="font-bold text-slate-500 uppercase">Arrendatario:</span>
                      <span className="font-black text-slate-900 text-right">{targetDep.tenantName}</span>
                    </div>
                    <div className="flex justify-between items-start border-b border-slate-200 pb-2">
                      <span className="font-bold text-slate-500 uppercase">Propiedad:</span>
                      <span className="font-black text-slate-700 text-right">{targetDep.propertyLabel}</span>
                    </div>
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-slate-500 uppercase">Monto Original:</span>
                      <span className="font-black text-rose-600">{targetDep.currency} {targetDep.initialAmount.toLocaleString()}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 text-center">No se pudieron encontrar los detalles del registro.</p>
                )}

                <p className="text-[11px] text-slate-500 leading-relaxed text-center font-medium">
                  Al confirmar, se eliminará el registro de custodia y resguardo tanto de la sesión actual como de la base de datos de Gestión Integrada en Firestore de manera permanente.
                </p>
              </div>

              {/* Footer */}
              <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-between gap-3">
                <button 
                  onClick={() => setDeleteTargetId(null)}
                  className="no-jde-override flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all text-center"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    if (deleteTargetId) {
                      onDelete(deleteTargetId);
                      notify("Registro de garantía eliminado de la base de datos", "success");
                      setDeleteTargetId(null);
                    }
                  }}
                  className="no-jde-override flex-1 px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all text-center shadow-sm"
                >
                  Eliminar Registro
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* CONSOLIDATE CONFIRMATION MODAL */}
      {showConsolidateConfirm && (
        <div className="fixed inset-0 bg-[#0B253A]/90 backdrop-blur-xs flex items-center justify-center z-[110] p-4 animate-fade-in">
          <div className="bg-white rounded-[32px] border-2 border-teal-500 shadow-2xl max-w-md w-full overflow-hidden flex flex-col animate-scale-in">
            {/* Header */}
            <div className="bg-[#0B3C5D] text-[#FFCC00] px-6 py-4 flex items-center justify-between font-sans font-bold">
              <div className="flex items-center gap-2.5">
                <ShieldCheck size={20} className="text-[#FFCC00] animate-pulse" />
                <span className="text-[13px] uppercase tracking-wider">Confirmar Consolidación</span>
              </div>
              <button 
                onClick={() => setShowConsolidateConfirm(false)}
                className="text-slate-300 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-8 space-y-6">
              <div className="flex flex-col items-center text-center pb-4 border-b border-slate-100">
                <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mb-3 text-teal-600 border border-teal-100 shadow-inner">
                  <FileCheck size={36} />
                </div>
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">¿Consolidar Liquidación?</h3>
                <p className="text-xs text-slate-400 mt-1 font-bold">PROCESO FINAL E IRREVERSIBLE</p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex gap-3 items-start">
                <span className="text-amber-600 font-bold text-sm mt-0.5">⚠</span>
                <div className="space-y-1">
                  <span className="font-bold uppercase tracking-wider block text-[10px] text-amber-600">Advertencia Contable:</span>
                  <p className="leading-relaxed font-semibold">
                    Esta acción registrará la transacción de egreso en el Libro Auxiliar y emitirá el PDF foliado. El estado del depósito pasará a "LIQUIDADA" y no se podrá editar.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-between gap-3">
              <button 
                onClick={() => setShowConsolidateConfirm(false)}
                className="no-jde-override flex-1 px-4 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all text-center"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  setShowConsolidateConfirm(false);
                  handleSaveSettlement('FINALIZADA');
                }}
                className="no-jde-override flex-1 px-4 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all text-center shadow-sm"
              >
                Sí, Consolidar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DOSSIER / DOCUMENT SET MODAL */}
      {selectedDossierDeposit && selectedDossierDeposit.settlement && (() => {
        const deposit = selectedDossierDeposit;
        const settlement = deposit.settlement!;
        const totalDocs = 1 + (settlement.deductions?.filter(d => d.attachmentName).length || 0);
        
        return (
          <div className="fixed inset-0 bg-[#0B253A]/90 backdrop-blur-xs flex items-center justify-center z-[110] p-4 animate-fade-in">
            <div className="bg-white rounded-[32px] border-2 border-amber-500 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col animate-scale-in">
              {/* Header */}
              <div className="bg-amber-600 text-white px-6 py-5 flex items-center justify-between font-sans">
                <div className="flex items-center gap-3">
                  <Archive size={22} className="text-amber-100" />
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-wider">Set Consolidado de Liquidación</h3>
                    <p className="text-[10px] text-amber-50/80 font-bold">ASSETFLOW ASSETFLOW • DOSSIER PARA AUDITORÍA</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedDossierDeposit(null)}
                  className="text-amber-100 hover:text-white hover:bg-amber-700/50 p-1.5 rounded-lg transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
                {/* Summary Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 border border-slate-200/60 p-5 rounded-2xl text-xs">
                  <div className="space-y-2">
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase block">Arrendatario / Deudor:</span>
                      <span className="font-black text-slate-800 text-[13px]">{deposit.tenantName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase block">Propiedad asociada:</span>
                      <span className="font-bold text-slate-700">{deposit.propertyLabel}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase block">Folio ERP:</span>
                      <span className="font-black text-rose-600 text-[13px] font-mono">{settlement.folio || 'SIN_FOLIO'}</span>
                    </div>
                    <div className="flex justify-between items-end">
                      <div>
                        <span className="text-[10px] font-black text-slate-400 uppercase block">Fecha Liquidación:</span>
                        <span className="font-bold text-slate-700 font-mono">{settlement.settlementDate}</span>
                      </div>
                      <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-100 text-emerald-700 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider">
                        <FolderCheck size={11} />
                        Sello Activo
                      </span>
                    </div>
                  </div>
                </div>

                {/* Checklist Title */}
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                    <CheckSquare size={12} className="text-amber-500" />
                    Documentos Integrados en el Set ({totalDocs})
                  </h4>
                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          <th className="px-4 py-3">Índice</th>
                          <th className="px-4 py-3">Nombre del Archivo</th>
                          <th className="px-4 py-3">Origen / Justificación</th>
                          <th className="px-4 py-3 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                        {/* 1. Main PDF */}
                        <tr className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-mono text-slate-400">01</td>
                          <td className="px-4 py-3 font-semibold text-teal-700">
                            📄 01_Liquidacion_Garantia_{settlement.folio || 'S_F'}.pdf
                          </td>
                          <td className="px-4 py-3 text-slate-500 font-bold">Comprobante de Liquidación Foliado</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => exportSettlementPDF(deposit, settlement)}
                              className="p-1 text-teal-600 hover:bg-teal-50 rounded transition-all"
                              title="Descargar Comprobante PDF"
                            >
                              <Download size={13} />
                            </button>
                          </td>
                        </tr>
                        {/* 2. Deductions attachments */}
                        {settlement.deductions?.filter(d => d.attachmentName).map((d, index) => (
                          <tr key={d.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-mono text-slate-400">{index + 2 < 10 ? `0${index + 2}` : index + 2}</td>
                            <td className="px-4 py-3 text-slate-800 break-all">
                              📄 {d.attachmentName}
                            </td>
                            <td className="px-4 py-3">
                              <span className="font-bold text-slate-500">Respaldo:</span> {d.concept}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => downloadDeductionAttachment(d)}
                                className="p-1 text-slate-600 hover:bg-slate-100 rounded transition-all"
                                title="Descargar Adjunto"
                              >
                                <Download size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Audit Sello & Info */}
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 text-xs text-emerald-900 space-y-1.5">
                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] text-emerald-700">
                    <ShieldCheck size={14} />
                    Cumplimiento de Auditoría Interna (Compliance)
                  </div>
                  <p className="leading-relaxed font-semibold">
                    Este set unifica y ampara todos los respaldos asociados al egreso de caja para auditorías contables inmediatas. El expediente digital consolidado permite a los auditores comprobar de forma transparente cada deducción aplicada sin necesidad de navegar por repositorios externos.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-between gap-3">
                <button 
                  onClick={() => setSelectedDossierDeposit(null)}
                  className="px-5 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all text-center"
                >
                  Cerrar
                </button>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleSyncDossierToVault(deposit, settlement)}
                    className="px-5 py-3 bg-slate-700 hover:bg-slate-800 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all text-center shadow-sm flex items-center gap-1.5"
                  >
                    <FolderCheck size={14} />
                    Sincronizar Bóveda
                  </button>
                  <button 
                    onClick={() => handleDownloadDossier(deposit, settlement)}
                    className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all text-center shadow-sm flex items-center gap-1.5"
                  >
                    <FileArchive size={14} />
                    Descargar Set (.ZIP)
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      {/* ERP CONTEXT MENU */}
      {gridContextMenu && (
        <JDEGridContextMenu
          isOpen={!!gridContextMenu}
          x={gridContextMenu.x}
          y={gridContextMenu.y}
          programCode="P1502"
          programTitle="Control y Liquidación de Garantías de Arriendo"
          collectionName="security_deposits"
          recordId={gridContextMenu.deposit.id}
          recordFolio={`GAR-${gridContextMenu.deposit.id.substring(0, 8).toUpperCase()}`}
          onClose={() => setGridContextMenu(null)}
          onViewDetail={() => {
            handleOpenSettlement(gridContextMenu.deposit);
            setGridContextMenu(null);
          }}
          onSetRowHeight={setDefaultRowHeight}
          onResetColumns={resetWidths}
          onResetRows={resetHeights}
          onResetGridDimensions={resetAll}
        />
      )}
    </div>
  );
};

export default SecurityDepositModule;
