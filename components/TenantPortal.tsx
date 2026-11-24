import React, { useState, useEffect } from 'react';
import { 
  Wrench, ClipboardList, Plus, Trash2, X, Camera, CheckCircle2, 
  Clock, AlertTriangle, MessageSquare, Download, LogOut, Sparkles, Building, ChevronDown, ChevronUp, User, ShieldAlert,
  Copy, Check, Phone, Search, Filter, FileText, Calendar, DollarSign, Eye, Activity, ChevronRight, Receipt, CreditCard, History,
  ArrowLeft, ArrowRight, UploadCloud, Info
} from 'lucide-react';
import { Solicitud, Property, ModuleType, LeaseContract, Transaction } from '../types';
import { TenantPaymentLedgerTable, TenantPaymentItem } from './TenantPaymentLedgerTable';
import { TenantCobrosSection } from './TenantCobrosSection';
import { motion, AnimatePresence } from 'motion/react';
import { DEFAULT_ASSETFLOW_SVG } from '../lib/defaultLogo';

const formatChileDate = (dateStr: string) => {
  if (!dateStr || dateStr === '—') return '—';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

interface TenantPortalProps {
  solicitudes: Solicitud[];
  properties: Property[];
  leaseContracts: LeaseContract[];
  currentUser: string;
  transactions?: Transaction[];
  onSaveTransaction?: (tx: Transaction) => void;
  onSaveSolicitud: (sol: Solicitud) => void;
  onLogout: () => void;
}

const TenantPortal: React.FC<TenantPortalProps> = ({
  solicitudes,
  properties,
  leaseContracts,
  currentUser,
  transactions,
  onSaveTransaction,
  onSaveSolicitud,
  onLogout
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [expandedSolId, setExpandedSolId] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  // Reset step to 1 when form opens
  useEffect(() => {
    if (isFormOpen) {
      setStep(1);
      setSuccessData(null);
      setCopied(false);
    }
  }, [isFormOpen]);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [propertyId, setPropertyId] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedCommune, setSelectedCommune] = useState('');
  const [priority, setPriority] = useState<'BAJA' | 'MEDIA' | 'ALTA' | 'CRÍTICA'>('MEDIA');
  const [category, setCategory] = useState<'REQUERIMIENTO' | 'MEJORA' | 'CONSULTA'>('REQUERIMIENTO');
  const [images, setImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [exactLocation, setExactLocation] = useState('LIVING');
  const [successData, setSuccessData] = useState<{ id: string; trackingCode: string; rawSolicitud: Solicitud } | null>(null);
  const [tenantPhone, setTenantPhone] = useState(() => localStorage.getItem('tenant_portal_phone') || '');
  const [tenantName, setTenantName] = useState(() => localStorage.getItem('tenant_portal_name') || '');
  const [savePhoneCheckbox, setSavePhoneCheckbox] = useState(true);
  const [copied, setCopied] = useState(false);

  // Tab and search filters states
  const [activeTab, setActiveTab] = useState<'cobros' | 'solicitudes' | 'contrato' | 'reembolsos' | 'pagos'>('cobros');
  const [activeRequestTab, setActiveRequestTab] = useState<'ABIERTOS' | 'CERRADOS'>('ABIERTOS');
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('TODOS');

  // Tenant Charges & Payment State with Real-Time Synchronization
  const [tenantCobros, setTenantCobros] = useState<TenantPaymentItem[]>([
    { id: 'pay-006', property: '1822 - Depto 402', type: 'Arriendo Mes de Agosto 2026', chargedAmount: 420000, amount: 0, pendingAmount: 420000, status: 'Pendiente de pago', date: '05 agosto 2026', rawDate: '2026-08-05', channel: 'Webpay Plus / Transbank', referenceNumber: 'COB-2026-0801', period: 'AGOSTO 2026' },
    { id: 'pay-007', property: '1822 - Depto 402', type: 'Gasto Común Julio 2026', chargedAmount: 72000, amount: 0, pendingAmount: 72000, status: 'Pendiente de pago', date: '10 agosto 2026', rawDate: '2026-08-10', channel: 'Transferencia', referenceNumber: 'GC-2026-0702', period: 'JULIO 2026' },
    { id: 'pay-005', property: '1822 - Depto 402', type: 'Energía Eléctrica', chargedAmount: 35000, amount: 20000, pendingAmount: 15000, status: 'Pago Parcial', date: '10 julio 2026', rawDate: '2026-07-10', channel: 'Transferencia', referenceNumber: 'EE-2026-0701', period: 'JULIO 2026' },
    { id: 'pay-001', property: '1822 - Depto 402', type: 'Energía Eléctrica', chargedAmount: 47645, amount: 47645, pendingAmount: 0, status: 'Pagado', date: '25 junio 2026', rawDate: '2026-06-25', channel: 'Transferencia', referenceNumber: 'TR-998201', period: 'JUNIO 2026' },
    { id: 'pay-002', property: '1822 - Depto 402', type: 'Agua Caliente', chargedAmount: 14300, amount: 14300, pendingAmount: 0, status: 'Pagado', date: '25 junio 2026', rawDate: '2026-06-25', channel: 'Transferencia', referenceNumber: 'TR-998202', period: 'JUNIO 2026' },
    { id: 'pay-003', property: '1822 - Depto 402', type: 'Gasto Común', chargedAmount: 69865, amount: 69865, pendingAmount: 0, status: 'Pagado', date: '25 junio 2026', rawDate: '2026-06-25', channel: 'PAC', referenceNumber: 'PAC-998203', period: 'JUNIO 2026' },
    { id: 'pay-004', property: '1822 - Depto 402', type: 'Arriendo Mes de Junio 2026', chargedAmount: 385821, amount: 385821, pendingAmount: 0, status: 'Pagado', date: '25 junio 2026', rawDate: '2026-06-25', channel: 'PAC', referenceNumber: 'PAC-998204', period: 'JUNIO 2026' },
  ]);

  // Real-time payment processing callback
  const handlePaymentCompleted = (details: {
    itemsPaidIds: string[];
    totalAmount: number;
    paymentChannel: string;
    authCode: string;
    referenceNumber: string;
    timestamp: number;
  }) => {
    const formattedDate = new Date(details.timestamp).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });
    
    // 1. Update local cobros state in real time
    setTenantCobros(prev => prev.map(item => {
      if (details.itemsPaidIds.includes(item.id)) {
        const charged = item.chargedAmount ?? item.amount;
        return {
          ...item,
          amount: charged,
          pendingAmount: 0,
          status: 'Pagado',
          channel: details.paymentChannel,
          referenceNumber: details.referenceNumber,
          date: formattedDate
        };
      }
      return item;
    }));

    // 2. Persist transaction into ERP system & Firestore in real time
    if (onSaveTransaction) {
      const newTx: Transaction = {
        id: `TX-PORTAL-${details.referenceNumber}`,
        description: `PAGO RECAUDADO EN PORTAL ARRENDATARIO (${details.paymentChannel}) - FOLIO: ${details.referenceNumber}`,
        amount: details.totalAmount,
        category: 'ARRIENDOS',
        type: 'INCOME',
        documentType: 'COMPROBANTE',
        documentNumber: details.referenceNumber,
        date: new Date(details.timestamp).toISOString().split('T')[0],
        invoiceDate: new Date(details.timestamp).toISOString().split('T')[0],
        user: currentUser,
        timestamp: details.timestamp,
        propertyId: '1822',
        accountCode: '1.1.01.01',
        insuranceCompany: 'VIDA',
        status: 'COMPLETADA',
        metadata: {
          paymentChannel: details.paymentChannel,
          authCode: details.authCode,
          tenantTaxId: currentUser,
          tenantName: tenantName || currentUser,
          paidItemIds: details.itemsPaidIds
        },
        lockedBy: null,
        lockedAt: null
      };
      onSaveTransaction(newTx);
    }
  };

  // Reimbursement Form State
  const [reimbAmount, setReimbAmount] = useState('');
  const [reimbTitle, setReimbTitle] = useState('');
  const [reimbDesc, setReimbDesc] = useState('');
  const [reimbReceipts, setReimbReceipts] = useState<string[]>([]);
  const [isReimbUploading, setIsReimbUploading] = useState(false);
  const [reimbBankName, setReimbBankName] = useState(() => localStorage.getItem('reimb_bank_name') || '');
  const [reimbAccountType, setReimbAccountType] = useState(() => localStorage.getItem('reimb_account_type') || 'CUENTA CORRIENTE');
  const [reimbAccountNumber, setReimbAccountNumber] = useState(() => localStorage.getItem('reimb_account_number') || '');
  const [reimbRut, setReimbRut] = useState(() => localStorage.getItem('reimb_rut') || '');
  const [reimbHolderName, setReimbHolderName] = useState(() => localStorage.getItem('reimb_holder_name') || '');
  const [saveBankInfoCheckbox, setSaveBankInfoCheckbox] = useState(true);
  const [reimbSuccessData, setReimbSuccessData] = useState<{ id: string; trackingCode: string } | null>(null);
  const [reimbPropertyId, setReimbPropertyId] = useState('');
  const [reimbWizardStep, setReimbWizardStep] = useState(1);

  const exactLocationOptions = [
    'LIVING',
    'COMEDOR',
    'COCINA',
    'BAÑO PRINCIPAL',
    'BAÑO SEGUNDO / DE VISITAS',
    'DORMITORIO PRINCIPAL',
    'DORMITORIO SEGUNDO',
    'DORMITORIO TERCERO',
    'TERRAZA / BALCÓN',
    'LOGIA / LAVADERO',
    'HALL DE ACCESO',
    'PASILLO',
    'ESTACIONAMIENTO / BODEGA',
    'OTRO (ESPECIFICAR EN DETALLE)'
  ];

  const normalizeText = (text: string | undefined): string => {
    if (!text) return '';
    return text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toUpperCase();
  };

  // Helper to dynamically match Chilean communes to their correct regions if not explicitly set
  const getRegionForCommune = (commune: string | undefined): string => {
    if (!commune) return 'REGIÓN METROPOLITANA';
    const c = normalizeText(commune);
    
    // Región Metropolitana (RM)
    if ([
      'SANTIAGO', 'PROVIDENCIA', 'LAS CONDES', 'VITACURA', 'LO BARNECHEA', 
      'NUNOA', 'LA REINA', 'MACUL', 'SAN MIGUEL', 'MAIPU', 'LA FLORIDA', 
      'RECOLETA', 'ESTACION CENTRAL', 'PUENTE ALTO', 'PENALOLEN', 'QUILICURA', 'CONCHALI',
      'INDEPENDENCIA', 'SAN JOAQUIN', 'SAN BERNARDO', 'PUDAHUEL', 'HUECHURABA', 'CERRILLOS',
      'LO ESPEJO', 'LA CISTERNA', 'SAN RAMON', 'LA GRANJA', 'EL BOSQUE', 'QUINTA NORMAL',
      'LO PRADO', 'CERRO NAVIA', 'RENCA', 'LAMPA', 'COLINA', 'TALAGANTE', 'BUIN', 'PAINE', 'MELIPILLA'
    ].includes(c)) {
      return 'REGIÓN METROPOLITANA';
    }
    // Región de Valparaíso (V)
    if ([
      'VALPARAISO', 'VINA DEL MAR', 'EL QUISCO', 'ALGARROBO', 'EL TABO', 'SAN ANTONIO',
      'QUILPUE', 'VILLA ALEMANA', 'QUILLOTA', 'LOS ANDES', 'SAN FELIPE', 'CONCON',
      'LIMACHE', 'OLMUE', 'SAN ESTEBAN'
    ].includes(c)) {
      return 'REGIÓN DE VALPARAÍSO';
    }
    // Región de Antofagasta (II)
    if (['ANTOFAGASTA', 'MEJILLONES', 'CALAMA', 'TOCOPILLA', 'TALTAL', 'SAN PEDRO DE ATACAMA'].includes(c)) {
      return 'REGIÓN DE ANTOFAGASTA';
    }
    // Región de Tarapacá (I)
    if (['IQUIQUE', 'ALTO HOSPICIO', 'POZO ALMONTE', 'PICA', 'HUARA', 'CAMINA', 'COLCHANE'].includes(c)) {
      return 'REGIÓN DE TARAPACÁ';
    }
    // Región del Biobío (VIII)
    if ([
      'CONCEPCION', 'TALCAHUANO', 'CHIGUAYANTE', 'SAN PEDRO DE LA PAZ', 'CORONEL',
      'LOTA', 'PENCO', 'TOME', 'HUALPEN', 'LOS ANGELES'
    ].includes(c)) {
      return 'REGIÓN DEL BÍOBÍO';
    }
    // Región de Ñuble (XVI)
    if (['CHILLAN'].includes(c)) {
      return 'REGIÓN DE ÑUBLE';
    }
    // Región de la Araucanía (IX)
    if (['TEMUCO', 'PADRE LAS CASAS', 'ANGOL', 'VILLARRICA', 'PUCON', 'LAUTARO', 'VICTORIA'].includes(c)) {
      return 'REGIÓN DE LA ARAUCANÍA';
    }
    // Región de Los Lagos (X)
    if (['PUERTO MONTT', 'OSORNO', 'CASTRO', 'ANCUD', 'PUERTO VARAS', 'FRUTILLAR', 'LLANQUIHUE', 'QUELLON'].includes(c)) {
      return 'REGIÓN DE LOS LAGOS';
    }
    // Región de Coquimbo (IV)
    if (['COQUIMBO', 'SERENA', 'LA SERENA', 'OVALLE', 'ILLAPEL', 'VICUNA', 'LOS VILOS'].includes(c)) {
      return 'REGIÓN DE COQUIMBO';
    }
    // Región de O'Higgins (VI)
    if (['RANCAGUA'].includes(c)) {
      return 'REGIÓN DE O\'HIGGINS';
    }
    // Región del Maule (VII)
    if (['TALCA'].includes(c)) {
      return 'REGIÓN DEL MAULE';
    }
    // Región de Los Ríos (XIV)
    if (['VALDIVIA', 'LA UNION', 'RIO BUENO', 'PANGUIPULLI', 'LANCO', 'MARIQUINA'].includes(c)) {
      return 'REGIÓN DE LOS RÍOS';
    }
    // Región de Aysén (XI)
    if (['COYHAIQUE', 'AYSEN', 'PUERTO AYSEN', 'CHILE CHICO', 'COCHRANE'].includes(c)) {
      return 'REGIÓN DE AYSÉN';
    }
    // Región de Atacama (III)
    if (['COPIAPO', 'VALLENAR', 'CALDERA', 'CHANARAL', 'HUASCO', 'DIEGO DE ALMAGRO'].includes(c)) {
      return 'REGIÓN DE ATACAMA';
    }
    // Región de Arica y Parinacota (XV)
    if (['ARICA'].includes(c)) {
      return 'REGIÓN DE ARICA Y PARINACOTA';
    }
    // Región de Magallanes (XII)
    if (['PUNTA ARENAS'].includes(c)) {
      return 'REGIÓN DE MAGALLANES Y DE LA ANTÁRTICA CHILENA';
    }
    
    return 'REGIÓN METROPOLITANA';
  };

  const getPropertyRegion = (p: Property): string => {
    const reg = normalizeText(p.region);
    const comm = normalizeText(p.commune);

    if (reg.includes('METROPOLITANA') || reg === 'RM' || reg === 'METROPOLITAN') {
      return 'REGIÓN METROPOLITANA';
    }
    if (reg.includes('ANTOFAGASTA') || reg.includes('II REGION') || reg.includes('II REGION')) {
      return 'REGIÓN DE ANTOFAGASTA';
    }
    if (reg.includes('VALPARAISO') || reg.includes('V REGION')) {
      return 'REGIÓN DE VALPARAÍSO';
    }
    if (reg.includes('TARAPACA') || reg.includes('I REGION')) {
      return 'REGIÓN DE TARAPACÁ';
    }
    if (reg.includes('BIOBIO') || reg.includes('VIII REGION')) {
      return 'REGIÓN DEL BÍOBÍO';
    }
    if (reg.includes('NUBLE') || reg.includes('XVI REGION')) {
      return 'REGIÓN DE ÑUBLE';
    }
    if (reg.includes('ARAUCANIA') || reg.includes('IX REGION')) {
      return 'REGIÓN DE LA ARAUCANÍA';
    }
    if (reg.includes('LOS LAGOS') || reg.includes('X REGION')) {
      return 'REGIÓN DE LOS LAGOS';
    }
    if (reg.includes('COQUIMBO') || reg.includes('IV REGION')) {
      return 'REGIÓN DE COQUIMBO';
    }
    if (reg.includes('HIGGINS') || reg.includes('VI REGION')) {
      return 'REGIÓN DE O\'HIGGINS';
    }
    if (reg.includes('MAULE') || reg.includes('VII REGION')) {
      return 'REGIÓN DEL MAULE';
    }
    if (reg.includes('LOS RIOS') || reg.includes('XIV REGION')) {
      return 'REGIÓN DE LOS RÍOS';
    }
    if (reg.includes('AYSEN') || reg.includes('XI REGION')) {
      return 'REGIÓN DE AYSÉN';
    }
    if (reg.includes('ATACAMA') || reg.includes('III REGION')) {
      return 'REGIÓN DE ATACAMA';
    }
    if (reg.includes('ARICA') || reg.includes('XV REGION')) {
      return 'REGIÓN DE ARICA Y PARINACOTA';
    }
    if (reg.includes('MAGALLANES') || reg.includes('XII REGION')) {
      return 'REGIÓN DE MAGALLANES Y DE LA ANTÁRTICA CHILENA';
    }

    // Default back to matching by commune
    return getRegionForCommune(p.commune);
  };

  // Auto-select Region, Commune, and Property if the logged in user has exactly 1 contract registered
  useEffect(() => {
    if (leaseContracts && currentUser) {
      const myContracts = leaseContracts.filter(
        c => (c.tenantName && c.tenantName.toLowerCase() === currentUser.toLowerCase()) ||
             (c.tenantEmail && c.tenantEmail.toLowerCase() === currentUser.toLowerCase())
      );
      
      // Prefill tenant name if not set yet and available in contract
      if (myContracts.length > 0 && !tenantName && !localStorage.getItem('tenant_portal_name')) {
        const firstWithVal = myContracts.find(c => c.tenantName);
        if (firstWithVal) {
          setTenantName(firstWithVal.tenantName.toUpperCase());
        }
      }

      if (properties) {
        if (myContracts.length === 1) {
          const contract = myContracts[0];
          const matchedProp = properties.find(p => p.id === contract.propertyId || p.code === contract.propertyId);
          if (matchedProp) {
            if (isFormOpen) {
              setSelectedRegion(getPropertyRegion(matchedProp));
              setSelectedCommune((matchedProp.commune || 'SANTIAGO').toUpperCase().trim());
              setPropertyId(matchedProp.id);
            }
            if (!reimbPropertyId) {
              setReimbPropertyId(matchedProp.id);
            }
          }
        }
      }
    }
  }, [isFormOpen, leaseContracts, currentUser, properties, reimbPropertyId]);

  // Cascading lists helpers
  const availableRegions: string[] = Array.from(new Set<string>(
    properties.map(p => getPropertyRegion(p))
  )).sort((a: string, b: string) => a.localeCompare(b));

  const availableCommunes: string[] = selectedRegion ? Array.from(new Set<string>(
    properties
      .filter(p => getPropertyRegion(p) === selectedRegion)
      .map(p => (p.commune || 'SANTIAGO').toUpperCase().trim())
  )).sort((a: string, b: string) => a.localeCompare(b)) : [];

  const availableProperties = (selectedRegion && selectedCommune) ? properties
    .filter(p => {
      const pRegion = getPropertyRegion(p);
      const pCommune = (p.commune || 'SANTIAGO').toUpperCase().trim();
      return pRegion === selectedRegion && pCommune === selectedCommune;
    })
    .sort((a, b) => {
      const bCompare = (a.building || '').localeCompare(b.building || '');
      if (bCompare !== 0) return bCompare;
      return (a.code || '').localeCompare(b.code || '');
    }) : [];

  // Filter requests submitted by this tenant
  const myRequests = solicitudes.filter(
    s => (s.userCreator === currentUser || s.applicantEmail?.toLowerCase() === currentUser.toLowerCase()) && s.category !== 'REEMBOLSO'
  );

  const myReimbursements = solicitudes.filter(
    s => (s.userCreator === currentUser || s.applicantEmail?.toLowerCase() === currentUser.toLowerCase()) && s.category === 'REEMBOLSO'
  );

  // Filter contracts related to this tenant
  const myContracts = leaseContracts ? leaseContracts.filter(
    c => (c.tenantName && c.tenantName.toLowerCase() === currentUser.toLowerCase()) ||
         (c.tenantEmail && c.tenantEmail.toLowerCase() === currentUser.toLowerCase())
  ) : [];

  // Filter by search terms, active request tab and priority
  const filteredRequests = myRequests.filter(sol => {
    // Search matching
    const matchesSearch = 
      sol.title.toUpperCase().includes(searchTerm.toUpperCase()) ||
      sol.description.toUpperCase().includes(searchTerm.toUpperCase()) ||
      `SOL-${sol.id.split('-')[0].toUpperCase()}`.includes(searchTerm.toUpperCase());

    // Status filter matching using Abiertos/Cerrados tabs
    const matchesStatusTab = activeRequestTab === 'ABIERTOS'
      ? sol.status !== 'FINALIZADA'
      : sol.status === 'FINALIZADA';

    // Priority filter matching
    const matchesPriority = priorityFilter === 'TODOS' || sol.priority === priorityFilter;

    return matchesSearch && matchesStatusTab && matchesPriority;
  });

  const openRequestsCount = myRequests.filter(s => s.status !== 'FINALIZADA').length;
  const closedRequestsCount = myRequests.filter(s => s.status === 'FINALIZADA').length;

  // Sort by timestamp desc to get the newest request code dynamically
  const sortedRequests = [...myRequests].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  const newestCaseCode = sortedRequests.length > 0 ? `SOL-${sortedRequests[0].id.split('-')[0].toUpperCase()}` : 'PENDIENTE DE CREACIÓN';

  const renderVisualTimeline = (status: string) => {
    const steps = [
      { label: 'INGRESADA', desc: 'Solicitud recibida', active: true },
      { label: 'EN REVISIÓN', desc: 'Ejecutivo asignado', active: status !== 'PENDIENTE' },
      { label: 'EN PROCESO', desc: 'Técnico asignado', active: status === 'EN_PROCESO' || status === 'FINALIZADA' || status === 'APROBADA_JEFATURA' },
      { label: 'RESUELTO', desc: 'Caso finalizado', active: status === 'FINALIZADA' }
    ];

    return (
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-150 space-y-3">
        <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest">Línea de Tiempo del Requerimiento</p>
        <div className="flex items-center justify-between relative pt-1 pb-2">
          {/* connector line */}
          <div className="absolute top-4 left-4 right-4 h-0.5 bg-slate-200 z-0" />
          {/* active connector line */}
          <div 
            className="absolute top-4 left-4 h-0.5 bg-emerald-500 z-0 transition-all duration-300"
            style={{ 
              width: status === 'FINALIZADA' ? '100%' :
                     status === 'EN_PROCESO' || status === 'APROBADA_JEFATURA' ? '66%' :
                     status !== 'PENDIENTE' ? '33%' : '0%' 
            }}
          />
          
          {steps.map((st, i) => {
            const isCompleted = st.active;
            const isCurrent = (i === 0 && status === 'PENDIENTE') ||
                              (i === 1 && status === 'DETENIDA') ||
                              (i === 2 && (status === 'EN_PROCESO' || status === 'APROBADA_JEFATURA')) ||
                              (i === 3 && status === 'FINALIZADA');

            return (
              <div key={i} className="flex flex-col items-center text-center z-10 relative flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  isCompleted 
                    ? isCurrent 
                      ? 'bg-amber-400 border-amber-500 text-white shadow-sm scale-110 ring-4 ring-amber-400/20' 
                      : 'bg-emerald-500 border-emerald-600 text-white'
                    : 'bg-white border-slate-200 text-slate-400'
                }`}>
                  {isCompleted && !isCurrent ? (
                    <Check size={12} className="stroke-[3]" />
                  ) : (
                    <span className="text-[9px] font-black">{i + 1}</span>
                  )}
                </div>
                <span className={`text-[8px] sm:text-[9px] font-black uppercase mt-1.5 tracking-wider ${isCurrent ? 'text-[#0B3C5D]' : isCompleted ? 'text-slate-700' : 'text-slate-400'}`}>
                  {st.label}
                </span>
                <span className="text-[7px] font-bold text-slate-400 uppercase hidden sm:block mt-0.5">
                  {st.desc}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setIsUploading(true);
    const loadedImages: string[] = [];

    const fileList = Array.from(files) as File[];
    fileList.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          loadedImages.push(reader.result);
          if (loadedImages.length === fileList.length) {
            setImages(prev => [...prev, ...loadedImages]);
            setIsUploading(false);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleReimbReceiptsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setIsReimbUploading(true);
    const loadedReceipts: string[] = [];

    const fileList = Array.from(files) as File[];
    fileList.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          loadedReceipts.push(reader.result);
          if (loadedReceipts.length === fileList.length) {
            setReimbReceipts(prev => [...prev, ...loadedReceipts]);
            setIsReimbUploading(false);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeReimbReceipt = (index: number) => {
    setReimbReceipts(prev => prev.filter((_, i) => i !== index));
  };

  const handleReimbSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reimbPropertyId || !reimbAmount || !reimbTitle.trim() || !reimbDesc.trim()) {
      alert("Por favor, completa todos los campos requeridos.");
      return;
    }

    const numAmount = Number(reimbAmount.replace(/\D/g, ''));
    if (isNaN(numAmount) || numAmount <= 0) {
      alert("Por favor, ingresa un monto válido.");
      return;
    }

    if (reimbReceipts.length === 0) {
      alert("Por favor, adjunta al menos una boleta o comprobante de pago.");
      return;
    }

    const prop = properties.find(p => p.id === reimbPropertyId);
    const generatedId = crypto.randomUUID();
    const trackingCode = `SOL-${generatedId.split('-')[0].toUpperCase()}`;

    // Save Bank Info to localstorage if checkbox is on
    if (saveBankInfoCheckbox) {
      localStorage.setItem('reimb_bank_name', reimbBankName);
      localStorage.setItem('reimb_account_type', reimbAccountType);
      localStorage.setItem('reimb_account_number', reimbAccountNumber);
      localStorage.setItem('reimb_rut', reimbRut);
      localStorage.setItem('reimb_holder_name', reimbHolderName);
    } else {
      localStorage.removeItem('reimb_bank_name');
      localStorage.removeItem('reimb_account_type');
      localStorage.removeItem('reimb_account_number');
      localStorage.removeItem('reimb_rut');
      localStorage.removeItem('reimb_holder_name');
    }

    const normalizedTitle = `SOLICITUD REEMBOLSO: ${normalizeText(reimbTitle)}`;
    const normalizedDescription = normalizeText(reimbDesc);

    const newSolicitud: Solicitud = {
      id: generatedId,
      propertyId: reimbPropertyId,
      propertyLabel: prop ? `${prop.building} - UNIDAD ${prop.code} (${prop.address})` : 'UNIDAD NO IDENTIFICADA',
      title: normalizedTitle,
      description: normalizedDescription,
      status: 'PENDIENTE',
      priority: 'MEDIA',
      category: 'REEMBOLSO',
      requestDate: new Date().toISOString().split('T')[0],
      updates: [],
      subtasks: [],
      userCreator: currentUser,
      applicantName: normalizeText(tenantName.trim() || currentUser),
      applicantEmail: currentUser,
      timestamp: Date.now(),
      images: reimbReceipts,
      reimbursementAmount: numAmount,
      reimbursementReceipts: reimbReceipts,
      reimbursementBankInfo: {
        bankName: normalizeText(reimbBankName),
        accountType: normalizeText(reimbAccountType),
        accountNumber: reimbAccountNumber.trim(),
        rut: reimbRut.trim().toUpperCase(),
        holderName: normalizeText(reimbHolderName)
      },
      phone: tenantPhone,
      isTest: prop ? !!prop.isTest : false
    };

    onSaveSolicitud(newSolicitud);

    setReimbSuccessData({
      id: generatedId,
      trackingCode
    });

    setReimbTitle('');
    setReimbDesc('');
    setReimbAmount('');
    setReimbReceipts([]);
    setReimbWizardStep(1);
  };

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }).catch(() => {
        fallbackCopyToClipboard(text);
      });
    } else {
      fallbackCopyToClipboard(text);
    }
  };

  const fallbackCopyToClipboard = (text: string) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Fallback copy failed', err);
    }
    document.body.removeChild(textArea);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId || !title.trim() || !description.trim()) return;

    const prop = properties.find(p => p.id === propertyId);
    const generatedId = crypto.randomUUID();
    const trackingCode = `SOL-${generatedId.split('-')[0].toUpperCase()}`;

    const normalizedTitle = normalizeText(title);
    const normalizedDescription = `[LUGAR EXACTO: ${exactLocation}] ${normalizeText(description)}`;
    const normalizedApplicantName = normalizeText(tenantName.trim() || currentUser);

    const newSolicitud: Solicitud = {
      id: generatedId,
      propertyId,
      propertyLabel: prop ? `${prop.building} - UNIDAD ${prop.code} (${prop.address})` : 'UNIDAD NO IDENTIFICADA',
      title: normalizedTitle,
      description: normalizedDescription,
      status: 'PENDIENTE',
      priority,
      category,
      requestDate: new Date().toISOString().split('T')[0],
      updates: [],
      subtasks: [],
      userCreator: currentUser,
      applicantName: normalizedApplicantName,
      applicantEmail: currentUser,
      timestamp: Date.now(),
      images: images, // Save uploaded images list
      exactLocation: exactLocation,
      phone: tenantPhone,
      isTest: prop ? !!prop.isTest : false
    };

    onSaveSolicitud(newSolicitud);

    setSuccessData({
      id: generatedId,
      trackingCode,
      rawSolicitud: newSolicitud
    });
    setCopied(false);
  };

  const handleFinalize = (savePhone: boolean) => {
    if (savePhone && successData) {
      if (savePhoneCheckbox && tenantPhone.trim()) {
        localStorage.setItem('tenant_portal_phone', tenantPhone);
      } else if (!savePhoneCheckbox) {
        localStorage.removeItem('tenant_portal_phone');
      }

      if (savePhoneCheckbox && tenantName.trim()) {
        localStorage.setItem('tenant_portal_name', tenantName);
      } else if (!savePhoneCheckbox) {
        localStorage.removeItem('tenant_portal_name');
      }

      const updatedSolicitud: Solicitud = {
        ...successData.rawSolicitud,
        phone: tenantPhone,
        applicantName: tenantName.trim() || currentUser
      };
      onSaveSolicitud(updatedSolicitud);
    }

    setTitle('');
    setDescription('');
    setPropertyId('');
    setSelectedRegion('');
    setSelectedCommune('');
    setPriority('MEDIA');
    setCategory('REQUERIMIENTO');
    setImages([]);
    setExactLocation('LIVING');
    setSuccessData(null);
    setCopied(false);
    setIsFormOpen(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDIENTE':
        return (
          <span className="flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full border border-amber-300 bg-amber-50 text-amber-700 uppercase">
            <Clock size={10} /> Pendiente
          </span>
        );
      case 'EN_PROCESO':
        return (
          <span className="flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full border border-blue-300 bg-blue-50 text-blue-700 uppercase">
            <Wrench size={10} /> En Proceso
          </span>
        );
      case 'DETENIDA':
        return (
          <span className="flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full border border-rose-300 bg-rose-50 text-rose-700 uppercase">
            <AlertTriangle size={10} /> Detenida
          </span>
        );
      case 'FINALIZADA':
        return (
          <span className="flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full border border-emerald-300 bg-emerald-50 text-emerald-700 uppercase">
            <CheckCircle2 size={10} /> Solucionado
          </span>
        );
      case 'APROBADA_JEFATURA':
        return (
          <span className="flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full border border-purple-300 bg-purple-50 text-purple-700 uppercase">
            <CheckCircle2 size={10} /> Aprobado Jefatura
          </span>
        );
      default:
        return (
          <span className="text-[9px] font-black px-2 py-0.5 rounded-full border border-slate-300 bg-slate-50 text-slate-700 uppercase">
            {status}
          </span>
        );
    }
  };

  const getPriorityColor = (prio: string) => {
    switch (prio) {
      case 'CRÍTICA': return 'text-rose-600 bg-rose-50 border border-rose-200';
      case 'ALTA': return 'text-orange-600 bg-orange-50 border border-orange-200';
      case 'MEDIA': return 'text-indigo-600 bg-indigo-50 border border-indigo-200';
      default: return 'text-slate-600 bg-slate-50 border border-slate-200';
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#F8FAFC] text-slate-800 font-sans overflow-hidden">
      {/* MOBILE / CORPORATE HEADER */}
      <header className="flex-shrink-0 bg-[#0B3C5D] text-white py-4 px-6 shadow-md border-b border-[#051C2C]">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white rounded-xl p-1.5 border border-white/20 flex items-center justify-center shadow-inner select-none w-[120px] h-[38px]"
                 dangerouslySetInnerHTML={{ __html: DEFAULT_ASSETFLOW_SVG }} />
            <div className="border-l border-white/10 pl-3">
              <h1 className="text-[11px] font-black tracking-widest text-[#FFCC00] uppercase font-mono leading-none">ASSETFLOW</h1>
              <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest mt-1">Portal Arrendatario</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-[9px] font-black text-slate-300 uppercase tracking-wider">Arrendatario Activo</p>
              <p className="text-[11px] font-bold text-white max-w-[150px] truncate">{currentUser}</p>
            </div>
            <button 
              onClick={onLogout}
              className="px-3 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-200 hover:text-white transition-all cursor-pointer border border-white/10 flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-[#FFCC00]"
              title="Cerrar Sesión"
            >
              <LogOut size={14} className="text-[#FFCC00]" />
              <span className="text-[10px] font-bold uppercase hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* CORE CONTAINER */}
      <main className="flex-1 overflow-y-auto px-4 pt-6 pb-16">
        <div className="max-w-3xl mx-auto space-y-6">
        
        {/* POLISHED TABBED SEGMENTED CONTROL */}
        <div className="flex flex-col sm:flex-row bg-slate-100 p-1.5 rounded-2xl border border-slate-200 shadow-sm gap-1">
          <button
            onClick={() => setActiveTab('cobros')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'cobros'
                ? 'bg-[#0B3C5D] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <DollarSign size={15} className="stroke-[2.5]" />
            <span>Mis Cobros y Pago Online</span>
          </button>

          <button
            onClick={() => setActiveTab('solicitudes')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'solicitudes'
                ? 'bg-[#0B3C5D] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <ClipboardList size={15} className="stroke-[2.5]" />
            <span>Mis Solicitudes</span>
            {myRequests.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'solicitudes' ? 'bg-[#FFCC00] text-[#0B3C5D]' : 'bg-slate-250 text-slate-700'
              }`}>
                {myRequests.length}
              </span>
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('reembolsos')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'reembolsos'
                ? 'bg-[#0B3C5D] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Receipt size={15} className="stroke-[2.5]" />
            <span>Reembolso Reparaciones</span>
            {myReimbursements.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'reembolsos' ? 'bg-[#FFCC00] text-[#0B3C5D]' : 'bg-slate-250 text-slate-700'
              }`}>
                {myReimbursements.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('pagos')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'pagos'
                ? 'bg-[#0B3C5D] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <CreditCard size={15} className="stroke-[2.5]" />
            <span>Pagos Realizados</span>
          </button>

          <button
            onClick={() => setActiveTab('contrato')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === 'contrato'
                ? 'bg-[#0B3C5D] text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Building size={15} className="stroke-[2.5]" />
            <span>Mi Contrato y Unidad</span>
          </button>
        </div>

        {activeTab === 'solicitudes' && (
          <div className="space-y-6">
            {/* COMPACT & ELEGANT TOP HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-3xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center gap-3 text-[#0B3C5D]">
                <div className="p-2.5 bg-slate-50 border border-slate-150 rounded-2xl text-[#0B3C5D] shadow-xs">
                  <Activity size={18} className="stroke-[2.5]" />
                </div>
                <div>
                  <h2 className="text-xs font-black uppercase tracking-widest text-[#0B3C5D] font-mono leading-tight">
                    Portal de Requerimientos
                  </h2>
                  <p className="text-[9.5px] font-bold text-slate-450 uppercase tracking-wide">
                    {myRequests.length} {myRequests.length === 1 ? 'Caso' : 'Casos'} Registrado{myRequests.length !== 1 ? 'os' : ''} en total
                  </p>
                </div>
              </div>
              
              <button 
                onClick={() => setIsFormOpen(true)}
                className="w-full sm:w-auto px-5 py-3 bg-[#FFCC00] hover:bg-[#E6B800] text-[#0B3C5D] font-black text-[9.5px] uppercase tracking-wider rounded-xl shadow-xs transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 cursor-pointer border border-[#FFCC00]"
              >
                <Plus size={13} className="stroke-[3]" />
                <span>Ingresar Reporte</span>
              </button>
            </div>

            {/* SEARCH AND FILTERS */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3.5">
              <div className="flex items-center gap-2 text-[#0B3C5D]">
                <Search size={14} className="stroke-[2.5]" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 font-mono">Buscador y Filtros</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Search input */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="BUSCAR CASO..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-xs font-bold uppercase tracking-wider border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B3C5D] focus:border-[#0B3C5D] transition-all placeholder:text-slate-400"
                  />
                  <Search size={12} className="absolute left-3 top-3.5 text-slate-400" />
                </div>

                {/* Priority dropdown */}
                <div className="relative">
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-xs font-bold uppercase tracking-wider border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B3C5D] focus:border-[#0B3C5D] transition-all appearance-none cursor-pointer"
                  >
                    <option value="TODOS">TODAS LAS PRIORIDADES</option>
                    <option value="CRÍTICA">PRIORIDAD: CRÍTICA</option>
                    <option value="ALTA">PRIORIDAD: ALTA</option>
                    <option value="MEDIA">PRIORIDAD: MEDIA</option>
                    <option value="BAJA">PRIORIDAD: BAJA</option>
                  </select>
                  <Filter size={12} className="absolute left-3 top-3.5 text-slate-400" />
                  <ChevronDown size={12} className="absolute right-3 top-4 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* REQUESTS TRACKING HEADER */}
            <div className="flex items-center justify-between pt-2">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Listado de Casos Activos</h3>
              <span className="text-[9px] font-mono font-black text-slate-500 bg-slate-200/60 px-2.5 py-1 rounded-full uppercase tracking-wider">Historial</span>
            </div>

            {/* REQUESTS LIST */}
            <div id="requests-list-container" className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
              {/* TABS HEADER BAR AS IN SCREENSHOT 2 */}
              <div className="border-b border-slate-100 bg-white px-6 pt-4 flex gap-6">
                <button
                  type="button"
                  onClick={() => setActiveRequestTab('ABIERTOS')}
                  className={`pb-3.5 text-xs font-black uppercase tracking-wider relative transition-all cursor-pointer flex items-center gap-2 select-none focus:outline-none ${
                    activeRequestTab === 'ABIERTOS' 
                      ? 'text-slate-800 font-extrabold' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <span>Abiertos</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black transition-all ${
                    activeRequestTab === 'ABIERTOS'
                      ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/40'
                      : 'bg-emerald-50/50 text-emerald-600/80'
                  }`}>
                    {openRequestsCount}
                  </span>
                  {activeRequestTab === 'ABIERTOS' && (
                    <motion.div 
                      layoutId="activeRequestTabUnderline"
                      className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#0B3C5D]" 
                    />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveRequestTab('CERRADOS')}
                  className={`pb-3.5 text-xs font-black uppercase tracking-wider relative transition-all cursor-pointer flex items-center gap-2 select-none focus:outline-none ${
                    activeRequestTab === 'CERRADOS' 
                      ? 'text-slate-800 font-extrabold' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <span>Cerrados</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black transition-all ${
                    activeRequestTab === 'CERRADOS'
                      ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200/40'
                      : 'bg-rose-50/50 text-rose-600/80'
                  }`}>
                    {closedRequestsCount}
                  </span>
                  {activeRequestTab === 'CERRADOS' && (
                    <motion.div 
                      layoutId="activeRequestTabUnderline"
                      className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#0B3C5D]" 
                    />
                  )}
                </button>
              </div>

              {filteredRequests.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                    <ClipboardList size={32} />
                  </div>
                  <p className="text-xs font-black text-slate-600 uppercase tracking-wider">No se encontraron solicitudes registradas</p>
                  <p className="text-[10px] text-slate-400 max-w-xs mx-auto uppercase leading-relaxed font-bold">
                    Cualquier desperfecto, gotera o daño de infraestructura puede ser ingresado presionando el botón superior.
                  </p>
                </div>
              ) : (
                <div>
                  {/* VISTA MÓVIL Y TABLET: TARJETAS RESPONSIVAS (block md:hidden) */}
                  <div className="hidden divide-y divide-slate-100 bg-white">
                    {filteredRequests.map((sol) => {
                      const isExpanded = expandedSolId === sol.id;
                      
                      const getFechaCierre = (s: typeof sol): string => {
                        if (s.status !== 'FINALIZADA') return '—';
                        const closedInHistory = s.statusHistory?.find(sh => sh.status === 'FINALIZADA');
                        if (closedInHistory) return closedInHistory.date;
                        const finalUpdate = s.updates?.find(up => 
                          up.content.toUpperCase().includes('FINALIZADA') || 
                          up.content.toUpperCase().includes('RESUELTO')
                        );
                        if (finalUpdate) return finalUpdate.date;
                        return s.lastModifiedAt || s.requestDate;
                      };

                      const renderStatusBadgeMobile = (status: string) => {
                        switch (status) {
                          case 'PENDIENTE':
                            return (
                              <span className="inline-flex items-center gap-1 text-[8.5px] font-black px-2.5 py-1 rounded-full border border-amber-300 bg-amber-50 text-amber-850 uppercase tracking-wider font-mono">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                PENDIENTE
                              </span>
                            );
                          case 'EN_PROCESO':
                            return (
                              <span className="inline-flex items-center gap-1 text-[8.5px] font-black px-2.5 py-1 rounded-full border border-blue-300 bg-blue-50 text-blue-700 uppercase tracking-wider font-mono">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                EN PROCESO
                              </span>
                            );
                          case 'DETENIDA':
                            return (
                              <span className="inline-flex items-center gap-1 text-[8.5px] font-black px-2.5 py-1 rounded-full border border-rose-300 bg-rose-50 text-rose-700 uppercase tracking-wider font-mono">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                DETENIDA
                              </span>
                            );
                          case 'FINALIZADA':
                            return (
                              <span className="inline-flex items-center gap-1 text-[8.5px] font-black px-2.5 py-1 rounded-full border border-slate-300 bg-slate-100 text-slate-800 uppercase tracking-wider font-mono">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                                CERRADO
                              </span>
                            );
                          case 'APROBADA_JEFATURA':
                            return (
                              <span className="inline-flex items-center gap-1 text-[8.5px] font-black px-2.5 py-1 rounded-full border border-emerald-300 bg-emerald-50 text-emerald-700 uppercase tracking-wider font-mono">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                APROBADO
                              </span>
                            );
                          default:
                            return (
                              <span className="inline-flex items-center gap-1 text-[8.5px] font-black px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-600 uppercase tracking-wider font-mono">
                                {status}
                              </span>
                            );
                        }
                      };

                      return (
                        <div key={sol.id} className="p-5 space-y-4 hover:bg-slate-50/50 transition-all border-b border-slate-100 last:border-0">
                          {/* CARD HEADER */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] font-extrabold text-[#0B3C5D] bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                                #{sol.id.split('-')[0].toUpperCase()}
                              </span>
                              <span className="text-[10px] font-mono font-bold text-slate-450 uppercase tracking-wider">
                                {formatChileDate(sol.requestDate)}
                              </span>
                            </div>
                            {renderStatusBadgeMobile(sol.status)}
                          </div>

                          {/* CARD BODY */}
                          <div onClick={() => setExpandedSolId(isExpanded ? null : sol.id)} className="cursor-pointer space-y-1.5">
                            <span className="text-[9px] font-black text-[#0B3C5D] uppercase tracking-widest block font-mono">
                              {sol.category || 'REQUERIMIENTO'}
                            </span>
                            <h4 className="text-xs font-black text-slate-800 leading-snug uppercase">
                              {sol.title}
                            </h4>
                            <p className="text-[10px] text-slate-500 font-bold line-clamp-2 uppercase leading-relaxed">
                              {sol.description}
                            </p>
                          </div>

                          {/* EXPANSION TRIGGER BUTTON & DATES */}
                          <div className="flex items-center justify-between pt-1">
                            <button
                              onClick={() => setExpandedSolId(isExpanded ? null : sol.id)}
                              className="text-[10px] font-black text-[#0B3C5D] hover:text-[#0a2e46] uppercase tracking-wider flex items-center gap-1.5 cursor-pointer bg-slate-50 hover:bg-slate-100/80 px-3 py-1.5 rounded-lg border border-slate-200 transition-all"
                            >
                              <span>{isExpanded ? 'Ocultar Detalles' : 'Ver Detalles'}</span>
                              {isExpanded ? <ChevronUp size={12} className="stroke-[3]" /> : <ChevronDown size={12} className="stroke-[3]" />}
                            </button>
                            
                            {sol.status === 'FINALIZADA' && (
                              <span className="text-[9px] font-mono font-black text-emerald-700 bg-emerald-50 border border-emerald-150 px-2 py-0.5 rounded-md uppercase">
                                Cierre: {formatChileDate(getFechaCierre(sol))}
                              </span>
                            )}
                          </div>

                          {/* EXPANDED CONTENT AREA FOR MOBILE */}
                          <AnimatePresence initial={false}>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden border-t border-slate-100 pt-4 space-y-4"
                              >
                                {/* DYNAMIC TIMELINE STATUS BAR */}
                                {renderVisualTimeline(sol.status)}

                                {/* DESCRIPTION */}
                                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2">
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">Diagnóstico Técnico</p>
                                  <p className="text-xs text-slate-700 font-semibold leading-relaxed whitespace-pre-wrap uppercase">
                                    {sol.description}
                                  </p>
                                </div>

                                {/* IMAGES */}
                                {sol.images && sol.images.length > 0 && (
                                  <div className="space-y-2">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">Evidencia Fotográfica</p>
                                    <div className="grid grid-cols-2 gap-2.5">
                                      {sol.images.map((img, i) => (
                                        <div key={i} className="relative rounded-xl overflow-hidden border border-slate-200 aspect-video bg-white shadow-xs">
                                          <img src={img} alt={`Falla ${i+1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* STATUS TIMELINE / UPDATES */}
                                <div className="space-y-3 bg-slate-50/50 rounded-2xl p-4 border border-slate-200/80">
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2 font-mono">Historial de Actualizaciones</p>
                                  {sol.updates && sol.updates.length > 0 ? (
                                    <div className="space-y-3 pl-3 border-l-2 border-slate-200">
                                      {sol.updates.map((up) => (
                                        <div key={up.id} className="relative pl-4 space-y-1">
                                          <div className="absolute left-[-18px] top-1.5 w-2 h-2 bg-[#0B3C5D] rounded-full border-2 border-white shadow-xs" />
                                          <div className="flex justify-between items-center text-[8.5px] font-bold text-slate-450 uppercase">
                                            <span className="text-[#0B3C5D] font-black">{up.user}</span>
                                            <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-100">{up.date}</span>
                                          </div>
                                          <p className="text-[10px] font-bold text-slate-600 uppercase leading-normal">{up.content}</p>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-[9.5px] text-slate-400 font-bold uppercase italic">No hay actualizaciones registradas aún.</p>
                                  )}
                                </div>

                                {/* ASSIGNED TECHNICIAN / WORK ORDER */}
                                {sol.assignedTo && (
                                  <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 flex flex-col sm:flex-row gap-3 sm:items-center justify-between text-[10.5px] font-black text-indigo-950 uppercase shadow-xs">
                                    <span className="flex items-center gap-2">
                                      <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                      Técnico Asignado: {sol.assignedTo}
                                    </span>
                                    {sol.workOrderFolio && (
                                      <span className="self-start sm:self-auto bg-indigo-600 text-white px-2.5 py-1 rounded-md text-[9px] font-mono font-black">
                                        OT: #{sol.workOrderFolio}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>

                  {/* TABLA COMPLETAMENTE RESPONSIVA PARA TODOS LOS DISPOSITIVOS CON DESPLAZAMIENTO HORIZONTAL EN MÓVIL */}
                  <div className="flex md:hidden items-center justify-center gap-1.5 text-[9.5px] font-black text-slate-400 bg-slate-50 border-b border-slate-100 py-3 uppercase tracking-wider select-none font-mono">
                    <ChevronRight size={12} className="text-[#0B3C5D] animate-pulse" />
                    Desliza horizontalmente para ver más columnas
                    <ChevronRight size={12} className="text-[#0B3C5D] animate-pulse" />
                  </div>
                  <div className="w-full overflow-x-auto scrollbar-thin">
                    <table className="min-w-full divide-y divide-slate-200 text-left">
                      <thead className="bg-[#f8fafc] border-b border-slate-200">
                        <tr>
                          <th scope="col" className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider">Categoría</th>
                          <th scope="col" className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider">Caso o Solicitud</th>
                          <th scope="col" className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider">Estado de Caso o Solicitud</th>
                          <th scope="col" className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider">Número de Caso o Solicitud</th>
                          <th scope="col" className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider">Fecha Ingreso</th>
                          <th scope="col" className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider">Fecha Cierre</th>
                          <th scope="col" className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-wider text-center">Ver Detalles</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-150 bg-white">
                        {filteredRequests.flatMap((sol) => {
                          const isExpanded = expandedSolId === sol.id;
                          
                          // Helpers for dates
                          const getFechaCierre = (s: typeof sol): string => {
                            if (s.status !== 'FINALIZADA') return '—';
                            const closedInHistory = s.statusHistory?.find(sh => sh.status === 'FINALIZADA');
                            if (closedInHistory) return closedInHistory.date;
                            const finalUpdate = s.updates?.find(up => 
                              up.content.toUpperCase().includes('FINALIZADA') || 
                              up.content.toUpperCase().includes('RESUELTO')
                            );
                            if (finalUpdate) return finalUpdate.date;
                            return s.lastModifiedAt || s.requestDate;
                          };

                          const renderStatusBadge = (status: string) => {
                            switch (status) {
                              case 'PENDIENTE':
                                return (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full border border-amber-300 bg-amber-50 text-amber-750 uppercase tracking-wider font-mono">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                    PENDIENTE
                                  </span>
                                );
                              case 'EN_PROCESO':
                                return (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full border border-blue-300 bg-blue-50 text-blue-700 uppercase tracking-wider font-mono">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                    EN PROCESO
                                  </span>
                                );
                              case 'DETENIDA':
                                return (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full border border-rose-300 bg-rose-50 text-rose-700 uppercase tracking-wider font-mono">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                    DETENIDA
                                  </span>
                                );
                              case 'FINALIZADA':
                                return (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full border border-slate-300 bg-slate-100 text-slate-800 uppercase tracking-wider font-mono">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                                    CERRADO
                                  </span>
                                );
                              case 'APROBADA_JEFATURA':
                                return (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full border border-emerald-300 bg-emerald-50 text-emerald-700 uppercase tracking-wider font-mono">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    APROBADO
                                  </span>
                                );
                              default:
                                return (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600 uppercase tracking-wider font-mono">
                                    {status}
                                  </span>
                                );
                            }
                          };

                          return [
                            // Primary Row
                            <tr 
                              key={`row-${sol.id}`} 
                              className="hover:bg-slate-50/70 odd:bg-white even:bg-slate-50/30 transition-colors group cursor-pointer border-b border-slate-100"
                              onClick={() => setExpandedSolId(isExpanded ? null : sol.id)}
                            >
                              <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold">
                                <span className="inline-flex items-center text-[10px] font-extrabold px-2.5 py-0.5 rounded-md bg-[#0B3C5D]/10 text-[#0B3C5D] uppercase tracking-wider font-mono">
                                  {sol.category || 'REQUERIMIENTO'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-800 font-bold uppercase tracking-tight">
                                <div className="font-extrabold text-slate-900 text-xs tracking-tight normal-case truncate max-w-[220px]" title={sol.title}>
                                  {sol.title}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-xs uppercase tracking-wider">
                                {renderStatusBadge(sol.status)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-xs">
                                <span className="font-mono text-[10px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded-md">
                                  #{sol.id.split('-')[0].toUpperCase()}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-xs font-mono font-bold text-slate-500">
                                {formatChileDate(sol.requestDate)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-xs font-mono font-bold text-slate-500">
                                {formatChileDate(getFechaCierre(sol))}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-xs text-center">
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedSolId(isExpanded ? null : sol.id);
                                  }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-[#0B3C5D] hover:bg-slate-100 transition-all duration-150 inline-flex items-center justify-center cursor-pointer"
                                >
                                  <Eye size={16} className={`transition-transform duration-200 ${isExpanded ? 'scale-110 text-[#0B3C5D]' : 'scale-100'}`} />
                                </button>
                              </td>
                            </tr>,
                            // Expanded detail block (renders only if expanded)
                            isExpanded && (
                              <tr key={`detail-${sol.id}`} className="bg-slate-50/40">
                                <td colSpan={7} className="px-6 py-6 border-t border-b border-slate-150">
                                  <motion.div 
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-5"
                                  >
                                    {/* NEW DYNAMIC TIMELINE STATUS BAR */}
                                    {renderVisualTimeline(sol.status)}

                                    {/* DESCRIPTION */}
                                    <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs space-y-2">
                                      <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest">Diagnóstico Técnico del Arrendatario</p>
                                      <p className="text-xs text-slate-700 font-semibold leading-relaxed whitespace-pre-wrap uppercase">
                                        {sol.description}
                                      </p>
                                    </div>

                                    {/* IMAGES */}
                                    {sol.images && sol.images.length > 0 && (
                                      <div className="space-y-2">
                                        <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest">Evidencia Fotográfica</p>
                                        <div className="grid grid-cols-2 gap-3">
                                          {sol.images.map((img, i) => (
                                            <div key={i} className="relative rounded-2xl overflow-hidden border border-slate-200 aspect-video shadow-xs bg-white hover:opacity-90 transition-opacity">
                                              <img src={img} alt={`Falla ${i+1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* STATUS TIMELINE */}
                                    <div className="space-y-3 bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs">
                                      <p className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Historial de Actualizaciones</p>
                                      {sol.updates && sol.updates.length > 0 ? (
                                        <div className="space-y-3 pl-3 border-l-2 border-slate-200">
                                          {sol.updates.map((up) => (
                                            <div key={up.id} className="relative pl-4 space-y-1">
                                              <div className="absolute left-[-18px] top-1.5 w-2.5 h-2.5 bg-[#0B3C5D] rounded-full border-2 border-white shadow-xs"></div>
                                              <div className="flex justify-between items-center text-[9px] font-bold text-slate-450 uppercase">
                                                <span className="text-[#0B3C5D] font-black">{up.user}</span>
                                                <span className="font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{up.date}</span>
                                              </div>
                                              <p className="text-[10px] font-bold text-slate-600 uppercase leading-normal">{up.content}</p>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-[9.5px] text-slate-400 font-bold uppercase tracking-wider italic pt-1">No hay actualizaciones registradas por el ejecutivo aún.</p>
                                      )}
                                    </div>

                                    {/* ASSIGNED TECHNICIAN OR WORK ORDER */}
                                    {sol.assignedTo && (
                                      <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center justify-between text-[10.5px] font-black text-indigo-950 uppercase shadow-xs">
                                        <span className="flex items-center gap-1.5">
                                          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                          Técnico Asignado: {sol.assignedTo}
                                        </span>
                                        {sol.workOrderFolio && <span className="bg-indigo-600 text-white px-2.5 py-1 rounded-md text-[9px] font-mono font-black">OT: #{sol.workOrderFolio}</span>}
                                      </div>
                                    )}
                                  </motion.div>
                                </td>
                              </tr>
                            )
                          ].filter(Boolean);
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* QUICK BENTO STATS SUMMARY */}
            <div className="grid grid-cols-3 divide-x divide-slate-150 bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-4 text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Casos</p>
                <p className="text-lg font-black text-slate-800 mt-1">{myRequests.length}</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-[9px] font-black text-[#0B3C5D] uppercase tracking-widest">En Proceso</p>
                <p className="text-lg font-black text-[#0B3C5D] mt-1">
                  {myRequests.filter(r => r.status !== 'FINALIZADA' && r.status !== 'REBOTADA').length}
                </p>
              </div>
              <div className="p-4 text-center">
                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Solucionados</p>
                <p className="text-lg font-black text-emerald-600 mt-1">
                  {myRequests.filter(r => r.status === 'FINALIZADA').length}
                </p>
              </div>
            </div>

            {/* NOTIFICATION INFO */}
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 flex gap-3.5 items-start shadow-xs">
              <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600 shrink-0">
                <ShieldAlert size={16} className="stroke-[2.5]" />
              </div>
              <div>
                <p className="text-[10px] font-black text-indigo-950 uppercase tracking-wider">Aviso de Privacidad y Rol Técnico</p>
                <p className="text-[9px] font-bold text-slate-500 leading-normal uppercase mt-1">
                  Su cuenta posee privilegios limitados de lectura y escritura únicamente sobre solicitudes técnicas de habitabilidad de sus respectivas unidades de arriendo.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* REIMBURSEMENTS TAB */}
        {activeTab === 'reembolsos' && (
          <div className="space-y-6">
            {/* ELEGANT HEADER */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 text-[#0B3C5D]">
                  <div className="p-2.5 bg-slate-50 border border-slate-150 rounded-2xl text-[#0B3C5D] shadow-xs">
                    <Receipt size={18} className="stroke-[2.5]" />
                  </div>
                  <div>
                    <h2 className="text-xs font-black uppercase tracking-widest text-[#0B3C5D] font-mono leading-tight">
                      Reembolso de Reparaciones
                    </h2>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 animate-none">
                      Devolución de gastos de mantención autorizados
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-500 uppercase font-bold bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-150">
                    {myReimbursements.length} {myReimbursements.length === 1 ? 'Solicitud' : 'Solicitudes'}
                  </span>
                </div>
              </div>
            </div>

            {/* MAIN CONTENT GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* LEFT COLUMN: FORM */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
                <div>
                  <h3 className="text-sm font-black text-[#0B3C5D] uppercase tracking-wider flex items-center gap-2">
                    <Plus size={16} className="text-[#FFCC00]" />
                    Nueva Solicitud de Reembolso
                  </h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">
                    Completa los detalles y adjunta la boleta o recibo del gasto
                  </p>
                </div>

                {reimbSuccessData && (
                  <div className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-800">
                      <CheckCircle2 size={16} className="animate-bounce text-emerald-600" />
                      <span className="text-xs font-black uppercase tracking-wider">¡Solicitud Enviada!</span>
                    </div>
                    <p className="text-[10px] text-emerald-700 font-bold uppercase">
                      Se ha registrado el caso con el código <strong className="font-mono">{reimbSuccessData.trackingCode}</strong>. El área de finanzas revisará los comprobantes adjuntos.
                    </p>
                    <button 
                      onClick={() => setReimbSuccessData(null)}
                      className="text-[9px] font-black uppercase text-emerald-800 underline hover:text-emerald-950 cursor-pointer"
                    >
                      Crear Otra Solicitud
                    </button>
                  </div>
                )}

                {!reimbSuccessData && (
                  <div className="space-y-5">
                    {/* STEP PROGRESS INDICATOR */}
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
                      <div className="flex items-center justify-between">
                        {[1, 2, 3, 4].map((stepNum) => {
                          const stepTitles = ['Monto', 'Evidencia', 'Banco', 'Confirmar'];
                          const isActive = reimbWizardStep === stepNum;
                          const isCompleted = reimbWizardStep > stepNum;
                          
                          // Helper to check if step navigation is allowed
                          const canNavigateTo = (targetStep: number) => {
                            if (targetStep < reimbWizardStep) return true;
                            if (targetStep === 1) return true;
                            if (targetStep === 2) return !!reimbPropertyId && reimbTitle.trim().length >= 4 && Number(reimbAmount.replace(/\D/g, '')) > 0;
                            if (targetStep === 3) {
                              return !!reimbPropertyId && reimbTitle.trim().length >= 4 && Number(reimbAmount.replace(/\D/g, '')) > 0 &&
                                     reimbDesc.trim().length >= 10 && reimbReceipts.length > 0;
                            }
                            if (targetStep === 4) {
                              return !!reimbPropertyId && reimbTitle.trim().length >= 4 && Number(reimbAmount.replace(/\D/g, '')) > 0 &&
                                     reimbDesc.trim().length >= 10 && reimbReceipts.length > 0 &&
                                     reimbBankName.trim().length >= 2 && reimbAccountType.trim().length >= 2 && reimbAccountNumber.trim().length >= 4 && reimbRut.trim().length >= 7 && reimbHolderName.trim().length >= 4;
                            }
                            return false;
                          };

                          return (
                            <div key={stepNum} className="flex flex-col items-center flex-1 relative">
                              {stepNum > 1 && (
                                <div className={`absolute left-[-50%] top-4 right-[50%] h-0.5 -z-10 transition-colors ${
                                  stepNum <= reimbWizardStep ? 'bg-emerald-500' : 'bg-slate-200'
                                }`} />
                              )}
                              <button
                                type="button"
                                disabled={!canNavigateTo(stepNum)}
                                onClick={() => setReimbWizardStep(stepNum)}
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 transition-all ${
                                  isActive ? 'bg-[#0B3C5D] border-[#0B3C5D] text-white shadow-md' :
                                  isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' :
                                  'bg-slate-50 border-slate-200 text-slate-400 disabled:opacity-55'
                                }`}
                              >
                                {isCompleted ? <Check size={12} className="stroke-[3]" /> : stepNum}
                              </button>
                              <span className={`text-[8.5px] font-black uppercase mt-1.5 ${
                                isActive ? 'text-[#0B3C5D]' : 'text-slate-400'
                              }`}>
                                {stepTitles[stepNum - 1]}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* STEP-SPECIFIC VIEWS */}
                    <form onSubmit={handleReimbSubmit} className="space-y-4">
                      {/* Helper state variables computed inside the render */}
                      {(() => {
                        const isStep1Valid = !!reimbPropertyId && reimbTitle.trim().length >= 4 && Number(reimbAmount.replace(/\D/g, '')) > 0;
                        const isStep2Valid = reimbDesc.trim().length >= 10 && reimbReceipts.length > 0;
                        const isStep3Valid = reimbBankName.trim().length >= 2 && reimbAccountType.trim().length >= 2 && reimbAccountNumber.trim().length >= 4 && reimbRut.trim().length >= 7 && reimbHolderName.trim().length >= 4;

                        return (
                          <>
                            {/* STEP 1: PROPIEDAD, TITULO, MONTO */}
                            {reimbWizardStep === 1 && (
                              <div className="space-y-4">
                                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 flex gap-2.5">
                                  <Info size={16} className="text-[#0B3C5D] shrink-0 mt-0.5" />
                                  <div className="space-y-0.5">
                                    <h4 className="text-[10px] font-black text-[#0B3C5D] uppercase tracking-wider">Paso 1: Datos de la reparación</h4>
                                    <p className="text-[9px] text-slate-500 font-bold uppercase leading-relaxed">
                                      Selecciona la propiedad en donde se efectuó el trabajo e ingresa el costo total del gasto.
                                    </p>
                                  </div>
                                </div>

                                {/* Property Selector */}
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider ml-1">Unidad / Propiedad Asociada</label>
                                  <select
                                    required
                                    value={reimbPropertyId}
                                    onChange={(e) => setReimbPropertyId(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 uppercase outline-none focus:bg-white focus:border-[#0B3C5D] transition-all"
                                  >
                                    <option value="">Selecciona tu unidad</option>
                                    {myContracts.map(c => {
                                      const prop = properties.find(p => p.id === c.propertyId || p.code === c.propertyId);
                                      return (
                                        <option key={c.id} value={c.propertyId}>
                                          {prop ? `${prop.building} - UNIDAD ${prop.code}` : `CONTRATO ID: ${c.id}`}
                                        </option>
                                      );
                                    })}
                                  </select>
                                </div>

                                {/* Repair Title */}
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider ml-1">Trabajo Realizado (Título Corto)</label>
                                  <input
                                    type="text"
                                    required
                                    placeholder="Ej: REPARACIÓN SIFÓN DE LAVAPLATOS"
                                    value={reimbTitle}
                                    onChange={(e) => setReimbTitle(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 uppercase outline-none focus:bg-white focus:border-[#0B3C5D] transition-all"
                                  />
                                  <p className="text-[8px] text-slate-400 font-bold uppercase ml-1">Mínimo 4 caracteres</p>
                                </div>

                                {/* Amount Requested */}
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider ml-1">Monto Total del Gasto (CLP)</label>
                                  <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-slate-450 text-xs font-bold">$</span>
                                    <input
                                      type="text"
                                      required
                                      placeholder="Ej: 45.000"
                                      value={reimbAmount}
                                      onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '');
                                        setReimbAmount(val ? Number(val).toLocaleString('es-CL') : '');
                                      }}
                                      className="w-full bg-slate-50 border border-slate-150 rounded-xl pl-6 pr-3 py-2.5 text-xs font-bold font-mono text-slate-700 outline-none focus:bg-white focus:border-[#0B3C5D] transition-all"
                                    />
                                  </div>
                                  <p className="text-[8px] text-slate-400 font-bold uppercase ml-1">Este monto debe calzar con los documentos de respaldo</p>
                                </div>
                              </div>
                            )}

                            {/* STEP 2: DETALLE Y EVIDENCIA */}
                            {reimbWizardStep === 2 && (
                              <div className="space-y-4">
                                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 flex gap-2.5">
                                  <Info size={16} className="text-[#0B3C5D] shrink-0 mt-0.5" />
                                  <div className="space-y-0.5">
                                    <h4 className="text-[10px] font-black text-[#0B3C5D] uppercase tracking-wider">Paso 2: Detalles y evidencia digital</h4>
                                    <p className="text-[9px] text-slate-500 font-bold uppercase leading-relaxed">
                                      Describe la causa de la reparación y sube una fotografía nítida o PDF de la boleta o factura de los gastos.
                                    </p>
                                  </div>
                                </div>

                                {/* Description */}
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider ml-1">Explicación del Gasto / Reparación</label>
                                  <textarea
                                    required
                                    rows={3}
                                    placeholder="Describe detalladamente qué se reparó, quién realizó el trabajo y por qué era urgente..."
                                    value={reimbDesc}
                                    onChange={(e) => setReimbDesc(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-150 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 uppercase outline-none focus:bg-white focus:border-[#0B3C5D] transition-all resize-none"
                                  />
                                  <div className="flex justify-between text-[8px] font-bold uppercase ml-1 text-slate-400">
                                    <span>Mínimo 10 caracteres</span>
                                    <span>Ingresado: {reimbDesc.trim().length}</span>
                                  </div>
                                </div>

                                {/* Document Upload Area */}
                                <div className="space-y-1.5">
                                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider ml-1">Acompañar Boleta / Comprobante / Recibo</label>
                                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center bg-slate-50 hover:bg-slate-100 transition-colors relative">
                                    <input
                                      type="file"
                                      multiple
                                      accept="image/*,application/pdf"
                                      onChange={handleReimbReceiptsChange}
                                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <div className="flex flex-col items-center justify-center space-y-1">
                                      <UploadCloud size={24} className="text-[#0B3C5D]" />
                                      <p className="text-[10px] font-bold uppercase text-slate-600">Haz clic o arrastra fotos/archivos</p>
                                      <p className="text-[8px] text-slate-400 uppercase">Boleta, Factura o Recibo Legible (Requerido)</p>
                                    </div>
                                  </div>

                                  {/* Upload Loading Indicator */}
                                  {isReimbUploading && (
                                    <div className="text-center py-2">
                                      <span className="text-[9px] font-black text-[#0B3C5D] uppercase animate-pulse">Procesando documentos...</span>
                                    </div>
                                  )}

                                  {/* File Previews */}
                                  {reimbReceipts.length > 0 ? (
                                    <div className="space-y-1.5">
                                      <span className="text-[8px] font-black text-[#0B3C5D] uppercase tracking-wider block ml-1">Archivos Cargados ({reimbReceipts.length}):</span>
                                      <div className="grid grid-cols-3 gap-2">
                                        {reimbReceipts.map((img, i) => (
                                          <div key={i} className="relative rounded-lg overflow-hidden border border-slate-200 aspect-square group bg-slate-50 flex items-center justify-center">
                                            {img.startsWith('data:image') || img.startsWith('http') ? (
                                              <img src={img} alt={`Preview ${i+1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                            ) : (
                                              <div className="flex flex-col items-center justify-center">
                                                <FileText size={16} className="text-slate-400" />
                                                <span className="text-[7px] text-slate-500 uppercase font-bold mt-1">Archivo</span>
                                              </div>
                                            )}
                                            <button
                                              type="button"
                                              onClick={() => removeReimbReceipt(i)}
                                              className="absolute top-1 right-1 bg-rose-600 hover:bg-rose-700 text-white p-1 rounded-full shadow-md transition-all cursor-pointer opacity-80 hover:opacity-100"
                                            >
                                              <Trash2 size={10} />
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-[8.5px] font-bold text-rose-600 uppercase ml-1">Debe adjuntar al menos 1 comprobante para avanzar.</p>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* STEP 3: DATOS BANCARIOS */}
                            {reimbWizardStep === 3 && (
                              <div className="space-y-4">
                                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-2.5">
                                  <Info size={16} className="text-amber-800 shrink-0 mt-0.5" />
                                  <div className="space-y-0.5">
                                    <h4 className="text-[10px] font-black text-amber-900 uppercase tracking-wider">Paso 3: Destinatario de la transferencia</h4>
                                    <p className="text-[9px] text-amber-800 font-bold uppercase leading-relaxed">
                                      Indica con exactitud la cuenta bancaria donde deseas recibir la transferencia una vez aprobado el reembolso.
                                    </p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider ml-1">Banco</label>
                                    <input
                                      type="text"
                                      required
                                      placeholder="Ej: BANCO ESTADO"
                                      value={reimbBankName}
                                      onChange={(e) => setReimbBankName(e.target.value)}
                                      className="w-full bg-slate-50 border border-slate-150 rounded-xl px-2 py-2 text-[10px] font-bold text-slate-700 uppercase outline-none focus:bg-white focus:border-[#0B3C5D] transition-all"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider ml-1">Tipo de Cuenta</label>
                                    <input
                                      type="text"
                                      required
                                      placeholder="Ej: CUENTA CORRIENTE"
                                      value={reimbAccountType}
                                      onChange={(e) => setReimbAccountType(e.target.value)}
                                      className="w-full bg-slate-50 border border-slate-150 rounded-xl px-2 py-2 text-[10px] font-bold text-slate-700 uppercase outline-none focus:bg-white focus:border-[#0B3C5D] transition-all"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider ml-1">Número de Cuenta</label>
                                    <input
                                      type="text"
                                      required
                                      placeholder="Ej: 12345678"
                                      value={reimbAccountNumber}
                                      onChange={(e) => setReimbAccountNumber(e.target.value.replace(/\D/g, ''))}
                                      className="w-full bg-slate-50 border border-slate-150 rounded-xl px-2 py-2 text-[10px] font-bold text-slate-700 outline-none focus:bg-white focus:border-[#0B3C5D] transition-all"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider ml-1">RUT Beneficiario</label>
                                    <input
                                      type="text"
                                      required
                                      placeholder="Ej: 12.345.678-9"
                                      value={reimbRut}
                                      onChange={(e) => setReimbRut(e.target.value)}
                                      className="w-full bg-slate-50 border border-slate-150 rounded-xl px-2 py-2 text-[10px] font-bold text-slate-700 uppercase outline-none focus:bg-white focus:border-[#0B3C5D] transition-all"
                                    />
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider ml-1">Nombre Completo del Titular</label>
                                  <input
                                    type="text"
                                    required
                                    placeholder="Ej: JUAN PÉREZ ARANCIBIA"
                                    value={reimbHolderName}
                                    onChange={(e) => setReimbHolderName(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-150 rounded-xl px-2.5 py-2 text-[10px] font-bold text-slate-700 uppercase outline-none focus:bg-white focus:border-[#0B3C5D] transition-all"
                                  />
                                </div>

                                <div className="flex items-center gap-2 pt-1">
                                  <input
                                    type="checkbox"
                                    id="saveBankCheckbox"
                                    checked={saveBankInfoCheckbox}
                                    onChange={(e) => setSaveBankInfoCheckbox(e.target.checked)}
                                    className="rounded text-[#0B3C5D] focus:ring-[#0B3C5D]"
                                  />
                                  <label htmlFor="saveBankCheckbox" className="text-[9px] font-bold text-slate-550 uppercase tracking-wide cursor-pointer">
                                    Guardar datos bancarios para futuras solicitudes
                                  </label>
                                </div>
                              </div>
                            )}

                            {/* STEP 4: REVISION Y CONFIRMACION */}
                            {reimbWizardStep === 4 && (
                              <div className="space-y-4 text-slate-700 font-sans">
                                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex gap-2.5">
                                  <CheckCircle2 size={16} className="text-emerald-700 shrink-0 mt-0.5" />
                                  <div className="space-y-0.5">
                                    <h4 className="text-[10px] font-black text-emerald-900 uppercase tracking-wider">Paso 4: Confirmación Final</h4>
                                    <p className="text-[9px] text-emerald-800 font-bold uppercase leading-relaxed">
                                      Revisa que la información sea fidedigna antes del envío a la administración.
                                    </p>
                                  </div>
                                </div>

                                {/* SUMMARY REVIEW CARD */}
                                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 space-y-3.5 text-xs">
                                  <div className="border-b border-slate-200 pb-2">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Propiedad</span>
                                    <p className="font-extrabold text-[#0B3C5D] uppercase mt-0.5">
                                      {(() => {
                                        const propSelected = properties.find(p => p.id === reimbPropertyId);
                                        return propSelected ? `${propSelected.building} - DEPARTAMENTO ${propSelected.code}` : 'No Seleccionado';
                                      })()}
                                    </p>
                                  </div>

                                  <div className="grid grid-cols-2 gap-3 border-b border-slate-200 pb-2">
                                    <div>
                                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Título del Trabajo</span>
                                      <p className="font-bold text-slate-800 uppercase mt-0.5 truncate">{reimbTitle}</p>
                                    </div>
                                    <div>
                                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Monto Reclamado</span>
                                      <p className="font-extrabold text-emerald-700 font-mono mt-0.5">${reimbAmount} CLP</p>
                                    </div>
                                  </div>

                                  <div className="border-b border-slate-200 pb-2">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Explicación</span>
                                    <p className="font-semibold text-slate-600 uppercase mt-0.5 line-clamp-2 leading-relaxed">{reimbDesc}</p>
                                  </div>

                                  <div className="border-b border-slate-200 pb-2">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Transferir a:</span>
                                    <div className="bg-white p-2 rounded-xl border border-slate-150 mt-1 space-y-1 text-[11px] font-semibold text-slate-600">
                                      <p className="font-extrabold text-slate-800 uppercase">{reimbHolderName}</p>
                                      <p className="uppercase">{reimbBankName} • {reimbAccountType}</p>
                                      <p className="font-mono">Nº: {reimbAccountNumber} • RUT: {reimbRut}</p>
                                    </div>
                                  </div>

                                  <div>
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Archivos de Respaldo</span>
                                    <div className="flex items-center gap-1.5 mt-1">
                                      <FileText size={14} className="text-[#0B3C5D]" />
                                      <span className="font-bold text-slate-700 uppercase text-[10px]">{reimbReceipts.length} comprobante(s) adjunto(s)</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="bg-amber-50/55 border border-amber-150 rounded-2xl p-3 flex gap-2">
                                  <Info size={14} className="text-amber-800 shrink-0 mt-0.5" />
                                  <p className="text-[8.5px] text-amber-800 uppercase leading-normal font-bold">
                                    Al enviar esta solicitud, declaras que el gasto es verídico, fue pre-autorizado por la administración y se adjuntan los comprobantes tributarios de pago correspondientes.
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* ACTIONS NAVIGATION PANEL */}
                            <div className="flex gap-2 pt-3 border-t border-slate-100">
                              {reimbWizardStep > 1 && (
                                <button
                                  type="button"
                                  onClick={() => setReimbWizardStep(prev => prev - 1)}
                                  className="flex-1 flex items-center justify-center gap-1.5 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                                >
                                  <ArrowLeft size={13} className="stroke-[2.5]" />
                                  Atrás
                                </button>
                              )}

                              {reimbWizardStep < 4 ? (
                                <button
                                  type="button"
                                  disabled={
                                    reimbWizardStep === 1 ? !isStep1Valid :
                                    reimbWizardStep === 2 ? !isStep2Valid :
                                    reimbWizardStep === 3 ? !isStep3Valid :
                                    false
                                  }
                                  onClick={() => setReimbWizardStep(prev => prev + 1)}
                                  className="flex-1 flex items-center justify-center gap-1.5 py-3 bg-[#0B3C5D] hover:bg-[#0A2E46] disabled:bg-slate-100 disabled:text-slate-400 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer"
                                >
                                  Siguiente
                                  <ArrowRight size={13} className="stroke-[2.5]" />
                                </button>
                              ) : (
                                <button
                                  type="submit"
                                  disabled={isReimbUploading}
                                  className="flex-1 flex items-center justify-center gap-1.5 py-3.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-300 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md active:scale-98 cursor-pointer"
                                >
                                  <CheckCircle2 size={13} className="stroke-[2.5]" />
                                  {isReimbUploading ? 'Procesando...' : 'Enviar Reembolso'}
                                </button>
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </form>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: REIMBURSEMENT HISTORY */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4 flex flex-col h-full min-h-[450px]">
                <div>
                  <h3 className="text-sm font-black text-[#0B3C5D] uppercase tracking-wider flex items-center gap-2">
                    <History size={16} className="text-[#FFCC00]" />
                    Historial de Reembolsos
                  </h3>
                  <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">
                    Monitorea el avance y pago de tus solicitudes de reembolso
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 max-h-[500px] pr-1">
                  {myReimbursements.length === 0 ? (
                    <div className="bg-slate-50 rounded-2xl p-8 border border-dashed border-slate-150 text-center text-slate-400 flex flex-col items-center justify-center h-full">
                      <Receipt size={32} className="text-slate-300 mb-2" />
                      <p className="text-xs font-black uppercase tracking-wider">No registras reembolsos</p>
                      <p className="text-[10px] uppercase text-slate-400 mt-1">Tus solicitudes ingresadas se mostrarán en esta sección</p>
                    </div>
                  ) : (
                    [...myReimbursements].sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0)).map(r => {
                      const isApproved = r.status === 'APROBADA_JEFATURA' || r.status === 'FINALIZADA';
                      const isRejected = r.status === 'DETENIDA';
                      const isProcessing = r.status === 'EN_PROCESO';

                      const statusLabels = {
                        PENDIENTE: 'EN REVISIÓN',
                        EN_PROCESO: 'PROCESANDO PAGO',
                        FINALIZADA: 'REEMBOLSADO',
                        APROBADA_JEFATURA: 'APROBADO',
                        DETENIDA: 'RECHAZADO / OBSERVADO'
                      };

                      return (
                        <div key={r.id} className="border border-slate-150 rounded-2xl p-4 bg-slate-50 hover:bg-white transition-all space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="space-y-0.5">
                              <span className="text-[8px] font-mono font-black text-slate-400 uppercase tracking-widest block">
                                SOL-{r.id.split('-')[0].toUpperCase()}
                              </span>
                              <h4 className="text-xs font-black text-slate-800 uppercase leading-snug">
                                {r.title.replace('SOLICITUD REEMBOLSO: ', '')}
                              </h4>
                              <p className="text-[8px] font-bold text-[#0B3C5D] uppercase">
                                {r.propertyLabel.split(' (')[0]}
                              </p>
                            </div>

                            <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase border shrink-0 ${
                              isApproved ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              isRejected ? 'bg-rose-50 text-rose-700 border-rose-200' :
                              isProcessing ? 'bg-blue-50 text-blue-700 border-blue-200' :
                              'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {statusLabels[r.status] || r.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 py-2 border-y border-slate-200 bg-white px-3 rounded-xl">
                            <div>
                              <span className="text-[7px] font-black text-slate-400 uppercase tracking-wider block">Monto</span>
                              <span className="text-xs font-black text-emerald-700 font-mono">
                                ${r.reimbursementAmount?.toLocaleString('es-CL')} CLP
                              </span>
                            </div>
                            <div>
                              <span className="text-[7px] font-black text-slate-400 uppercase tracking-wider block">Fecha Petición</span>
                              <span className="text-xs font-black text-slate-700 font-mono">
                                {formatChileDate(r.requestDate)}
                              </span>
                            </div>
                          </div>

                          {/* Description */}
                          <div className="space-y-0.5 font-sans">
                            <span className="text-[7px] font-black text-slate-400 uppercase tracking-wider">Descripción del Arrendatario</span>
                            <p className="text-[10px] font-semibold text-slate-600 leading-normal uppercase whitespace-pre-wrap">
                              {r.description}
                            </p>
                          </div>

                          {/* Administrative feedback / updates */}
                          {r.updates && r.updates.length > 0 && (
                            <div className="space-y-1.5 pt-2 border-t border-slate-200 font-sans">
                              <span className="text-[7px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                <MessageSquare size={9} />
                                Respuestas de la Administración
                              </span>
                              <div className="space-y-1.5">
                                {r.updates.map(u => (
                                  <div key={u.id} className="bg-amber-50/50 border border-amber-200 rounded-xl p-2.5">
                                    <div className="flex justify-between text-[7px] font-black text-slate-400 uppercase">
                                      <span>{u.user}</span>
                                      <span>{formatChileDate(u.date)}</span>
                                    </div>
                                    <p className="text-[9px] font-bold text-amber-900 uppercase mt-0.5 whitespace-pre-wrap">{u.content}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Previews / links */}
                          {r.reimbursementReceipts && r.reimbursementReceipts.length > 0 && (
                            <div className="space-y-1 pt-1 font-sans">
                              <span className="text-[7px] font-black text-slate-400 uppercase tracking-wider block">Documento de Respaldo</span>
                              <div className="flex flex-wrap gap-1.5">
                                {r.reimbursementReceipts.map((rec, idx) => (
                                  <a
                                    key={idx}
                                    href={rec}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 bg-white border border-slate-200 hover:border-[#0B3C5D] text-slate-600 px-2.5 py-1 text-[8px] font-black rounded-lg uppercase cursor-pointer"
                                  >
                                    <FileText size={9} />
                                    <span>Ver Comprobante {idx + 1}</span>
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* MIS COBROS TAB */}
        {activeTab === 'cobros' && (
          <TenantCobrosSection 
            tenantName={tenantName || currentUser}
            tenantTaxId={currentUser}
            propertyLabel={myContracts[0]?.propertyLabel || '1822 - Depto 402'}
            payments={tenantCobros}
            onPaymentCompleted={handlePaymentCompleted}
          />
        )}

        {/* PAGOS TAB */}
        {activeTab === 'pagos' && (
          <div className="space-y-6">
            <TenantPaymentLedgerTable 
              payments={tenantCobros}
              tenantName={tenantName || currentUser}
              tenantTaxId={currentUser}
              propertyLabel={myContracts[0]?.propertyLabel || 'Propiedad 1822'}
              title="Historial de Pagos y Ficha de Cumplimiento"
              isCompanyUser={false}
              contractStartDate={myContracts[0]?.startDate ? new Date(myContracts[0].startDate).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' }) : '01 de Mayo de 2024'}
              nextRenewalDate={myContracts[0]?.endDate ? new Date(myContracts[0].endDate).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' }) : '01 de Mayo de 2027'}
              contractId={myContracts[0]?.id || 'CTR-2024-1822'}
            />
          </div>
        )}

        {/* CONTRACTS TAB */}
        {activeTab === 'contrato' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden">
              <div className="p-6 sm:p-8 bg-gradient-to-r from-[#0B3C5D] to-[#0A2E46] text-white relative">
                <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 relative z-10">
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/10 text-[#FFCC00] text-[9px] font-black uppercase tracking-widest">
                      <FileText size={11} /> Información Legal de Arriendo
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight uppercase text-white">
                      Mi Contrato y Unidad
                    </h2>
                    <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
                      Aquí puedes revisar las fechas críticas, montos y detalles formales de tu arrendamiento vigente con ASSETFLOW.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-8 space-y-6 bg-white">
                {myContracts.length === 0 ? (
                  <div className="text-center py-8 space-y-3">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                      <Building size={20} />
                    </div>
                    <p className="text-xs font-black text-slate-600 uppercase tracking-wider">No registras contratos firmados actualmente</p>
                    <p className="text-[10px] text-slate-400 max-w-xs mx-auto uppercase leading-relaxed font-bold">
                      Si acabas de mudarte, el ejecutivo cargará el documento digital en el sistema a la brevedad. Escríbenos a soporte@inmobiliariapro.cl para dudas.
                    </p>
                  </div>
                ) : (
                  myContracts.map((c) => {
                    const matchedProp = properties.find(p => p.id === c.propertyId || p.code === c.propertyId);
                    
                    return (
                      <div key={c.id} className="space-y-6">
                        {/* Summary details */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1">
                            <span className="text-[8px] font-black text-slate-400 block tracking-widest uppercase">ID de Contrato</span>
                            <span className="text-sm font-bold text-slate-800 font-mono select-all uppercase">
                              {c.id}
                            </span>
                          </div>
                          
                          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1">
                            <span className="text-[8px] font-black text-slate-400 block tracking-widest uppercase">Estado Contractual</span>
                            <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full border border-emerald-300 bg-emerald-50 text-emerald-700 uppercase mt-1">
                              ● {c.status}
                            </span>
                          </div>
                        </div>

                        {/* Property Details */}
                        <div className="bg-slate-50/50 border border-slate-200 rounded-2xl p-5 space-y-4">
                          <h4 className="text-[10px] font-black text-[#0B3C5D] uppercase tracking-widest border-b border-slate-200 pb-2 font-mono font-black">Información del Inmueble</h4>
                          
                          <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                            <div>
                              <span className="text-[8px] font-black text-slate-400 block tracking-widest uppercase">Edificio / Condominio</span>
                              <span className="text-xs font-bold text-slate-800 uppercase">{matchedProp?.building || 'NO ESPECIFICADO'}</span>
                            </div>
                            <div>
                              <span className="text-[8px] font-black text-slate-400 block tracking-widest uppercase">Unidad / Depto</span>
                              <span className="text-xs font-black text-[#0B3C5D] uppercase">UNIDAD {matchedProp?.code || 'N/A'}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-[8px] font-black text-slate-400 block tracking-widest uppercase">Dirección Completa</span>
                              <span className="text-xs font-semibold text-slate-700 uppercase">{matchedProp?.address || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-[8px] font-black text-slate-400 block tracking-widest uppercase">Comuna</span>
                              <span className="text-xs font-bold text-slate-800 uppercase">{matchedProp?.commune || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-[8px] font-black text-slate-400 block tracking-widest uppercase">Región</span>
                              <span className="text-xs font-bold text-slate-800 uppercase">{matchedProp ? getPropertyRegion(matchedProp) : 'N/A'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Contract Dates and Rates */}
                        <div className="bg-slate-50/50 border border-slate-200 rounded-2xl p-5 space-y-4">
                          <h4 className="text-[10px] font-black text-[#0B3C5D] uppercase tracking-widest border-b border-slate-200 pb-2 font-mono font-black">Fechas y Condiciones Económicas</h4>
                          
                          <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                            <div>
                              <span className="text-[8px] font-black text-slate-400 block tracking-widest uppercase"><Calendar size={10} className="inline mr-1" /> Inicio de Contrato</span>
                              <span className="text-xs font-mono font-bold text-slate-800">{c.startDate}</span>
                            </div>
                            <div>
                              <span className="text-[8px] font-black text-slate-400 block tracking-widest uppercase"><Calendar size={10} className="inline mr-1" /> Término de Contrato</span>
                              <span className="text-xs font-mono font-bold text-slate-800">{c.endDate}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-[8px] font-black text-slate-400 block tracking-widest uppercase"><DollarSign size={10} className="inline mr-1" /> Canon de Arriendo Mensual</span>
                              <span className="text-sm font-black text-emerald-700">
                                {c.monthlyAmount.toLocaleString()} {c.currency}
                              </span>
                            </div>
                            {c.renewalDate && (
                              <div className="col-span-2">
                                <span className="text-[8px] font-black text-slate-400 block tracking-widest uppercase">Próxima Fecha de Reajuste / Renovación</span>
                                <span className="text-xs font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-150 inline-block uppercase mt-1">
                                  {c.renewalDate}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Observations */}
                        {c.observations && (
                          <div className="bg-amber-50/40 border border-amber-200 rounded-2xl p-4 space-y-1">
                            <span className="text-[8px] font-black text-amber-700 block tracking-widest uppercase">Cláusulas / Observaciones de la Administración</span>
                            <p className="text-xs text-amber-900 font-semibold leading-relaxed uppercase whitespace-pre-wrap">{c.observations}</p>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODAL / BOTTOM SHEET FORM */}
        <AnimatePresence>
          {isFormOpen && (
            <div className="fixed inset-0 z-[100] bg-slate-800/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all duration-300">
              <motion.div 
                initial={{ y: '100%', scale: 0.95 }}
                animate={{ y: 0, scale: 1 }}
                exit={{ y: '100%', scale: 0.95 }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="bg-white rounded-t-[32px] sm:rounded-[32px] w-full max-w-md shadow-2xl overflow-hidden max-h-[92vh] flex flex-col border border-slate-150"
              >
                {successData ? (
                  <div className="flex flex-col h-full overflow-hidden">
                    {/* Success Header */}
                    <div className="bg-gradient-to-r from-emerald-800 to-teal-950 p-6 text-white flex justify-between items-center shrink-0 border-b border-emerald-950">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center border border-white/10">
                          <CheckCircle2 size={18} className="text-[#FFCC00] animate-bounce" />
                        </div>
                        <div>
                          <h3 className="text-sm font-black uppercase tracking-widest text-[#FFCC00]">¡Solicitud Recibida!</h3>
                          <p className="text-[9px] text-slate-300 font-bold uppercase tracking-wider mt-0.5">Ingresado Correctamente</p>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => handleFinalize(false)} 
                        className="p-2 hover:bg-white/10 rounded-full transition-all text-slate-200 hover:text-white cursor-pointer"
                      >
                        <X size={20} className="stroke-[2.5]" />
                      </button>
                    </div>

                    {/* Success Body */}
                    <div className="flex-1 p-6 overflow-y-auto custom-audit-scroll space-y-5 text-center">
                      <div className="flex justify-center">
                        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center border-2 border-emerald-100 shadow-sm">
                          <CheckCircle2 size={36} className="text-emerald-600 stroke-[2.5]" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-tight">Requerimiento Ingresado con Éxito</h4>
                        <p className="text-slate-500 text-xs font-semibold leading-relaxed">
                          Hemos guardado su solicitud de mantenimiento de manera segura. Su número de seguimiento del caso es:
                        </p>
                      </div>

                      {/* Tracking Code Card */}
                      <div className="bg-slate-50 border border-dashed border-slate-250 rounded-2xl p-4 space-y-2.5 relative group">
                        <span className="text-[8px] font-black text-slate-400 block tracking-widest uppercase">Número de Seguimiento</span>
                        <div className="text-xl font-black text-slate-800 font-mono tracking-wider select-all">
                          {successData.trackingCode}
                        </div>
                        <div className="flex justify-center">
                          <button
                            type="button"
                            onClick={() => {
                              copyToClipboard(successData.trackingCode);
                            }}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all duration-200 ${
                              copied 
                                ? 'bg-emerald-600 text-white shadow-xs' 
                                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 hover:border-slate-350'
                            }`}
                          >
                            {copied ? (
                              <>
                                <Check size={11} className="stroke-[2.5]" />
                                Copiado
                              </>
                            ) : (
                              <>
                                <Copy size={11} className="stroke-[2.5]" />
                                Copiar Número
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Phone and Tenant Name Input Form */}
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-3.5">
                        <div className="flex items-center gap-2">
                          <Phone size={13} className="text-[#0B3C5D]" />
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Contacto Directo</span>
                        </div>
                        
                        <p className="text-[10px] text-slate-600 font-bold uppercase leading-relaxed">
                          Déjanos tu número telefónico, pronto un ejecutivo se pondrá en contacto contigo.
                        </p>

                        <div className="space-y-1.5">
                          <label className="text-[8.5px] font-black text-slate-550 uppercase tracking-wider block ml-1">Número Telefónico</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
                              <span className="text-xs font-black text-slate-400 font-sans">+56</span>
                            </div>
                            <input 
                              type="tel"
                              placeholder="9 1234 5678"
                              value={tenantPhone.replace(/^\+56\s*/, '')}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^\d\s-]/g, '');
                                setTenantPhone(val ? `+56 ${val}` : '');
                              }}
                              className="w-full bg-white border border-slate-250 rounded-xl pl-12 pr-4 py-3 text-xs font-black outline-none focus:ring-2 focus:ring-[#0B3C5D] focus:border-[#0B3C5D] transition-all text-slate-800"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[8.5px] font-black text-slate-550 uppercase tracking-wider block ml-1">Nombre del Arrendatario</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-slate-400">
                              <User size={13} className="text-[#0B3C5D]" />
                            </div>
                            <input 
                              type="text"
                              placeholder="EJ: ALBERTO ROJAS"
                              value={tenantName}
                              onChange={(e) => {
                                setTenantName(normalizeText(e.target.value));
                              }}
                              className="w-full bg-white border border-slate-250 rounded-xl pl-11 pr-4 py-3 text-xs font-black uppercase outline-none focus:ring-2 focus:ring-[#0B3C5D] focus:border-[#0B3C5D] transition-all text-slate-800"
                            />
                          </div>
                        </div>

                        {/* Save Checkbox option */}
                        <label className="flex items-start gap-2.5 cursor-pointer select-none group mt-1">
                          <input 
                            type="checkbox"
                            checked={savePhoneCheckbox}
                            onChange={(e) => setSavePhoneCheckbox(e.target.checked)}
                            className="mt-0.5 rounded border-slate-350 text-[#0B3C5D] focus:ring-[#0B3C5D] h-3.5 w-3.5 cursor-pointer"
                          />
                          <span className="text-[8.5px] font-black text-slate-500 uppercase tracking-wide group-hover:text-slate-700 transition-colors">
                            Recordar mis datos para futuras consultas
                          </span>
                        </label>
                      </div>
                    </div>

                    {/* Success Footer */}
                    <div className="p-6 bg-slate-50 border-t border-slate-200 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleFinalize(true)}
                        className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-md hover:shadow-lg transition-all cursor-pointer text-center border border-emerald-750"
                      >
                        Confirmar y Finalizar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Form Header */}
                    <div className="bg-gradient-to-r from-[#0B3C5D] to-[#0A2E46] p-6 text-white flex justify-between items-center shrink-0 border-b border-[#051C2C]">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center border border-white/10">
                          <Wrench size={18} className="text-[#FFCC00] animate-pulse" />
                        </div>
                        <div>
                          <h3 className="text-sm font-black uppercase tracking-widest text-[#FFCC00]">Asistente de Solicitud</h3>
                          <p className="text-[9px] text-slate-300 font-bold uppercase tracking-wider mt-0.5">Reportar falla en 4 pasos sencillos</p>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setIsFormOpen(false)} 
                        className="p-2 hover:bg-white/10 rounded-full transition-all text-slate-200 hover:text-white cursor-pointer"
                      >
                        <X size={20} className="stroke-[2.5]" />
                      </button>
                    </div>

                    {/* Wizard Progress Indicator Bar */}
                    <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0 select-none">
                      <div className="flex items-center justify-between w-full relative">
                        {/* Connector line behind circles */}
                        <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-slate-200 -translate-y-1/2 z-0" />
                        
                        {/* Connector active line */}
                        <div 
                          className="absolute top-1/2 left-0 h-[2px] bg-[#0B3C5D] -translate-y-1/2 z-0 transition-all duration-300"
                          style={{ width: `${((step - 1) / 3) * 100}%` }}
                        />
                        
                        {/* Steps */}
                        {[
                          { n: 1, label: 'Unidad' },
                          { n: 2, label: 'Categoría' },
                          { n: 3, label: 'Detalle' },
                          { n: 4, label: 'Confirmar' }
                        ].map((s) => {
                          const isActive = step >= s.n;
                          const isCurrent = step === s.n;
                          return (
                            <div key={s.n} className="flex flex-col items-center z-10">
                              <button
                                type="button"
                                disabled={step < s.n && !propertyId} // Allow clicking backward or forward to already validated steps
                                onClick={() => {
                                  if (s.n === 1) setStep(1);
                                  else if (s.n === 2 && propertyId) setStep(2);
                                  else if (s.n === 3 && propertyId) setStep(3);
                                  else if (s.n === 4 && propertyId && title.trim() && description.trim()) setStep(4);
                                }}
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black border transition-all duration-300 focus:outline-none ${
                                  isCurrent 
                                    ? 'bg-[#FFCC00] text-[#0B3C5D] border-[#FFCC00] ring-4 ring-[#FFCC00]/20 scale-110' 
                                    : isActive
                                      ? 'bg-[#0B3C5D] text-white border-[#0B3C5D]'
                                      : 'bg-white text-slate-400 border-slate-200 hover:border-slate-350'
                                }`}
                              >
                                {s.n}
                              </button>
                              <span className={`text-[8px] font-black uppercase mt-1 tracking-wider ${
                                isCurrent ? 'text-[#0B3C5D]' : isActive ? 'text-slate-600' : 'text-slate-450'
                              }`}>
                                {s.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
     
                    {/* Form Body with sliding animation wrapper */}
                    <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                      <div className="flex-1 p-6 overflow-y-auto custom-audit-scroll space-y-4">
                        <AnimatePresence mode="wait">
                      {step === 1 && (
                        <motion.div
                          key="step1"
                          initial={{ opacity: 0, x: 15 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -15 }}
                          transition={{ duration: 0.15 }}
                          className="space-y-4"
                        >
                          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                            <p className="text-[9px] font-black text-slate-450 uppercase tracking-widest border-b border-slate-200 pb-2 mb-3">Identificación de la Propiedad</p>
                            
                            <div className="space-y-3.5">
                              {/* Select Region */}
                              <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Región</label>
                                <div className="relative">
                                  <select 
                                    required 
                                    value={selectedRegion} 
                                    onChange={e => {
                                      setSelectedRegion(e.target.value);
                                      setSelectedCommune('');
                                      setPropertyId('');
                                    }}
                                    className="w-full bg-white border border-slate-250 rounded-xl px-4 py-3 text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-[#0B3C5D] focus:border-[#0B3C5D] transition-all cursor-pointer appearance-none text-slate-800"
                                  >
                                    <option value="">-- Seleccione Región --</option>
                                    {availableRegions.map(reg => (
                                      <option key={reg} value={reg}>{reg}</option>
                                    ))}
                                  </select>
                                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <ChevronDown size={14} className="stroke-[2.5]" />
                                  </div>
                                </div>
                              </div>
                             
                              {/* Select Commune */}
                              <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Comuna</label>
                                <div className="relative">
                                  <select 
                                    required 
                                    disabled={!selectedRegion}
                                    value={selectedCommune} 
                                    onChange={e => {
                                      setSelectedCommune(e.target.value);
                                      setPropertyId('');
                                    }}
                                    className="w-full bg-white border border-slate-250 rounded-xl px-4 py-3 text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-[#0B3C5D] focus:border-[#0B3C5D] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer appearance-none text-slate-800"
                                  >
                                    <option value="">-- Seleccione Comuna --</option>
                                    {availableCommunes.map(com => (
                                      <option key={com} value={com}>{com}</option>
                                    ))}
                                  </select>
                                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <ChevronDown size={14} className="stroke-[2.5]" />
                                  </div>
                                </div>
                              </div>
                             
                              {/* Select Property */}
                              <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Propiedad Arrendada / Unidad</label>
                                <div className="relative">
                                  <select 
                                    required 
                                    disabled={!selectedCommune}
                                    value={propertyId} 
                                    onChange={e => setPropertyId(e.target.value)}
                                    className="w-full bg-white border border-slate-250 rounded-xl px-4 py-3 text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-[#0B3C5D] focus:border-[#0B3C5D] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer appearance-none text-slate-800"
                                  >
                                    <option value="">-- Seleccione su Unidad --</option>
                                    {availableProperties.map(p => (
                                      <option key={p.id} value={p.id}>{p.building} - DEPTO {p.code} ({p.address})</option>
                                    ))}
                                  </select>
                                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                    <ChevronDown size={14} className="stroke-[2.5]" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {propertyId && (
                            <div className="bg-emerald-50 border border-emerald-200/50 rounded-2xl p-4 flex gap-3.5 items-start">
                              <span className="text-emerald-600 text-base leading-none">✓</span>
                              <div>
                                <p className="text-[9.5px] font-black text-emerald-950 uppercase tracking-wider">Unidad Vinculada Correctamente</p>
                                <p className="text-[9px] font-bold text-emerald-850 uppercase leading-relaxed mt-1">
                                  {properties.find(p => p.id === propertyId)?.building} - DEPARTAMENTO {properties.find(p => p.id === propertyId)?.code}
                                </p>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}

                      {step === 2 && (
                        <motion.div
                          key="step2"
                          initial={{ opacity: 0, x: 15 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -15 }}
                          transition={{ duration: 0.15 }}
                          className="space-y-4"
                        >
                          {/* Category Selection with Custom Dropdown */}
                          <div className="space-y-2">
                            <label className="text-[9.5px] font-black text-slate-500 uppercase tracking-widest ml-1">¿Qué tipo de caso deseas abrir?</label>
                            <div className="relative">
                              <select
                                id="category-dropdown-select"
                                value={category}
                                onChange={(e) => setCategory(e.target.value as any)}
                                className="w-full pl-11 pr-10 py-3.5 bg-white text-xs font-bold uppercase tracking-wider border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#0B3C5D] focus:border-[#0B3C5D] transition-all cursor-pointer appearance-none shadow-sm text-slate-800"
                              >
                                <option value="REQUERIMIENTO">🔧 REPARACIÓN TÉCNICA (FALLAS, FILTRACIONES, GOTERAS, ELECTRICIDAD)</option>
                                <option value="MEJORA">✨ SOLICITUD DE MEJORA (PINTURA, CAMBIOS COSMÉTICOS)</option>
                                <option value="SERVICIOS">⚡ SERVICIOS (MANTENCIONES DE CALEFONT, AIRE ACONDICIONADO)</option>
                                <option value="CONSULTA">💬 CONSULTA GENERAL (GASTOS COMUNES, MANUALES DE EQUIPOS)</option>
                                <option value="DOCUMENTACIÓN">📂 DOCUMENTACIÓN (REVISIÓN DE CONTRATO, CERTIFICADOS DE ARRIENDO)</option>
                              </select>
                              <div className="absolute left-4 top-4 text-[#0B3C5D]">
                                <ClipboardList size={16} className="stroke-[2.5]" />
                              </div>
                              <div className="absolute right-4 top-4.5 text-slate-400 pointer-events-none">
                                <ChevronDown size={14} className="stroke-[2.5]" />
                              </div>
                            </div>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide ml-1 mt-1 leading-normal">
                              La correcta clasificación de su caso permite al sistema rutear de manera automática su solicitud al técnico idóneo.
                            </p>
                          </div>

                          {/* Priority Selection with Custom Cards */}
                          <div className="space-y-2 pt-1.5">
                            <label className="text-[9.5px] font-black text-slate-500 uppercase tracking-widest ml-1">¿Cuál es el nivel de urgencia?</label>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { id: 'BAJA', label: 'BAJA', desc: 'Leve. Sin interferencia crítica', bg: 'bg-emerald-50 text-emerald-800 border-emerald-300' },
                                { id: 'MEDIA', label: 'MEDIA', desc: 'Normal. Falla regular', bg: 'bg-indigo-50 text-[#0B3C5D] border-[#0B3C5D]' },
                                { id: 'ALTA', label: 'ALTA', desc: 'Urgente. Afecta confort inmediato', bg: 'bg-orange-50 text-orange-800 border-orange-300' },
                                { id: 'CRÍTICA', label: 'CRÍTICA', desc: 'Emergencia. Daño activo grave', bg: 'bg-rose-50 text-rose-800 border-rose-300' }
                              ].map((prio) => {
                                const isSel = priority === prio.id;
                                return (
                                  <button
                                    key={prio.id}
                                    type="button"
                                    onClick={() => setPriority(prio.id as any)}
                                    className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between h-[82px] transition-all cursor-pointer select-none ${
                                      isSel 
                                        ? `ring-2 ring-offset-1 ring-slate-800/10 ${prio.bg} shadow-xs font-black` 
                                        : 'bg-white border-slate-200 hover:bg-slate-50/50 text-slate-700'
                                    }`}
                                  >
                                    <span className="text-[10px] font-black uppercase tracking-wider">{prio.label}</span>
                                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tight leading-normal">{prio.desc}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {step === 3 && (
                        <motion.div
                          key="step3"
                          initial={{ opacity: 0, x: 15 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -15 }}
                          transition={{ duration: 0.15 }}
                          className="space-y-4"
                        >
                          <div className="bg-amber-50 border border-amber-200/50 rounded-2xl p-4 flex gap-3.5 items-start">
                            <span className="text-amber-500 text-sm leading-none">⚠️</span>
                            <div>
                              <p className="text-[9.5px] font-black text-amber-950 uppercase tracking-wider">¡Reporte Breve y Conciso!</p>
                              <p className="text-[9px] font-bold text-amber-900 uppercase mt-1 leading-relaxed">
                                Para acelerar la asignación técnica, resume la falla. Se aplica un límite estricto de 50 caracteres en el título y 200 en el detalle.
                              </p>
                            </div>
                          </div>

                          {/* Title */}
                          <div className="space-y-1">
                            <div className="flex justify-between items-center ml-1">
                              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">¿Qué está fallando? (Título breve)</label>
                              <span className={`text-[8.5px] font-black ${title.length >= 45 ? 'text-rose-500 animate-pulse' : 'text-slate-450'}`}>
                                {title.length}/50
                              </span>
                            </div>
                            <input 
                              type="text" 
                              required 
                              maxLength={50}
                              placeholder="EJ: GOTERA BAÑO PRINCIPAL, ENCHUFE QUEMADO..."
                              value={title}
                              onChange={e => setTitle(normalizeText(e.target.value))}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-[#0B3C5D] focus:bg-white transition-all text-slate-800 placeholder-slate-400"
                            />
                          </div>

                          {/* Exact Location Dropdown */}
                          <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Lugar exacto de la propiedad</label>
                            <div className="relative">
                              <select
                                value={exactLocation}
                                onChange={e => setExactLocation(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 pr-10 text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-[#0B3C5D] focus:bg-white transition-all text-slate-800 appearance-none cursor-pointer"
                              >
                                {exactLocationOptions.map(option => (
                                  <option key={option} value={option}>{option}</option>
                                ))}
                              </select>
                              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-500">
                                <ChevronDown size={14} />
                              </div>
                            </div>
                          </div>

                          {/* Description */}
                          <div className="space-y-1">
                            <div className="flex justify-between items-center ml-1">
                              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Detalle del desperfecto</label>
                              <span className={`text-[8.5px] font-black ${description.length >= 180 ? 'text-rose-500 animate-pulse' : 'text-slate-450'}`}>
                                {description.length}/200
                              </span>
                            </div>
                            <textarea 
                              required 
                              maxLength={200}
                              placeholder="DESCRIBA DETALLADAMENTE LA FALLA, INDICANDO EL LUGAR Y CUÁNDO COMENZÓ..."
                              value={description}
                              onChange={e => setDescription(normalizeText(e.target.value))}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-xs font-semibold uppercase outline-none focus:ring-2 focus:ring-[#0B3C5D] focus:bg-white h-32 resize-none transition-all text-slate-800 placeholder-slate-400"
                            />
                          </div>
                        </motion.div>
                      )}

                      {step === 4 && (
                        <motion.div
                          key="step4"
                          initial={{ opacity: 0, x: 15 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -15 }}
                          transition={{ duration: 0.15 }}
                          className="space-y-4"
                        >
                          {/* Image Upload Area */}
                          <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Evidencia Fotográfica (Opcional)</label>
                            
                            <div className="flex gap-3 items-center">
                              <button 
                                type="button" 
                                onClick={() => document.getElementById('tenant_image_upload')?.click()}
                                className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-slate-100 border-2 border-dashed border-slate-250 rounded-2xl cursor-pointer w-20 h-20 shrink-0 transition-all text-slate-400 hover:text-slate-600 hover:border-slate-350 focus:outline-none focus:ring-2 focus:ring-[#0B3C5D] select-none"
                              >
                                <Camera size={20} className="text-slate-500 animate-bounce" />
                                <span className="text-[8px] font-black uppercase mt-1">Añadir</span>
                              </button>
                              <input 
                                type="file" 
                                id="tenant_image_upload" 
                                multiple 
                                accept="image/*" 
                                onChange={handleImageChange} 
                                className="hidden" 
                              />
                              <p className="text-[9px] text-slate-400 font-bold uppercase leading-relaxed">
                                Adjunta capturas claras del desperfecto. Ayuda al técnico a venir preparado con las herramientas idóneas.
                              </p>
                            </div>

                            {/* Previews */}
                            {images.length > 0 && (
                              <div className="grid grid-cols-4 gap-2 pt-1.5">
                                {images.map((img, idx) => (
                                  <div key={idx} className="relative rounded-lg overflow-hidden border border-slate-200 aspect-square group bg-slate-50 shadow-xs">
                                    <img src={img} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    <button 
                                      type="button" 
                                      onClick={() => removeImage(idx)}
                                      className="absolute top-1 right-1 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full transition-colors cursor-pointer shadow-md"
                                    >
                                      <X size={10} className="stroke-[2.5]" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {isUploading && (
                              <p className="text-[9px] font-bold text-indigo-600 animate-pulse uppercase">Cargando imágenes...</p>
                            )}
                          </div>

                          {/* Request Summary Review Card */}
                          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3">
                            <div className="flex items-center gap-1.5 border-b border-slate-200 pb-2">
                              <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                              <p className="text-[8.5px] font-black text-slate-450 uppercase tracking-widest">Resumen de Confirmación</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-[10px] uppercase font-bold text-slate-600">
                              <div className="col-span-2 sm:col-span-1">
                                <span className="text-[8px] font-black text-slate-400 block tracking-wider">Propiedad Vinculada</span>
                                <span className="text-slate-800 truncate block">
                                  {properties.find(p => p.id === propertyId)?.building} - UNIDAD {properties.find(p => p.id === propertyId)?.code}
                                </span>
                              </div>
                              <div className="col-span-2 sm:col-span-1">
                                <span className="text-[8px] font-black text-slate-400 block tracking-wider">Clasificación de Solicitud</span>
                                <span className="text-slate-800 block">
                                  {category} • Prioridad {priority}
                                </span>
                              </div>
                              <div className="col-span-2 pt-1 border-t border-slate-100">
                                <span className="text-[8px] font-black text-slate-400 block tracking-wider">Lugar Exacto de la Falla</span>
                                <span className="text-slate-800 block font-bold text-xs tracking-tight">{exactLocation}</span>
                              </div>
                              <div className="col-span-2 pt-1 border-t border-slate-100">
                                <span className="text-[8px] font-black text-slate-400 block tracking-wider">Título de Requerimiento</span>
                                <span className="text-slate-900 block font-black text-xs tracking-tight">{title}</span>
                              </div>
                              <div className="col-span-2">
                                <span className="text-[8px] font-black text-slate-400 block tracking-wider">Detalle del Diagnóstico</span>
                                <span className="text-slate-700 block font-semibold leading-relaxed whitespace-pre-wrap text-[9.5px] bg-white rounded-lg p-2.5 border border-slate-150">{description}</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Wizard Footer Navigation Actions */}
                  <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0 gap-3">
                    {step > 1 ? (
                      <button
                        type="button"
                        onClick={() => setStep(prev => prev - 1)}
                        className="px-5 py-3.5 bg-white hover:bg-slate-100 border border-slate-250 text-slate-700 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all cursor-pointer select-none"
                      >
                        Anterior
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsFormOpen(false)}
                        className="px-5 py-3.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all cursor-pointer select-none"
                      >
                        Cancelar
                      </button>
                    )}

                    {step < 4 ? (
                      <button
                        type="button"
                        disabled={
                          (step === 1 && !propertyId) ||
                          (step === 3 && (!title.trim() || !description.trim()))
                        }
                        onClick={() => setStep(prev => prev + 1)}
                        className="flex-1 py-3.5 bg-[#0B3C5D] hover:bg-[#07263b] text-white disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 rounded-xl font-black text-[11px] uppercase tracking-widest transition-all cursor-pointer select-none text-center border border-[#0B3C5D] disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                      >
                        Siguiente Paso
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={!propertyId || !title.trim() || !description.trim()}
                        className="flex-1 py-3.5 bg-[#FFCC00] hover:bg-[#ffd11a] text-[#0B3C5D] disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 rounded-xl font-black text-[11px] uppercase tracking-widest shadow-md hover:shadow-lg transition-all cursor-pointer select-none text-center border border-[#E6B800] disabled:cursor-not-allowed"
                      >
                        Enviar Solicitud
                      </button>
                    )}
                  </div>
                </form>
              </>
            )}
          </motion.div>
            </div>
          )}
        </AnimatePresence>

        </div>
      </main>
    </div>
  );
};

export default TenantPortal;
