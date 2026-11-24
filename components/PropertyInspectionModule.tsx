import React, { useState, useRef } from 'react';
import { 
  ClipboardCheck, Camera, FileText, Send, MailCheck, User, MapPin, 
  Plus, Trash2, CheckCircle2, AlertTriangle, Clock, Shield, Search, 
  FileSignature, ChevronDown, Check, RefreshCw, X, Download, ShieldCheck
} from 'lucide-react';
import { Property, LeaseContract, PropertyInspection, PropertyInspectionItem, Applicant } from '../types';
import { downloadPropertyInspectionAct } from '../lib/pdfGenerator';

interface PropertyInspectionModuleProps {
  inspections: PropertyInspection[];
  properties: Property[];
  contracts: LeaseContract[];
  currentUser: string;
  onSave: (inspection: PropertyInspection) => void;
  onDelete?: (id: string) => void;
  onSync?: () => void;
  applicants?: Applicant[];
  onSeedTestData?: () => void;
  companyLogo?: string | null;
}

// Preset areas and elements to inspect
const PRESET_AREAS = [
  'LIVING / COMEDOR',
  'COCINA',
  'BAÑO PRINCIPAL',
  'BAÑO DE VISITAS',
  'DORMITORIO 1 (PRINCIPAL)',
  'DORMITORIO 2',
  'BALCÓN / TERRAZA',
  'LOGIA / LAVADERO',
  'ESTACIONAMIENTO / BODEGA'
];

const PRESET_ELEMENTS = [
  'Muros y Pintura',
  'Pisos y Guardapolvos',
  'Ventanas, Vidrios y Marcos',
  'Puertas y Cerraduras',
  'Interruptores, Enchufes y Luminaria',
  'Grifería y Desagües',
  'Muebles / clósets',
  'Sanitarios y Duchas'
];

// Map of which elements are relevant to each inspection area
const AREA_ELEMENTS_MAP: Record<string, string[]> = {
  'LIVING / COMEDOR': [
    'Muros y Pintura',
    'Pisos y Guardapolvos',
    'Ventanas, Vidrios y Marcos',
    'Puertas y Cerraduras',
    'Interruptores, Enchufes y Luminaria',
    'Muebles / clósets'
  ],
  'COCINA': [
    'Muros y Pintura',
    'Pisos y Guardapolvos',
    'Ventanas, Vidrios y Marcos',
    'Puertas y Cerraduras',
    'Interruptores, Enchufes y Luminaria',
    'Grifería y Desagües',
    'Muebles / clósets'
  ],
  'BAÑO PRINCIPAL': [
    'Muros y Pintura',
    'Pisos y Guardapolvos',
    'Ventanas, Vidrios y Marcos',
    'Puertas y Cerraduras',
    'Interruptores, Enchufes y Luminaria',
    'Grifería y Desagües',
    'Muebles / clósets',
    'Sanitarios y Duchas'
  ],
  'BAÑO DE VISITAS': [
    'Muros y Pintura',
    'Pisos y Guardapolvos',
    'Ventanas, Vidrios y Marcos',
    'Puertas y Cerraduras',
    'Interruptores, Enchufes y Luminaria',
    'Grifería y Desagües',
    'Muebles / clósets',
    'Sanitarios y Duchas'
  ],
  'DORMITORIO 1 (PRINCIPAL)': [
    'Muros y Pintura',
    'Pisos y Guardapolvos',
    'Ventanas, Vidrios y Marcos',
    'Puertas y Cerraduras',
    'Interruptores, Enchufes y Luminaria',
    'Muebles / clósets'
  ],
  'DORMITORIO 2': [
    'Muros y Pintura',
    'Pisos y Guardapolvos',
    'Ventanas, Vidrios y Marcos',
    'Puertas y Cerraduras',
    'Interruptores, Enchufes y Luminaria',
    'Muebles / clósets'
  ],
  'BALCÓN / TERRAZA': [
    'Muros y Pintura',
    'Pisos y Guardapolvos',
    'Ventanas, Vidrios y Marcos',
    'Puertas y Cerraduras',
    'Interruptores, Enchufes y Luminaria'
  ],
  'LOGIA / LAVADERO': [
    'Muros y Pintura',
    'Pisos y Guardapolvos',
    'Ventanas, Vidrios y Marcos',
    'Interruptores, Enchufes y Luminaria',
    'Grifería y Desagües'
  ],
  'ESTACIONAMIENTO / BODEGA': [
    'Muros y Pintura',
    'Pisos y Guardapolvos',
    'Puertas y Cerraduras',
    'Interruptores, Enchufes y Luminaria'
  ]
};

// Presets observations dropdown list to avoid inconsistent data entry
const OBSERVATION_PRESETS: Record<string, string[]> = {
  'Muros y Pintura': [
    'Pintura en perfecto estado, limpia y sin marcas',
    'Pintura con leves desgastes de uso normal',
    'Rayas o marcas menores en zona baja de muros',
    'Manchas de humedad visibles o descascaramiento menor',
    'Perforaciones menores de cuadros por tapar',
    'Daño grave en tabiquería o fisuras estructurales'
  ],
  'Pisos y Guardapolvos': [
    'Pisos limpios, nivelados, sin rayaduras ni fisuras',
    'Desgaste menor por tránsito normal de personas',
    'Rayas menores o madera opaca',
    'Cerámicas sueltas o fragüe trizado en juntas',
    'Tablas de piso flotante separadas o levantadas por humedad',
    'Alfombra con manchas severas, quemaduras o desgaste extremo'
  ],
  'Ventanas, Vidrios y Marcos': [
    'Marcos limpios, vidrios íntegros y cierres herméticos',
    'Vidrio sucio pero sin rayaduras ni picaduras',
    'Cierre suelto o requiere lubricación menor',
    'Vidrio trizado o quebrado que requiere reposición',
    'Falta burlete de goma o sellado deficiente en marcos'
  ],
  'Puertas y Cerraduras': [
    'Apertura fluida, picaporte firme y cerradura operativa con llave',
    'Roza levemente al cerrar pero sin impedir cierre',
    'Bisagra suelta o rechinante',
    'Cerradura defectuosa o trancada, no gira la llave',
    'Falta manilla o pestillo de seguridad en baño'
  ],
  'Interruptores, Enchufes y Luminaria': [
    'Todos los interruptores y enchufes firmes y operativos',
    'Enchufe suelto de la caja pero con corriente',
    'Falta ampolleta o soquete se encuentra expuesto',
    'Tapa plástica quebrada o con trizaduras',
    'Interruptor no enciende o presenta falso contacto'
  ],
  'Grifería y Desagües': [
    'Grifería en perfecto estado, flujo continuo y sin fugas',
    'Desgaste por sarro acumulado en filtros',
    'Goteo leve en grifo cerrado, requiere cambio de goma',
    'Filtración activa bajo el mueble (sifón o mangueras)',
    'Desagüe lento o parcialmente obstruido'
  ],
  'Muebles / clósets': [
    'Puertas y cajones cierran perfecto, repisas firmes',
    'Bisagra desajustada de clóset',
    'Cajón atascado o riel doblado',
    'Falta manilla o tirador en cajonera',
    'Melamina soplada por humedad en cocina'
  ],
  'Sanitarios y Duchas': [
    'Sanitarios limpios, descarga rápida y sello hermético',
    'Desgaste estético menor en silicona de tina',
    'Estanque de WC con carga lenta o goteo interno continuo',
    'Tapa de WC suelta o quebrada',
    'Tricadura en lavamanos o WC sin fuga',
    'Silicona con hongos o filtración por base de WC'
  ],
  'Otros': [
    'Excelente estado de conservación',
    'Estado regular con observaciones señaladas',
    'Requiere mantención preventiva inmediata',
    'Requiere reparación correctiva urgente'
  ]
};

export const PropertyInspectionModule: React.FC<PropertyInspectionModuleProps> = ({
  inspections,
  properties,
  contracts,
  currentUser,
  onSave,
  onDelete,
  onSync,
  applicants = [],
  onSeedTestData,
  companyLogo
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'TODOS' | 'ENTRANTE' | 'RESTITUCION'>('TODOS');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'BORRADOR' | 'ACTA_ENVIADA' | 'ACEPTADO' | 'RECHAZADO'>('TODOS');
  
  // Create / Edit mode states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState<PropertyInspection | null>(null);
  const [activeTab, setActiveTab] = useState<'NUEVO' | 'ITEMS' | 'FOTOS' | 'FIRMAS'>('NUEVO');
  
  // Form fields
  const [propertyId, setPropertyId] = useState('');
  const [contractId, setContractId] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [tenantEmail, setTenantEmail] = useState('');
  const [executiveName, setExecutiveName] = useState(currentUser);
  const [executiveEmail, setExecutiveEmail] = useState('');
  const [inspectionType, setInspectionType] = useState<'ENTRANTE' | 'RESTITUCION'>('ENTRANTE');
  const [inspectionDate, setInspectionDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Inspection items state
  const [items, setItems] = useState<PropertyInspectionItem[]>([]);
  const [newItemArea, setNewItemArea] = useState(PRESET_AREAS[0]);
  const [newItemElement, setNewItemElement] = useState(PRESET_ELEMENTS[0]);
  const [newItemState, setNewItemState] = useState<'EXCELENTE' | 'BUENO' | 'REGULAR' | 'MALO'>('BUENO');
  const [newItemObservation, setNewItemObservation] = useState('');
  
  // Photos state
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);
  
  // Signatures
  const [sigTenant, setSigTenant] = useState('');
  const [sigTenantRut, setSigTenantRut] = useState('');
  const [sigTenantDocNumber, setSigTenantDocNumber] = useState('');
  const [sigExecutive, setSigExecutive] = useState('');
  
  // Simulated email view state
  const [simulatedEmail, setSimulatedEmail] = useState<{
    to: string;
    cc: string;
    subject: string;
    body: string;
    inspectionId: string;
    isOpen: boolean;
  } | null>(null);

  // Tenant digital signing portal states
  const [isSigningPortalOpen, setIsSigningPortalOpen] = useState(false);
  const [portalTenantName, setPortalTenantName] = useState('');
  const [portalTenantRut, setPortalTenantRut] = useState('');
  const [portalTenantDocNumber, setPortalTenantDocNumber] = useState('');
  const [portalError, setPortalError] = useState('');
  const [portalInspectionId, setPortalInspectionId] = useState('');

  // Auto-fill tenant details from selected contract
  const handleContractChange = (cId: string) => {
    setContractId(cId);
    const contract = contracts.find(c => c.id === cId);
    if (contract) {
      setTenantName(contract.tenantName);
      setPropertyId(contract.propertyId);
      
      // Look up tenant email or generate plausible corporate email
      const normalizedTenant = contract.tenantName.toLowerCase().replace(/\s+/g, '.');
      setTenantEmail(`${normalizedTenant}@arrendatario.cl`);
    }
  };

  // Auto-fill tenant details if property is selected directly
  const handlePropertyChange = (pId: string) => {
    setPropertyId(pId);
    // Try to find a contract active for this property
    const activeContract = contracts.find(c => c.propertyId === pId && c.status === 'VIGENTE');
    if (activeContract) {
      setContractId(activeContract.id);
      setTenantName(activeContract.tenantName);
      const normalizedTenant = activeContract.tenantName.toLowerCase().replace(/\s+/g, '.');
      setTenantEmail(`${normalizedTenant}@arrendatario.cl`);
    } else {
      setContractId('');
      setTenantName('');
      setTenantEmail('');
    }
  };

  // Add item to active inspection
  const handleAddItem = () => {
    const item: PropertyInspectionItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      area: newItemArea,
      element: newItemElement,
      state: newItemState,
      observation: newItemObservation || 'Sin observaciones adicionales'
    };
    setItems([...items, item]);
    // Reset observation for next item
    setNewItemObservation('');
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  // Seed default presets to fill items list quickly for the user
  const handleSeedDefaultItems = () => {
    const seeded: PropertyInspectionItem[] = [];
    PRESET_AREAS.slice(0, 4).forEach(area => {
      PRESET_ELEMENTS.slice(0, 4).forEach(element => {
        const obsList = OBSERVATION_PRESETS[element] || OBSERVATION_PRESETS['Otros'];
        seeded.push({
          id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          area,
          element,
          state: 'BUENO',
          observation: obsList[0]
        });
      });
    });
    setItems(seeded);
  };

  // Photo uploads handler (Base64 file reader)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result) {
            setUploadedPhotos(prev => [...prev, reader.result as string]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files) {
      Array.from(files).forEach((file: File) => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (reader.result) {
              setUploadedPhotos(prev => [...prev, reader.result as string]);
            }
          };
          reader.readAsDataURL(file);
        }
      });
    }
  };

  // Save inspection
  const handleSaveInspection = (status: PropertyInspection['status'] = 'BORRADOR') => {
    if (!propertyId || !tenantName) {
      alert('Debe seleccionar al menos una propiedad y especificar el nombre del arrendatario.');
      return;
    }

    const prop = properties.find(p => p.id === propertyId);
    const propLabel = prop ? `${prop.building} - Depto/Local ${prop.floor} (${prop.address}, ${prop.commune})` : 'Propiedad no identificada';

    const finalInspection: PropertyInspection = {
      id: selectedInspection?.id || `ins-${Date.now()}`,
      propertyId,
      propertyLabel: propLabel,
      contractId: contractId || undefined,
      tenantName,
      tenantEmail: tenantEmail || 'correo@arrendatario.cl',
      executiveName,
      executiveEmail: executiveEmail || 'ejecutivo@inmobiliariapro.cl',
      type: inspectionType,
      status,
      inspectionDate,
      items,
      photos: uploadedPhotos,
      signatureTenant: sigTenant || undefined,
      signatureTenantRut: sigTenantRut || undefined,
      signatureTenantDocNumber: sigTenantDocNumber || undefined,
      signatureExecutive: sigExecutive || undefined,
      userCreator: currentUser,
      timestamp: selectedInspection?.timestamp || Date.now(),
      isTest: false
    };

    onSave(finalInspection);
    setIsFormOpen(false);
    setSelectedInspection(null);
    resetForm();
  };

  // Trigger dispatch simulation
  const handleSendAct = (inspection: PropertyInspection) => {
    const prop = properties.find(p => p.id === inspection.propertyId);
    const propDetails = prop ? `${prop.building}, Depto ${prop.floor}` : inspection.propertyLabel;

    const subject = `[ASSETFLOW] Acta de Revisión de Propiedad (${inspection.type}) - ${propDetails}`;
    const body = `Estimado(a) ${inspection.tenantName},

Adjunto a este correo electrónico enviamos el Acta de Revisión Física del Inmueble ubicado en ${inspection.propertyLabel}, realizada el ${inspection.inspectionDate} por el ejecutivo ${inspection.executiveName}.

El acta registra un total de ${inspection.items.length} elementos revisados y un registro fotográfico adjunto de ${inspection.photos.length} imágenes que certifican el estado de entrega.

POR FAVOR, REVISE EL DETALLE Y RESPONDA A ESTE CORREO ELECTRÓNICO CONFIRMANDO SU ACEPTACIÓN O RECHAZO DE LAS OBSERVACIONES INDICADAS EN EL ACTA EMITIDA POR EL SISTEMA.

Atentamente,
Departamento Inmobiliario de AssetFlow S.A.
----------------------------------------------------------------------
Enviado automáticamente por el Sistema Integrado AssetFlow.`;

    setSimulatedEmail({
      to: inspection.tenantEmail,
      cc: inspection.executiveEmail || 'ejecutivo@inmobiliariapro.cl',
      subject,
      body,
      inspectionId: inspection.id,
      isOpen: true
    });
  };

  // Open tenant's secure digital signing portal
  const handleOpenSigningPortal = () => {
    if (!simulatedEmail) return;
    const originalInspection = inspections.find(i => i.id === simulatedEmail.inspectionId);
    if (!originalInspection) return;

    // Search for tenant's RUT (tax ID) and Doc/Series Number
    const contract = contracts.find(c => c.id === originalInspection.contractId);
    const prefilledRut = contract ? contract.tenantTaxId : (applicants.find(a => a.name === originalInspection.tenantName)?.taxId || '');
    const prefilledDocNumber = contract ? (contract.tenantDocNumber || '') : '';

    setPortalInspectionId(simulatedEmail.inspectionId);
    setPortalTenantName(originalInspection.tenantName);
    setPortalTenantRut(prefilledRut);
    setPortalTenantDocNumber(prefilledDocNumber);
    setPortalError('');
    setIsSigningPortalOpen(true);
    setSimulatedEmail(null); // Close email simulator to focus on signing portal
  };

  const handleCompletePortalSigning = () => {
    if (!portalTenantRut.trim()) {
      setPortalError('El RUN / RUT es obligatorio para firmar.');
      return;
    }
    if (!portalTenantDocNumber.trim()) {
      setPortalError('El número de serie o documento de la cédula es obligatorio.');
      return;
    }
    
    // RUT format check / validation (simple regex check for RUT format, e.g. XX.XXX.XXX-X or XXXXXXXX-X)
    const cleanRut = portalTenantRut.replace(/\s+/g, '').toUpperCase();
    const rutRegex = /^\d{1,2}\.?\d{3}\.?\d{3}-?[\dkK]$/;
    if (!rutRegex.test(cleanRut)) {
      setPortalError('El formato de RUN / RUT ingresado no es válido (ej: 12.345.678-9).');
      return;
    }

    // Doc Number check (typical Chilean ID numbers are 9 digits or starts with letter)
    const cleanDocNum = portalTenantDocNumber.replace(/\s+/g, '').toUpperCase();
    if (cleanDocNum.length < 6) {
      setPortalError('El número de documento / serie ingresado es demasiado corto.');
      return;
    }

    const originalInspection = inspections.find(i => i.id === portalInspectionId);
    if (originalInspection) {
      const updated: PropertyInspection = {
        ...originalInspection,
        status: 'ACEPTADO',
        signatureTenant: portalTenantName.toUpperCase(),
        signatureTenantRut: cleanRut,
        signatureTenantDocNumber: cleanDocNum
      };
      onSave(updated);
      setIsSigningPortalOpen(false);
      alert(`🎉 ¡Acta firmada con éxito!\n\nEl arrendatario ${portalTenantName} ha firmado digitalmente ingresando su RUN/RUT y Número de Serie. El estado del acta cambió a ACEPTADO y la propiedad está lista.`);
    }
  };

  // Simulate Tenant Email reply (Accepting/Rejecting conditions)
  const handleSimulateTenantResponse = (accepted: boolean) => {
    if (!simulatedEmail) return;
    
    if (accepted) {
      handleOpenSigningPortal();
    } else {
      const originalInspection = inspections.find(i => i.id === simulatedEmail.inspectionId);
      if (originalInspection) {
        const updated: PropertyInspection = {
          ...originalInspection,
          status: 'RECHAZADO',
          rejectionReason: 'Arrendatario indica que pintura en dormitorio principal presenta rayones no registrados.',
          signatureTenant: undefined,
          signatureTenantRut: undefined,
          signatureTenantDocNumber: undefined
        };
        onSave(updated);
        alert(`Simulación exitosa: El arrendatario ha respondido el correo RECHAZANDO el estado de la propiedad.`);
      }
      setSimulatedEmail(null);
    }
  };

  const handleEditClick = (inspection: PropertyInspection) => {
    setSelectedInspection(inspection);
    setPropertyId(inspection.propertyId);
    setContractId(inspection.contractId || '');
    setTenantName(inspection.tenantName);
    setTenantEmail(inspection.tenantEmail);
    setExecutiveName(inspection.executiveName);
    setExecutiveEmail(inspection.executiveEmail || '');
    setInspectionType(inspection.type);
    setInspectionDate(inspection.inspectionDate);
    setItems(inspection.items);
    setUploadedPhotos(inspection.photos);
    setSigTenant(inspection.signatureTenant || '');
    setSigTenantRut(inspection.signatureTenantRut || '');
    setSigTenantDocNumber(inspection.signatureTenantDocNumber || '');
    setSigExecutive(inspection.signatureExecutive || '');
    
    setIsFormOpen(true);
    setActiveTab('NUEVO');
  };

  const resetForm = () => {
    setSelectedInspection(null);
    setPropertyId('');
    setContractId('');
    setTenantName('');
    setTenantEmail('');
    setExecutiveName(currentUser);
    setExecutiveEmail('');
    setInspectionType('ENTRANTE');
    setInspectionDate(new Date().toISOString().split('T')[0]);
    setItems([]);
    setUploadedPhotos([]);
    setSigTenant('');
    setSigTenantRut('');
    setSigTenantDocNumber('');
    setSigExecutive('');
  };

  // Candidates for Check-In (Approved Applicants) and Check-Out (Active Tenants)
  const approvedApplicants = (applicants || []).filter(app => app.status === 'APROBADO');
  const activeTenants = contracts.filter(c => c.status === 'VIGENTE' || c.status === 'ACTIVO');

  const checkInCandidates = propertyId 
    ? approvedApplicants.filter(a => a.propertyId === propertyId)
    : approvedApplicants;

  const checkOutCandidates = propertyId
    ? activeTenants.filter(c => c.propertyId === propertyId)
    : activeTenants;

  // Filtered inspections list
  const filteredInspections = inspections.filter(i => {
    const matchSearch = 
      i.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.propertyLabel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.executiveName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchType = typeFilter === 'TODOS' || i.type === typeFilter;
    const matchStatus = statusFilter === 'TODOS' || i.status === statusFilter;

    return matchSearch && matchType && matchStatus;
  });

  return (
    <div className="p-6 bg-slate-50 h-full overflow-y-auto">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-lg border border-slate-200 shadow-xs mb-6">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardCheck size={24} className="text-indigo-600 animate-pulse" />
            <h1 className="text-xl font-bold font-sans text-slate-800 tracking-tight uppercase">
              Revisión Física y Acta de Propiedades
            </h1>
          </div>
          <p className="text-xs font-medium text-slate-500 mt-1 uppercase tracking-wide">
            Control de Entrega (Check-in) y Restitución (Check-out) de Unidades Inmobiliarias - AssetFlow S.A.
          </p>
        </div>
        <div className="flex gap-2">
          {onSeedTestData && (
            <button
              onClick={onSeedTestData}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-black uppercase tracking-wider rounded-lg border border-emerald-200 transition-all flex items-center gap-2 cursor-pointer"
              title="Cargar 10 datos de prueba integrados para probar el flujo completo"
            >
              <CheckCircle2 size={14} className="text-emerald-600" />
              Cargar 10 Datos Prueba
            </button>
          )}
          {onSync && (
            <button
              onClick={onSync}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-lg border border-slate-300 transition-all flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw size={14} />
              Sincronizar Nube
            </button>
          )}
          <button
            onClick={() => {
              resetForm();
              setIsFormOpen(true);
              setActiveTab('NUEVO');
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-lg border border-indigo-700 transition-all flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Plus size={16} />
            Nueva Acta / Revisión
          </button>
        </div>
      </div>

      {/* FILTERS AND SEARCH */}
      {!isFormOpen && (
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-3xs mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Buscar por arrendatario, unidad, ejecutivo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 text-slate-800 border border-slate-300 text-xs rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
            />
          </div>
          
          <div className="flex flex-wrap gap-3 w-full md:w-auto justify-end">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tipo:</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-300 text-slate-800 text-[11px] font-bold px-2.5 py-1.5 rounded-lg focus:outline-none"
              >
                <option value="TODOS">Todos los Tipos</option>
                <option value="ENTRANTE">Entrega (Entrante)</option>
                <option value="RESTITUCION">Restitución (Salida)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Estado:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-slate-50 border border-slate-300 text-slate-800 text-[11px] font-bold px-2.5 py-1.5 rounded-lg focus:outline-none"
              >
                <option value="TODOS">Todos los Estados</option>
                <option value="BORRADOR">Borrador</option>
                <option value="ACTA_ENVIADA">Acta Enviada</option>
                <option value="ACEPTADO">Aceptado por Arrendatario</option>
                <option value="RECHAZADO">Rechazado</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* TENANT DIGITAL SIGNING PORTAL MODAL */}
      {isSigningPortalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 font-sans animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
            
            <div className="bg-gradient-to-r from-emerald-700 to-indigo-800 text-white p-5 flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={20} className="text-emerald-300" />
                  <span className="text-xs font-black tracking-widest uppercase text-emerald-100">
                    AssetFlow Secure Sign
                  </span>
                </div>
                <button 
                  onClick={() => {
                    setIsSigningPortalOpen(false);
                    // Reopen simulated email
                    const ins = inspections.find(i => i.id === portalInspectionId);
                    setSimulatedEmail({
                      to: ins?.tenantEmail || '',
                      cc: 'ejecutivo@inmobiliariapro.cl',
                      subject: `[ASSETFLOW] Acta de Revisión de Propiedad`,
                      body: `Estimado(a) ${ins?.tenantName || 'Inquilino'},\n\nAdjunto a este correo electrónico enviamos el Acta de Revisión Física del Inmueble realizada el ${ins?.inspectionDate || ''}.\n\nPor favor confirme su aceptación ingresando al portal.`,
                      inspectionId: portalInspectionId,
                      isOpen: true
                    });
                  }} 
                  className="text-white/70 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
              <h3 className="text-sm font-black uppercase tracking-wider mt-1.5">
                Portal de Firma Digital Certificada
              </h3>
              <p className="text-[10px] text-white/80">
                Firma de Acta de Revisión según Ley Nº 19.799 (Chile)
              </p>
            </div>

            <div className="p-5 flex flex-col gap-4">
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex gap-2.5">
                <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="text-[10px] text-amber-800 leading-normal">
                  <strong>Validación de Identidad Obligatoria:</strong> Para firmar digitalmente y dar conformidad técnica, ingrese su RUN y Número de Serie de su Cédula de Identidad chilena vigente.
                </div>
              </div>

              {portalError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg text-xs font-medium">
                  ⚠️ {portalError}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Nombre Completo del Firmante (Arrendatario):
                </label>
                <input
                  type="text"
                  value={portalTenantName}
                  disabled
                  className="w-full bg-slate-100 border border-slate-300 text-slate-500 text-xs px-3 py-2 rounded-lg font-mono uppercase cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    RUN / RUT:
                  </label>
                  <input
                    type="text"
                    value={portalTenantRut}
                    onChange={(e) => setPortalTenantRut(e.target.value)}
                    placeholder="12.345.678-9"
                    className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs px-3 py-2 rounded-lg font-mono uppercase focus:bg-white focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    Nº Serie Cédula:
                  </label>
                  <input
                    type="text"
                    value={portalTenantDocNumber}
                    onChange={(e) => setPortalTenantDocNumber(e.target.value)}
                    placeholder="A12345678"
                    className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs px-3 py-2 rounded-lg font-mono uppercase focus:bg-white focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div className="text-[9px] text-slate-400 leading-normal bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                💡 <strong>¿Dónde está el Número de Serie?</strong> En cédulas vigentes es el "Número de Documento" impreso en el frente; en cédulas antiguas se encuentra al reverso.
              </div>

              <div className="flex items-start gap-2 mt-1">
                <input
                  type="checkbox"
                  id="portal-check-terms"
                  defaultChecked
                  className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="portal-check-terms" className="text-[10px] text-slate-500 leading-normal cursor-pointer select-none">
                  Acepto firmar digitalmente este documento declarando conformidad con el estado físico de la propiedad indicada.
                </label>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between gap-3">
              <button
                onClick={() => {
                  setIsSigningPortalOpen(false);
                  const ins = inspections.find(i => i.id === portalInspectionId);
                  setSimulatedEmail({
                    to: ins?.tenantEmail || '',
                    cc: 'ejecutivo@inmobiliariapro.cl',
                    subject: `[ASSETFLOW] Acta de Revisión de Propiedad`,
                    body: `Estimado(a) ${ins?.tenantName || 'Inquilino'},\n\nAdjunto a este correo electrónico enviamos el Acta de Revisión Física del Inmueble realizada el ${ins?.inspectionDate || ''}.\n\nPor favor confirme su aceptación ingresando al portal.`,
                    inspectionId: portalInspectionId,
                    isOpen: true
                  });
                }}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 text-xs font-bold uppercase tracking-wider"
              >
                Volver
              </button>
              <button
                onClick={handleCompletePortalSigning}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-lg shadow-md transition-all flex items-center gap-1.5"
              >
                <ShieldCheck size={14} />
                Firmar Acta Digitalmente
              </button>
            </div>

          </div>
        </div>
      )}

      {/* INSPECTIONS GRID / TABLE */}
      {!isFormOpen && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-xs">
          {filteredInspections.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs text-slate-600">
                <thead className="bg-slate-100 text-[10px] font-bold uppercase text-slate-500 tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-4">ID / Tipo</th>
                    <th className="p-4">Propiedad / Unidad</th>
                    <th className="p-4">Arrendatario / Contacto</th>
                    <th className="p-4">Fecha / Ejecutivo</th>
                    <th className="p-4">Items / Fotos</th>
                    <th className="p-4 text-center">Estado</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredInspections.map((ins) => (
                    <tr 
                      key={ins.id} 
                      className="hover:bg-indigo-50/40 cursor-pointer transition-colors"
                      onClick={() => handleEditClick(ins)}
                      title="Hacer clic para ver detalles de la revisión"
                    >
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-[10px] text-slate-400 font-bold">{ins.id}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider w-max ${
                            ins.type === 'ENTRANTE' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                              : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}>
                            {ins.type === 'ENTRANTE' ? 'ENTREGA' : 'RESTITUCIÓN'}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 font-medium text-slate-800 max-w-xs truncate" title={ins.propertyLabel}>
                        {ins.propertyLabel}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800">{ins.tenantName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{ins.tenantEmail}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-700">{ins.inspectionDate}</span>
                          <span className="text-[10px] text-slate-400 uppercase font-black">Eje: {ins.executiveName}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-[10px] font-bold text-slate-600 border border-slate-200">
                            <ClipboardCheck size={11} className="text-indigo-500" />
                            {ins.items?.length || 0}
                          </span>
                          <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-[10px] font-bold text-slate-600 border border-slate-200">
                            <Camera size={11} className="text-teal-500" />
                            {ins.photos?.length || 0}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          ins.status === 'ACEPTADO' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          ins.status === 'RECHAZADO' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          ins.status === 'ACTA_ENVIADA' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 animate-pulse' :
                          'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {ins.status === 'ACEPTADO' && <CheckCircle2 size={10} />}
                          {ins.status === 'RECHAZADO' && <AlertTriangle size={10} />}
                          {ins.status === 'BORRADOR' && <Clock size={10} />}
                          {ins.status === 'ACTA_ENVIADA' && <MailCheck size={10} />}
                          {ins.status === 'BORRADOR' ? 'BORRADOR' :
                           ins.status === 'ACTA_ENVIADA' ? 'ACTA ENVIADA' :
                           ins.status === 'ACEPTADO' ? 'ACEPTADO POR CLIENTE' : 'RECHAZADO'}
                        </span>
                        {ins.rejectionReason && (
                          <p className="text-[10px] text-rose-600 italic mt-1 font-sans font-medium">
                            Motivo: {ins.rejectionReason}
                          </p>
                        )}
                      </td>
                      <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => downloadPropertyInspectionAct(ins, companyLogo)}
                            className="p-1.5 hover:bg-slate-100 text-emerald-600 border border-emerald-100 hover:border-emerald-200 rounded-lg transition-all"
                            title="Descargar Acta en PDF"
                          >
                            <Download size={14} />
                          </button>

                          <button
                            onClick={() => handleEditClick(ins)}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 border border-slate-200 hover:text-indigo-600 rounded-lg transition-all"
                            title="Editar Acta"
                          >
                            <FileText size={14} />
                          </button>
                          
                          {ins.status === 'BORRADOR' && (
                            <button
                              onClick={() => {
                                handleSendAct(ins);
                                // Set status to Acta Enviada
                                const updated = { ...ins, status: 'ACTA_ENVIADA' as const };
                                onSave(updated);
                              }}
                              className="px-2 py-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white border border-indigo-200 hover:border-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1"
                              title="Enviar Acta al Arrendatario"
                            >
                              <Send size={11} />
                              Enviar Acta
                            </button>
                          )}

                          {ins.status === 'ACTA_ENVIADA' && (
                            <button
                              onClick={() => {
                                setSimulatedEmail({
                                  to: ins.tenantEmail,
                                  cc: ins.executiveEmail || 'ejecutivo@inmobiliariapro.cl',
                                  subject: `[SIMULACIÓN] Responder correo de Acta - ${ins.propertyLabel}`,
                                  body: 'Simular respuesta de aceptación de arriendo',
                                  inspectionId: ins.id,
                                  isOpen: true
                                });
                              }}
                              className="px-2 py-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white border border-emerald-200 hover:border-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1"
                              title="Simular Aceptación por Arrendatario"
                            >
                              <MailCheck size={11} />
                              Simular Resp.
                            </button>
                          )}

                          {onDelete && (
                            <button
                              onClick={() => {
                                if (confirm('¿Está seguro de que desea eliminar esta revisión física permanentemente?')) {
                                  onDelete(ins.id);
                                }
                              }}
                              className="p-1.5 hover:bg-rose-50 text-rose-500 border border-slate-200 hover:border-rose-200 rounded-lg transition-all"
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <ClipboardCheck size={36} className="text-slate-300 mx-auto mb-3" />
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                No hay actas de revisión registradas
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Presione "Nueva Acta / Revisión" para registrar el estado de una propiedad.
              </p>
            </div>
          )}
        </div>
      )}

      {/* DETAILED ACT FORM MODAL */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] my-auto">
          
          {/* Modal Header */}
          <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <ClipboardCheck size={18} className="text-indigo-400" />
              <span className="text-sm font-bold tracking-wider font-mono">
                {selectedInspection ? `EDITAR ACTA DE REVISIÓN: ${selectedInspection.id}` : 'NUEVO REGISTRO DE REVISIÓN FÍSICA'}
              </span>
            </div>
            <button 
              onClick={() => {
                setIsFormOpen(false);
                setSelectedInspection(null);
                resetForm();
              }}
              className="text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50">
            <button
              onClick={() => setActiveTab('NUEVO')}
              className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-r border-slate-200 transition-all cursor-pointer ${
                activeTab === 'NUEVO' ? 'bg-white text-indigo-600 border-t-2 border-t-indigo-600' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              1. Datos Base
            </button>
            <button
              onClick={() => setActiveTab('ITEMS')}
              className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-r border-slate-200 transition-all cursor-pointer ${
                activeTab === 'ITEMS' ? 'bg-white text-indigo-600 border-t-2 border-t-indigo-600' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              2. Inventario & Estado ({items.length})
            </button>
            <button
              onClick={() => setActiveTab('FOTOS')}
              className={`px-5 py-3 text-xs font-bold uppercase tracking-wider border-r border-slate-200 transition-all cursor-pointer ${
                activeTab === 'FOTOS' ? 'bg-white text-indigo-600 border-t-2 border-t-indigo-600' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              3. Registro Fotográfico ({uploadedPhotos.length})
            </button>
            <button
              onClick={() => setActiveTab('FIRMAS')}
              className={`px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'FIRMAS' ? 'bg-white text-indigo-600 border-t-2 border-t-indigo-600' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              4. Firma del Acta
            </button>
          </div>

          {/* Form Content */}
          <div className="p-6 overflow-y-auto flex-1">
            
            {/* TAB 1: DATOS BASE */}
            {activeTab === 'NUEVO' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Tipo de Inspección:
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="insp_type"
                          checked={inspectionType === 'ENTRANTE'}
                          onChange={() => setInspectionType('ENTRANTE')}
                          className="accent-indigo-600 h-4 w-4"
                        />
                        Entrega al Arrendatario (Check-In)
                      </label>
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name="insp_type"
                          checked={inspectionType === 'RESTITUCION'}
                          onChange={() => setInspectionType('RESTITUCION')}
                          className="accent-amber-600 h-4 w-4"
                        />
                        Restitución de la Vivienda (Check-Out)
                      </label>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Vincular Contrato Vigente:
                    </label>
                    <select
                      value={contractId}
                      onChange={(e) => handleContractChange(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs px-3 py-2 rounded-lg"
                    >
                      <option value="">-- SELECCIONE CONTRATO --</option>
                      {contracts.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.tenantName} - {c.propertyLabel} ({c.status})
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400 italic font-medium">
                      Opcional: Llena automáticamente los datos del arrendatario y de la propiedad.
                    </p>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Propiedad / Unidad Inmobiliaria:
                    </label>
                    <select
                      value={propertyId}
                      onChange={(e) => handlePropertyChange(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs px-3 py-2 rounded-lg font-medium"
                      required
                    >
                      <option value="">-- SELECCIONE PROPIEDAD --</option>
                      {properties.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.building} - Depto {p.floor} ({p.address}, {p.commune})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        {inspectionType === 'ENTRANTE' ? 'Postulante Aprobado (Check-In):' : 'Arrendatario de la Vivienda (Check-Out):'}
                      </label>
                      
                      {inspectionType === 'ENTRANTE' ? (
                        <select
                          value={
                            approvedApplicants.find(a => a.name === tenantName)?.id || (tenantName ? '__MANUAL__' : '')
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '__MANUAL__') {
                              setTenantName('');
                              setTenantEmail('');
                            } else if (val) {
                              const app = approvedApplicants.find(a => a.id === val);
                              if (app) {
                                setTenantName(app.name);
                                setTenantEmail(app.email || `${app.name.toLowerCase().replace(/\s+/g, '.')}@arrendatario.cl`);
                                if (app.propertyId) {
                                  handlePropertyChange(app.propertyId);
                                }
                              }
                            } else {
                              setTenantName('');
                              setTenantEmail('');
                            }
                          }}
                          className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs px-3 py-2 rounded-lg font-bold"
                          required
                        >
                          <option value="">-- SELECCIONE POSTULANTE --</option>
                          {checkInCandidates.map(app => (
                            <option key={app.id} value={app.id}>
                              {app.name} ({app.taxId}) {app.propertyLabel ? `[${app.propertyLabel}]` : ''}
                            </option>
                          ))}
                          <option value="__MANUAL__">✍️ INGRESAR NOMBRE MANUALMENTE...</option>
                        </select>
                      ) : (
                        <select
                          value={
                            activeTenants.find(c => c.tenantName === tenantName)?.id || (tenantName ? '__MANUAL__' : '')
                          }
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '__MANUAL__') {
                              setTenantName('');
                              setTenantEmail('');
                            } else if (val) {
                              const c = activeTenants.find(c => c.id === val);
                              if (c) {
                                setTenantName(c.tenantName);
                                setTenantEmail(c.tenantEmail || `${c.tenantName.toLowerCase().replace(/\s+/g, '.')}@arrendatario.cl`);
                                setContractId(c.id);
                                if (c.propertyId) {
                                  setPropertyId(c.propertyId);
                                }
                              }
                            } else {
                              setTenantName('');
                              setTenantEmail('');
                            }
                          }}
                          className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs px-3 py-2 rounded-lg font-bold"
                          required
                        >
                          <option value="">-- SELECCIONE ARRENDATARIO --</option>
                          {checkOutCandidates.map(c => (
                            <option key={c.id} value={c.id}>
                              {c.tenantName} - {c.propertyLabel} ({c.status})
                            </option>
                          ))}
                          <option value="__MANUAL__">✍️ INGRESAR NOMBRE MANUALMENTE...</option>
                        </select>
                      )}

                      {/* Manual input fallback */}
                      {(tenantName === '' || 
                        (inspectionType === 'ENTRANTE' && !approvedApplicants.some(a => a.name === tenantName)) || 
                        (inspectionType === 'RESTITUCION' && !activeTenants.some(c => c.tenantName === tenantName))
                      ) && (
                        <input
                          type="text"
                          value={tenantName}
                          onChange={(e) => setTenantName(e.target.value)}
                          placeholder="Nombre del Arrendatario..."
                          className="w-full bg-slate-50 border border-indigo-200 text-slate-800 text-xs px-3 py-2 rounded-lg mt-1 font-bold focus:border-indigo-500 placeholder-slate-400"
                          required
                        />
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Correo Arrendatario:
                      </label>
                      <input
                        type="email"
                        value={tenantEmail}
                        onChange={(e) => setTenantEmail(e.target.value)}
                        placeholder="arrendatario@correo.cl"
                        className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs px-3 py-2 rounded-lg"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Ejecutivo Responsable:
                      </label>
                      <input
                        type="text"
                        value={executiveName}
                        onChange={(e) => setExecutiveName(e.target.value)}
                        className="w-full bg-slate-200 border border-slate-300 text-slate-600 text-xs px-3 py-2 rounded-lg cursor-not-allowed"
                        readOnly
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        Fecha de Inspección:
                      </label>
                      <input
                        type="date"
                        value={inspectionDate}
                        onChange={(e) => setInspectionDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs px-3 py-2 rounded-lg"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Correo del Ejecutivo (copia):
                    </label>
                    <input
                      type="email"
                      value={executiveEmail}
                      onChange={(e) => setExecutiveEmail(e.target.value)}
                      placeholder="cristian.munoz@inmobiliariapro.cl"
                      className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs px-3 py-2 rounded-lg"
                    />
                  </div>

                  {/* Seed / Fast Fill Helper */}
                  <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 mt-2 flex justify-between items-center">
                    <div className="flex gap-2 items-center">
                      <Shield size={16} className="text-indigo-600" />
                      <div>
                        <span className="text-[11px] font-extrabold text-indigo-900 block uppercase">Carga Rápida de Inventario</span>
                        <span className="text-[9.5px] text-indigo-700 block">Pre-llena áreas comunes para ahorrar tiempo de escritura.</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleSeedDefaultItems}
                      className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-wider rounded-md"
                    >
                      Cargar Plantilla
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: ITEMS INVENTARIO */}
            {activeTab === 'ITEMS' && (
              <div className="flex flex-col gap-6">
                
                {/* Item Creation Board */}
                <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                  
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      1. Área / Ambiente:
                    </label>
                    <select
                      value={newItemArea}
                      onChange={(e) => {
                        const newArea = e.target.value;
                        setNewItemArea(newArea);
                        const available = AREA_ELEMENTS_MAP[newArea] || PRESET_ELEMENTS;
                        const defaultEl = available[0] || PRESET_ELEMENTS[0];
                        setNewItemElement(defaultEl);
                        const presets = OBSERVATION_PRESETS[defaultEl] || OBSERVATION_PRESETS['Otros'];
                        setNewItemObservation(presets[0] || '');
                      }}
                      className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none font-bold"
                    >
                      {PRESET_AREAS.map(a => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      2. Componente / Elemento:
                    </label>
                    <select
                      value={newItemElement}
                      onChange={(e) => {
                        setNewItemElement(e.target.value);
                        // Seed default observation from presets
                        const presets = OBSERVATION_PRESETS[e.target.value] || OBSERVATION_PRESETS['Otros'];
                        setNewItemObservation(presets[0]);
                      }}
                      className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none font-medium"
                    >
                      {(AREA_ELEMENTS_MAP[newItemArea] || PRESET_ELEMENTS).map(el => (
                        <option key={el} value={el}>{el}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      3. Diagnóstico / Estado:
                    </label>
                    <select
                      value={newItemState}
                      onChange={(e) => setNewItemState(e.target.value as any)}
                      className="w-full bg-white border border-slate-300 text-slate-800 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none"
                    >
                      <option value="EXCELENTE">Excelente</option>
                      <option value="BUENO">Bueno</option>
                      <option value="REGULAR">Regular</option>
                      <option value="MALO">Malo</option>
                    </select>
                  </div>

                  {/* DROP DOWN PRECISE OBSERVATIONS TO PREVENT INCONSISTENCY */}
                  <div className="flex flex-col gap-1 md:col-span-1">
                    <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1">
                      <span>4. Observación (Consistente):</span>
                    </label>
                    <select
                      value={newItemObservation}
                      onChange={(e) => setNewItemObservation(e.target.value)}
                      className="w-full bg-white border border-indigo-300 text-slate-800 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none font-bold"
                    >
                      <option value="">-- SELECCIONE OBSERVACIÓN --</option>
                      {(OBSERVATION_PRESETS[newItemElement] || OBSERVATION_PRESETS['Otros']).map((obs, idx) => (
                        <option key={idx} value={obs}>{obs}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-lg border border-indigo-700 transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus size={14} />
                    Agregar
                  </button>
                </div>

                {/* Items Added List */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="bg-slate-100 px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200">
                    Elementos en Acta ({items.length})
                  </div>
                  {items.length > 0 ? (
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                      {items.map((item, idx) => (
                        <div key={item.id} className="p-3.5 hover:bg-slate-50 flex items-center justify-between text-xs gap-4 transition-colors">
                          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-2">
                            <span className="font-extrabold text-[#143B57] uppercase font-mono tracking-wide">{item.area}</span>
                            <span className="font-medium text-slate-700">{item.element}</span>
                            <span className={`font-black uppercase tracking-wider text-[9px] w-max px-2 py-0.5 rounded-full ${
                              item.state === 'EXCELENTE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                              item.state === 'BUENO' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                              item.state === 'REGULAR' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                              'bg-rose-50 text-rose-700 border border-rose-100'
                            }`}>
                              {item.state}
                            </span>
                            <span className="text-slate-500 italic truncate" title={item.observation}>
                              {item.observation}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="p-1 hover:bg-rose-50 text-rose-500 rounded-md transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-400 italic">
                      No se han agregado elementos a la revisión física.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: FOTOS */}
            {activeTab === 'FOTOS' && (
              <div className="flex flex-col gap-6">
                
                {/* Drag and Drop Zone */}
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className="border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50 hover:bg-slate-100/50 p-8 rounded-lg text-center cursor-pointer transition-all"
                  onClick={() => document.getElementById('inspect-photo-upload')?.click()}
                >
                  <Camera size={36} className="text-slate-400 mx-auto mb-2 animate-pulse" />
                  <span className="text-xs font-black text-slate-700 uppercase tracking-widest block">
                    Arrastre sus fotos o haga click para buscar
                  </span>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Formatos JPG, PNG aceptados. Registro fotográfico inmutable de entrega/restitución.
                  </span>
                  <input
                    id="inspect-photo-upload"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </div>

                {/* Uploaded Photos Grid */}
                <div>
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                    Fotos cargadas ({uploadedPhotos.length})
                  </div>
                  {uploadedPhotos.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                      {uploadedPhotos.map((photo, idx) => (
                        <div key={idx} className="relative group aspect-square rounded-lg border border-slate-200 overflow-hidden bg-slate-100 shadow-2xs">
                          <img src={photo} alt={`Registro ${idx + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setUploadedPhotos(uploadedPhotos.filter((_, i) => i !== idx))}
                            className="absolute top-1 right-1 p-1 bg-slate-900/80 hover:bg-rose-600 text-white rounded-full transition-colors"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 text-slate-400 text-xs italic rounded-lg">
                      No hay fotografías cargadas para esta revisión.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: FIRMAS */}
            {activeTab === 'FIRMAS' && (
              <div className="flex flex-col gap-6">
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg flex items-center gap-2.5">
                  <FileSignature size={18} className="text-indigo-600" />
                  <div>
                    <span className="text-xs font-black text-slate-800 uppercase block">Firma de Conformidad Técnica</span>
                    <span className="text-[10px] text-slate-500 block">Indique los nombres que asumen la responsabilidad técnica de la firma digital de este Acta.</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex flex-col gap-3 border border-slate-200 p-4 rounded-xl bg-white shadow-xs">
                    <span className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                      Datos de Firma Digital del Arrendatario:
                    </span>
                    
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                        Nombre Completo:
                      </label>
                      <input
                        type="text"
                        value={sigTenant}
                        onChange={(e) => setSigTenant(e.target.value)}
                        placeholder="Nombre Completo para firmar"
                        className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs px-3 py-2 rounded-lg font-mono uppercase focus:bg-white"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                          RUN / RUT Arrendatario:
                        </label>
                        <input
                          type="text"
                          value={sigTenantRut}
                          onChange={(e) => setSigTenantRut(e.target.value)}
                          placeholder="12.345.678-9"
                          className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs px-3 py-2 rounded-lg font-mono uppercase focus:bg-white"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                          Nº Serie Cédula:
                        </label>
                        <input
                          type="text"
                          value={sigTenantDocNumber}
                          onChange={(e) => setSigTenantDocNumber(e.target.value)}
                          placeholder="A12345678"
                          className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs px-3 py-2 rounded-lg font-mono uppercase focus:bg-white"
                        />
                      </div>
                    </div>

                    <div className="h-20 bg-slate-50 border border-slate-200 flex items-center justify-center rounded-lg text-xs italic text-slate-400 font-serif shadow-2xs p-2">
                      {sigTenant ? (
                        <div className="text-center">
                          <span className="text-emerald-600 font-bold block">✓ Firmado Electrónicamente</span>
                          <span className="text-[10px] text-slate-500 block">RUN/RUT: {sigTenantRut || 'No Registrado'}</span>
                          <span className="text-[9px] text-slate-400 block font-mono">Serie: {sigTenantDocNumber || 'No Registrada'}</span>
                        </div>
                      ) : (
                        'Firma Pendiente (Se completará mediante Portal Secure)'
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      Firma del Ejecutivo Inmobiliario Responsable:
                    </label>
                    <input
                      type="text"
                      value={sigExecutive}
                      onChange={(e) => setSigExecutive(e.target.value)}
                      placeholder="Ingrese Nombre Completo para firmar"
                      className="w-full bg-slate-50 border border-slate-300 text-slate-800 text-xs px-3 py-2 rounded-lg font-mono uppercase"
                    />
                    <div className="h-24 bg-white border border-slate-200 flex items-center justify-center rounded-lg text-xs italic text-slate-400 font-serif shadow-2xs">
                      {sigExecutive ? `Firmado digitalmente por: ${sigExecutive.toUpperCase()}` : 'Firma Pendiente'}
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Modal Footer Actions */}
          <div className="bg-slate-50 p-4 border-t border-slate-200 flex justify-between items-center">
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIsFormOpen(false);
                  setSelectedInspection(null);
                  resetForm();
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              {selectedInspection && (
                <button
                  onClick={() => downloadPropertyInspectionAct(selectedInspection, companyLogo)}
                  className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-black uppercase tracking-wider rounded-lg border border-emerald-200 transition-all flex items-center gap-2 cursor-pointer"
                  title="Descargar Acta Completa en PDF"
                >
                  <Download size={14} className="text-emerald-600" />
                  Descargar PDF
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleSaveInspection('BORRADOR')}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-black uppercase tracking-wider rounded-lg border border-slate-900 transition-all cursor-pointer"
              >
                Grabar Borrador
              </button>
              <button
                onClick={() => handleSaveInspection('ACTA_ENVIADA')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-lg border border-indigo-700 transition-all cursor-pointer"
              >
                Grabar y Enviar Acta
              </button>
            </div>
          </div>

        </div>
      </div>
      )}

      {/* SIMULATED EMAIL MODAL */}
      {simulatedEmail?.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 font-sans animate-fade-in">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col">
            
            <div className="bg-slate-800 text-white p-4 flex justify-between items-center">
              <span className="text-xs font-bold font-mono tracking-widest uppercase">
                Simulador de Correo SMTP Certificado - AssetFlow S.A.
              </span>
              <button onClick={() => setSimulatedEmail(null)} className="text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="p-4 bg-slate-100 flex flex-col gap-2 border-b border-slate-200 text-xs text-slate-600">
              <div className="flex gap-2">
                <span className="font-bold w-12 text-slate-500 text-right">Para:</span>
                <span className="font-mono">{simulatedEmail.to}</span>
              </div>
              <div className="flex gap-2">
                <span className="font-bold w-12 text-slate-500 text-right">CC:</span>
                <span className="font-mono">{simulatedEmail.cc}</span>
              </div>
              <div className="flex gap-2 border-t border-slate-200/50 pt-2 font-bold text-slate-800">
                <span className="w-12 text-slate-500 text-right">Asunto:</span>
                <span>{simulatedEmail.subject}</span>
              </div>
            </div>

            <div className="p-6 flex-1 bg-white">
              <pre className="whitespace-pre-wrap font-sans text-xs text-slate-700 bg-slate-50 p-4 border border-slate-200 rounded-lg max-h-72 overflow-y-auto">
                {simulatedEmail.body}
              </pre>

              <div className="mt-4 p-4 bg-indigo-50 border border-indigo-100 rounded-lg flex gap-3">
                <Send size={18} className="text-indigo-600 shrink-0" />
                <div>
                  <span className="text-xs font-extrabold text-indigo-900 uppercase block">Simulación de Respuesta del Inquilino</span>
                  <p className="text-[10px] text-indigo-700 mt-1">
                    Como desarrolladores o analistas de control, simule aquí el reenvío de aceptación o rechazo firmado por el arrendatario.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between gap-3">
              <button
                onClick={() => setSimulatedEmail(null)}
                className="px-3.5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold uppercase rounded-lg"
              >
                Cerrar Simulador
              </button>
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleSimulateTenantResponse(false)}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 hover:border-rose-600 text-xs font-bold uppercase rounded-lg transition-all"
                >
                  Simular Rechazo (Re-inspeccionar)
                </button>
                <button
                  onClick={() => handleSimulateTenantResponse(true)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase rounded-lg shadow-sm transition-all"
                >
                  Simular Aceptación (Firma OK)
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default PropertyInspectionModule;
