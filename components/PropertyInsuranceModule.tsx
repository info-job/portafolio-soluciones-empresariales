
import React, { useState, useMemo, useRef } from 'react';
import { Property, PropertyInsurancePolicy, PropertyClaim } from '../types';
import { 
  ShieldCheck, ShieldAlert, Shield, Search, Filter, 
  ExternalLink, Calendar, Building2, FileText, 
  Plus, Edit2, Trash2, X, Save, AlertCircle,
  CheckCircle2, Clock, Download, Eye, Upload, FileUp, Loader2, Table as TableIcon, LayoutGrid, FileSpreadsheet, CloudCheck,
  AlertTriangle, Activity, PlusCircle, FileCode, Landmark, DollarSign, PenTool, ClipboardList, CheckCircle, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { extractInsurancePolicyData } from '../geminiService';
import { downloadJDEClaimReceipt } from '../lib/pdfGenerator';
import * as XLSX from 'xlsx';
import { useResizableColumns } from '../lib/useResizableColumns';
import { GridDimensionControls } from './common/GridDimensionControls';
import { JDEGridContextMenu } from './JDEGridContextMenu';

interface PropertyInsuranceModuleProps {
  properties: Property[];
  onUpdateProperty: (p: Property) => void;
  onAddProperty: (p: Property) => void;
  currentUser: string;
}

const PropertyInsuranceModule: React.FC<PropertyInsuranceModuleProps> = ({ 
  properties, 
  onUpdateProperty,
  onAddProperty,
  currentUser 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'VIGENTE' | 'VENCIDA' | 'PENDIENTE'>('ALL');
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewingUrl, setViewingUrl] = useState<string | null>(null);
  // Form state for editing policy
  const [policyForm, setPolicyForm] = useState<Partial<PropertyInsurancePolicy>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0 });
  const [extractionResults, setExtractionResults] = useState<any[]>([]);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tab state: POLICIES or CLAIMS
  const [activeModuleTab, setActiveModuleTab] = useState<'POLICIES' | 'CLAIMS'>('POLICIES');

  // Claims (Siniestros) State
  const [claimSearchTerm, setClaimSearchTerm] = useState('');
  const [claimStatusFilter, setClaimStatusFilter] = useState<'ALL' | 'REPORTE_INICIAL' | 'EN_LIQUIDACION' | 'REPARACION' | 'LIQUIDADO' | 'RECHAZADO'>('ALL');
  const [claimSeverityFilter, setClaimSeverityFilter] = useState<'ALL' | 'BAJA' | 'MEDIA' | 'ALTA' | 'CRÍTICA'>('ALL');

  // Column inline AssetFlow Enterprise filters
  const [colClaimNum, setColClaimNum] = useState('');
  const [colProperty, setColProperty] = useState('');
  const [colType, setColType] = useState('');
  const [colStatus, setColStatus] = useState('');

  // ERP Grid Context Menu state
  const [gridContextMenu, setGridContextMenu] = useState<{
    x: number;
    y: number;
    claim: PropertyClaim;
    property: Property;
  } | null>(null);

  // Resizable columns & rows for claims grid
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
      sel: 48,
      claimNum: 130,
      propCode: 130,
      building: 200,
      type: 140,
      severity: 110,
      incidentDate: 120,
      estimatedCost: 140,
      status: 140
    },
    initialRowHeight: 40,
    storageKey: 'jde_insurance_claims_grid'
  });
  
  const [selectedClaim, setSelectedClaim] = useState<PropertyClaim | null>(null);
  const [selectedClaimProperty, setSelectedClaimProperty] = useState<Property | null>(null);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [targetPropertyId, setTargetPropertyId] = useState<string>('');
  const [claimForm, setClaimForm] = useState<Partial<PropertyClaim>>({
    id: '',
    claimNumber: '',
    incidentDate: new Date().toISOString().split('T')[0],
    reportDate: new Date().toISOString().split('T')[0],
    type: 'INUNDACIÓN',
    severity: 'MEDIA',
    status: 'REPORTE_INICIAL',
    description: '',
    estimatedCost: 0,
    deductibleAmount: 0,
    coveredAmount: 0,
    adjusterName: '',
    adjusterEmail: '',
    documentUrl: '',
    history: []
  });

  const [newTimelineAction, setNewTimelineAction] = useState('REVISIÓN_AJUSTE');
  const [newTimelineNotes, setNewTimelineNotes] = useState('');

  const parseGenericDate = (dateStr?: string): Date | null => {
    if (!dateStr) return null;
    const clean = dateStr.trim();
    if (!clean) return null;

    // Is it in YYYY-MM-DD?
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean) || /^\d{4}\/\d{2}\/\d{2}$/.test(clean)) {
      const parts = clean.split(/[-/]/);
      return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    }

    // Is it in DD-MM-YYYY?
    if (/^\d{2}-\d{2}-\d{4}$/.test(clean) || /^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
      const parts = clean.split(/[-/]/);
      return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    }

    // Try normal Date.parse
    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
      return d;
    }

    // Fallback split-based heuristic
    const parts = clean.split(/[-/]/);
    if (parts.length === 3) {
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      const p2 = parseInt(parts[2], 10);
      if (parts[0].length === 4) {
        return new Date(p0, p1 - 1, p2);
      } else if (parts[2].length === 4) {
        return new Date(p2, p1 - 1, p0);
      }
    }

    return null;
  };

  const getPolicyStatus = (policy?: Partial<PropertyInsurancePolicy>): 'VIGENTE' | 'VENCIDA' | 'PENDIENTE' => {
    if (!policy || !policy.endDate) return 'PENDIENTE';
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = parseGenericDate(policy.endDate);
    
    if (!end || isNaN(end.getTime())) return 'PENDIENTE';
    if (end < today) return 'VENCIDA';
    return 'VIGENTE';
  };

  const getDaysRemaining = (endDate?: string): number | null => {
    if (!endDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = parseGenericDate(endDate);
    if (!end || isNaN(end.getTime())) return null;
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const filteredProperties = useMemo(() => {
    return properties.filter(p => {
      const matchesSearch = 
        p.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.building.toLowerCase().includes(searchTerm.toLowerCase());
      
      const currentStatus = getPolicyStatus(p.insurancePolicy);
      const matchesStatus = statusFilter === 'ALL' || currentStatus === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [properties, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    const total = properties.length;
    let vigente = 0;
    let vencida = 0;
    let pendiente = 0;

    properties.forEach(p => {
      const status = getPolicyStatus(p.insurancePolicy);
      if (status === 'VIGENTE') vigente++;
      else if (status === 'VENCIDA') vencida++;
      else pendiente++;
    });
    
    return { total, vigente, vencida, pendiente };
  }, [properties]);

  // Aggregate all Claims (Siniestros) embedded across all properties
  const allClaims = useMemo(() => {
    const list: { claim: PropertyClaim; property: Property }[] = [];
    properties.forEach(p => {
      if (p.claims && p.claims.length > 0) {
        p.claims.forEach(c => {
          list.push({ claim: c, property: p });
        });
      }
    });
    // Sort buy date/incidentDate descending
    return list.sort((a, b) => new Date(b.claim.incidentDate).getTime() - new Date(a.claim.incidentDate).getTime());
  }, [properties]);

  // Filter claim reports
  const [targetSearchProperty, setTargetSearchProperty] = useState<string>('ALL');

  const filteredClaims = useMemo(() => {
    return allClaims.filter(({ claim, property }) => {
      const matchesSearch = 
        claim.claimNumber.toLowerCase().includes(claimSearchTerm.toLowerCase()) ||
        claim.description.toLowerCase().includes(claimSearchTerm.toLowerCase()) ||
        property.building.toLowerCase().includes(claimSearchTerm.toLowerCase()) ||
        property.code.toLowerCase().includes(claimSearchTerm.toLowerCase()) ||
        (claim.adjusterName && claim.adjusterName.toLowerCase().includes(claimSearchTerm.toLowerCase()));
      
      const matchesStatus = claimStatusFilter === 'ALL' || claim.status === claimStatusFilter;
      const matchesSeverity = claimSeverityFilter === 'ALL' || claim.severity === claimSeverityFilter;
      
      const matchesColClaimNum = !colClaimNum || claim.claimNumber.toLowerCase().includes(colClaimNum.toLowerCase());
      const matchesColProperty = !colProperty || 
        property.code.toLowerCase().includes(colProperty.toLowerCase()) ||
        property.building.toLowerCase().includes(colProperty.toLowerCase());
      const matchesColType = !colType || claim.type.toLowerCase().includes(colType.toLowerCase());
      const matchesColStatus = !colStatus || claim.status.toLowerCase().includes(colStatus.toLowerCase());
      
      const matchesPropertySelect = targetSearchProperty === 'ALL' || property.id === targetSearchProperty;

      return matchesSearch && matchesStatus && matchesSeverity && 
        matchesColClaimNum && matchesColProperty && matchesColType && matchesColStatus && matchesPropertySelect;
    });
  }, [allClaims, claimSearchTerm, claimStatusFilter, claimSeverityFilter, colClaimNum, colProperty, colType, colStatus, targetSearchProperty]);

  // Claims summary dashboard indicators
  const claimStats = useMemo(() => {
    let total = allClaims.length;
    let active = 0;
    let settled = 0;
    let rejected = 0;
    let totalEstimatedCLP = 0;
    let totalCoveredCLP = 0;

    allClaims.forEach(({ claim }) => {
      if (claim.status === 'REPORTE_INICIAL' || claim.status === 'EN_LIQUIDACION' || claim.status === 'REPARACION') {
        active++;
      } else if (claim.status === 'LIQUIDADO') {
        settled++;
      } else if (claim.status === 'RECHAZADO') {
        rejected++;
      }
      totalEstimatedCLP += claim.estimatedCost || 0;
      totalCoveredCLP += claim.coveredAmount || 0;
    });

    return { total, active, settled, rejected, totalEstimatedCLP, totalCoveredCLP };
  }, [allClaims]);

  const handleEditPolicy = (property: Property) => {
    setSelectedProperty(property);
    setPolicyForm(property.insurancePolicy || {
      status: 'PENDIENTE',
      insuranceCompany: '',
      policyNumber: '',
      startDate: '',
      endDate: '',
      coverageAmount: 0
    });
    setIsModalOpen(true);
  };

  const handleSavePolicy = () => {
    if (!selectedProperty) return;

    const calculatedStatus = getPolicyStatus(policyForm);

    const updatedProperty: Property = {
      ...selectedProperty,
      insurancePolicy: {
        ...policyForm as PropertyInsurancePolicy,
        status: calculatedStatus,
        id: policyForm.id || crypto.randomUUID()
      }
    };

    onUpdateProperty(updatedProperty);
    setIsModalOpen(false);
    setSelectedProperty(null);
  };

  const handleDeletePolicy = (property: Property) => {
    const updatedProperty: Property = {
      ...property,
      insurancePolicy: undefined
    };
    onUpdateProperty(updatedProperty);
  };

  // --- OPERATIONS FOR CLAIMS (SINIESTROS) ---
  const handleOpenAddClaimModal = () => {
    const propertiesWithInsurance = properties.filter(p => p.insurancePolicy);
    const defaultPropId = propertiesWithInsurance.length > 0 ? propertiesWithInsurance[0].id : (properties.length > 0 ? properties[0].id : '');
    
    setTargetPropertyId(defaultPropId);
    
    const linkedProp = properties.find(p => p.id === defaultPropId);
    
    setClaimForm({
      id: '',
      claimNumber: '',
      incidentDate: new Date().toISOString().split('T')[0],
      reportDate: new Date().toISOString().split('T')[0],
      type: 'INUNDACIÓN',
      severity: 'MEDIA',
      status: 'REPORTE_INICIAL',
      description: '',
      estimatedCost: 0,
      deductibleAmount: 0,
      coveredAmount: 0,
      adjusterName: '',
      adjusterEmail: '',
      documentUrl: '',
      history: []
    });
    
    setIsClaimModalOpen(true);
  };

  const handleOpenEditClaimModal = (claim: PropertyClaim, propertyId: string) => {
    setTargetPropertyId(propertyId);
    setClaimForm(claim);
    setIsClaimModalOpen(true);
  };

  const handleSaveClaim = () => {
    if (!targetPropertyId) {
      alert("Por favor seleccione una propiedad afectante");
      return;
    }

    const linkedProperty = properties.find(p => p.id === targetPropertyId);
    if (!linkedProperty) return;

    let updatedClaim: PropertyClaim;
    const isNew = !claimForm.id;
    const claimId = claimForm.id || crypto.randomUUID();

    if (isNew) {
      updatedClaim = {
        ...claimForm as PropertyClaim,
        id: claimId,
        history: [
          {
            id: crypto.randomUUID(),
            date: new Date().toISOString().split('T')[0],
            action: 'REPORTE_INCIAL_SINIESTRO',
            user: currentUser,
            notes: `Registro del siniestro #${claimForm.claimNumber || 'S/N'} por ${currentUser}. Estimación: $${(claimForm.estimatedCost || 0).toLocaleString('es-CL')} CLP.`
          }
        ]
      };
    } else {
      updatedClaim = {
        ...claimForm as PropertyClaim,
        history: claimForm.history || []
      };
    }

    // Embed inside properties claim list
    const existingClaims = linkedProperty.claims || [];
    let nextClaims: PropertyClaim[] = [];
    if (isNew) {
      nextClaims = [...existingClaims, updatedClaim];
    } else {
      nextClaims = existingClaims.map(c => c.id === claimId ? updatedClaim : c);
    }

    const updatedProperty: Property = {
      ...linkedProperty,
      claims: nextClaims
    };

    onUpdateProperty(updatedProperty);
    
    // If we were viewing details of this claim, update that details too!
    if (selectedClaim && selectedClaim.id === claimId) {
      setSelectedClaim(updatedClaim);
      setSelectedClaimProperty(updatedProperty);
    }

    setIsClaimModalOpen(false);
  };

  const handleDeleteClaim = (claimId: string, propertyId: string) => {
    if (!confirm("¿Está seguro que desea eliminar este reporte de siniestro permanentemente?")) return;
    
    const linkedProperty = properties.find(p => p.id === propertyId);
    if (!linkedProperty || !linkedProperty.claims) return;

    const updatedProperty: Property = {
      ...linkedProperty,
      claims: linkedProperty.claims.filter(c => c.id !== claimId)
    };

    onUpdateProperty(updatedProperty);
    
    if (selectedClaim && selectedClaim.id === claimId) {
      setSelectedClaim(null);
      setSelectedClaimProperty(null);
    }
  };

  const handleAddTimelineEvent = () => {
    if (!selectedClaim || !selectedClaimProperty) return;
    if (!newTimelineNotes.trim()) {
      alert("Por favor escriba una glosa u observación para registrar en la bitácora.");
      return;
    }

    const newEvent = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      action: newTimelineAction,
      user: currentUser,
      notes: newTimelineNotes
    };

    const updatedClaim: PropertyClaim = {
      ...selectedClaim,
      status: (newTimelineAction === 'CAMBIO_ESTADO' && claimForm.status) ? claimForm.status : selectedClaim.status,
      coveredAmount: claimForm.coveredAmount !== undefined ? claimForm.coveredAmount : selectedClaim.coveredAmount,
      history: [newEvent, ...(selectedClaim.history || [])]
    };

    // Update inside Property object
    const updatedProperty: Property = {
      ...selectedClaimProperty,
      claims: (selectedClaimProperty.claims || []).map(c => c.id === selectedClaim.id ? updatedClaim : c)
    };

    onUpdateProperty(updatedProperty);
    
    // Refresh local detail views
    setSelectedClaim(updatedClaim);
    setSelectedClaimProperty(updatedProperty);
    setNewTimelineNotes('');
  };

  const handleClaimFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setClaimForm(prev => ({ ...prev, documentUrl: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const exportClaimsToExcel = () => {
    const data = filteredClaims.map(({ claim, property }) => ({
      'Nº de Siniestro (Cía)': claim.claimNumber,
      'Código de Propiedad': property.code,
      'Edificio / Sucursal': property.building,
      'Dirección': property.address,
      'Tipo de Siniestro': claim.type,
      'Gravedad': claim.severity,
      'Fecha Siniestro': claim.incidentDate,
      'Fecha Reporte': claim.reportDate,
      'Costo Daño Est. (CLP)': claim.estimatedCost || 0,
      'Deducible (UF/CLP)': claim.deductibleAmount || 0,
      'Monto Indemnizado (CLP)': claim.coveredAmount || 0,
      'Estado Reporte': claim.status,
      'Liquidador Seguros': claim.adjusterName || 'SIN AJUSTADOR',
      'Correo Liquidador': claim.adjusterEmail || 'N/A',
      'Glosa / Detalle': claim.description
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Siniestros');
    XLSX.writeFile(wb, `Reporte_Claims_Siniestros_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleSingleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setPolicyForm(prev => ({ ...prev, documentUrl: base64 }));
    };
    reader.readAsDataURL(file);
  };

  const handleViewDocument = (url: string) => {
    setViewingUrl(url);
    setIsViewerOpen(true);
  };

  const handleOpenInNewTab = (url: string) => {
    if (url.startsWith('data:')) {
      const win = window.open();
      if (win) {
        win.document.write(`<iframe src="${url}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.download = 'poliza.pdf';
        link.click();
      }
    } else {
      window.open(url, '_blank');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setProcessingProgress({ current: 0, total: files.length });
    const results: any[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProcessingProgress({ current: i + 1, total: files.length });

      try {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        const extractedData = await extractInsurancePolicyData(base64);
        
        if (extractedData) {
          // Intentar mapear con una propiedad existente por dirección
          const matchedProperty = properties.find(p => {
            const addressMatch = extractedData.insuredPropertyAddress && (
              p.address.toLowerCase().includes(extractedData.insuredPropertyAddress.toLowerCase()) ||
              extractedData.insuredPropertyAddress.toLowerCase().includes(p.address.toLowerCase())
            );
            const codeMatch = extractedData.policyNumber && p.code.toLowerCase() === extractedData.policyNumber.toLowerCase();
            const buildingMatch = extractedData.insuredPropertyAddress && p.building.toLowerCase().includes(extractedData.insuredPropertyAddress.toLowerCase());
            
            return addressMatch || codeMatch || buildingMatch;
          });

          const resultItem = {
            ...extractedData,
            fileName: file.name,
            matchedPropertyId: matchedProperty?.id || null,
            matchedPropertyName: matchedProperty ? `${matchedProperty.building} - ${matchedProperty.code}` : 'NO ENCONTRADA',
            documentUrl: base64
          };
          
          results.push(resultItem);

          if (matchedProperty) {
            const policy: PropertyInsurancePolicy = {
              id: crypto.randomUUID(),
              policyNumber: extractedData.policyNumber || 'S/N',
              insuranceCompany: extractedData.insuranceCompany || 'DESCONOCIDA',
              startDate: extractedData.startDate || '',
              endDate: extractedData.endDate || '',
              coverageAmount: extractedData.coverageAmount || 0,
              status: getPolicyStatus({ endDate: extractedData.endDate }),
              documentUrl: base64,
              observations: `Extraído automáticamente por IA el ${new Date().toLocaleDateString()}. Confianza: ${extractedData.confidenceScore}%`
            };
            
            onUpdateProperty({
              ...matchedProperty,
              insurancePolicy: policy,
              // Enrich existing property with more details if they were missing
              surfaceAreaLand: matchedProperty.surfaceAreaLand || extractedData.surfaceAreaLand,
              surfaceAreaBuilt: matchedProperty.surfaceAreaBuilt || extractedData.surfaceAreaBuilt,
              constructionYear: matchedProperty.constructionYear || extractedData.constructionYear,
              destination: matchedProperty.destination || (extractedData.destination as any),
              useType: matchedProperty.useType || (extractedData.useType as any),
              propertyRole: matchedProperty.propertyRole || extractedData.propertyRole,
              appraisalValue: matchedProperty.appraisalValue || extractedData.appraisalValue,
              lastAppraisalDate: matchedProperty.lastAppraisalDate || (extractedData.appraisalValue ? new Date().toISOString().split('T')[0] : undefined)
            });
          } else {
            // Si no hay coincidencia, crear una nueva propiedad
            const newPropertyId = crypto.randomUUID();
            const policy: PropertyInsurancePolicy = {
              id: crypto.randomUUID(),
              policyNumber: extractedData.policyNumber || 'S/N',
              insuranceCompany: extractedData.insuranceCompany || 'DESCONOCIDA',
              startDate: extractedData.startDate || '',
              endDate: extractedData.endDate || '',
              coverageAmount: extractedData.coverageAmount || 0,
              status: getPolicyStatus({ endDate: extractedData.endDate }),
              documentUrl: base64,
              observations: `Propiedad creada automáticamente por IA el ${new Date().toLocaleDateString()}.`
            };

            const newProperty: Property = {
              id: newPropertyId,
              code: extractedData.insuredPropertyCode || extractedData.policyNumber || `IA-${newPropertyId.slice(0, 4)}`,
              building: extractedData.insuredPropertyBuilding || extractedData.insuredPropertyAddress?.split(',')[0] || 'EDIFICIO NUEVO (IA)',
              floor: extractedData.insuredPropertyFloor || '1',
              address: extractedData.insuredPropertyAddress || 'DIRECCIÓN DESCONOCIDA',
              commune: extractedData.insuredPropertyCommune || 'SIN ESPECIFICAR',
              type: 'OFICINA', // Default, can be refined if needed
              insurancePolicy: policy,
              // Detailed fields
              surfaceAreaLand: extractedData.surfaceAreaLand,
              surfaceAreaBuilt: extractedData.surfaceAreaBuilt,
              constructionYear: extractedData.constructionYear,
              destination: extractedData.destination as any,
              useType: extractedData.useType as any,
              propertyRole: extractedData.propertyRole,
              appraisalValue: extractedData.appraisalValue,
              lastAppraisalDate: extractedData.appraisalValue ? new Date().toISOString().split('T')[0] : undefined
            };

            onAddProperty(newProperty);
            
            // Actualizar el resultado para reflejar que se creó una propiedad
            resultItem.matchedPropertyId = newPropertyId;
            resultItem.matchedPropertyName = `${newProperty.building} - ${newProperty.code} (CREADA)`;
          }
        }
      } catch (error) {
        console.error(`Error procesando archivo ${file.name}:`, error);
      }
    }

    setExtractionResults(results);
    setIsProcessing(false);
    setShowResultsModal(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const exportToExcel = () => {
    const data = filteredProperties.map(p => ({
      'Código Propiedad': p.code,
      'Edificio': p.building,
      'Dirección': p.address,
      'Comuna': p.commune,
      'Compañía Seguros': p.insurancePolicy?.insuranceCompany || 'N/A',
      'Número Póliza': p.insurancePolicy?.policyNumber || 'N/A',
      'Inicio Vigencia': p.insurancePolicy?.startDate || 'N/A',
      'Término Vigencia': p.insurancePolicy?.endDate || 'N/A',
      'Monto Cobertura': p.insurancePolicy?.coverageAmount || 0,
      'Estado': p.insurancePolicy?.status || 'PENDIENTE'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Seguros');
    XLSX.writeFile(wb, `Reporte_Seguros_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getStatusBadge = (property: Property) => {
    const status = getPolicyStatus(property.insurancePolicy);
    switch (status) {
      case 'VIGENTE':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 text-[9px] font-black rounded-full border border-emerald-100 uppercase">
            <CheckCircle2 size={10} /> Vigente
          </span>
        );
      case 'VENCIDA':
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-rose-50 text-rose-700 text-[9px] font-black rounded-full border border-rose-100 uppercase">
            <AlertCircle size={10} /> Vencida
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 text-[9px] font-black rounded-full border border-amber-100 uppercase">
            <Clock size={10} /> Pendiente
          </span>
        );
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#f3f2f1] overflow-hidden">
      {/* SUB-MODULE TABS */}
      <div className="bg-[#f3f2f1] border-b border-slate-200 px-8 py-2.5 flex items-center justify-between no-print shadow-inner shrink-0 leading-none">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveModuleTab('POLICIES')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 border ${
              activeModuleTab === 'POLICIES'
                ? 'bg-[#0B3C5D] text-white shadow-md shadow-[#0B3C5D]/20 border-[#0B3C5D]'
                : 'bg-white text-slate-600 hover:bg-slate-200 border-slate-250 shadow-sm'
            }`}
          >
            <ShieldCheck size={14} /> Pólizas de Seguros
          </button>
          <button
            onClick={() => setActiveModuleTab('CLAIMS')}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 border ${
              activeModuleTab === 'CLAIMS'
                ? 'bg-[#BF2424] text-white shadow-md shadow-[#BF2424]/20 border-[#BF2424]'
                : 'bg-white text-slate-600 hover:bg-slate-200 border-slate-250 shadow-sm'
            }`}
          >
            <AlertTriangle size={14} /> Registro de Siniestros
          </button>
        </div>
        <div className="text-[10px] uppercase font-black text-slate-500 tracking-wider flex items-center gap-2">
          <Activity size={12} className="text-emerald-500 animate-pulse" />
          Servicio de Seguros Activo: <span className="text-slate-800 font-mono select-all bg-slate-200 px-1.5 py-0.5 rounded text-[9px]">{currentUser || 'SISTEMA'}</span>
        </div>
      </div>

      {activeModuleTab === 'POLICIES' && (
        <>
          {/* HEADER */}
          <div className="bg-white border-b border-slate-200 px-8 py-6 shadow-sm z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-600 p-3 rounded-2xl text-white shadow-lg shadow-indigo-100">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Gestión de Seguros</h1>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Control de Pólizas y Coberturas de Activos</p>
                </div>
              </div>

                 <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0B3C5D]/10 text-[#0B3C5D] border border-[#0B3C5D]/20 rounded-lg text-[10px] font-black uppercase font-mono tracking-wider mr-2">
                    <TableIcon size={14} className="text-[#0B3C5D]" />
                    <span>Grilla AssetFlow Enterprise (P1502)</span>
                 </div>

                 <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button 
                      onClick={() => setStatusFilter('ALL')}
                      className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${statusFilter === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Todos
                    </button>
                    <button 
                      onClick={() => setStatusFilter('VIGENTE')}
                      className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${statusFilter === 'VIGENTE' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Vigentes
                    </button>
                    <button 
                      onClick={() => setStatusFilter('VENCIDA')}
                      className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${statusFilter === 'VENCIDA' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      Vencidas
                    </button>
                 </div>
              </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Total Propiedades</p>
                <p className="text-2xl font-black text-slate-900">{stats.total}</p>
              </div>
              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                <p className="text-[9px] font-black text-emerald-400 uppercase mb-1">Pólizas Vigentes</p>
                <p className="text-2xl font-black text-emerald-700">{stats.vigente}</p>
              </div>
              <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100">
                <p className="text-[9px] font-black text-rose-400 uppercase mb-1">Pólizas Vencidas</p>
                <p className="text-2xl font-black text-rose-700">{stats.vencida}</p>
              </div>
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                <p className="text-[9px] font-black text-amber-400 uppercase mb-1">Sin Póliza / Pendiente</p>
                <p className="text-2xl font-black text-amber-700">{stats.pendiente}</p>
              </div>
            </div>
          </div>

          {/* SEARCH AND FILTERS */}
          <div className="px-8 py-4 flex items-center justify-between bg-white/50 border-b border-slate-200">
            <div className="flex items-center gap-4">
              <div className="relative w-96">
                <input 
                  type="text" 
                  placeholder="Buscar por dirección, código o edificio..." 
                  className="w-full bg-white border border-slate-200 rounded-xl px-10 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
              </div>

              <input 
                type="file" 
                multiple 
                accept=".pdf,image/*" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
              
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Procesando ({processingProgress.current}/{processingProgress.total})
                  </>
                ) : (
                  <>
                    <FileUp size={16} />
                    Carga Masiva IA
                  </>
                )}
              </button>
            </div>

            <button 
              onClick={exportToExcel}
              className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg shadow-emerald-100"
            >
              <FileSpreadsheet size={16} />
              Exportar Excel
            </button>
          </div>

          {/* PROGRESS BAR */}
          <AnimatePresence>
            {isProcessing && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="px-8 py-2 bg-indigo-50 border-b border-indigo-100 overflow-hidden"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] font-black text-indigo-600 uppercase flex items-center gap-2">
                    <Loader2 size={12} className="animate-spin" />
                    Procesando documentos con IA...
                  </p>
                  <p className="text-[10px] font-black text-indigo-600 uppercase">
                    {processingProgress.current} de {processingProgress.total} ({Math.round((processingProgress.current / processingProgress.total) * 100)}%)
                  </p>
                </div>
                <div className="w-full h-1.5 bg-indigo-100 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-indigo-600"
                    initial={{ width: 0 }}
                    animate={{ width: `${(processingProgress.current / processingProgress.total) * 100}%` }}
                    transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* PROPERTY ERP GRID */}
          <div className="flex-1 overflow-auto px-8 py-6">
            <div className="bg-[#FAFBFD] border border-[#91A6BA] rounded-sm shadow-sm overflow-hidden flex flex-col">
              {/* ERP Grid Header Info */}
              <div className="bg-[#E9F0F8] border-b border-[#C3D5E6] px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-[10px]">
                <div className="flex items-center gap-2 text-[#0B3C5D] font-bold">
                  <span className="font-mono bg-[#0B3C5D] text-white px-1.5 py-0.5 rounded text-[9px]">P1502 / F1502</span>
                  <span>Trabajar con Pólizas y Seguros de Inmuebles</span>
                  <span className="text-slate-400">|</span>
                  <span className="text-slate-600 font-mono text-[9.5px]">
                    Activos: <strong className="text-slate-900">{filteredProperties.length}</strong> de {properties.length}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono">
                  <span className="text-emerald-700 font-bold">● Vigentes: {stats.vigente}</span>
                  <span className="text-rose-700 font-bold">● Vencidas: {stats.vencida}</span>
                  <span className="text-amber-700 font-bold">● Sin Póliza: {stats.pendiente}</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-[#E2ECF5] border-b border-[#91A6BA] text-[#143B57]">
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider border-r border-[#B0C4D6]">Propiedad</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider border-r border-[#B0C4D6]">Dirección / Comuna</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider border-r border-[#B0C4D6]">Compañía Aseguradora</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider border-r border-[#B0C4D6]">Póliza #</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider border-r border-[#B0C4D6]">Vigencia (Inicio - Fin)</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-center border-r border-[#B0C4D6]">Días Restantes</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-center border-r border-[#B0C4D6]">Estado Póliza</th>
                      <th className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D5E1ED] text-[11px] font-sans">
                    {filteredProperties.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-6 py-16 text-center text-slate-500">
                          <Building2 size={36} className="mx-auto mb-2 opacity-30" />
                          <p className="font-bold uppercase tracking-wider text-xs">No se encontraron propiedades con pólizas bajo este criterio</p>
                        </td>
                      </tr>
                    ) : (
                      filteredProperties.map(p => (
                        <tr 
                          key={p.id} 
                          onClick={() => handleEditPolicy(p)}
                          className="hover:bg-[#EDF4FA] transition-colors group cursor-pointer border-b border-[#E2ECF5]"
                        >
                          <td className="px-4 py-3 border-r border-[#E2ECF5]">
                             <div className="flex items-center gap-2.5">
                               <div className="bg-slate-100 p-1.5 rounded text-slate-500 group-hover:bg-[#0B3C5D] group-hover:text-white transition-colors">
                                 <Building2 size={14} />
                               </div>
                               <div>
                                 <p className="font-black text-slate-900 uppercase leading-tight">{p.code}</p>
                                 <p className="text-[9px] font-bold text-slate-400 uppercase">{p.building}</p>
                               </div>
                             </div>
                           </td>
                           <td className="px-4 py-3 border-r border-[#E2ECF5]">
                             <p className="font-bold text-slate-800 uppercase">{p.address}</p>
                             <p className="text-[9px] font-bold text-slate-400 uppercase">{p.commune}</p>
                           </td>
                           <td className="px-4 py-3 border-r border-[#E2ECF5]">
                             <p className="font-black text-slate-800 uppercase">{p.insurancePolicy?.insuranceCompany || '---'}</p>
                           </td>
                           <td className="px-4 py-3 border-r border-[#E2ECF5]">
                             <p className="font-mono font-bold text-slate-700">{p.insurancePolicy?.policyNumber || '---'}</p>
                           </td>
                           <td className="px-4 py-3 border-r border-[#E2ECF5]">
                             {p.insurancePolicy ? (
                               <div className="flex flex-col font-mono text-[10px]">
                                 <span className="font-bold text-slate-800">Fin: {p.insurancePolicy.endDate}</span>
                                 <span className="text-slate-400 text-[9px]">Ini: {p.insurancePolicy.startDate}</span>
                               </div>
                             ) : <span className="text-slate-400 font-mono">---</span>}
                           </td>
                           <td className="px-4 py-3 text-center border-r border-[#E2ECF5]">
                             {p.insurancePolicy ? (
                               <span className={`font-mono font-black px-2 py-0.5 rounded text-[10px] ${
                                 (getDaysRemaining(p.insurancePolicy.endDate) || 0) <= 30 ? 'bg-rose-100 text-rose-700 border border-rose-300' : 'bg-slate-100 text-slate-700'
                               }`}>
                                 {getDaysRemaining(p.insurancePolicy.endDate)} días
                               </span>
                             ) : <span className="text-slate-400 font-mono">---</span>}
                           </td>
                           <td className="px-4 py-3 text-center border-r border-[#E2ECF5]">
                             {getStatusBadge(p)}
                           </td>
                           <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                             <div className="flex items-center justify-center gap-1.5">
                               <button 
                                 onClick={() => handleEditPolicy(p)}
                                 className="px-2 py-1 bg-white hover:bg-[#0B3C5D] hover:text-white text-slate-700 border border-slate-300 rounded text-[10px] font-bold transition-all shadow-3xs cursor-pointer"
                                 title="Editar Póliza"
                               >
                                 <Edit2 size={12} className="inline mr-1" />
                                 <span>{p.insurancePolicy ? 'Editar' : 'Asociar'}</span>
                               </button>
                               {p.insurancePolicy && (
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); handleDeletePolicy(p); }}
                                   className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all"
                                   title="Eliminar Póliza"
                                 >
                                   <Trash2 size={14} />
                                 </button>
                               )}
                               {p.insurancePolicy?.documentUrl && (
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); handleViewDocument(p.insurancePolicy!.documentUrl!)} }
                                   className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-all"
                                   title="Ver Documento Digital"
                                 >
                                   <Eye size={14} />
                                 </button>
                               )}
                             </div>
                           </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* ERP Bottom Status Strip */}
              <div className="bg-[#E9F0F8] border-t border-[#C3D5E6] px-4 py-1.5 flex items-center justify-between text-[9.5px] text-slate-600 font-mono">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-emerald-700 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                    ERP Grid En Línea
                  </span>
                  <span>•</span>
                  <span>Clic en fila abre edición de póliza</span>
                </div>
                <div>
                  Total Propiedades: <strong className="text-slate-900">{filteredProperties.length}</strong>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {activeModuleTab === 'CLAIMS' && (
        <div className="flex-1 flex flex-col overflow-hidden bg-[#f3f2f1]">
          {/* ASSETFLOW CENTRAL INTEGRATION BRAND BANNER */}
          <div className="h-1 bg-[#0b3c5d] shrink-0" />
          <div className="bg-[#0B3C5D] text-white px-6 py-3 flex items-center justify-between shadow-sm shrink-0 leading-none">
            <div className="flex items-center gap-2.5">
              <span className="font-extrabold text-[13px] tracking-wide uppercase select-none">ASSETFLOW Central Systems</span>
            </div>
            <div className="hidden md:flex items-center gap-5 text-slate-300 text-[10px] font-black uppercase select-none">
              <span className="hover:text-white cursor-pointer transition-colors">Home</span>
              <span>•</span>
              <span className="hover:text-white cursor-pointer transition-colors animate-pulse">Navigator</span>
              <span>•</span>
              <span className="hover:text-white cursor-pointer transition-colors">Open Applications</span>
              <span>•</span>
              <span className="hover:text-white cursor-pointer transition-colors">Recent Reports</span>
              <span>•</span>
              <span className="hover:text-white cursor-pointer transition-colors">Favorites</span>
            </div>
          </div>

          {/* SCREEN TITLE SILVER BANNER */}
          <div className="bg-[#e4e6e9] border-b border-slate-300 px-6 py-2.5 flex items-center justify-between text-slate-800 shrink-0 select-none">
            <div className="flex items-center gap-2">
              <Landmark className="text-slate-650" size={16} />
              <span className="font-black text-xs uppercase tracking-tight text-slate-700">Trabajar con Siniestros de Propiedades</span>
            </div>
            <div className="flex items-center gap-1.5 h-7">
              <button
                onClick={() => {
                  setClaimSearchTerm('');
                  setColClaimNum('');
                  setColProperty('');
                  setColType('');
                  setColStatus('');
                  setTargetSearchProperty('ALL');
                }}
                className="px-3 h-full bg-white hover:bg-slate-100 border border-slate-350 text-[10px] font-black uppercase text-slate-700 rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
                title="Buscar / Refrescar Siniestros de Seguros"
              >
                <Search size={12} /> Buscar
              </button>
              <button
                onClick={handleOpenAddClaimModal}
                className="px-3.5 h-full bg-[#1b5e3a] hover:bg-[#124228] text-white text-[10px] font-black uppercase rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
                title="Nuevo Reporte de Siniestro"
              >
                <Plus size={12} /> Registrar
              </button>
              <button
                onClick={() => {
                  if (!selectedClaim || !selectedClaimProperty) {
                    alert('Por favor seleccione un siniestro de la tabla.');
                    return;
                  }
                  handleOpenEditClaimModal(selectedClaim, selectedClaimProperty.id);
                }}
                disabled={!selectedClaim}
                className="px-3 h-full bg-amber-500 hover:bg-amber-600 text-slate-950 text-[10px] font-black uppercase rounded-lg flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                title="Editar Siniestro Seleccionado"
              >
                <Edit2 size={12} /> Cambiar
              </button>
              <button
                onClick={() => {
                  if (!selectedClaim || !selectedClaimProperty) {
                    alert('Por favor seleccione un siniestro de la tabla.');
                    return;
                  }
                  handleDeleteClaim(selectedClaim.id, selectedClaimProperty.id);
                }}
                disabled={!selectedClaim}
                className="px-3 h-full bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase rounded-lg flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                title="Eliminar Siniestro Seleccionado"
              >
                <Trash2 size={12} /> Eliminar
              </button>
              <button
                onClick={exportClaimsToExcel}
                className="px-3 h-full bg-[#3c763d] hover:bg-[#254a26] text-white text-[10px] font-black uppercase rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
                title="Exportar Reporte Excel"
              >
                <FileSpreadsheet size={12} /> Exportar XLS
              </button>
              <button
                onClick={() => {
                  if (!selectedClaim || !selectedClaimProperty) {
                    alert('Por favor seleccione un siniestro.');
                    return;
                  }
                  downloadJDEClaimReceipt({
                    claim: selectedClaim,
                    property: selectedClaimProperty,
                    currentUser
                  });
                }}
                disabled={!selectedClaim}
                className="px-3 h-full bg-[#0a2f47] hover:bg-[#071F30] text-white text-[10px] font-black uppercase rounded-lg flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-40"
                title="Imprimir Comprobante Contable"
              >
                <Download size={12} /> Comprobante PDF
              </button>
            </div>
          </div>

          {/* DYNAMIC SUMMARIES */}
          <div className="bg-white border-b border-slate-250 px-6 py-4 grid grid-cols-2 lg:grid-cols-5 gap-4 shrink-0">
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Reclamos Registrados</p>
              <p className="text-xl font-black text-slate-900 font-mono">{claimStats.total}</p>
            </div>
            <div className="bg-amber-50 p-3 rounded-2xl border border-amber-100">
              <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-1">En Liquidación/Obra</p>
              <p className="text-xl font-black text-amber-700 font-mono">{claimStats.active}</p>
            </div>
            <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100">
              <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">Liquidados Aprobados</p>
              <p className="text-xl font-black text-emerald-700 font-mono">{claimStats.settled}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Siniestrado Est.</p>
              <p className="text-xl font-black text-slate-800 font-mono">${claimStats.totalEstimatedCLP.toLocaleString('es-CL')}</p>
            </div>
            <div className="bg-sky-50 p-3 rounded-2xl border border-sky-100">
              <p className="text-[9px] font-black text-sky-500 uppercase tracking-widest mb-1">Monto Indemnizado Cía</p>
              <p className="text-xl font-black text-sky-700 font-mono">${claimStats.totalCoveredCLP.toLocaleString('es-CL')}</p>
            </div>
          </div>

          {/* QUERY SEARCH SELECTION FORM */}
          <div className="bg-[#f1f3f6] border-b border-slate-300 px-6 py-3 flex flex-wrap gap-5 items-center shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[10px] text-slate-500 uppercase tracking-wider">Cía Asegurada:</span>
              <input 
                type="text" 
                readOnly 
                value="00070" 
                className="w-14 bg-slate-200 border border-slate-350 rounded px-2.5 py-1 text-center font-black select-none font-mono text-[11px] text-slate-650" 
                title="ASSETFLOW Company ID fijo"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[10px] text-slate-500 uppercase tracking-wider">Unidad de Negocio:</span>
              <select
                value={targetSearchProperty}
                onChange={(e) => setTargetSearchProperty(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2.5 py-1 text-[11px] font-black uppercase text-slate-700 focus:ring-2 focus:ring-[#0B3C5D]/10 max-w-[220px]"
              >
                <option value="ALL">* - Todas las propiedades ASSETFLOW</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.code} - {p.building.substring(0, 18).toUpperCase()}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[10px] text-slate-500 uppercase tracking-wider">Severidad:</span>
              <select
                value={claimSeverityFilter}
                onChange={(e) => setClaimSeverityFilter(e.target.value as any)}
                className="bg-white border border-slate-300 rounded px-2 py-1 text-[11px] font-black uppercase text-slate-700 focus:ring-2 focus:ring-[#0B3C5D]/10"
              >
                <option value="ALL">* - Todas </option>
                <option value="BAJA">BAJA</option>
                <option value="MEDIA">MEDIA</option>
                <option value="ALTA">ALTA</option>
                <option value="CRÍTICA">CRÍTICA</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[10px] text-slate-500 uppercase tracking-wider">Estado:</span>
              <select
                value={claimStatusFilter}
                onChange={(e) => setClaimStatusFilter(e.target.value as any)}
                className="bg-white border border-slate-300 rounded px-2 py-1 text-[11px] font-black uppercase text-slate-700 focus:ring-2 focus:ring-[#0B3C5D]/10"
              >
                <option value="ALL">* - Todos</option>
                <option value="REPORTE_INICIAL">REPORTE INICIAL</option>
                <option value="EN_LIQUIDACION">EN LIQUIDACION</option>
                <option value="REPARACION">REPARACION / OBRA</option>
                <option value="LIQUIDADO">LIQUIDADO / CUBIERTO</option>
                <option value="RECHAZADO">RECHAZADO</option>
              </select>
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <GridDimensionControls
                defaultRowHeight={defaultRowHeight}
                onSetRowHeight={setDefaultRowHeight}
                onResetColumns={resetWidths}
                onResetRows={resetHeights}
                onResetAll={resetAll}
              />

              <div className="flex items-center gap-2 w-64">
                <div className="relative w-full">
                  <input
                    type="text"
                    placeholder="Buscar Nº siniestro, liquidador..."
                    value={claimSearchTerm}
                    onChange={(e) => setClaimSearchTerm(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded px-8 py-1 text-[11px] font-bold focus:ring-2 focus:ring-[#0B3C5D]/10"
                  />
                  <Search size={11} className="absolute left-2.5 top-2 text-slate-400" />
                </div>
              </div>
            </div>
          </div>

          {/* DUAL WORKSPACE: INTERACTIVE GRID (TABLE) + CLAIMS LEDGER SIDEBAR */}
          <div className="flex-1 flex overflow-hidden">
            {/* GRID TABLE SHEET */}
            <div className="flex-1 overflow-auto bg-white border-r border-slate-300 relative shadow-sm">
              <table className="w-full min-w-[1170px] text-left border-collapse table-fixed select-none">
                <thead className="sticky top-0 z-20 bg-slate-100 text-slate-700 text-[10px] font-black uppercase border-b border-slate-300 shadow-sm">
                  <tr className="divide-x divide-slate-300">
                    <th style={{ width: widths.sel }} className="p-2 text-center bg-slate-200 relative">
                      Sel
                      <div 
                        onMouseDown={(e) => onMouseDown('sel', e)}
                        onDoubleClick={() => onColumnDoubleClick('sel', 48)}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-600"
                      />
                    </th>
                    <th style={{ width: widths.claimNum }} className="p-2 relative">
                      Nº Siniestro
                      <div 
                        onMouseDown={(e) => onMouseDown('claimNum', e)}
                        onDoubleClick={() => onColumnDoubleClick('claimNum', 130)}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-600"
                      />
                    </th>
                    <th style={{ width: widths.propCode }} className="p-2 relative">
                      Código Propiedad
                      <div 
                        onMouseDown={(e) => onMouseDown('propCode', e)}
                        onDoubleClick={() => onColumnDoubleClick('propCode', 130)}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-600"
                      />
                    </th>
                    <th style={{ width: widths.building }} className="p-2 relative">
                      Edificio Asociado
                      <div 
                        onMouseDown={(e) => onMouseDown('building', e)}
                        onDoubleClick={() => onColumnDoubleClick('building', 200)}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-600"
                      />
                    </th>
                    <th style={{ width: widths.type }} className="p-2 relative">
                      Tipo Siniestro
                      <div 
                        onMouseDown={(e) => onMouseDown('type', e)}
                        onDoubleClick={() => onColumnDoubleClick('type', 140)}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-600"
                      />
                    </th>
                    <th style={{ width: widths.severity }} className="p-2 text-center relative">
                      Severidad
                      <div 
                        onMouseDown={(e) => onMouseDown('severity', e)}
                        onDoubleClick={() => onColumnDoubleClick('severity', 110)}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-600"
                      />
                    </th>
                    <th style={{ width: widths.incidentDate }} className="p-2 text-center relative">
                      Fecha Siniestro
                      <div 
                        onMouseDown={(e) => onMouseDown('incidentDate', e)}
                        onDoubleClick={() => onColumnDoubleClick('incidentDate', 120)}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-600"
                      />
                    </th>
                    <th style={{ width: widths.estimatedCost }} className="p-2 text-right relative">
                      Monto Est. CLP
                      <div 
                        onMouseDown={(e) => onMouseDown('estimatedCost', e)}
                        onDoubleClick={() => onColumnDoubleClick('estimatedCost', 140)}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-600"
                      />
                    </th>
                    <th style={{ width: widths.status }} className="p-2 text-center relative">
                      Estado Siniestro
                      <div 
                        onMouseDown={(e) => onMouseDown('status', e)}
                        onDoubleClick={() => onColumnDoubleClick('status', 140)}
                        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-600"
                      />
                    </th>
                  </tr>
                  {/* ORIGINAL SCREEN COLUMN TEXT INLINE FILTERS */}
                  <tr className="bg-slate-50 border-b border-slate-300 divide-x divide-slate-300 select-all">
                    <td className="p-1 px-2 text-center bg-slate-200">
                      <div className="h-3 w-3 bg-slate-300 rounded-full mx-auto" />
                    </td>
                    <td className="p-1">
                      <input 
                        type="text"
                        className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[9px] font-bold font-mono tracking-wide shadow-inner focus:outline-none focus:ring-1 focus:ring-[#0B3C5D]/50"
                        value={colClaimNum}
                        onChange={e => setColClaimNum(e.target.value)}
                        placeholder="Filtrar..."
                      />
                    </td>
                    <td className="p-1">
                      <input 
                        type="text"
                        className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[9px] font-bold shadow-inner focus:outline-none focus:ring-1 focus:ring-[#0B3C5D]/50"
                        value={colProperty}
                        onChange={e => setColProperty(e.target.value)}
                        placeholder="Filtrar..."
                      />
                    </td>
                    <td className="p-1 bg-[#f5f5f5]" />
                    <td className="p-1">
                      <input 
                        type="text"
                        className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[9px] font-bold shadow-inner focus:outline-none focus:ring-1 focus:ring-[#0B3C5D]/50"
                        value={colType}
                        onChange={e => setColType(e.target.value)}
                        placeholder="Filtrar..."
                      />
                    </td>
                    <td className="p-1 bg-[#f5f5f5]" />
                    <td className="p-1 bg-[#f5f5f5]" />
                    <td className="p-1 bg-[#f5f5f5]" />
                    <td className="p-1">
                      <input 
                        type="text"
                        className="w-full bg-white border border-slate-300 rounded px-1.5 py-0.5 text-[9px] font-bold shadow-inner focus:outline-none focus:ring-1 focus:ring-[#0B3C5D]/50"
                        value={colStatus}
                        onChange={e => setColStatus(e.target.value)}
                        placeholder="Filtrar..."
                      />
                    </td>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {filteredClaims.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-14 text-center text-xs font-black text-slate-400 uppercase tracking-widest bg-slate-50">
                        Ningún reclamo registrado bajo el filtro actual
                      </td>
                    </tr>
                  ) : (
                    filteredClaims.map(({ claim, property }) => {
                      const isSelected = selectedClaim?.id === claim.id;
                      return (
                         <tr
                           key={claim.id}
                           style={{ height: `${getRowHeight(claim.id)}px` }}
                           onClick={() => {
                             setSelectedClaim(claim);
                             setSelectedClaimProperty(property);
                           }}
                           onDoubleClick={() => handleOpenEditClaimModal(claim, property.id)}
                           onContextMenu={(e) => {
                             e.preventDefault();
                             setSelectedClaim(claim);
                             setSelectedClaimProperty(property);
                             setGridContextMenu({ x: e.clientX, y: e.clientY, claim, property });
                           }}
                           className={`cursor-pointer divide-x divide-slate-150 text-[11px] font-bold hover:bg-slate-50 border-r border-transparent select-none transition-all relative group ${
                             isSelected ? 'bg-sky-50 shadow-sm border-l-4 border-amber-500' : 'bg-white'
                           }`}
                         >
                          <td className="p-2 text-center bg-slate-50 relative">
                            <div className="flex items-center justify-center">
                              <input 
                                type="radio" 
                                checked={isSelected}
                                onChange={() => {}} // Row onClick triggers it
                                className="h-3 w-3 text-[#0B3C5D] focus:ring-0 cursor-pointer"
                              />
                            </div>
                            <div
                              onMouseDown={(e) => onRowMouseDown(claim.id, e)}
                              onDoubleClick={() => onRowDoubleClick(claim.id, defaultRowHeight)}
                              className="absolute left-0 right-0 bottom-0 h-1 cursor-row-resize hover:bg-blue-600"
                            />
                          </td>
                          <td className="p-2 font-mono font-black text-[#0B3C5D] uppercase truncate bg-[#fbfcff]/50">{claim.claimNumber || 'S/N PENDING'}</td>
                          <td className="p-2 uppercase font-black text-slate-900">{property.code}</td>
                          <td className="p-2 uppercase text-slate-600 truncate">{property.building}</td>
                          <td className="p-2 uppercase">
                            <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded text-[9px] font-black font-mono tracking-wider">{claim.type}</span>
                          </td>
                          <td className="p-2 text-center uppercase">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold ${
                              claim.severity === 'CRÍTICA' ? 'bg-red-100 text-red-800' :
                              claim.severity === 'ALTA' ? 'bg-orange-100 text-orange-850' :
                              claim.severity === 'MEDIA' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'
                            }`}>
                              {claim.severity}
                            </span>
                          </td>
                          <td className="p-2 text-center text-slate-600 font-mono">{claim.incidentDate}</td>
                          <td className="p-2 text-right font-black text-slate-950 px-3 font-mono">
                            ${(claim.estimatedCost || 0).toLocaleString('es-CL')}
                          </td>
                          <td className="p-2 text-center">
                            <span className={`px-2 py-0.5 rounded text-[8px] font-black border uppercase tracking-wider ${
                              claim.status === 'LIQUIDADO' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              claim.status === 'RECHAZADO' ? 'bg-rose-50 text-rose-750 border-rose-200' :
                              claim.status === 'REPARACION' ? 'bg-blue-50 text-blue-750 border-blue-200' :
                              claim.status === 'EN_LIQUIDACION' ? 'bg-purple-50 text-purple-750 border-purple-200' : 'bg-amber-50 text-amber-750 border-amber-200'
                            }`}>
                              {claim.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* CLAIMS PANEL CARD DRAWER */}
            <div className="w-[430px] bg-slate-50 border-l border-slate-300 flex flex-col overflow-y-auto no-print">
              {selectedClaim && selectedClaimProperty ? (
                <div className="p-5 space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-350 pb-3">
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Ficha de Liquidación F12017</p>
                      <h4 className="text-sm font-black text-slate-800 mt-1 uppercase text-ellipsis">Siniestro: {selectedClaim.claimNumber || 'Sin Cía Nº'}</h4>
                    </div>
                    <button 
                      onClick={() => {
                        setSelectedClaim(null);
                        setSelectedClaimProperty(null);
                      }}
                      className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-lg transition-all"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* PROPERTY DIRECT INFORMATION */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Activo Reclamado</p>
                    <div className="flex items-center gap-3">
                      <div className="bg-[#0B3C5D]/10 p-2 rounded-xl text-[#0B3C5D]">
                        <Building2 size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-slate-800 uppercase leading-none">{selectedClaimProperty.code} - {selectedClaimProperty.building}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase truncate mt-1 leading-normal">{selectedClaimProperty.address}</p>
                      </div>
                    </div>
                    {selectedClaimProperty.insurancePolicy && (
                      <div className="pt-2 border-t border-slate-100 flex justify-between text-[9px] font-bold text-slate-500 uppercase mt-1">
                        <span>Póliza: #{selectedClaimProperty.insurancePolicy.policyNumber}</span>
                        <span>Cía: {selectedClaimProperty.insurancePolicy.insuranceCompany}</span>
                      </div>
                    )}
                  </div>

                  {/* FINANCIAL BALANCES */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3.5">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide">Ledger de Costos Seguros (F12017)</span>
                      <span className="text-[10px] font-extrabold text-[#BF2424] bg-red-50 border border-red-100 px-1.5 rounded-lg font-mono">EST</span>
                    </div>
                    
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 text-[10px] uppercase font-extrabold">Efectos Daños Est.:</span>
                        <span className="font-extrabold text-slate-800 font-mono">${(selectedClaim.estimatedCost || 0).toLocaleString('es-CL')} CLP</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 text-[10px] uppercase font-extrabold">Deducible Contable:</span>
                        <span className="font-extrabold text-slate-500 font-mono">- ${(selectedClaim.deductibleAmount || 0).toLocaleString('es-CL')} CLP</span>
                      </div>
                      <div className="flex items-center justify-between text-xs border-b border-dashed border-slate-150 pb-2.5">
                        <span className="text-emerald-600 text-[10px] uppercase font-extrabold flex items-center gap-1">Indemnizado por Cía:</span>
                        <span className="font-extrabold text-emerald-700 font-mono">+ ${(selectedClaim.coveredAmount || 0).toLocaleString('es-CL')} CLP</span>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-slate-800 font-black text-[10px] uppercase flex items-center gap-1">
                          <DollarSign size={14} className="text-slate-450" />
                          Gasto Neto No Cubierto:
                        </span>
                        <span className="font-black text-xs text-rose-700 font-mono">
                          ${(Math.max(0, (selectedClaim.estimatedCost || 0) - (selectedClaim.coveredAmount || 0) - (selectedClaim.status === 'RECHAZADO' ? 0 : (selectedClaim.deductibleAmount || 0)))).toLocaleString('es-CL')} CLP
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* REAL-TIME TIMELINE EVENT LOGGER */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide">Bitácora / Cambios de Estado</span>
                      <span className="text-[9px] font-black text-emerald-600 uppercase bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 flex items-center gap-1">
                        <Activity size={10} /> Sistema
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Hito Registrado</label>
                          <select
                            value={newTimelineAction}
                            onChange={(e) => {
                              setNewTimelineAction(e.target.value);
                              if (e.target.value === 'CAMBIO_ESTADO') {
                                setClaimForm(prev => ({ ...prev, status: selectedClaim.status }));
                              } else {
                                setClaimForm(prev => ({ ...prev, coveredAmount: selectedClaim.coveredAmount || 0 }));
                              }
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-[10px] font-bold uppercase outline-none focus:ring-1 focus:ring-[#0B3C5D]"
                          >
                            <option value="REVISIÓN_AJUSTE">REVISIÓN DE AJUSTADOR</option>
                            <option value="CAMBIO_ESTADO">CAMBIO DE ESTADO</option>
                            <option value="PRESUPUESTO_OBRA">RECEPCIÓN DE PRESUPUESTO</option>
                            <option value="COBRO_INDEMNIZACIÓN">RECUPERACIÓN COBRO CÍA</option>
                            <option value="MEDIDA_DAÑO">APROBACIÓN DE REPARACIONES</option>
                            <option value="RESERVA_FONDO">REGISTRE COSTO TÉCNICO</option>
                          </select>
                        </div>
                        <div>
                          {newTimelineAction === 'CAMBIO_ESTADO' ? (
                            <>
                              <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Próximo Estado</label>
                              <select
                                value={claimForm.status}
                                onChange={(e) => setClaimForm({ ...claimForm, status: e.target.value as any })}
                                className="w-full bg-yellow-50 border border-yellow-200 text-yellow-950 rounded-xl px-2.5 py-1.5 text-[10px] font-black uppercase outline-none"
                              >
                                <option value="REPORTE_INICIAL">REPORTE INICIAL</option>
                                <option value="EN_LIQUIDACION">EN LIQUIDACIÓN</option>
                                <option value="REPARACION">EN REPARACIÓN</option>
                                <option value="LIQUIDADO">LIQUIDADO / CERRADO</option>
                                <option value="RECHAZADO">RECHAZADO / CERRADO</option>
                              </select>
                            </>
                          ) : (
                            <>
                              <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Monto Indemnizado Cía ($)</label>
                              <input
                                type="number"
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-[10px] font-bold font-mono outline-none focus:ring-1 focus:ring-[#0B3C5D]"
                                placeholder="CLP"
                                value={claimForm.coveredAmount !== undefined ? claimForm.coveredAmount : (selectedClaim.coveredAmount || 0)}
                                onChange={(e) => setClaimForm({ ...claimForm, coveredAmount: Number(e.target.value) })}
                              />
                            </>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Comentario Explicativo / Glosa</label>
                        <textarea
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-[10px] font-bold h-12 resize-none outline-none focus:ring-1 focus:ring-[#0B3C5D] placeholder:text-slate-300"
                          placeholder="Ingrese las observaciones del ajustador o hito de reparación..."
                          value={newTimelineNotes}
                          onChange={(e) => setNewTimelineNotes(e.target.value)}
                        />
                      </div>

                      <button
                        onClick={handleAddTimelineEvent}
                        className="w-full py-2 bg-[#0B3C5D] hover:bg-[#07243b] text-white text-[10px] font-black uppercase rounded-xl transition-all shadow shadow-[#0B3C5D]/20 flex items-center justify-center gap-1.5"
                      >
                        <PlusCircle size={12} /> Registrar Cambios en Ledger
                      </button>
                    </div>
                  </div>

                  {/* HISTORY ACCORDION */}
                  <div className="space-y-3">
                    <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-wider pl-1">Auditoría de Eventos Histórica</h5>
                    {selectedClaim.history && selectedClaim.history.length > 0 ? (
                      <div className="space-y-3.5 border-l-2 border-slate-200 ml-2.5 pl-4 py-1">
                        {selectedClaim.history.map((h: any) => (
                           <div key={h.id} className="relative space-y-1">
                             <div className="absolute -left-[22.5px] top-1.5 h-2.5 w-2.5 rounded-full bg-slate-400 border-2 border-slate-50" />
                             <div className="flex items-center justify-between text-[9px] text-slate-400 font-extrabold">
                               <span className="font-mono">{h.date}</span>
                               <span className="bg-slate-200 text-slate-700 px-1 py-0.2 rounded font-mono font-black">{h.user.toUpperCase()}</span>
                             </div>
                             <p className="text-[10px] font-black uppercase text-slate-700">{h.action.replace(/_/g, ' ')}</p>
                             <p className="text-[10px] font-bold text-slate-500 leading-normal bg-white p-2 rounded-xl border border-slate-100 shadow-sm">{h.notes}</p>
                           </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 bg-white/50 text-center rounded-2xl border border-dashed border-slate-200 text-[10px] font-extrabold text-slate-400">
                        No hay hitos reportados para este reclamo.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-401 select-none">
                  <ClipboardList size={44} className="text-slate-300 stroke-1 mb-3" />
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-700">Ficha Técnica de Seguros Vacía</p>
                  <p className="text-[10px] font-bold uppercase max-w-[260px] mt-1.5 text-slate-400 leading-relaxed">Seleccione un siniestro del Ledger en formato de grilla para registrar hitos de liquidación, gastos no cubiertos e indemnizaciones de Seguros.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR PÓLIZA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-indigo-600 p-3 rounded-2xl text-white">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Detalles de la Póliza</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Propiedad: {selectedProperty?.code}</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 grid grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Compañía de Seguros</label>
                <input 
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={policyForm.insuranceCompany}
                  onChange={e => setPolicyForm({...policyForm, insuranceCompany: e.target.value})}
                  placeholder="Ej: Mapfre, HDI, Sura..."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Número de Póliza</label>
                <input 
                  type="text"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={policyForm.policyNumber}
                  onChange={e => setPolicyForm({...policyForm, policyNumber: e.target.value})}
                  placeholder="Ej: 123456789"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Fecha Inicio Vigencia</label>
                <input 
                  type="date"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={policyForm.startDate}
                  onChange={e => setPolicyForm({...policyForm, startDate: e.target.value})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Fecha Término Vigencia</label>
                <div className="relative">
                  <input 
                    type="date"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                    value={policyForm.endDate}
                    onChange={e => setPolicyForm({...policyForm, endDate: e.target.value})}
                  />
                  {policyForm.endDate && (
                    <div className={`absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg text-[8px] font-black uppercase ${
                      (getDaysRemaining(policyForm.endDate) || 0) <= 30 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {getDaysRemaining(policyForm.endDate)} días
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Monto Cobertura (UF/CLP)</label>
                <input 
                  type="number"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={policyForm.coverageAmount}
                  onChange={e => setPolicyForm({...policyForm, coverageAmount: Number(e.target.value)})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Estado de Póliza</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-indigo-500/20"
                  value={policyForm.status}
                  onChange={e => setPolicyForm({...policyForm, status: e.target.value as any})}
                >
                  <option value="PENDIENTE">PENDIENTE</option>
                  <option value="VIGENTE">VIGENTE</option>
                  <option value="VENCIDA">VENCIDA</option>
                </select>
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">URL Documento Digital (PDF/Imagen)</label>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                    value={policyForm.documentUrl}
                    onChange={e => setPolicyForm({...policyForm, documentUrl: e.target.value})}
                    placeholder="https://servidor.com/poliza.pdf"
                  />
                  <input 
                    type="file"
                    className="hidden"
                    id="single-policy-upload"
                    accept=".pdf,image/*"
                    onChange={handleSingleFileUpload}
                  />
                  <button 
                    className="bg-slate-100 p-3 rounded-2xl text-slate-400 hover:bg-slate-200 transition-all"
                    title="Subir archivo"
                    onClick={() => document.getElementById('single-policy-upload')?.click()}
                  >
                    <Upload size={20} />
                  </button>
                </div>
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Observaciones</label>
                <textarea 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 h-24 resize-none"
                  value={policyForm.observations}
                  onChange={e => setPolicyForm({...policyForm, observations: e.target.value})}
                  placeholder="Detalles adicionales sobre la cobertura..."
                />
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-4">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-8 py-3 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase hover:bg-slate-50 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSavePolicy}
                className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-2"
              >
                <Save size={18} /> Guardar Cambios
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* VIEWER DE DOCUMENTO DIGITAL */}
      {isViewerOpen && viewingUrl && (
        <div className="fixed inset-0 z-[300] bg-slate-900/90 backdrop-blur-md flex flex-col p-4">
          <div className="flex justify-between items-center mb-4 px-4">
            <div className="flex items-center gap-3 text-white">
              <FileText size={24} />
              <h3 className="text-lg font-black uppercase tracking-tighter">Visor de Póliza Digital</h3>
            </div>
            <button 
              onClick={() => setIsViewerOpen(false)}
              className="p-3 bg-white/10 text-white hover:bg-white/20 rounded-full transition-all"
            >
              <X size={24} />
            </button>
          </div>
          <div className="flex-1 bg-white rounded-[40px] overflow-hidden shadow-2xl relative">
            {viewingUrl.toLowerCase().includes('.pdf') || viewingUrl.startsWith('data:application/pdf') ? (
              <iframe 
                src={viewingUrl} 
                className="w-full h-full border-none"
                title="Visor PDF"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center p-10 overflow-auto">
                <img 
                  src={viewingUrl} 
                  alt="Póliza Digital" 
                  className="max-w-full max-h-full object-contain shadow-lg" 
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4 no-print">
               <button 
                onClick={() => handleOpenInNewTab(viewingUrl)}
                className="bg-slate-900 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase flex items-center gap-2 shadow-2xl hover:bg-slate-800 transition-all"
              >
                <ExternalLink size={16} />
                Abrir en Nueva Pestaña
              </button>
              <a 
                href={viewingUrl} 
                download="poliza_seguro.pdf"
                className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase flex items-center gap-2 shadow-2xl hover:bg-indigo-700 transition-all"
              >
                <Download size={16} />
                Descargar Archivo
              </a>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONTROL DE SINIESTROS */}
      {isClaimModalOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[40px] w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header Dialog */}
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-red-50/20 shrink-0">
              <div className="flex items-center gap-4">
                <div className="bg-[#BF2424] p-3 rounded-2xl text-white">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">
                    {claimForm.id ? "Modificar Siniestro Reportado" : "Reportar Nuevo Siniestro de Propiedad"}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Formulario de Control de Seguros • F12017</p>
                </div>
              </div>
              <button 
                onClick={() => setIsClaimModalOpen(false)} 
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                title="Cerrar Formulario"
              >
                <X size={20} />
              </button>
            </div>

            {/* Inner Body Scroller */}
            <div className="p-8 overflow-y-auto space-y-6 flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2 md:col-span-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase select-none">Propiedad Afectada (Unidad de Negocio)</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-[#BF2424]/20"
                    value={targetPropertyId}
                    onChange={e => setTargetPropertyId(e.target.value)}
                    disabled={!!claimForm.id} // Lock property choice on edit to prevent identity confusion
                  >
                    <option value="">-- Seleccionar propiedad --</option>
                    {properties.map(p => (
                      <option key={p.id} value={p.id}>{p.code} - {p.building.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 col-span-2 md:col-span-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase select-none">Número de Siniestro (Cía / Liquidador)</label>
                  <input 
                    type="text"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold font-mono uppercase tracking-wide outline-none focus:ring-2 focus:ring-[#BF2424]/20"
                    value={claimForm.claimNumber || ''}
                    onChange={e => setClaimForm({...claimForm, claimNumber: e.target.value})}
                    placeholder="Ej: SIN-2026-0899"
                  />
                </div>

                <div className="space-y-1.5 col-span-2 md:col-span-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase select-none">Tipo de Riesgo / Siniestro</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-[#BF2424]/20"
                    value={claimForm.type || 'INUNDACIÓN'}
                    onChange={e => setClaimForm({...claimForm, type: e.target.value as any})}
                  >
                    <option value="INUNDACIÓN">INUNDACIÓN</option>
                    <option value="INCENDIO">INCENDIO</option>
                    <option value="ROBO">ROBO / ASALTO</option>
                    <option value="SISMO">SISMO / TERREMOTO</option>
                    <option value="ROTURA_VIDRIOS">ROTURA DE VIDRIOS</option>
                    <option value="DAÑO_ESTRUCTURAL">DAÑO ESTRUCTURAL</option>
                    <option value="OTROS">OTROS EVENTOS</option>
                  </select>
                </div>

                <div className="space-y-1.5 col-span-2 md:col-span-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase select-none">Severidad / Intensidad del Daño</label>
                  <select
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-[#BF2424]/20"
                    value={claimForm.severity || 'MEDIA'}
                    onChange={e => setClaimForm({...claimForm, severity: e.target.value as any})}
                  >
                    <option value="BAJA">BAJA PRIO</option>
                    <option value="MEDIA">MEDIA</option>
                    <option value="ALTA">ALTA PRIORIDAD</option>
                    <option value="CRÍTICA">CRÍTICA / DESASTRE</option>
                  </select>
                </div>

                <div className="space-y-1.5 col-span-2 md:col-span-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase select-none">Fecha de Incidente</label>
                  <input 
                    type="date"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-[#BF2424]/20"
                    value={claimForm.incidentDate || ''}
                    onChange={e => setClaimForm({...claimForm, incidentDate: e.target.value})}
                  />
                </div>

                <div className="space-y-1.5 col-span-2 md:col-span-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase select-none">Fecha de Notificación / Denuncio</label>
                  <input 
                    type="date"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-[#BF2424]/20"
                    value={claimForm.reportDate || ''}
                    onChange={e => setClaimForm({...claimForm, reportDate: e.target.value})}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase select-none">Daño Estimado Inicial ($ CLP)</label>
                  <input 
                    type="number"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold font-mono outline-none focus:ring-2 focus:ring-[#BF2424]/20"
                    value={claimForm.estimatedCost || 0}
                    onChange={e => setClaimForm({...claimForm, estimatedCost: Number(e.target.value)})}
                    placeholder="Monto estimado"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase select-none">Deducible Aplicado ($ CLP)</label>
                  <input 
                    type="number"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold font-mono outline-none focus:ring-2 focus:ring-[#BF2424]/20"
                    value={claimForm.deductibleAmount || 0}
                    onChange={e => setClaimForm({...claimForm, deductibleAmount: Number(e.target.value)})}
                    placeholder="Deducible"
                  />
                </div>

                <div className="space-y-1.5 col-span-2 md:col-span-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase select-none font-sans">Ajustador Asociado</label>
                  <input 
                    type="text"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-[#BF2424]/20"
                    value={claimForm.adjusterName || ''}
                    onChange={e => setClaimForm({...claimForm, adjusterName: e.target.value})}
                    placeholder="Ej: Juan de Dios Lagos"
                  />
                </div>

                <div className="space-y-1.5 col-span-2 md:col-span-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase select-none">Correo Electrónico Ajustador</label>
                  <input 
                    type="email"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-[#BF2424]/20"
                    value={claimForm.adjusterEmail || ''}
                    onChange={e => setClaimForm({...claimForm, adjusterEmail: e.target.value})}
                    placeholder="ajustador@aseguradora.cl"
                  />
                </div>

                <div className="col-span-2 space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase select-none">Documentos / Informe Técnico Ajustador (PDF/Img)</label>
                  <div className="flex gap-2.5">
                    <input 
                      type="text"
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 focus:ring-[#BF2424]/20"
                      value={claimForm.documentUrl || ''}
                      onChange={e => setClaimForm({...claimForm, documentUrl: e.target.value})}
                      placeholder="https://servidor.com/informe-siniestro.pdf"
                    />
                    <input 
                      type="file"
                      className="hidden"
                      id="single-claim-upload"
                      accept=".pdf,image/*"
                      onChange={handleClaimFileUpload}
                    />
                    <button 
                      className="bg-slate-100 p-3.5 rounded-2xl text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-all shadow-sm"
                      title="Subir archivo digital del siniestro"
                      type="button"
                      onClick={() => document.getElementById('single-claim-upload')?.click()}
                    >
                      <Upload size={18} />
                    </button>
                  </div>
                </div>

                <div className="col-span-2 space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase select-none">Descripción Técnico del Accidente / Daños</label>
                  <textarea 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-xs font-bold outline-none focus:ring-2 focus:ring-[#BF2424]/20 h-28 resize-none placeholder:text-slate-300"
                    value={claimForm.description || ''}
                    onChange={e => setClaimForm({...claimForm, description: e.target.value})}
                    placeholder="Ingrese observaciones contables, detalles sobre activos dañados o glosa descriptiva..."
                  />
                </div>
              </div>
            </div>

            {/* Actions Panel Footer */}
            <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-3.5 shrink-0">
              <button 
                onClick={() => setIsClaimModalOpen(false)}
                className="px-8 py-3 bg-white border-2 border-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase hover:bg-slate-50 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveClaim}
                className="px-8 py-3 bg-[#BF2424] hover:bg-[#a11a1a] text-white rounded-2xl font-black text-xs uppercase shadow-xl shadow-[#BF2424]/20 transition-all flex items-center gap-2"
              >
                <Save size={18} /> Guardar Cambios
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* MODAL DE RESULTADOS DE EXTRACCIÓN */}
      {showResultsModal && (
        <ExtractionResultsModal 
          results={extractionResults}
          onClose={() => setShowResultsModal(false)}
          onViewDoc={handleViewDocument}
        />
      )}

      {/* ERP GRID CONTEXT MENU */}
      {gridContextMenu && (
        <JDEGridContextMenu
          isOpen={!!gridContextMenu}
          x={gridContextMenu.x}
          y={gridContextMenu.y}
          programCode="P0010"
          programTitle="Control de Siniestros y Pólizas de Seguro"
          collectionName="properties"
          recordId={gridContextMenu.claim.id}
          recordFolio={gridContextMenu.claim.claimNumber || `SIN-${gridContextMenu.property.code}`}
          onClose={() => setGridContextMenu(null)}
          onViewDetail={() => {
            handleOpenEditClaimModal(gridContextMenu.claim, gridContextMenu.property.id);
            setGridContextMenu(null);
          }}
          onExportExcel={() => {
            exportClaimsToExcel();
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

// MODAL DE RESULTADOS DE EXTRACCIÓN
const ExtractionResultsModal: React.FC<{
  results: any[];
  onClose: () => void;
  onViewDoc: (url: string) => void;
}> = ({ results, onClose, onViewDoc }) => {
  return (
    <div className="fixed inset-0 z-[400] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-[40px] w-full max-w-5xl max-h-[85vh] shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-indigo-50/50">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 p-3 rounded-2xl text-white">
              <CloudCheck size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Resultados de Procesamiento IA</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Se han procesado {results.length} documentos</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-8">
          <div className="bg-slate-50 rounded-3xl border border-slate-200 overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200">
                  <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Archivo / IA</th>
                  <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Compañía / Póliza</th>
                  <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Propiedad Detectada</th>
                  <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Detalles Propiedad</th>
                  <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Vigencia</th>
                  <th className="px-6 py-4 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                  <th className="px-6 py-4 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest">Doc</th>
                </tr>
              </thead>
              <tbody>
                {results.map((res, idx) => (
                  <tr key={idx} className="border-b border-slate-200 hover:bg-white transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-[10px] font-black text-slate-900 truncate max-w-[150px]">{res.fileName}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <div className="w-16 h-1 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ width: `${res.confidenceScore}%` }} />
                        </div>
                        <span className="text-[8px] font-bold text-slate-400">{res.confidenceScore}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[10px] font-black text-slate-700 uppercase">{res.insuranceCompany}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">#{res.policyNumber}</p>
                    </td>
                    <td className="px-6 py-4">
                      {res.matchedPropertyId ? (
                        <div className="flex items-center gap-2">
                          <div className="bg-emerald-100 p-1.5 rounded-lg text-emerald-600">
                            <CheckCircle2 size={12} />
                          </div>
                          <p className="text-[10px] font-black text-emerald-700 uppercase">{res.matchedPropertyName}</p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="bg-rose-100 p-1.5 rounded-lg text-rose-600">
                            <AlertCircle size={12} />
                          </div>
                          <p className="text-[10px] font-black text-rose-700 uppercase">Creada (IA)</p>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="text-[8px] font-bold text-slate-400 uppercase">ROL: {res.propertyRole || '---'}</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">Sup: {res.surfaceAreaBuilt || '---'} m2</p>
                        <p className="text-[8px] font-bold text-slate-400 uppercase">Año: {res.constructionYear || '---'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[9px] font-bold text-slate-600 uppercase">{res.startDate} al {res.endDate}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {res.matchedPropertyId ? (
                        <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[8px] font-black rounded-full border border-emerald-100 uppercase">Vinculada</span>
                      ) : (
                        <span className="px-2 py-1 bg-rose-50 text-rose-700 text-[8px] font-black rounded-full border border-rose-100 uppercase">Ignorada</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => onViewDoc(res.documentUrl)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!results.some(r => r.matchedPropertyId) && (
            <div className="mt-6 p-6 bg-amber-50 rounded-3xl border border-amber-200 flex items-center gap-4">
              <AlertCircle className="text-amber-600" size={24} />
              <div>
                <p className="text-xs font-black text-amber-900 uppercase">Atención: No se detectaron coincidencias automáticas</p>
                <p className="text-[10px] font-bold text-amber-700 uppercase mt-1">Asegúrese de que las direcciones en las pólizas coincidan con las registradas en el sistema o que los códigos de propiedad sean correctos.</p>
              </div>
            </div>
          )}
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button 
            onClick={onClose}
            className="px-10 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase shadow-xl hover:bg-slate-800 transition-all"
          >
            Entendido
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default PropertyInsuranceModule;
