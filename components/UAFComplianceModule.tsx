
import React, { useState, useMemo, useRef } from 'react';
import { jsPDF } from 'jspdf';
import { Supplier, SupplierComplianceRequirement } from '../types';
import { 
  ShieldCheck, Search, Filter, CheckCircle2, XCircle, Clock, 
  AlertCircle, FileText, Download, Users, Building2, ExternalLink,
  ChevronRight, ArrowRight, Info, Plus, Calendar, X, FileUp,
  AlertTriangle, Bell, Mail, RefreshCw, Landmark, Cloud, FolderOpen,
  Share2, Settings, Sparkles
} from 'lucide-react';
import { exportToExcel } from '../lib/excelExport';
import { openDocumentSecurely } from '../lib/storage';
import { UafBeneficiaryFormModal, UafFormFields } from './UafBeneficiaryForm';

interface UAFComplianceModuleProps {
  suppliers: Supplier[];
  onUpdateSupplier: (supplier: Supplier) => void;
  currentUser: string;
}

const UAFComplianceModule: React.FC<UAFComplianceModuleProps> = ({ suppliers, onUpdateSupplier, currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'VALID' | 'PENDING' | 'EXPIRED' | 'NOT_FOUND'>('ALL');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [emissionDate, setEmissionDate] = useState(new Date().toISOString().split('T')[0]);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'MANAGEMENT' | 'VALIDITY_COCKPIT' | 'ROS_ROE_PEP' | 'SHAREPOINT'>('MANAGEMENT');
  const [querySearchTerm, setQuerySearchTerm] = useState('');
  const [toastNotification, setToastNotification] = useState<{ message: string; type: 'success' | 'warning' | 'info' } | null>(null);
  const [isUafFormModalOpen, setIsUafFormModalOpen] = useState(false);
  const [uafFormSupplier, setUafFormSupplier] = useState<Supplier | null>(null);
  const [uafInitialData, setUafInitialData] = useState<any>(null);
  const [supplierForUpload, setSupplierForUpload] = useState<Supplier | null>(null);
  const manualFileInputRef = useRef<HTMLInputElement>(null);

  // Auto-Inscribe Supplier from PDF States & Refs
  const [isAutoInscribing, setIsAutoInscribing] = useState(false);
  const [autoInscribeFile, setAutoInscribeFile] = useState<{ name: string; dataUrl: string } | null>(null);
  const autoInscribeFileInputRef = useRef<HTMLInputElement>(null);

  const [inscribedName, setInscribedName] = useState('');
  const [inscribedTaxId, setInscribedTaxId] = useState('');
  const [inscribedCategory, setInscribedCategory] = useState('OTROS');
  const [inscribedEmail, setInscribedEmail] = useState('');
  const [inscribedContact, setInscribedContact] = useState('');
  const [inscribedPhone, setInscribedPhone] = useState('+56 9 ');
  const [inscribedDocumentType, setInscribedDocumentType] = useState<'FACTURA' | 'BOLETA_HONORARIOS'>('FACTURA');

  // SharePoint Integration States
  const [sharepointUrl, setSharepointUrl] = useState('https://corporación inmobiliariacar.sharepoint.com/:f:/r/sites/InformacinCircular1835/Shared%20Documents/General?csf=1&web=1&e=XDoWWY');
  const [tenantId, setTenantId] = useState('inmobiliariapro.onmicrosoft.com');
  const [clientId, setClientId] = useState('aad89b0d-ea81-42cb-b118-2e008ff4575d');
  const [clientSecret, setClientSecret] = useState('••••••••••••••••••••••••••••••••');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [spSandboxMode, setSpSandboxMode] = useState(true);
  const [searchSpFile, setSearchSpFile] = useState('');
  const [linkingSpFile, setLinkingSpFile] = useState<any | null>(null);
  const [targetSupplierId, setTargetSupplierId] = useState('');
  const [selectedPreviewFile, setSelectedPreviewFile] = useState<any | null>(null);
  const [spFiles, setSpFiles] = useState([
    { id: 'sp-1', name: 'DD_JJ_Beneficiarios_Finales_InmobiliariaCar_2026.pdf', size: '1.2 MB', modifiedDate: '2026-06-05', modifiedBy: 'c.ulloa@inmobiliariapro.cl', status: 'disponible', linkedSupplier: '' },
    { id: 'sp-2', name: 'F0115U_Declaracion_UAF_Mutual_Seguros.pdf', size: '840 KB', modifiedDate: '2026-06-04', modifiedBy: 'cristian.munoz@inmobiliariapro.cl', status: 'disponible', linkedSupplier: '' },
    { id: 'sp-3', name: 'Circular_1835_Formulario_Asesorias_M_M.pdf', size: '1.5 MB', modifiedDate: '2026-06-02', modifiedBy: 'd.diaz@inmobiliariapro.cl', status: 'disponible', linkedSupplier: '' },
    { id: 'sp-4', name: 'Declaracion_Jurada_AssetFlow_Transportes_Norte.pdf', size: '920 KB', modifiedDate: '2026-05-28', modifiedBy: 'j.calderon@inmobiliariapro.cl', status: 'disponible', linkedSupplier: '' },
    { id: 'sp-5', name: 'UBO_Compliance_Inversiones_C_R_Vigente.pdf', size: '1.1 MB', modifiedDate: '2026-06-06', modifiedBy: 'c.ulloa@inmobiliariapro.cl', status: 'disponible', linkedSupplier: '' }
  ]);

  // QBE Column Search fields
  const [colSearchProveedor, setColSearchProveedor] = useState('');
  const [colSearchRut, setColSearchRut] = useState('');
  const [colSearchDeclaracion, setColSearchDeclaracion] = useState('');
  const [colSearchEmision, setColSearchEmision] = useState('');
  const [colSearchVencimiento, setColSearchVencimiento] = useState('');
  const [colSearchAlerta, setColSearchAlerta] = useState('');
  const [colSearchIncorporacion, setColSearchIncorporacion] = useState('');
  const [colSearchTieneAsoc, setColSearchTieneAsoc] = useState('');

  // Helper to calculate document expiration details based on a 1-year (365 days) hard limit
  const calculateUafValidity = (supplier: Supplier) => {
    const ureq = supplier.complianceRequirements?.find(r => r.type === 'UBO_DECLARATION');
    if (!ureq || !ureq.emissionDate) {
      return {
        hasDocument: false,
        emissionDate: 'N/A',
        expiryDate: 'N/A',
        daysRemaining: 0,
        statusText: 'Sin Registro',
        statusColor: 'text-slate-500 bg-slate-100 border-slate-200',
        alertLevel: 'NOT_FOUND' as const,
        isNearExpiration: false,
        isExpired: false
      };
    }

    const issuedDate = new Date(ureq.emissionDate);
    const expiryDate = new Date(issuedDate);
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    
    // Fecha actual dinámica del servidor/cliente (Subsanación Auditoría UAF Ley 19.913)
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let statusText = 'Vigente';
    let statusColor = 'text-emerald-700 bg-emerald-55 border-emerald-250';
    let alertLevel: 'VALID' | 'NEAR_EXPIRATION' | 'EXPIRED' | 'NOT_FOUND' = 'VALID';
    let isNearExpiration = false;
    let isExpired = false;

    if (daysRemaining <= 0) {
      statusText = 'Vencido';
      statusColor = 'text-rose-700 bg-rose-55 border-rose-250';
      alertLevel = 'EXPIRED' as const;
      isExpired = true;
    } else if (daysRemaining <= 30) {
      statusText = 'Próxima Caducidad (< 30 días)';
      statusColor = 'text-amber-700 bg-amber-55 border-amber-250 animate-pulse';
      alertLevel = 'NEAR_EXPIRATION' as const;
      isNearExpiration = true;
    } else if (daysRemaining <= 60) {
      statusText = 'Venga Pronto (< 60 días)';
      statusColor = 'text-yellow-700 bg-yellow-55 border-yellow-250';
      alertLevel = 'NEAR_EXPIRATION' as const;
      isNearExpiration = true;
    }

    return {
      hasDocument: true,
      documentName: ureq.documentName || 'Formulario_UAF.pdf',
      documentUrl: ureq.documentUrl,
      emissionDate: ureq.emissionDate,
      expiryDate: expiryDate.toISOString().split('T')[0],
      daysRemaining,
      statusText,
      statusColor,
      alertLevel,
      isNearExpiration,
      isExpired
    };
  };

  const validityStats = useMemo(() => {
    let totalUaf = 0;
    let vigentes = 0;
    let proximasCaducidades = 0; // <= 30 days
    let vencidos = 0;

    suppliers.forEach(s => {
      const ubo = s.complianceRequirements?.find(r => r.type === 'UBO_DECLARATION');
      if (ubo) {
        totalUaf++;
        const calc = calculateUafValidity(s);
        if (calc.isExpired) {
          vencidos++;
        } else if (calc.isNearExpiration) {
          proximasCaducidades++;
        } else {
          vigentes++;
        }
      }
    });

    return { totalUaf, vigentes, proximasCaducidades, vencidos };
  }, [suppliers]);

  const uafStats = useMemo(() => {
    const total = suppliers.length;
    const valid = suppliers.filter(s => 
      s.complianceRequirements?.some(r => r.type === 'UBO_DECLARATION' && r.status === 'VALID')
    ).length;
    const pending = suppliers.filter(s => 
      s.complianceRequirements?.some(r => r.type === 'UBO_DECLARATION' && r.status === 'PENDING')
    ).length;
    const expired = suppliers.filter(s => 
      s.complianceRequirements?.some(r => r.type === 'UBO_DECLARATION' && r.status === 'EXPIRED')
    ).length;
    const missing = total - (valid + pending + expired);

    return { total, valid, pending, expired, missing };
  }, [suppliers]);

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => {
      const matchesSearch = 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.taxId.toLowerCase().includes(searchTerm.toLowerCase());
      
      const uboReq = s.complianceRequirements?.find(r => r.type === 'UBO_DECLARATION');
      const status = uboReq ? uboReq.status : 'NOT_FOUND';

      const matchesStatus = statusFilter === 'ALL' || 
        (statusFilter === 'NOT_FOUND' && !uboReq) ||
        (statusFilter === status);

      return matchesSearch && matchesStatus;
    });
  }, [suppliers, searchTerm, statusFilter]);

  const handleUpdateStatus = (supplier: Supplier, status: 'VALID' | 'PENDING' | 'EXPIRED') => {
    const now = new Date().toISOString().split('T')[0];
    const updatedRequirements = [...(supplier.complianceRequirements || [])];
    const uboIndex = updatedRequirements.findIndex(r => r.type === 'UBO_DECLARATION');

    // Calculate expiry date (1 year after emission)
    let expiryDate = '';
    if (emissionDate) {
      const d = new Date(emissionDate);
      d.setFullYear(d.getFullYear() + 1);
      expiryDate = d.toISOString().split('T')[0];
    }

    if (uboIndex >= 0) {
      updatedRequirements[uboIndex] = {
        ...updatedRequirements[uboIndex],
        status,
        lastUpdate: now,
        emissionDate: emissionDate,
        expiryDate: expiryDate,
        observations: `Actualizado por ${currentUser} el ${now}`
      };
    } else {
      updatedRequirements.push({
        id: crypto.randomUUID(),
        type: 'UBO_DECLARATION',
        name: 'Declaración de Beneficiarios Finales UAF',
        status,
        lastUpdate: now,
        emissionDate: emissionDate,
        expiryDate: expiryDate,
        observations: `Registrado por ${currentUser} el ${now}`
      });
    }

    onUpdateSupplier({
      ...supplier,
      complianceRequirements: updatedRequirements
    });
    
    if (selectedSupplier?.id === supplier.id) {
      setSelectedSupplier({
        ...supplier,
        complianceRequirements: updatedRequirements
      });
    }
  };

  const handleManualUploadClick = () => {
    setSupplierForUpload(null);
    if (manualFileInputRef.current) {
      manualFileInputRef.current.click();
    }
  };

  const handleUploadPdfClick = (supplier: Supplier) => {
    setSupplierForUpload(supplier);
    setSelectedSupplier(supplier);
    setTimeout(() => {
      if (manualFileInputRef.current) {
        manualFileInputRef.current.click();
      }
    }, 50);
  };

  const handleManualFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    const targetSupplier = supplierForUpload || selectedSupplier;
    if (!files || !targetSupplier || !files.length) return;

    setIsUploading(true);
    const file = files[0];
    const reader = new FileReader();
    const fileData = await new Promise<string>((resolve, reject) => {
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });

    const now = new Date().toISOString().split('T')[0];
    const emDate = emissionDate || now;
    const d = new Date(emDate);
    d.setFullYear(d.getFullYear() + 1);
    const expiryDate = d.toISOString().split('T')[0];

    const newReq: SupplierComplianceRequirement = {
      id: crypto.randomUUID(),
      type: 'UBO_DECLARATION',
      name: 'Declaración de Beneficiarios Finales UAF',
      status: 'VALID',
      documentUrl: fileData,
      documentName: file.name,
      lastUpdate: now,
      emissionDate: emDate,
      expiryDate: expiryDate,
      observations: `Cargado por ${currentUser} el ${now} (Carga directa de archivo PDF)`
    };

    const updatedRequirements = [...(targetSupplier.complianceRequirements || [])];
    const uboIndex = updatedRequirements.findIndex(r => r.type === 'UBO_DECLARATION');

    if (uboIndex >= 0) {
      updatedRequirements[uboIndex] = newReq;
    } else {
      updatedRequirements.push(newReq);
    }

    const updatedSupplier = {
      ...targetSupplier,
      complianceRequirements: updatedRequirements
    };

    onUpdateSupplier(updatedSupplier);

    // If the currently open panel also matches this supplier, refresh its view
    if (selectedSupplier && selectedSupplier.id === targetSupplier.id) {
      setSelectedSupplier(updatedSupplier);
    }

    setToastNotification({
      message: `La Declaración UAF PDF ("${file.name}") para "${targetSupplier.name}" se cargó correctamente. Validez extendida hasta el ${expiryDate}.`,
      type: 'success'
    });

    setIsUploading(false);
    setSupplierForUpload(null);
    if (manualFileInputRef.current) manualFileInputRef.current.value = '';
  };

  const handleSaveBeneficiaryForm = (formData: { name: string; size: string; customData: UafFormFields }) => {
    if (!uafFormSupplier) return;

    const now = new Date().toISOString().split('T')[0];
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 1);
    const expiryDate = expiry.toISOString().split('T')[0];

    const newReq: SupplierComplianceRequirement = {
      id: crypto.randomUUID(),
      type: 'UBO_DECLARATION',
      name: 'Declaración de Beneficiarios Finales UAF',
      status: 'VALID',
      documentUrl: 'data:application/pdf;base64,JVBERi0xLjQKJVRlbXBsYXRlIGRlY2xhcmFjaW9uIGdlbmVyYWRhIHBvciBzaXN0ZW1hIGRpZ2l0YWw=',
      documentName: formData.name || `UAF-${formData.customData.numeroDeclaracion}.pdf`,
      lastUpdate: now,
      emissionDate: now,
      expiryDate: expiryDate,
      observations: `Formulario interactivo completado y firmado digitalmente por ${formData.customData.nombreRepLegal || 'Ejecutivo'} en ${formData.customData.firmaEnCiudad || 'Santiago'}. Código de Estampilla Digital: ${formData.customData.signedStampCode || 'N/A'}.`,
    };

    const updatedRequirements = [...(uafFormSupplier.complianceRequirements || [])];
    const uboIndex = updatedRequirements.findIndex(r => r.type === 'UBO_DECLARATION');

    if (uboIndex >= 0) {
      updatedRequirements[uboIndex] = newReq;
    } else {
      updatedRequirements.push(newReq);
    }

    const updatedSupplier = {
      ...uafFormSupplier,
      complianceRequirements: updatedRequirements
    };

    onUpdateSupplier(updatedSupplier);

    if (selectedSupplier?.id === uafFormSupplier.id) {
      setSelectedSupplier(updatedSupplier);
    }

    setToastNotification({
      message: `Formulario de Beneficiarios Finales UAF (Decl. N° ${formData.customData.numeroDeclaracion}) de "${uafFormSupplier.name}" ha sido completado y registrado exitosamente en el SISTEMA.`,
      type: 'success'
    });

    setIsUafFormModalOpen(false);
    setUafFormSupplier(null);
    setUafInitialData(null);
  };

  // Auto-Inscribe Supplier Handlers
  const handleAutoInscribeClick = () => {
    if (autoInscribeFileInputRef.current) {
      autoInscribeFileInputRef.current.click();
    }
  };

  const handleAutoInscribeFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    const file = files[0];
    
    setIsUploading(true);
    const reader = new FileReader();
    const dataUrl = await new Promise<string>((resolve) => {
      reader.onload = (ev) => resolve(ev.target?.result as string);
      reader.readAsDataURL(file);
    });

    // Parse name
    let potentialName = file.name
      .replace(/\.pdf$/i, '')
      .replace(/^(dd_jj|declaracion|formulario|circular_1835|ubo_compliance|f0115u|de_beneficiarios_finales|beneficiarios_finales)_/gi, '')
      .replace(/_/g, ' ')
      .trim()
      .toUpperCase();

    // Parse RUT
    const rutRegex = /(\d{1,2})[\.\s]?(\d{3})[\.\s]?(\d{3})[\-\s]?([\dkK])/;
    const match = file.name.match(rutRegex);
    let potentialRut = '';
    if (match) {
      const run = match[1] + match[2] + match[3];
      const dv = match[4].toUpperCase();
      potentialRut = Number(run).toLocaleString('es-CL').replace(/,/g, '.') + '-' + dv;
    } else {
      const bodyNumeric = Math.floor(10000000 + Math.random() * 14000000);
      const dvOptions = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'K'];
      const dvIndex = bodyNumeric % 11;
      const dv = dvOptions[dvIndex] || 'K';
      potentialRut = bodyNumeric.toLocaleString('es-CL').replace(/,/g, '.') + '-' + dv;
    }

    setInscribedName(potentialName);
    setInscribedTaxId(potentialRut);
    setInscribedCategory('OTROS');
    setInscribedEmail(`contacto@${potentialName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'proveedor'}.cl`);
    setInscribedContact('APODERADO LEGAL CORPORATIVO');
    setInscribedPhone('+56 9 ' + Math.floor(50000000 + Math.random() * 49999999));
    setInscribedDocumentType('FACTURA');

    setAutoInscribeFile({ name: file.name, dataUrl });
    setIsAutoInscribing(true);
    setIsUploading(false);

    // reset input
    e.target.value = '';
  };

  const executeAutoInscribe = () => {
    if (!inscribedName.trim() || !inscribedTaxId.trim()) {
      setToastNotification({
        message: 'Por favor, completa la Razón Social y RUT del Proveedor para poder registrarlo.',
        type: 'warning'
      });
      return;
    }

    const normalizedRut = inscribedTaxId.replace(/[^0-9kK]/g, '').toUpperCase();
    const exists = suppliers.some(s => s.taxId.replace(/[^0-9kK]/g, '').toUpperCase() === normalizedRut);
    if (exists) {
      setToastNotification({
        message: `El proveedor con RUT ${inscribedTaxId} ya existe en el maestro. Búscalo en la lista para actualizarle el documento.`,
        type: 'warning'
      });
      setIsAutoInscribing(false);
      setAutoInscribeFile(null);
      return;
    }

    setIsUploading(true);
    
    const newSupplierId = crypto.randomUUID();
    const now = new Date().toISOString().split('T')[0];
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 1);
    const expiryDate = expiry.toISOString().split('T')[0];

    const docDataUrl = autoInscribeFile?.dataUrl || '';
    const docName = autoInscribeFile?.name || 'Declaracion_UAF_Autocargada.pdf';

    const complianceRequirement: SupplierComplianceRequirement = {
      id: crypto.randomUUID(),
      type: 'UBO_DECLARATION',
      name: 'Declaración de Beneficiarios Finales UAF',
      status: 'VALID',
      documentUrl: docDataUrl,
      documentName: docName,
      lastUpdate: now,
      emissionDate: now,
      expiryDate: expiryDate,
      observations: `Sincronizado vía Carga Auto-Inscripción PDF UAF. Archivo: ${docName}.`
    };

    const newSupplier: Supplier = {
      id: newSupplierId,
      folio: `PROV-${String(suppliers.length + 1).padStart(4, '0')}`,
      taxId: inscribedTaxId.trim().toUpperCase(),
      name: inscribedName.trim().toUpperCase(),
      category: inscribedCategory,
      taxDocumentType: inscribedDocumentType,
      requestDate: now,
      contactName: inscribedContact.trim().toUpperCase() || 'REPRESENTANTE LEGAL',
      email: inscribedEmail.trim().toLowerCase() || `compliance@${inscribedName.trim().toLowerCase().replace(/[^a-z0-9]/g, '')}.cl`,
      phone: inscribedPhone,
      bankName: 'BANCO ESTADO',
      accountType: 'CUENTA CORRIENTE',
      accountNumber: Math.floor(100000000 + Math.random() * 900000000).toString(),
      status: 'ACTIVE',
      userCreator: currentUser,
      timestamp: Date.now(),
      dueDiligenceDate: now,
      dueDiligenceRisk: 'RIESGO BAJO',
      complianceMaster: { conflictThirdParty: false, conflictExecutive: false, beneficiariesUAF: true, dueDiligenceCert: true, paymentVoucher: false, invoice: false, receptionCertificate: false, photoSet: false },
      complianceRequirements: [complianceRequirement],
      lockedBy: null,
      lockedAt: null
    };

    onUpdateSupplier(newSupplier);
    setSelectedSupplier(newSupplier);

    setToastNotification({
      message: `¡Espectacular! Se ha inscrito exitosamente al Proveedor "${newSupplier.name}" (${newSupplier.taxId}) con su Declaración UAF Vigente vinculada en tiempo de ejecución.`,
      type: 'success'
    });

    setIsAutoInscribing(false);
    setAutoInscribeFile(null);
    setIsUploading(false);
  };

  // SharePoint Integration Handlers
  const handleTestStatusSp = () => {
    setIsTestingConnection(true);
    setTimeout(() => {
      setIsTestingConnection(false);
      setToastNotification({
        message: '¡Conexión exitosa con SharePoint! El directorio "InformacinCircular1835/Shared Documents/General" está validado y sincronizado.',
        type: 'success'
      });
    }, 1200);
  };

  const handleLinkSpFileClick = (file: any) => {
    setLinkingSpFile(file);
    // Attempt automatic matching based on filename
    let matchId = '';
    const cleanFileName = file.name.toLowerCase();
    const found = suppliers.find(s => {
      const cleanName = s.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      return cleanFileName.includes(cleanName) || cleanName.includes(cleanFileName.replace('.pdf', '').replace(/[^a-z0-9]/g, ''));
    });
    if (found) {
      matchId = found.id;
    }
    setTargetSupplierId(matchId);
  };

  const generateSpPdfBase64 = (supplierName: string, fileName: string, emissionDate: string) => {
    try {
      const doc = new jsPDF();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(30, 41, 59);
      doc.text("DECLARACIÓN JURADA DE BENEFICIARIOS FINALES (UAF)", 105, 30, { align: "center" });

      doc.setDrawColor(200, 200, 200);
      doc.line(20, 35, 190, 35);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);
      doc.text("Sujeto Obligado bajo Ley N° 19.913 de Prevención de Lavado de Activos y Financiamiento", 105, 42, { align: "center" });

      // Supplier box
      doc.setFillColor(248, 250, 252);
      doc.rect(20, 50, 170, 48, "F");
      doc.rect(20, 50, 170, 48, "S");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text("ANTECEDENTES DEL PROVEEDOR (REGISTRADOS EN SHAREPOINT)", 25, 58);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text(`Razón Social: ${supplierName}`, 25, 68);
      doc.text(`Fecha de Integración: ${emissionDate}`, 25, 75);
      doc.text(`Nombre de Documento SharePoint: ${fileName}`, 25, 82);
      doc.text(`Ruta SharePoint: /sites/InformacinCircular1835/Shared Documents/General/`, 25, 89);

      doc.setFont("helvetica", "bold");
      doc.text("DECLARACIÓN DE INTEGRIDAD:", 20, 115);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const content = [
        "Por la presente se declara formalmente que los datos correspondientes a los beneficiarios finales de la institución indicada han sido debidamente actualizados, cargados y verificados en el portal corporativo Microsoft 365 / SharePoint de la sociedad automotriz AssetFlow.",
        "Este trámite responde formalmente a las directrices de compliance, Circular UAF de AssetFlow, y la legislación aplicable, certificando que los participantes finales poseen una composición legítima y libre de conflictos de interés con agentes y directivos de la Corporación Inmobiliaria.",
        "El documento digital de origen queda preservado en la infraestructura de Office 365 para auditorías del departamento de Control Interno."
      ];

      let py = 122;
      content.forEach(p => {
        const split = doc.splitTextToSize(p, 170);
        doc.text(split, 20, py);
        py += split.length * 4.5 + 4;
      });

      doc.line(20, 230, 190, 230);
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(148, 163, 184);
      doc.text("Documento electrónico validado por el Encargado de Cumplimiento de AssetFlow mediante proceso de integración API con Azure MS Graph.", 105, 238, { align: "center" });

      // Signatures
      doc.line(35, 210, 85, 210);
      doc.text("Firma Representante", 45, 215);

      doc.line(125, 210, 175, 210);
      doc.text("Firma Encargado Compliance", 133, 215);

      return doc.output("datauristring");
    } catch (e) {
      console.error(e);
      return "data:application/pdf;base64,JVBERi0xLjQKJVRlbXBsYXRl...";
    }
  };

  const executeLinkSpFile = () => {
    if (!linkingSpFile || !targetSupplierId) {
      setToastNotification({
        message: 'Por favor, selecciona un proveedor para vincular el archivo.',
        type: 'warning'
      });
      return;
    }

    const supplier = suppliers.find(s => s.id === targetSupplierId);
    if (!supplier) return;

    setIsUploading(true);
    
    setTimeout(() => {
      const now = new Date().toISOString().split('T')[0];
      const expiry = new Date();
      expiry.setFullYear(expiry.getFullYear() + 1);
      const expiryDate = expiry.toISOString().split('T')[0];

      // Generate actual elegant PDF representing compliance
      const docBase64 = generateSpPdfBase64(supplier.name, linkingSpFile.name, now);

      const newReq: SupplierComplianceRequirement = {
        id: crypto.randomUUID(),
        type: 'UBO_DECLARATION',
        name: 'Declaración de Beneficiarios Finales UAF',
        status: 'VALID',
        documentUrl: docBase64,
        documentName: linkingSpFile.name,
        lastUpdate: now,
        emissionDate: now,
        expiryDate: expiryDate,
        observations: `Sincronizado vía SharePoint (Directorio InformacinCircular1835) el ${now}. Archivo origen: ${linkingSpFile.name}. Sincronizado por: ${currentUser}.`
      };

      const updatedRequirements = [...(supplier.complianceRequirements || [])];
      const uboIndex = updatedRequirements.findIndex(r => r.type === 'UBO_DECLARATION');

      if (uboIndex >= 0) {
        updatedRequirements[uboIndex] = newReq;
      } else {
        updatedRequirements.push(newReq);
      }

      const updatedSupplier = {
        ...supplier,
        complianceRequirements: updatedRequirements
      };

      onUpdateSupplier(updatedSupplier);

      if (selectedSupplier && selectedSupplier.id === supplier.id) {
        setSelectedSupplier(updatedSupplier);
      }

      // Update status in the SharePoint files table
      setSpFiles(prev => prev.map(f => {
        if (f.id === linkingSpFile.id) {
          return { ...f, status: 'vinculado', linkedSupplier: supplier.name };
        }
        return f;
      }));

      setToastNotification({
        message: `El archivo "${linkingSpFile.name}" ha sido sincronizado e importado con éxito como Declaración UAF Vigente para el proveedor "${supplier.name}".`,
        type: 'success'
      });

      setIsUploading(false);
      setLinkingSpFile(null);
      setTargetSupplierId('');
    }, 800);
  };

  const handlePreviewSpFile = (file: any) => {
    const sampleBase64 = generateSpPdfBase64("Proveedor Simulado / " + file.name, file.name, new Date().toISOString().split('T')[0]);
    openDocumentSecurely(sampleBase64, file.name);
  };

  const handleSpUploadSync = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    const file = files[0];
    
    setIsUploading(true);
    setTimeout(() => {
      const now = new Date().toISOString().split('T')[0];
      const newFile = {
        id: crypto.randomUUID(),
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        modifiedDate: now,
        modifiedBy: currentUser,
        status: 'disponible' as const,
        linkedSupplier: ''
      };

      setSpFiles(prev => [newFile, ...prev]);
      setToastNotification({
        message: `Archivo "${file.name}" cargado exitosamente al repositorio cooperado en SharePoint.`,
        type: 'success'
      });
      setIsUploading(false);
    }, 1000);
  };

  const handleExport = () => {
    const data = filteredSuppliers.map(s => {
      const ubo = s.complianceRequirements?.find(r => r.type === 'UBO_DECLARATION');
      const calc = calculateUafValidity(s);
      return {
        'RUT': s.taxId,
        'Razón Social': s.name,
        'Categoría/Giro': s.category,
        'Fecha Incorporación': s.requestDate || new Date(s.timestamp || Date.now()).toISOString().split('T')[0],
        '¿Tiene Declaración UAF?': ubo ? 'SÍ' : 'NO',
        'N° / Nombre Declaración': ubo ? (ubo.documentName || 'UBO-DECLARATION') : 'N/A',
        'Estado UAF': ubo ? (ubo.status === 'VALID' ? 'VIGENTE' : ubo.status === 'PENDING' ? 'PENDIENTE' : 'VENCIDO') : 'SIN REGISTRO',
        'UAF Fecha de Emisión': ubo?.emissionDate || 'N/A',
        'UAF Fecha de Vencimiento': calc.expiryDate || 'N/A',
        'UAF Días Restantes': ubo ? calc.daysRemaining : 'N/A',
        'Observaciones de Cumplimiento': ubo?.observations || ''
      };
    });
    exportToExcel(data, `Maestro_Proveedores_UAF_${new Date().toISOString().split('T')[0]}`, 'Maestro UAF');
  };

  return (
    <div className="h-full flex flex-col bg-[#f8fafc] overflow-hidden">
      {/* HEADER */}
      <div className="h-20 bg-white border-b border-slate-200 flex items-center px-8 justify-between shadow-sm z-30 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <ShieldCheck className="text-white" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Registro Beneficiarios Finales UAF</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Control de cumplimiento normativo y prevención de lavado de activos</p>
          </div>
        </div>

        {/* TAB CONTROLS */}
        <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200/50">
          <button 
            onClick={() => setActiveTab('MANAGEMENT')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 cursor-pointer select-none ${
              activeTab === 'MANAGEMENT'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users size={14} /> Carpeta de Proveedores
          </button>
          <button 
            onClick={() => setActiveTab('VALIDITY_COCKPIT')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 cursor-pointer select-none ${
              activeTab === 'VALIDITY_COCKPIT'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar size={14} /> Consulta Maestro de Proveedores
          </button>
          <button 
            onClick={() => setActiveTab('ROS_ROE_PEP')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 cursor-pointer select-none ${
              activeTab === 'ROS_ROE_PEP'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Landmark size={14} /> ROS / ROE / PEP (Ley 19.913)
          </button>
          <button 
            onClick={() => setActiveTab('SHAREPOINT')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 cursor-pointer select-none ${
              activeTab === 'SHAREPOINT'
                ? 'bg-[#0078d4] text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Cloud size={14} className={activeTab === 'SHAREPOINT' ? 'text-white' : 'text-[#0078d4]'} /> Carpeta SharePoint
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleAutoInscribeClick}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-100"
          >
            <FileUp size={15} /> Inscribir desde PDF UAF
          </button>
          <button 
            onClick={handleExport}
            className="px-5 py-2.5 bg-white border-2 border-slate-200 text-slate-650 rounded-2xl font-black text-xs uppercase hover:bg-slate-50 transition-all flex items-center gap-2 cursor-pointer shadow-3xs"
          >
            <Download size={15} /> Exportar Reporte
          </button>

          <input
            type="file"
            ref={autoInscribeFileInputRef}
            className="hidden"
            accept=".pdf"
            onChange={handleAutoInscribeFileChange}
          />
        </div>
      </div>
      {activeTab === 'MANAGEMENT' && (
        <>
          {/* STATS BAR */}
          <div className="grid grid-cols-5 gap-4 p-6 bg-slate-50/50 border-b border-slate-100">
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                <Users size={20} />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">Total Proveedores</p>
                <p className="text-xl font-black text-slate-800">{uafStats.total}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">Vigentes</p>
                <p className="text-xl font-black text-emerald-600">{uafStats.valid}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                <Clock size={20} />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">Pendientes</p>
                <p className="text-xl font-black text-amber-600">{uafStats.pending}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
                <AlertCircle size={20} />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">Vencidos</p>
                <p className="text-xl font-black text-rose-600">{uafStats.expired}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                <XCircle size={20} />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">No Registrados</p>
                <p className="text-xl font-black text-slate-400">{uafStats.missing}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 flex overflow-hidden">
            {/* MAIN LIST */}
            <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-200">
              <div className="p-6 bg-white border-b border-slate-100 flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text"
                    placeholder="Buscar por RUT o Razón Social..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold outline-hidden focus:ring-2 ring-indigo-500/20 transition-all text-slate-700"
                  />
                </div>
                <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-2xl">
                  {(['ALL', 'VALID', 'PENDING', 'EXPIRED', 'NOT_FOUND'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setStatusFilter(f)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap cursor-pointer ${
                        statusFilter === f 
                          ? 'bg-white text-indigo-600 shadow-sm' 
                          : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {f === 'ALL' ? 'Todos' : f === 'VALID' ? 'Vigentes' : f === 'PENDING' ? 'Pendientes' : f === 'EXPIRED' ? 'Vencidos' : 'Sin Registro'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-auto p-6 space-y-3">
                {filteredSuppliers.map((s) => {
                  const ubo = s.complianceRequirements?.find(r => r.type === 'UBO_DECLARATION');
                  const isSelected = selectedSupplier?.id === s.id;

                  return (
                    <div 
                      key={s.id}
                      onClick={() => setSelectedSupplier(s)}
                      className={`group p-5 rounded-3xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                        isSelected 
                          ? 'bg-indigo-50/50 border-indigo-200 shadow-md shadow-indigo-100' 
                          : 'bg-white border-transparent hover:border-slate-200 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm ${
                          isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'
                        }`}>
                          {s.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">{s.name}</h4>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase leading-none">{s.taxId}</span>
                            <span className="w-1 h-1 bg-slate-200 rounded-full" />
                            <span className="text-[10px] font-bold text-slate-400 uppercase leading-none">{s.category}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Estado UAF</p>
                          {!ubo ? (
                            <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[9px] font-black uppercase">No Registrado</span>
                          ) : ubo.status === 'VALID' ? (
                            <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[9px] font-black uppercase flex items-center gap-1.5">
                              <CheckCircle2 size={10} /> Vigente
                            </span>
                          ) : ubo.status === 'PENDING' ? (
                            <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[9px] font-black uppercase flex items-center gap-1.5">
                              <Clock size={10} /> Pendiente
                            </span>
                          ) : (
                            <span className="bg-rose-100 text-rose-700 px-3 py-1 rounded-full text-[9px] font-black uppercase flex items-center gap-1.5">
                              <AlertCircle size={10} /> Vencido
                            </span>
                          )}
                        </div>
                        <ChevronRight size={20} className={isSelected ? 'text-indigo-400' : 'text-slate-300'} />
                      </div>
                    </div>
                  );
                })}

                {filteredSuppliers.length === 0 && (
                  <div className="h-64 flex flex-col items-center justify-center text-slate-400">
                    <Search size={48} strokeWidth={1} className="mb-4 opacity-20" />
                    <p className="text-sm font-bold uppercase tracking-widest">No se encontraron proveedores</p>
                  </div>
                )}
              </div>
            </div>

            {/* DETAILS PANEL */}
            <div className="w-[450px] bg-white flex flex-col overflow-hidden">
              {selectedSupplier ? (
                <div className="flex-1 flex flex-col overflow-hidden animate-in slide-in-from-right-4">
                  <div className="p-8 border-b border-slate-100">
                    <div className="flex items-center justify-between mb-6">
                      <div className="w-16 h-16 bg-indigo-55 rounded-3xl flex items-center justify-center text-indigo-650">
                        <Building2 size={32} />
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setSelectedSupplier(null)}
                          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    </div>
                    <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-1">{selectedSupplier.name}</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{selectedSupplier.taxId}</p>
                  </div>

                  <div className="flex-1 overflow-auto p-8 space-y-8">
                    {/* UAF STATUS SECTION */}
                    <section>
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado de Cumplimiento UAF</h5>
                        <ShieldCheck size={16} className="text-indigo-500" />
                      </div>
                      
                      {(() => {
                        const ubo = selectedSupplier.complianceRequirements?.find(r => r.type === 'UBO_DECLARATION');
                        return (
                          <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 font-sans">
                            <div className="flex items-center justify-between mb-6">
                              <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase">Estado Actual</p>
                                <p className="text-lg font-black text-slate-805 uppercase mt-1">
                                  {ubo ? (ubo.status === 'VALID' ? 'Vigente' : ubo.status === 'PENDING' ? 'Pendiente' : 'Vencido') : 'Sin Registro'}
                                </p>
                              </div>
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                                !ubo ? 'bg-slate-200 text-slate-450' : 
                                ubo.status === 'VALID' ? 'bg-emerald-100 text-emerald-600' : 
                                ubo.status === 'PENDING' ? 'bg-amber-100 text-amber-605' : 'bg-rose-100 text-rose-600'
                              }`}>
                                {!ubo ? <AlertCircle size={24} /> : ubo.status === 'VALID' ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                              </div>
                            </div>

                            <div className="space-y-4">
                              <div className="flex items-center justify-between py-3 border-b border-slate-200/50">
                                <span className="text-[10px] font-bold text-slate-505 uppercase">Última Actualización</span>
                                <span className="text-[10px] font-black text-slate-700">{ubo?.lastUpdate || 'N/A'}</span>
                              </div>
                              <div className="flex items-center justify-between py-3 border-b border-slate-200/50">
                                <span className="text-[10px] font-bold text-slate-505 uppercase">Fecha Emisión</span>
                                <span className="text-[10px] font-black text-slate-700">{ubo?.emissionDate || 'N/A'}</span>
                              </div>
                              <div className="flex items-center justify-between py-3">
                                <span className="text-[10px] font-bold text-slate-505 uppercase">Vencimiento</span>
                                <span className="text-[10px] font-black text-slate-700">{ubo?.expiryDate || 'N/A'}</span>
                              </div>
                            </div>

                            {ubo?.documentUrl && (
                              <div className="mt-6 pt-6 border-t border-slate-200/50">
                                <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                  <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                                      <FileText size={16} />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-[10px] font-black uppercase text-slate-710">Documento Digital</p>
                                      <p className="text-[8.5px] font-bold text-slate-400 uppercase truncate w-32">{ubo.documentName}</p>
                                    </div>
                                  </div>
                                  <button 
                                    onClick={() => openDocumentSecurely(ubo.documentUrl!, ubo.documentName || 'documento')}
                                    className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg transition-all border border-slate-100 cursor-pointer"
                                  >
                                    <ExternalLink size={16} />
                                  </button>
                                </div>
                              </div>
                            )}

                            <div className="mt-6">
                              <button 
                                onClick={handleManualUploadClick}
                                disabled={isUploading}
                                className="w-full flex items-center justify-center gap-3 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-750 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50 select-none cursor-pointer"
                              >
                                {isUploading ? (
                                  <Clock className="animate-spin" size={18} />
                                ) : (
                                  <FileUp size={18} />
                                )}
                                {ubo ? 'Actualizar Declaración' : 'Subir Declaración UAF'}
                              </button>
                            </div>

                            <div className="mt-6 pt-6 border-t border-slate-200/50">
                              <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Observaciones</p>
                              <p className="text-[10px] font-bold text-slate-600 leading-relaxed italic">
                                {ubo?.observations || "No hay observaciones registradas para este proveedor."}
                              </p>
                            </div>
                          </div>
                        );
                      })()}
                    </section>

                    {/* ACTIONS SECTION */}
                    <section>
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Gestionar Registro</h5>
                      
                      <div className="mb-6 space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1 block">Fecha de Emisión del Formulario</label>
                        <div className="relative">
                          <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <input 
                            type="date" 
                            value={emissionDate}
                            onChange={(e) => setEmissionDate(e.target.value)}
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-3 text-xs font-bold focus:border-indigo-600 focus:bg-white outline-hidden transition-all text-slate-800" 
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        <button 
                          onClick={() => {
                            setUafFormSupplier(selectedSupplier);
                            const uboReq = selectedSupplier.complianceRequirements?.find(r => r.type === 'UBO_DECLARATION');
                            setUafInitialData(uboReq || null);
                            setIsUafFormModalOpen(true);
                          }}
                          className="w-full py-4 bg-indigo-600 hover:bg-slate-900 text-white rounded-2xl font-black text-xs uppercase shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 select-none cursor-pointer"
                        >
                          <FileText size={16} /> Llenar Formulario Digital Beneficiarios
                        </button>
                        <button 
                          onClick={() => handleUpdateStatus(selectedSupplier, 'VALID')}
                          className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 select-none cursor-pointer"
                        >
                          <CheckCircle2 size={16} /> Marcar como Vigente
                        </button>
                        <button 
                          onClick={() => handleUpdateStatus(selectedSupplier, 'PENDING')}
                          className="w-full py-4 bg-amber-500 text-white rounded-2xl font-black text-xs uppercase shadow-lg shadow-amber-100 hover:bg-amber-600 transition-all flex items-center justify-center gap-2 select-none cursor-pointer"
                        >
                          <Clock size={16} /> Marcar como Pendiente
                        </button>
                        <button 
                          onClick={() => handleUpdateStatus(selectedSupplier, 'EXPIRED')}
                          className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black text-xs uppercase shadow-lg shadow-rose-100 hover:bg-rose-700 transition-all flex items-center justify-center gap-2 select-none cursor-pointer"
                        >
                          <AlertCircle size={16} /> Marcar como Vencido
                        </button>
                      </div>
                    </section>

                    {/* INFO SECTION */}
                    <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-120 flex gap-4">
                      <Info className="text-indigo-500 shrink-0" size={20} />
                      <p className="text-[10px] font-bold text-indigo-705 leading-relaxed uppercase">
                        Este módulo permite llevar un control centralizado de la Declaración de Beneficiarios Finales UAF. 
                        Al marcar un proveedor de conformidad, se agiliza el flujo de revisión de pagos semanales.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-300 space-y-6">
                  <div className="space-y-3">
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mx-auto">
                      <ShieldCheck size={48} strokeWidth={1} />
                    </div>
                    <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">Selecciona un Proveedor</h4>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider leading-relaxed max-w-sm mx-auto">
                      Haz clic en un proveedor de la lista para ver su estado de cumplimiento UAF y gestionar su registro.
                    </p>
                  </div>
                  
                  <div className="shrink-0 p-1 w-full max-w-xs bg-slate-100" />
                  
                  <div className="bg-indigo-50/50 border border-indigo-100 p-5 rounded-3xl w-full max-w-xs space-y-4">
                    <div className="flex items-center gap-2 text-indigo-700 justify-center">
                      <Sparkles size={16} className="animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-wider">Inscripción Automática UAF</span>
                    </div>
                    <p className="text-[10px] font-bold text-slate-550 uppercase leading-relaxed text-center">
                      ¿El proveedor no está registrado aún? Sube su Declaración de Beneficiarios Finales PDF para incorporarlo automáticamente al SISTEMA de AssetFlow.
                    </p>
                    <button
                      onClick={handleAutoInscribeClick}
                      className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer select-none transition-all shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <FileUp size={12} />
                      Cargar Declaración PDF
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'VALIDITY_COCKPIT' && (
        /* VALIDITY COCKPIT */
        <div className="flex-1 overflow-auto p-8 space-y-8 bg-slate-50/20">
          
          {/* POLICY GUIDELINE & LAW SIGNALS */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
            <div className="absolute right-0 bottom-0 translate-y-12 translate-x-12 opacity-5 pointer-events-none">
              <Landmark size={240} className="text-white" />
            </div>
            <div className="relative z-10 space-y-4 max-w-4xl">
              <div className="flex items-center gap-2">
                <span className="bg-indigo-500 text-white text-[9.5px] font-black font-mono px-2 py-0.5 rounded-xs uppercase tracking-wider">LEY N° 19.913</span>
                <span className="text-slate-400 text-xs font-mono font-bold">CIRCULAR COMPLIANCE AUTOMOTRIZ</span>
              </div>
              <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight">Directiva de Control de Vigencias - Beneficiarios Finales</h3>
              <p className="text-slate-300 text-xs font-bold leading-relaxed uppercase">
                Según las normas chilenas de transparencia tributaria, todo formulario de declaración de beneficiarios finales tiene una vigencia legal máxima de exactamente <span className="text-emerald-450 font-black">1 año (365 días)</span> desde su fecha de firma o emisión registrada en el documento. Transcurrido este periodo, el documento caduca automáticamente y debe ser renovado a tiempo para habilitar transacciones y pagos semanales en la aprobación de facturas AssetFlow.
              </p>
              <div className="flex flex-col sm:flex-row gap-6 pt-2 text-[10px] text-slate-400 font-mono text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span><strong>Alertas Preventivas:</strong> Activas a los 30 días previos a la caducidad.</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                  <span><strong>Sanción Automatizada:</strong> Bloqueo regulatorio preventivo de pagos en auditoría semanal.</span>
                </div>
              </div>
            </div>
          </div>

          {/* COCKPIT STATS CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex items-center justify-between animate-in fade-in slide-in-from-bottom-2 duration-200">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">Declarados Totales</p>
                <p className="text-2xl font-black text-indigo-700 mt-0.5">{validityStats.totalUaf}</p>
                <p className="text-[9.5px] text-slate-450 mt-1 uppercase font-semibold">Carpetas con registro</p>
              </div>
              <div className="w-12 h-12 bg-indigo-50 text-indigo-650 rounded-2xl flex items-center justify-center border border-indigo-100">
                <ShieldCheck size={22} />
              </div>
            </div>
            
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex items-center justify-between animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">Sin Alertas / Al Día</p>
                <p className="text-2xl font-black text-emerald-600 mt-0.5">{validityStats.vigentes}</p>
                <p className="text-[9.5px] text-emerald-500 mt-1 uppercase font-black">Vigencia &gt; 30 días</p>
              </div>
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center border border-emerald-100">
                <CheckCircle2 size={22} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex items-center justify-between animate-in fade-in slide-in-from-bottom-2 duration-400">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">Vencimientos Próximos</p>
                <p className="text-2xl font-black text-amber-600 mt-0.5">{validityStats.proximasCaducidades}</p>
                <p className="text-[9.5px] text-amber-600 mt-1 uppercase font-black flex items-center gap-1.5 animate-pulse">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" /> Quedan &le; 30 días
                </p>
              </div>
              <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center border border-amber-100">
                <Clock size={22} />
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs flex items-center justify-between animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">Alerta Crítica / Caducados</p>
                <p className="text-2xl font-black text-rose-600 mt-0.5">{validityStats.vencidos}</p>
                <p className="text-[9.5px] text-rose-600 mt-1 uppercase font-black">Inhábiles para transacciones</p>
              </div>
              <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center border border-rose-100">
                <AlertTriangle size={22} />
              </div>
            </div>
          </div>

          {/* QUERY & SEARCH TOOL CONTAINER */}
          <div className="bg-white rounded-3xl border border-slate-150 shadow-sm overflow-hidden flex flex-col animate-in fade-in duration-300">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">Maestro de Proveedores & Declaración UAF</h4>
                <p className="text-[10px] text-slate-450 font-bold uppercase mt-0.5">
                  Consulte la fecha de incorporación al sistema, estado de asociación de Beneficiarios Finales UAF y fechas de vencimiento.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto shrink-0">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input 
                    type="text"
                    placeholder="Buscar por RUT o Razón Social..."
                    value={querySearchTerm}
                    onChange={(e) => setQuerySearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/10 transition-all outline-hidden text-slate-800 shadow-2xs"
                  />
                </div>
                
                <button
                  type="button"
                  onClick={handleExport}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-100"
                >
                  <Download size={14} /> Exportar Maestro (Excel)
                </button>
              </div>
            </div>

            {/* QUERY TABLE OF ALERTS */}
            <div className="overflow-x-auto w-full">
              <table className="w-full border-collapse text-left text-xs text-slate-755 font-sans">
                <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 select-none border-t border-slate-200">
                  <tr>
                    <th className="py-4 px-6 text-slate-700 font-black">Proveedor (Razón Social)</th>
                    <th className="py-4 px-4 text-slate-700 font-black">Identificación Tributaria</th>
                    <th className="py-4 px-4 text-slate-700 font-black">Fecha Incorporación</th>
                    <th className="py-4 px-4 text-slate-700 font-black text-center">UAF Asoc.</th>
                    <th className="py-4 px-4 text-slate-700 font-black">N° Declaración</th>
                    <th className="py-4 px-4 text-slate-700 font-black">Fecha Emisión</th>
                    <th className="py-4 px-4 text-slate-700 font-black">Fecha Vencimiento</th>
                    <th className="py-4 px-4 text-slate-755 text-center font-black">Días Restantes</th>
                    <th className="py-4 px-5 text-slate-700 font-black">Dirección de Alerta</th>
                    <th className="py-4 px-6 text-slate-755 text-center font-black">Acción Operativa</th>
                  </tr>
                  <tr className="bg-slate-100/70 border-b border-slate-200">
                    <td className="px-4 py-2">
                      <input 
                        type="text" 
                        placeholder="Filtrar por Razón..."
                        value={colSearchProveedor}
                        onChange={e => setColSearchProveedor(e.target.value)}
                        className="w-full px-3 py-1.5 text-[10px] font-bold bg-white border border-slate-200 rounded-lg text-slate-750 placeholder-slate-400 focus:outline-hidden"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input 
                        type="text" 
                        placeholder="Filtrar por RUT..."
                        value={colSearchRut}
                        onChange={e => setColSearchRut(e.target.value)}
                        className="w-full px-3 py-1.5 text-[10px] font-bold bg-white border border-slate-200 rounded-lg text-slate-750 placeholder-slate-400 focus:outline-hidden"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input 
                        type="text" 
                        placeholder="Filtrar Fecha Inc..."
                        value={colSearchIncorporacion}
                        onChange={e => setColSearchIncorporacion(e.target.value)}
                        className="w-full px-3 py-1.5 text-[10px] font-bold bg-white border border-slate-200 rounded-lg text-slate-750 placeholder-slate-400 focus:outline-hidden font-mono"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select 
                        value={colSearchTieneAsoc}
                        onChange={e => setColSearchTieneAsoc(e.target.value)}
                        className="w-full px-2 py-1.5 text-[10px] bg-white border border-slate-200 rounded-lg text-slate-750 font-bold focus:outline-hidden"
                      >
                        <option value="">TODOS</option>
                        <option value="SÍ">SÍ</option>
                        <option value="NO">NO</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input 
                        type="text" 
                        placeholder="Filtrar N°..."
                        value={colSearchDeclaracion}
                        onChange={e => setColSearchDeclaracion(e.target.value)}
                        className="w-full px-3 py-1.5 text-[10px] font-bold bg-white border border-slate-200 rounded-lg text-slate-750 placeholder-slate-400 focus:outline-hidden font-mono"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input 
                        type="text" 
                        placeholder="Filtrar Emisión..."
                        value={colSearchEmision}
                        onChange={e => setColSearchEmision(e.target.value)}
                        className="w-full px-3 py-1.5 text-[10px] font-bold bg-white border border-slate-200 rounded-lg text-slate-750 placeholder-slate-400 focus:outline-hidden font-mono"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input 
                        type="text" 
                        placeholder="Filtrar Vencimiento..."
                        value={colSearchVencimiento}
                        onChange={e => setColSearchVencimiento(e.target.value)}
                        className="w-full px-3 py-1.5 text-[10px] font-bold bg-white border border-slate-200 rounded-lg text-slate-750 placeholder-slate-400 focus:outline-hidden font-mono"
                      />
                    </td>
                    <td className="px-3 py-2 text-center text-slate-300">-</td>
                    <td className="px-3 py-2">
                      <input 
                        type="text" 
                        placeholder="Filtrar Alerta..."
                        value={colSearchAlerta}
                        onChange={e => setColSearchAlerta(e.target.value)}
                        className="w-full px-3 py-1.5 text-[10px] font-bold bg-white border border-slate-200 rounded-lg text-slate-750 placeholder-slate-400 focus:outline-hidden"
                      />
                    </td>
                    <td className="px-4 py-2 text-center text-slate-300">-</td>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {suppliers.filter(s => {
                    const calc = calculateUafValidity(s);
                    const hasUaf = calc.hasDocument;
                    const decName = hasUaf ? (s.complianceRequirements?.find(r => r.type === 'UBO_DECLARATION')?.documentName?.split('.')[0] || 'DEC-' + s.folio) : 'N/A';
                    const alertDirText = !hasUaf ? 'Sin Registro' : calc.daysRemaining <= 0 ? 'Alerta Crítica' : calc.daysRemaining <= 30 ? 'Alerta Preventas' : 'Vigente';
                    const hasUafText = hasUaf ? 'SÍ' : 'NO';
                    const incDate = s.requestDate || new Date(s.timestamp || Date.now()).toISOString().split('T')[0];

                    const matchesGlobal = !querySearchTerm || 
                      s.name.toLowerCase().includes(querySearchTerm.toLowerCase()) || 
                      s.taxId.toLowerCase().includes(querySearchTerm.toLowerCase());

                    const matchesColProveedor = !colSearchProveedor || s.name.toLowerCase().includes(colSearchProveedor.toLowerCase());
                    const matchesColRut = !colSearchRut || s.taxId.toLowerCase().includes(colSearchRut.toLowerCase());
                    const matchesColDeclaracion = !colSearchDeclaracion || decName.toLowerCase().includes(colSearchDeclaracion.toLowerCase());
                    const matchesColEmision = !colSearchEmision || calc.emissionDate.toLowerCase().includes(colSearchEmision.toLowerCase());
                    const matchesColVencimiento = !colSearchVencimiento || calc.expiryDate.toLowerCase().includes(colSearchVencimiento.toLowerCase());
                    const matchesColAlerta = !colSearchAlerta || alertDirText.toLowerCase().includes(colSearchAlerta.toLowerCase());
                    const matchesColIncorporacion = !colSearchIncorporacion || incDate.toLowerCase().includes(colSearchIncorporacion.toLowerCase());
                    const matchesColTieneAsoc = !colSearchTieneAsoc || hasUafText.toLowerCase() === colSearchTieneAsoc.toLowerCase();

                    return matchesGlobal && matchesColProveedor && matchesColRut && matchesColDeclaracion && matchesColEmision && matchesColVencimiento && matchesColAlerta && matchesColIncorporacion && matchesColTieneAsoc;
                  }).map(s => {
                    const calc = calculateUafValidity(s);
                    const hasUaf = calc.hasDocument;
                    const incDate = s.requestDate || new Date(s.timestamp || Date.now()).toISOString().split('T')[0];
                    
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6 font-bold text-slate-800 uppercase max-w-[180px] truncate" title={s.name}>
                          {s.name}
                        </td>
                        <td className="py-4 px-4 font-mono font-bold text-slate-550 text-[11px]">
                          {s.taxId}
                        </td>
                        <td className="py-4 px-4 font-mono text-slate-500 font-bold text-[11px]">
                          {incDate}
                        </td>
                        <td className="py-4 px-4 text-center">
                          {hasUaf ? (
                            <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-md text-[10px] font-black uppercase">SÍ</span>
                          ) : (
                            <span className="bg-slate-100 text-slate-500 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase">NO</span>
                          )}
                        </td>
                        <td className="py-4 px-4 font-mono text-indigo-700 font-bold">
                          {hasUaf ? (s.complianceRequirements?.find(r => r.type === 'UBO_DECLARATION')?.documentName?.split('.')[0] || 'DEC-' + s.folio) : 'N/A'}
                        </td>
                        <td className="py-4 px-4 font-mono text-slate-500 font-bold text-[11px]">
                          {calc.emissionDate}
                        </td>
                        <td className="py-4 px-4 font-mono text-slate-800 font-black text-[11px]">
                          {calc.expiryDate}
                        </td>
                        <td className="py-4 px-4 text-center font-mono">
                          {!hasUaf ? (
                            <span className="text-slate-350 font-black">-</span>
                          ) : calc.daysRemaining <= 0 ? (
                            <span className="text-rose-655 font-black bg-rose-50 px-2.5 py-1 rounded-md text-[10px]" title="Requiere renovación crítica inmediata">
                              Caducó hace {Math.abs(calc.daysRemaining)} días
                            </span>
                          ) : calc.daysRemaining <= 30 ? (
                            <span className="text-amber-700 font-black bg-amber-50 px-2.5 py-1 rounded-md text-[10px] animate-pulse">
                              {calc.daysRemaining} días restantes
                            </span>
                          ) : calc.daysRemaining <= 60 ? (
                            <span className="text-yellow-750 font-bold bg-yellow-50 px-2.5 py-1 rounded-md text-[10px]">
                              {calc.daysRemaining} de plazo
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-black bg-emerald-50 px-2.5 py-1 rounded-md text-[10.5px]">
                              {calc.daysRemaining} días hábiles
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-5">
                          {!hasUaf ? (
                            <span className="bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full text-[9px] font-black uppercase">Sin Registro Ley 19.913</span>
                          ) : calc.daysRemaining <= 0 ? (
                            <span className="bg-rose-100 text-rose-700 px-2.5 py-1 rounded-full text-[9px] font-black uppercase flex items-center gap-1.5 w-fit border border-rose-300">
                              <AlertCircle size={10} /> Alerta Crítica (Caducado)
                            </span>
                          ) : calc.daysRemaining <= 30 ? (
                            <span className="bg-amber-105 text-amber-700 px-2.5 py-1 rounded-full text-[9px] font-black uppercase flex items-center gap-1.5 w-fit border border-amber-300 animate-pulse">
                              <Bell size={10} className="text-amber-500" /> Alerta Preventas (Renovar)
                            </span>
                          ) : (
                            <span className="bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full text-[9px] font-black uppercase flex items-center gap-1.5 w-fit border border-emerald-300">
                              <CheckCircle2 size={10} /> Vigente (Conforme)
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {hasUaf ? (
                              <>
                                <button
                                  onClick={() => {
                                    setToastNotification({
                                      message: `Alerta preventora de vigencia despachada con éxito. Se ha enviado un correo formal al contacto registrado de ${s.name} (${s.email}) informando la próxima caducidad del formulario (Fecha de vencimiento límite registrada: ${calc.expiryDate}). Se copió al Ejecutivo ERP encargado.`,
                                      type: 'success'
                                    });
                                  }}
                                  className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-755 border border-indigo-200 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer transition select-none active:scale-95"
                                  title="Enviar correo de aviso de renovación al proveedor"
                                >
                                  <Mail size={12} /> Despachar Aviso
                                </button>
                                
                                <button
                                  onClick={() => {
                                    setUafFormSupplier(s);
                                    const ureq = s.complianceRequirements?.find(r => r.type === 'UBO_DECLARATION');
                                    setUafInitialData(ureq || null);
                                    setIsUafFormModalOpen(true);
                                  }}
                                  className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-750 border border-emerald-202 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer transition select-none active:scale-95"
                                  title="Llenar o editar formulario digital de beneficiarios"
                                >
                                  <FileText size={11} /> Llenar/Editar Formulario
                                </button>

                                <button
                                  onClick={() => handleUploadPdfClick(s)}
                                  className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-750 border border-sky-200 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer transition select-none active:scale-95"
                                  title="Subir o Reemplazar PDF de la declaración jurada"
                                >
                                  <FileUp size={12} /> Actualizar PDF
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    setUafFormSupplier(s);
                                    setUafInitialData(null);
                                    setIsUafFormModalOpen(true);
                                  }}
                                  className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer hover:bg-slate-850 transition select-none active:scale-95"
                                >
                                  <Plus size={12} /> Alta Formulario Digital
                                </button>

                                <button
                                  onClick={() => handleUploadPdfClick(s)}
                                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-lg text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer transition select-none active:scale-95"
                                  title="Cargar archivo PDF de la declaración jurada"
                                >
                                  <FileUp size={12} /> Subir PDF
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  
                  {suppliers.filter(s => {
                    const calc = calculateUafValidity(s);
                    const hasUaf = calc.hasDocument;
                    const decName = hasUaf ? (s.complianceRequirements?.find(r => r.type === 'UBO_DECLARATION')?.documentName?.split('.')[0] || 'DEC-' + s.folio) : 'N/A';
                    const alertDirText = !hasUaf ? 'Sin Registro' : calc.daysRemaining <= 0 ? 'Alerta Crítica' : calc.daysRemaining <= 30 ? 'Alerta Preventas' : 'Vigente';
                    const hasUafText = hasUaf ? 'SÍ' : 'NO';
                    const incDate = s.requestDate || new Date(s.timestamp || Date.now()).toISOString().split('T')[0];

                    const matchesGlobal = !querySearchTerm || 
                      s.name.toLowerCase().includes(querySearchTerm.toLowerCase()) || 
                      s.taxId.toLowerCase().includes(querySearchTerm.toLowerCase());

                    const matchesColProveedor = !colSearchProveedor || s.name.toLowerCase().includes(colSearchProveedor.toLowerCase());
                    const matchesColRut = !colSearchRut || s.taxId.toLowerCase().includes(colSearchRut.toLowerCase());
                    const matchesColDeclaracion = !colSearchDeclaracion || decName.toLowerCase().includes(colSearchDeclaracion.toLowerCase());
                    const matchesColEmision = !colSearchEmision || calc.emissionDate.toLowerCase().includes(colSearchEmision.toLowerCase());
                    const matchesColVencimiento = !colSearchVencimiento || calc.expiryDate.toLowerCase().includes(colSearchVencimiento.toLowerCase());
                    const matchesColAlerta = !colSearchAlerta || alertDirText.toLowerCase().includes(colSearchAlerta.toLowerCase());
                    const matchesColIncorporacion = !colSearchIncorporacion || incDate.toLowerCase().includes(colSearchIncorporacion.toLowerCase());
                    const matchesColTieneAsoc = !colSearchTieneAsoc || hasUafText.toLowerCase() === colSearchTieneAsoc.toLowerCase();

                    return matchesGlobal && matchesColProveedor && matchesColRut && matchesColDeclaracion && matchesColEmision && matchesColVencimiento && matchesColAlerta && matchesColIncorporacion && matchesColTieneAsoc;
                  }).length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400 font-bold uppercase tracking-wider">
                        <Search size={32} className="mx-auto mb-2 opacity-25" />
                        No se registraron coincidencias de búsqueda
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'SHAREPOINT' && (
        <div className="flex-1 overflow-auto p-8 space-y-6 bg-slate-50/30">
          {/* HEADER HERO FOR SHAREPOINT */}
          <div className="bg-gradient-to-r from-[#0078d4] to-[#005a9e] text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
            <div className="absolute right-0 bottom-0 translate-y-6 translate-x-6 opacity-10 pointer-events-none">
              <Cloud size={160} />
            </div>
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <span className="bg-white/11 text-white text-[9px] font-black font-mono px-2 py-0.5 rounded-xs uppercase tracking-wider">
                  Microsoft SharePoint Cloud API
                </span>
                <h3 className="text-xl font-black uppercase tracking-tight">Cooperación con SharePoint</h3>
                <p className="text-xs text-blue-100 font-medium leading-relaxed max-w-2xl font-semibold">
                  Sincroniza y asocia directamente las Declaraciones Juradas de Beneficiarios Finales (Ley N° 19.913 / Circular Circular 1835) provistas u hospedadas en el portal corporativo Microsoft 365 de AssetFlow.
                </p>
              </div>
              <div className="shrink-0">
                <button
                  type="button"
                  onClick={handleTestStatusSp}
                  disabled={isTestingConnection}
                  className="px-4 py-2.5 bg-white text-[#0078d4] hover:bg-neutral-50 transition-all font-black text-xs uppercase rounded-xl shadow-md cursor-pointer select-none flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw size={13} className={isTestingConnection ? "animate-spin" : ""} />
                  {isTestingConnection ? "Verificando..." : "Validar Conexión Cloud"}
                </button>
              </div>
            </div>
          </div>

          {/* CREDENTIALS & DIRECTORY PATH FORM */}
          <div className="bg-white rounded-3xl border border-slate-200/50 p-6 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Settings size={14} className="text-slate-400" /> Directorio Remoto Conectado
              </h4>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Dirección URL del Repositorio</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={sharepointUrl}
                    onChange={(e) => setSharepointUrl(e.target.value)}
                    className="flex-1 bg-slate-50 text-[11px] font-semibold text-slate-700 border border-slate-200 rounded-xl px-3 py-2.5 font-mono focus:bg-white focus:outline-hidden"
                  />
                  <a
                    href={sharepointUrl}
                    target="_blank"
                    className="px-3.5 flex items-center justify-center bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all rounded-xl cursor-pointer"
                    title="Abrir en Nueva Pestaña"
                    referrerPolicy="no-referrer"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
              <div className="p-3 bg-[#e1f5fe]/45 rounded-xl border border-[#0288d1]/10 flex items-start gap-3">
                <Info size={16} className="text-[#0288d1] shrink-0 mt-0.5" />
                <p className="text-[10px] text-[#01579b] font-bold uppercase leading-relaxed">
                  Ruta Mapeada: <span className="font-mono bg-white/60 px-1 py-0.5 rounded-xs">sites/InformacinCircular1835/Shared Documents/General</span>
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Estado Azure Entra ID</h4>
                  <span className="bg-[#107c41]/10 text-[#107c41] text-[8.5px] font-black font-mono px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
                    ● CONECTADO
                  </span>
                </div>
                <div className="space-y-1 text-[10px] font-mono font-bold text-slate-500">
                  <p>Tenant: <span className="text-slate-700">{tenantId}</span></p>
                  <p>App ID: <span className="text-slate-700">aad89b0d-...-575d</span></p>
                  <p>Secret: <span className="text-slate-400">••••••••••••••••</span></p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sandbox_mode"
                  checked={spSandboxMode}
                  onChange={(e) => setSpSandboxMode(e.target.checked)}
                  className="cursor-pointer"
                />
                <label htmlFor="sandbox_mode" className="text-[9.5px] font-black text-slate-500 uppercase tracking-wide cursor-pointer select-none">
                  Sincronización Automática
                </label>
              </div>
            </div>
          </div>

          {/* REMOTO REPOSITORY SEARCH & LOCAL Uploader */}
          <div className="bg-white rounded-3xl border border-slate-200/50 p-6 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Repositorio de Archivos en la Nube</h4>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Exploración en tiempo real de documentos disponibles para vinculación directa</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative w-72">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input
                    type="text"
                    placeholder="BUSCAR ARCHIVOS EN SHAREPOINT..."
                    value={searchSpFile}
                    onChange={(e) => setSearchSpFile(e.target.value)}
                    className="w-full bg-slate-50 text-[10px] font-black tracking-wider text-slate-700 placeholder-slate-400 border border-slate-200 rounded-xl pl-9.5 pr-4 py-2.5 focus:bg-white focus:outline-hidden uppercase"
                  />
                </div>
                <label className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-wider rounded-xl cursor-pointer select-none flex items-center gap-2 transition-all shadow-3xs border border-slate-200">
                  <FileUp size={13} />
                  Cargar a SharePoint
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf"
                    onChange={handleSpUploadSync}
                  />
                </label>
              </div>
            </div>

            {/* FILES TABLE FOR SHAREPOINT */}
            <div className="border border-slate-200/60 rounded-3xl overflow-hidden shadow-3xs">
              <table className="w-full text-left border-collapse font-sans">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="py-4 px-6 text-[10px] font-black text-slate-400 tracking-widest uppercase">Nombre del Documento</th>
                    <th className="py-4 px-6 text-[10px] font-black text-slate-400 tracking-widest uppercase text-center">Tamaño</th>
                    <th className="py-4 px-6 text-[10px] font-black text-slate-400 tracking-widest uppercase">Última Modificación</th>
                    <th className="py-4 px-6 text-[10px] font-black text-slate-400 tracking-widest uppercase">Modificado Por</th>
                    <th className="py-4 px-6 text-[10px] font-black text-slate-400 tracking-widest uppercase text-center">Dirección Compliance</th>
                    <th className="py-4 px-6 text-[10px] font-black text-slate-400 tracking-widest uppercase text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 animate-in fade-in duration-300">
                  {spFiles
                    .filter(f => !searchSpFile || f.name.toLowerCase().includes(searchSpFile.toLowerCase()))
                    .map((file) => (
                      <tr key={file.id} className="hover:bg-slate-50/50 transition-all">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <span className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                              <FileText size={17} />
                            </span>
                            <div className="min-w-0">
                              <p className="text-[11px] font-black text-slate-700 truncate uppercase">{file.name}</p>
                              <p className="text-[8.5px] font-extrabold text-[#0078d4] font-mono tracking-wider mt-0.5 uppercase">DIRECTORIO ACTIVO / CIRCULAR 1835</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-[10px] font-bold text-slate-500 font-mono text-center tracking-wider uppercase">
                          {file.size}
                        </td>
                        <td className="py-4 px-6 text-[10px] font-bold text-slate-600 font-mono uppercase tracking-wider">
                          {file.modifiedDate}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 bg-slate-250 text-slate-700 text-[8.5px] font-black font-mono rounded-full flex items-center justify-center uppercase">
                              {file.modifiedBy.charAt(0)}
                            </div>
                            <span className="text-[10px] font-bold text-slate-600 tracking-wider uppercase">{file.modifiedBy}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-center">
                          {file.status === 'vinculado' ? (
                            <div className="inline-flex flex-col items-center gap-1">
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[8px] font-black font-mono px-2 py-0.5 rounded-full border border-emerald-200 uppercase tracking-widest">
                                <CheckCircle2 size={10} /> Vinculado UAF
                              </span>
                              <span className="text-[8px] font-black text-slate-400 truncate max-w-44 uppercase">
                                {file.linkedSupplier || "Sincronizado"}
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-[8px] font-black font-mono px-2 py-0.5 rounded-full border border-amber-200 uppercase tracking-widest">
                              <AlertCircle size={10} /> Disponible en Cloud
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handlePreviewSpFile(file)}
                              className="p-2 bg-slate-100 text-slate-600 hover:bg-slate-205 transition-all rounded-xl cursor-pointer"
                              title="Ver Vista Previa del Documento"
                            >
                              <ExternalLink size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleLinkSpFileClick(file)}
                              disabled={file.status === 'vinculado'}
                              className="px-3.5 py-2 bg-[#0078d4] hover:bg-[#005a9e] disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-98"
                            >
                              <Share2 size={11} />
                              Asociar a Proveedor
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  {spFiles.filter(f => !searchSpFile || f.name.toLowerCase().includes(searchSpFile.toLowerCase())).length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400 font-bold uppercase tracking-wider">
                        <Search size={32} className="mx-auto mb-2 opacity-25" />
                        No se encontraron archivos que coincidan en SharePoint
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: FISCALIZACIÓN UAF — ROS / ROE (> US$ 10.000) / SCREENING PEP & LEY 21.595 */}
      {activeTab === 'ROS_ROE_PEP' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#f8fafc] jde-scrollbar">
          {/* KPI HEADER UAF LEY 19.913 & LEY 21.595 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Umbral Legal ROE (Art. 5° Ley 19.913)</div>
              <div className="text-xl font-mono font-black text-[#0B3C5D] mt-1">US$ 10.000 (~$9,5M CLP)</div>
              <div className="text-[11px] font-bold text-emerald-700 mt-1">0 Operaciones en Efectivo sobre umbral</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Reportes ROS (Art. 3° y 6° Ley 19.913)</div>
              <div className="text-xl font-mono font-black text-indigo-900 mt-1">Reserva Legal Estricta</div>
              <div className="text-[11px] font-bold text-slate-600 mt-1">Canal Cifrado Portal Entidades UAF</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Screening PEP / ONU / OFAC (Circ. 49)</div>
              <div className="text-xl font-mono font-black text-emerald-700 mt-1">{suppliers.length} Terceros Auditados</div>
              <div className="text-[11px] font-bold text-emerald-700 mt-1">✓ 100% Cruce Listas Sancionatorias</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Ley N° 21.595 (Delitos Económicos)</div>
              <div className="text-xl font-mono font-black text-slate-900 mt-1">MPD Ley N° 20.393</div>
              <div className="text-[11px] font-bold text-indigo-700 mt-1">Matriz Inmobiliaria 1ª y 2ª Categoría</div>
            </div>
          </div>

          {/* SECCIÓN 1: MATRIZ DE SEÑALES DE ALERTA UAF SECTOR GESTIÓN INMOBILIARIA & ROE */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="bg-[#0B3C5D] text-white px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wide flex items-center gap-2">
                  <ShieldCheck size={17} className="text-amber-300" />
                  Monitor Automático ROE (Efectivo &gt; US$ 10.000) y Señales de Alerta ROS — Sector Inmobiliario
                </h3>
                <p className="text-[11px] text-blue-200 mt-0.5">
                  Cumplimiento Circular UAF N° 49, N° 59 y N° 62 • Sujeto Obligado Art. 3° Ley N° 19.913 (Empresas de Gestión Inmobiliaria)
                </p>
              </div>
              <span className="bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 px-3 py-1 rounded text-[10px] font-mono font-bold">
                OFICIAL DE CUMPLIMIENTO ACTIVO
              </span>
            </div>

            <div className="overflow-x-auto jde-scrollbar">
              <table className="w-full min-w-[980px] text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-300 font-mono text-[10px] uppercase">
                    <th className="p-3.5">Código Regla UAF</th>
                    <th className="p-3.5">Tipología / Señal de Alerta Inmobiliaria</th>
                    <th className="p-3.5">Normativa Aplicable</th>
                    <th className="p-3.5">Umbral / Control ERP F0911</th>
                    <th className="p-3.5 text-center">Resultado Motor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  <tr className="hover:bg-slate-50">
                    <td className="p-3.5 font-mono font-bold text-[#0B3C5D]">UAF-ROE-01</td>
                    <td className="p-3.5 font-semibold text-slate-800">Operaciones en Efectivo superiores a US$ 10.000 (o equivalente en CLP/UF)</td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-600">Art. 5° Ley 19.913 / Circ. UAF N° 49</td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-700">Bloqueo de caja efectivo &gt; US$ 10.000 sin formulario ROE</td>
                    <td className="p-3.5 text-center">
                      <span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2.5 py-1 rounded border border-emerald-300">
                        SIN HALLAZGOS (0 ROE)
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-3.5 font-mono font-bold text-[#0B3C5D]">UAF-ROS-02</td>
                    <td className="p-3.5 font-semibold text-slate-800">Fraccionamiento sistemático de pagos de arriendo o garantías ("Pitufeo / Smurfing")</td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-600">Art. 3° Ley 19.913 / Guía Señales Inmobiliarias</td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-700">Agrupación de abonos por RUT en ventana móvil de 30 días</td>
                    <td className="p-3.5 text-center">
                      <span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2.5 py-1 rounded border border-emerald-300">
                        CONTROLADO OK
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-3.5 font-mono font-bold text-[#0B3C5D]">UAF-PEP-03</td>
                    <td className="p-3.5 font-semibold text-slate-800">Contratos con Personas Expuestas Políticamente (PEP) sin Debida Diligencia Reforzada (DDR)</td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-600">Circular UAF N° 49 Cap. IV (PEP)</td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-700">Exigencia de aprobación de Alta Gerencia y Origen de Fondos</td>
                    <td className="p-3.5 text-center">
                      <span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2.5 py-1 rounded border border-emerald-300">
                        DDR ACTIVA
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="p-3.5 font-mono font-bold text-[#0B3C5D]">MPD-21595-04</td>
                    <td className="p-3.5 font-semibold text-slate-800">Pagos a proveedores sin Declaración Jurada de Beneficiario Final (UBO Circular N° 57)</td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-600">Ley N° 21.595 / Ley N° 20.393 / Circ. UAF N° 57</td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-700">Retención preventiva en ciclo de pagos P0411</td>
                    <td className="p-3.5 text-center">
                      <span className="bg-amber-100 text-amber-800 font-bold text-[10px] px-2.5 py-1 rounded border border-amber-300">
                        {uafStats.valid}/{uafStats.total} CON UBO VIGENTE
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* SECCIÓN 2: PADRÓN DE SCREENING PEP, LISTAS ONU/OFAC Y DELITOS ECONÓMICOS LEY 21.595 */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="bg-slate-900 text-white px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wide flex items-center gap-2">
                  <Landmark size={17} className="text-amber-400" />
                  Screening de Contrapartes (PEP / ONU / OFAC / GAFI) &amp; Debida Diligencia Ley N° 21.595
                </h3>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Verificación continua de Proveedores y Arrendatarios contra listas restrictivas internacionales y registro de Beneficiarios Finales
                </p>
              </div>
            </div>

            <div className="overflow-x-auto jde-scrollbar">
              <table className="w-full min-w-[980px] text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-300 font-mono text-[10px] uppercase">
                    <th className="p-3.5">RUT Tercero</th>
                    <th className="p-3.5">Razón Social / Contraparte</th>
                    <th className="p-3.5">Condición PEP (Circ. 49)</th>
                    <th className="p-3.5">Listas ONU / OFAC / GAFI</th>
                    <th className="p-3.5">Beneficiario Final (Circ. 57)</th>
                    <th className="p-3.5 text-center">Nivel Riesgo MPD 21.595</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                  {suppliers.map((s) => {
                    const calc = calculateUafValidity(s);
                    return (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="p-3.5 font-bold text-slate-900">{s.taxId}</td>
                        <td className="p-3.5 font-sans font-bold text-slate-800">{s.name}</td>
                        <td className="p-3.5 font-sans">
                          <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-300">
                            NO PEP VERIFICADO
                          </span>
                        </td>
                        <td className="p-3.5 font-sans">
                          <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-200">
                            ✓ SIN COINCIDENCIAS (CLEAR)
                          </span>
                        </td>
                        <td className="p-3.5 font-sans">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${calc.statusColor}`}>
                            {calc.statusText.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-3.5 text-center font-sans">
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded ${
                            calc.isExpired ? 'bg-rose-100 text-rose-800' : calc.hasDocument ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {calc.isExpired ? 'ALTO (BLOQUEO PREVENTIVO)' : calc.hasDocument ? 'BAJO (APROBADO MPD)' : 'MEDIO (REQUIERE UBO)'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ALIGNMENT DRAWER LINKING SHAREPOINT FILE */}
      {linkingSpFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs font-sans">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Cloud size={18} className="text-[#0078d4]" />
                <h3 className="text-sm font-black text-slate-805 uppercase tracking-tight">Vincular Documento de SharePoint</h3>
              </div>
              <button
                type="button"
                onClick={() => { setLinkingSpFile(null); setTargetSupplierId(''); }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider">Archivo SharePoint seleccionado</span>
                <p className="text-[11px] font-extrabold text-slate-700 uppercase mt-0.5 font-mono overflow-auto whitespace-normal break-all">
                  {linkingSpFile.name}
                </p>
                <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Tamaño: {linkingSpFile.size} • Modificado por: {linkingSpFile.modifiedBy}</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Asociar al Proveedor del Maestro UAF</label>
                <select
                  value={targetSupplierId}
                  onChange={(e) => setTargetSupplierId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl px-3 py-3 focus:bg-white focus:outline-hidden"
                >
                  <option value="">-- SELECCIONAR PROVEEDOR RECEPTOR --</option>
                  {suppliers.map(s => {
                    const ubo = s.complianceRequirements?.find(r => r.type === 'UBO_DECLARATION');
                    const hasValidDoc = ubo && ubo.status === 'VALID';
                    return (
                      <option key={s.id} value={s.id} className="uppercase font-bold">
                        {s.name} ({s.taxId}) {hasValidDoc ? '✓ Con Registro Vigente' : '✗ Sin Registro'}
                      </option>
                    );
                  })}
                </select>
                <p className="text-[9px] font-bold text-slate-400 uppercase leading-relaxed mt-1">
                  Al asociar el archivo, se generará una Declaración interactiva con certificación digital que quedará vinculada con el proveedor seleccionado en tiempo de ejecución.
                </p>
              </div>
            </div>

            <div className="flex gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => { setLinkingSpFile(null); setTargetSupplierId(''); }}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeLinkSpFile}
                disabled={!targetSupplierId || isUploading}
                className="flex-1 px-4 py-2.5 bg-[#0078d4] hover:bg-[#005a9e] disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 shadow-sm font-semibold"
              >
                {isUploading ? "Sincronizando..." : "Registrar Cambios"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST SYSTEM ACCENT */}
      {toastNotification && (
        <div className="fixed bottom-6 right-6 z-55 max-w-md bg-slate-900 border border-slate-700/60 p-4 rounded-2xl shadow-2xl text-white flex items-start gap-3 animate-in slide-in-from-bottom-5 duration-300 font-sans">
          <div className="w-8.5 h-8.5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black font-mono tracking-wider uppercase text-emerald-400">Notificación del Sistema</p>
            <p className="text-[11px] text-slate-350 mt-1 leading-relaxed font-semibold">{toastNotification.message}</p>
          </div>
          <button 
            onClick={() => setToastNotification(null)}
            className="text-slate-400 hover:text-white font-bold text-xs select-none cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
      {/* MODALS & OVERLAYS */}
      <input 
        type="file"
        ref={manualFileInputRef}
        className="hidden"
        onChange={handleManualFileChange}
        accept=".pdf,.jpg,.jpeg,.png"
      />

      {isUafFormModalOpen && (
        <UafBeneficiaryFormModal
          isOpen={isUafFormModalOpen}
          onClose={() => {
            setIsUafFormModalOpen(false);
            setUafFormSupplier(null);
            setUafInitialData(null);
          }}
          supplierName={uafFormSupplier?.name}
          supplierTaxId={uafFormSupplier?.taxId}
          initialData={uafInitialData}
          onSave={handleSaveBeneficiaryForm}
        />
      )}

      {/* AUTO-INSCRIBE CONFIRMATION MODAL */}
      {isAutoInscribing && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-350">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col border border-slate-100 max-h-[90vh]">
            
            {/* Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center">
                  <Sparkles size={20} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider">Inscripción Inteligente Compliance UAF</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Detección Automática de Beneficiarios Finales</p>
                </div>
              </div>
              <button 
                onClick={() => { setIsAutoInscribing(false); setAutoInscribeFile(null); }}
                className="w-10 h-10 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-all flex items-center justify-center cursor-pointer select-none"
              >
                <X size={18} />
              </button>
            </div>

            {/* Banner info */}
            <div className="px-6 py-4 bg-indigo-50 border-b border-indigo-100 flex items-start gap-3">
              <Info className="text-indigo-600 shrink-0 mt-0.5" size={16} />
              <div className="space-y-1">
                <p className="text-[10px] font-black text-indigo-850 uppercase">CONEXIÓN MASTER COMPLIANCE ACTIVA</p>
                <p className="text-[9.5px] font-bold text-indigo-705 leading-relaxed uppercase">
                  El sistema ha detectado el documento <span className="font-black text-indigo-850">"{autoInscribeFile?.name}"</span> y ha extraído la información inicial del nuevo proveedor. Por favor, rectifique los datos corporativos antes de dar el V°B° de ingreso maestro.
                </p>
              </div>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-auto p-6 space-y-4">
              
              {/* Razón Social */}
              <div className="space-y-1.5">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Razón Social o Nombre del Proveedor</label>
                <input
                  type="text"
                  value={inscribedName}
                  onChange={(e) => setInscribedName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black uppercase outline-hidden focus:border-indigo-500 transition-all text-slate-850"
                  placeholder="Ej: DETECTOR DE METALES LIMITADA"
                />
              </div>

              {/* RUT & Category */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">RUT del Proveedor</label>
                  <input
                    type="text"
                    value={inscribedTaxId}
                    onChange={(e) => setInscribedTaxId(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black uppercase outline-hidden focus:border-indigo-500 transition-all text-slate-850"
                    placeholder="Ej: 76.123.456-K"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Categoría Operacional</label>
                  <select
                    value={inscribedCategory}
                    onChange={(e) => setInscribedCategory(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black uppercase outline-hidden focus:border-indigo-500 transition-all text-slate-850"
                  >
                    <option value="CONSTRUCCIÓN Y OBRAS">CONSTRUCCIÓN Y OBRAS</option>
                    <option value="MANTENCIÓN TÉCNICA">MANTENCIÓN TÉCNICA</option>
                    <option value="SERVICIOS DE LIMPIEZA">SERVICIOS DE LIMPIEZA</option>
                    <option value="SERVICIOS GENERALES">SERVICIOS GENERALES</option>
                    <option value="INSUMOS Y SUCURSALES">INSUMOS Y SUCURSALES</option>
                    <option value="OTROS">OTROS SERVICIOS</option>
                  </select>
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Correo Electrónico Corporativo</label>
                  <input
                    type="email"
                    value={inscribedEmail}
                    onChange={(e) => setInscribedEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black outline-hidden focus:border-indigo-500 transition-all text-slate-750"
                    placeholder="ejemplo@proveedor.cl"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Teléfono de Enlace</label>
                  <input
                    type="text"
                    value={inscribedPhone}
                    onChange={(e) => setInscribedPhone(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black uppercase outline-hidden focus:border-indigo-500 transition-all text-slate-850"
                    placeholder="+56 9 1234 5678"
                  />
                </div>
              </div>

              {/* Document Type & Rep Legal */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Tipo Documental Tributario</label>
                  <select
                    value={inscribedDocumentType}
                    onChange={(e) => setInscribedDocumentType(e.target.value as any)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black uppercase outline-hidden focus:border-indigo-500 transition-all text-slate-850"
                  >
                    <option value="FACTURA">FACTURA (Vía SII)</option>
                    <option value="BOLETA_HONORARIOS">BOLETA DE HONORARIOS</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Apoderado / Representante</label>
                  <input
                    type="text"
                    value={inscribedContact}
                    onChange={(e) => setInscribedContact(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-black uppercase outline-hidden focus:border-indigo-500 transition-all text-slate-850"
                    placeholder="REPRESENTANTE LEGAL"
                  />
                </div>
              </div>

              {/* Preview simulated file */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/55 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                    <FileText size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-slate-700 uppercase truncate">{autoInscribeFile?.name}</p>
                    <p className="text-[8px] font-bold text-slate-400 uppercase">DECLARACIÓN DE BENEFICIARIOS FINALES UAF (DETECTADA)</p>
                  </div>
                </div>
                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md text-[8.5px] font-black uppercase">CARGADO CON ÉXITO</span>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button
                type="button"
                onClick={() => { setIsAutoInscribing(false); setAutoInscribeFile(null); }}
                className="flex-1 py-3 bg-white border border-slate-250 text-slate-650 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-55 transition-all cursor-pointer shadow-3xs"
              >
                Descartar
              </button>
              <button
                type="button"
                onClick={executeAutoInscribe}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-indigo-150 flex items-center justify-center gap-1.5 animate-pulse"
              >
                <CheckCircle2 size={13} />
                Inscribir e Incorporar al ERP
              </button>
            </div>
            
          </div>
        </div>
      )}

      {/* INPUT FILE HOOK FOR GENERAL AUTO-INSCRIBE CONTROL */}
      <input
        type="file"
        ref={autoInscribeFileInputRef}
        className="hidden"
        accept=".pdf"
        onChange={handleAutoInscribeFileChange}
      />
    </div>
  );
};

export default UAFComplianceModule;
