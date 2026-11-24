import React, { useState, useMemo } from 'react';
import { useNotification } from './NotificationProvider';
import { 
  ClipboardList, Plus, Search, Filter, Calendar, Clock, 
  AlertTriangle, CheckCircle2, PlayCircle, StopCircle,
  ChevronRight, MessageSquare, User, MapPin, Mail, DollarSign,
  ArrowRight, FileText, Camera, MoreVertical,
  History, TrendingUp, X, Trash2, CheckSquare, Square,
  Info, Hammer, Wrench, LayoutGrid, Table, Download, FileSpreadsheet, Save,
  Database, ChevronDown, Layers, ArrowLeft, Building2, Home, ExternalLink
} from 'lucide-react';
import { Solicitud, SolicitudUpdate, SolicitudSubtask, Property, Supplier, WorkOrder, WorkOrderLineItem, ModuleType, LeaseContract } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { exportSolicitudesToExcel } from '../lib/excelExport';
import { F980011DModal } from './F980011DModal';
import { useResizableColumns } from '../lib/useResizableColumns';
import { GridDimensionControls } from './common/GridDimensionControls';
import { JDEP4310OrderEntryModal } from './JDEP4310OrderEntryModal';
import { JDEGridContextMenu } from './JDEGridContextMenu';
import { NewSolicitudModal } from './NewSolicitudModal';
import { CHILE_TERRITORY_MASTER, getRegionByCommune } from '../lib/chileanRealEstateMaster';

const normalizeTextForApp = (text: string): string => {
  if (!text) return '';
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
};

interface SolicitudesModuleProps {
  solicitudes: Solicitud[];
  properties: Property[];
  suppliers: Supplier[];
  workOrders: WorkOrder[];
  leaseContracts?: LeaseContract[];
  onSave: (solicitud: Solicitud) => void;
  onDelete: (id: string) => void;
  onAddWorkOrder: (wo: WorkOrder) => void;
  onNavigateToModule: (module: ModuleType) => void;
  onAddProperty: (prop: Property) => void;
  onUpdateProperty?: (prop: Property) => void;
  onUpdateSupplier?: (supp: Supplier) => void;
  onUpdateWorkOrder?: (wo: WorkOrder) => void;
  currentUser: string;
}

const SolicitudesModule: React.FC<SolicitudesModuleProps> = ({ 
  solicitudes, 
  properties, 
  suppliers,
  workOrders,
  leaseContracts,
  onSave, 
  onDelete,
  onAddWorkOrder,
  onNavigateToModule,
  onAddProperty,
  onUpdateProperty,
  onUpdateSupplier,
  onUpdateWorkOrder,
  currentUser 
}) => {
  const { notify } = useNotification();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [selectedSolicitud, setSelectedSolicitud] = useState<Solicitud | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isP4310RequisitionOpen, setIsP4310RequisitionOpen] = useState(false);
  const [gridContextMenu, setGridContextMenu] = useState<{ x: number; y: number; sol: Solicitud } | null>(null);
  const [isUpdateFormOpen, setIsUpdateFormOpen] = useState(false);
  const [isSubtaskFormOpen, setIsSubtaskFormOpen] = useState(false);
  
  // AssetFlow Enterprise Layout Mode
  const [layoutMode, setLayoutMode] = useState<'CARPETAS' | 'JDE_GRID'>('JDE_GRID');
  const [inspectTarget, setInspectTarget] = useState<Solicitud | null>(null);

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
      seq: 56,
      id: 96,
      title: 288,
      status: 128,
      priority: 112,
      category: 128,
      property: 192,
      commune: 128,
      date: 128,
      assignee: 160,
      ot: 128,
      modifiedAt: 144,
      modifiedBy: 160,
      actions: 112
    },
    initialRowHeight: 44,
    storageKey: 'solicitudes_grid'
  });
  
  // QBE (Query by Example) state fields for ERP Grid
  const [qbeId, setQbeId] = useState('');
  const [qbeTitle, setQbeTitle] = useState('');
  const [qbeStatus, setQbeStatus] = useState('ALL');
  const [qbePriority, setQbePriority] = useState('ALL');
  const [qbeCategory, setQbeCategory] = useState('ALL');
  const [qbeConjunto, setQbeConjunto] = useState('');
  const [qbeCommune, setQbeCommune] = useState('');
  const [qbeRegion, setQbeRegion] = useState('');
  const [qbeAddress, setQbeAddress] = useState('');
  const [qbeApplicant, setQbeApplicant] = useState('');
  const [qbeWorkOrder, setQbeWorkOrder] = useState('');
  const [qbeDate, setQbeDate] = useState('');
  const [qbeModifiedBy, setQbeModifiedBy] = useState('');
  const [qbeModifiedAt, setQbeModifiedAt] = useState('');
  
  // Master Lookup Modal States
  const [activeLookupMaster, setActiveLookupMaster] = useState<'NONE' | 'SOLICITUDES' | 'PROPIEDADES' | 'COMUNAS' | 'OT' | 'CONTRATISTAS'>('NONE');
  const [lookupSearchTerm, setLookupSearchTerm] = useState('');
  const [propLookupTab, setPropLookupTab] = useState<'CONDOMINIOS' | 'UNIDADES'>('CONDOMINIOS');

  // Drill-down states for Condominios / Conjuntos
  const [drilldownCondo, setDrilldownCondo] = useState<string | null>(null);
  const [drilldownSearchTerm, setDrilldownSearchTerm] = useState('');
  const [expandedCondoRows, setExpandedCondoRows] = useState<Record<string, boolean>>({});

  const toggleCondoRow = (condoName: string) => {
    setExpandedCondoRows(prev => ({
      ...prev,
      [condoName]: !prev[condoName]
    }));
  };

  // States for editing a record inside the lookup assistant
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editRecordType, setEditRecordType] = useState<'PROPIEDADES' | 'COMUNAS' | 'SOLICITUDES' | 'OT' | 'CONTRATISTAS' | null>(null);

  const closeLookupAssistant = () => {
    setActiveLookupMaster('NONE');
    setLookupSearchTerm('');
    setEditingRecordId(null);
    setEditRecordType(null);
    setDrilldownCondo(null);
    setDrilldownSearchTerm('');
    setExpandedCondoRows({});
  };

  const openLookupAssistant = (type: 'SOLICITUDES' | 'PROPIEDADES' | 'COMUNAS' | 'OT' | 'CONTRATISTAS', initialSearch = '') => {
    setEditingRecordId(null);
    setEditRecordType(null);
    setLookupSearchTerm(initialSearch || '');
    setDrilldownCondo(null);
    setDrilldownSearchTerm('');
    setExpandedCondoRows({});
    if (type === 'PROPIEDADES') {
      setPropLookupTab('CONDOMINIOS');
    }
    setActiveLookupMaster(type);
  };

  // Property edit fields
  const [editPropCode, setEditPropCode] = useState('');
  const [editPropBuilding, setEditPropBuilding] = useState('');
  const [editPropCommune, setEditPropCommune] = useState('');
  const [editPropRegion, setEditPropRegion] = useState('');
  const [editPropAddress, setEditPropAddress] = useState('');
  const [editPropType, setEditPropType] = useState<'DEPARTAMENTO' | 'CASA' | 'BODEGA' | 'ESTACIONAMIENTO' | 'LOCAL' | 'OFICINA'>('DEPARTAMENTO');

  // Commune (text only edit)
  const [editCommuneOldVal, setEditCommuneOldVal] = useState('');
  const [editCommuneNewVal, setEditCommuneNewVal] = useState('');

  // Solicitud edit fields
  const [editSolTitle, setEditSolTitle] = useState('');
  const [editSolDesc, setEditSolDesc] = useState('');
  const [editSolStatus, setEditSolStatus] = useState<'PENDIENTE' | 'EN_PROCESO' | 'DETENIDA' | 'FINALIZADA' | 'APROBADA_JEFATURA'>('PENDIENTE');
  const [editSolPriority, setEditSolPriority] = useState<'BAJA' | 'MEDIA' | 'ALTA' | 'CRÍTICA'>('BAJA');
  const [editSolCategory, setEditSolCategory] = useState<'REQUERIMIENTO' | 'MEJORA' | 'CONSULTA' | 'DOCUMENTACIÓN' | 'SERVICIOS' | 'REEMBOLSO'>('REQUERIMIENTO');

  // Supplier edit fields
  const [editSupplierName, setEditSupplierName] = useState('');
  const [editSupplierTaxId, setEditSupplierTaxId] = useState('');
  const [editSupplierEmail, setEditSupplierEmail] = useState('');
  const [editSupplierPhone, setEditSupplierPhone] = useState('');
  const [editSupplierAddress, setEditSupplierAddress] = useState('');
  const [editSupplierBankName, setEditSupplierBankName] = useState('');
  const [editSupplierAccountType, setEditSupplierAccountType] = useState('');
  const [editSupplierAccountNumber, setEditSupplierAccountNumber] = useState('');

  // WorkOrder edit fields
  const [editWOFolio, setEditWOFolio] = useState('');
  const [editWOPreparedBy, setEditWOPreparedBy] = useState('');
  const [editWOPreparedByDept, setEditWOPreparedByDept] = useState('');
  const [editWODeliverDate, setEditWODeliverDate] = useState('');
  const [editWOPaymentTerms, setEditWOPaymentTerms] = useState('');
  const [editWODeliverAddress, setEditWODeliverAddress] = useState('');

  const handleStartEditProp = (p: Property) => {
    setEditingRecordId(p.id);
    setEditRecordType('PROPIEDADES');
    setEditPropCode(p.code);
    setEditPropBuilding(p.building || p.conjunto || '');
    setEditPropCommune(p.commune);
    const foundReg = getRegionByCommune(p.commune);
    const regName = p.region || foundReg?.shortName || foundReg?.name || 'Metropolitana';
    setEditPropRegion(regName);
    setEditPropAddress(p.address || '');
    setEditPropType(p.type || 'DEPARTAMENTO');
  };

  const handleStartEditCommune = (c: string) => {
    setEditingRecordId(c);
    setEditRecordType('COMUNAS');
    setEditCommuneOldVal(c);
    setEditCommuneNewVal(c);
  };

  const handleStartEditSolicitud = (s: Solicitud) => {
    setEditingRecordId(s.id);
    setEditRecordType('SOLICITUDES');
    setEditSolTitle(s.title);
    setEditSolDesc(s.description);
    setEditSolStatus(s.status);
    setEditSolPriority(s.priority);
    setEditSolCategory(s.category);
  };

  const handleStartEditSupplier = (s: Supplier) => {
    setEditingRecordId(s.id);
    setEditRecordType('CONTRATISTAS');
    setEditSupplierName(s.name);
    setEditSupplierTaxId(s.taxId);
    setEditSupplierEmail(s.email);
    setEditSupplierPhone(s.phone);
    setEditSupplierAddress(s.address || '');
    setEditSupplierBankName(s.bankName || '');
    setEditSupplierAccountType(s.accountType || '');
    setEditSupplierAccountNumber(s.accountNumber || '');
  };

  const handleStartEditWorkOrder = (w: WorkOrder) => {
    setEditingRecordId(w.id);
    setEditRecordType('OT');
    setEditWOFolio(w.folio);
    setEditWOPreparedBy(w.preparedBy);
    setEditWOPreparedByDept(w.preparedByDept);
    setEditWODeliverDate(w.deliveryDate || '');
    setEditWOPaymentTerms(w.paymentTerms || '');
    setEditWODeliverAddress(w.deliveryAddress || '');
  };

  const handleSaveEditedRecord = () => {
    if (!editRecordType || !editingRecordId) return;

    if (editRecordType === 'PROPIEDADES') {
      const original = properties.find(p => p.id === editingRecordId);
      if (original) {
        const updated: Property = {
          ...original,
          code: editPropCode,
          building: editPropBuilding,
          commune: editPropCommune,
          region: editPropRegion,
          address: editPropAddress,
          type: editPropType,
        };
        if (onUpdateProperty) {
          onUpdateProperty(updated);
        } else {
          onAddProperty(updated);
        }
        notify('¡Propiedad guardada con éxito!', 'success');
      }
    } else if (editRecordType === 'COMUNAS') {
      properties.forEach(p => {
        if ((p.commune || '').toUpperCase().trim() === editCommuneOldVal.toUpperCase().trim()) {
          const updated: Property = {
            ...p,
            commune: editCommuneNewVal,
          };
          if (onUpdateProperty) onUpdateProperty(updated);
          else onAddProperty(updated);
        }
      });
      notify('¡Comuna actualizada con éxito!', 'success');
    } else if (editRecordType === 'SOLICITUDES') {
      const original = solicitudes.find(s => s.id === editingRecordId);
      if (original) {
        const updated: Solicitud = {
          ...original,
          title: editSolTitle,
          description: editSolDesc,
          status: editSolStatus,
          priority: editSolPriority,
          category: editSolCategory,
        };
        const audited = withAuditing(updated, original, currentUser);
        onSave(audited);
        notify('¡Solicitud guardada con éxito!', 'success');
      }
    } else if (editRecordType === 'CONTRATISTAS') {
      const original = suppliers.find(s => s.id === editingRecordId);
      if (original) {
        const updated: Supplier = {
          ...original,
          name: editSupplierName,
          taxId: editSupplierTaxId,
          email: editSupplierEmail,
          phone: editSupplierPhone,
          address: editSupplierAddress,
          bankName: editSupplierBankName,
          accountType: editSupplierAccountType,
          accountNumber: editSupplierAccountNumber,
        };
        if (onUpdateSupplier) {
          onUpdateSupplier(updated);
        }
        notify('¡Contratista guardado con éxito!', 'success');
      }
    } else if (editRecordType === 'OT') {
      const original = workOrders.find(w => w.id === editingRecordId);
      if (original) {
        const updated: WorkOrder = {
          ...original,
          folio: editWOFolio,
          preparedBy: editWOPreparedBy,
          preparedByDept: editWOPreparedByDept,
          deliveryDate: editWODeliverDate,
          paymentTerms: editWOPaymentTerms,
          deliveryAddress: editWODeliverAddress,
        };
        if (onUpdateWorkOrder) {
          onUpdateWorkOrder(updated);
        }
        notify('¡Orden de Trabajo guardada con éxito!', 'success');
      }
    }

    setEditingRecordId(null);
    setEditRecordType(null);
  };

  // Form Property Standardized Dropdown States
  const [selectedFormCommuneOpt, setSelectedFormCommuneOpt] = useState('SANTIAGO');
  const [customFormCommune, setCustomFormCommune] = useState('');
  const [selectedFormConjuntoOpt, setSelectedFormConjuntoOpt] = useState('');
  const [customFormConjunto, setCustomFormConjunto] = useState('');
  
  // OT Generation Modal States
  const [isOTFormOpen, setIsOTFormOpen] = useState(false);
  const [otSupplierId, setOtSupplierId] = useState('');
  const [otItemDescription, setOtItemDescription] = useState('');
  const [otUnitPrice, setOtUnitPrice] = useState<number>(0);
  const [otQuantity, setOtQuantity] = useState<number>(1);
  const [otDeliveryDate, setOtDeliveryDate] = useState('');
  const [otPaymentTerms, setOtPaymentTerms] = useState('FACTURA 30 DÍAS');
  const [otAccountCode, setOtAccountCode] = useState('5102010'); // Default Gasto Mantención

  // Form states
  const [newUpdateContent, setNewUpdateContent] = useState('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [newSubtaskDescription, setNewSubtaskDescription] = useState('');
  const [newSubtaskDueDate, setNewSubtaskDueDate] = useState('');
  const [newSubtaskAssignedTo, setNewSubtaskAssignedTo] = useState('');

  const withAuditing = (updated: Solicitud, original: Solicitud | null, user: string): Solicitud => {
    const nowStr = new Date().toISOString().split('T')[0] + ' ' + new Date().toTimeString().split(' ')[0].substring(0, 5);
    const statusHistory = updated.statusHistory ? [...updated.statusHistory] : [];
    
    // Track status change or lack thereof
    const hasStatusChanged = !original || original.status !== updated.status || statusHistory.length === 0;
    
    if (hasStatusChanged) {
      statusHistory.push({
        status: updated.status,
        date: nowStr,
        user: user,
        timestamp: Date.now()
      });
    }
    
    return {
      ...updated,
      lastModifiedAt: nowStr,
      lastModifiedBy: user,
      statusHistory
    };
  };

  const uniqueCommunes = useMemo(() => {
    return Array.from(new Set(properties.map(p => p.commune).filter(Boolean).map(c => c.toUpperCase().trim()))).sort();
  }, [properties]);

  const uniqueConjuntos = useMemo(() => {
    return Array.from(new Set(properties.map(p => p.conjunto || p.building).filter(Boolean).map(c => c.toUpperCase().trim()))).sort();
  }, [properties]);

  const condosGrouped = useMemo(() => {
    const map = new Map<string, {
      name: string;
      unitsCount: number;
      commune: string;
      region: string;
      address: string;
      sampleProperty: Property;
      units: Property[];
    }>();

    properties.forEach(p => {
      const name = (p.conjunto || p.building || 'SIN CONDOMINIO').toUpperCase().trim();
      const existing = map.get(name);
      const foundReg = getRegionByCommune(p.commune);
      const reg = p.region || foundReg?.shortName || foundReg?.name || 'Metropolitana';
      if (!existing) {
        map.set(name, {
          name,
          unitsCount: 1,
          commune: (p.commune || '').toUpperCase(),
          region: reg,
          address: p.address || '',
          sampleProperty: p,
          units: [p]
        });
      } else {
        existing.unitsCount += 1;
        existing.units.push(p);
        if (!existing.address && p.address) existing.address = p.address;
        if (!existing.commune && p.commune) existing.commune = p.commune.toUpperCase();
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [properties]);

  const propertiesById = useMemo(() => {
    const map = new Map<string, Property>();
    properties.forEach(p => map.set(p.id, p));
    return map;
  }, [properties]);

  const workOrdersById = useMemo(() => {
    const map = new Map<string, WorkOrder>();
    workOrders.forEach(w => map.set(w.id, w));
    return map;
  }, [workOrders]);

  const workOrdersByFolio = useMemo(() => {
    const map = new Map<string, WorkOrder>();
    workOrders.forEach(w => {
      if (w.folio) map.set(w.folio.toUpperCase(), w);
    });
    return map;
  }, [workOrders]);

  const filteredSolicitudes = useMemo(() => {
    return solicitudes.filter(sol => {
      // Look up associated property details for nested search / QBE filter
      const prop = propertiesById.get(sol.propertyId);
      const region = (prop?.region || 'METROPOLITANA').toUpperCase();
      const commune = (prop?.commune || 'SANTIAGO').toUpperCase();
      const conjunto = (prop?.conjunto || prop?.building || 'GENERAL').toUpperCase();
      const address = (prop?.address || '').toUpperCase();
      const applicant = (sol.applicantName || '').toUpperCase();
      const otFolio = (sol.workOrderFolio || '').toUpperCase();
      const shortId = sol.id.split('-')[0].toUpperCase();
      const modBy = (sol.lastModifiedBy || sol.userCreator || 'SISTEMA').toUpperCase();
      const modAt = (sol.lastModifiedAt || sol.requestDate || '').toUpperCase();

      // Standard overall controls
      const matchesSearch = searchTerm === '' || 
                            sol.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            sol.propertyLabel.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (sol.applicantName && sol.applicantName.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = filterStatus === 'ALL' || sol.status === filterStatus;
      const matchesCategory = filterCategory === 'ALL' || sol.category === filterCategory;

      // If we are in ERP grid mode, also apply fine-grained Query-By-Example (QBE) inputs
      if (layoutMode === 'JDE_GRID') {
        if (qbeId && !shortId.includes(qbeId.toUpperCase())) return false;
        if (qbeTitle && !sol.title.toUpperCase().includes(qbeTitle.toUpperCase())) return false;
        if (qbeStatus && qbeStatus !== 'ALL' && sol.status !== qbeStatus) return false;
        if (qbePriority && qbePriority !== 'ALL' && sol.priority !== qbePriority) return false;
        if (qbeCategory && qbeCategory !== 'ALL' && sol.category !== qbeCategory) return false;
        if (qbeConjunto && !conjunto.includes(qbeConjunto.toUpperCase())) return false;
        if (qbeCommune && !commune.includes(qbeCommune.toUpperCase())) return false;
        if (qbeRegion && !region.includes(qbeRegion.toUpperCase())) return false;
        if (qbeAddress && !address.includes(qbeAddress.toUpperCase())) return false;
        if (qbeApplicant && !applicant.includes(qbeApplicant.toUpperCase())) return false;
        if (qbeWorkOrder && !otFolio.includes(qbeWorkOrder.toUpperCase())) return false;
        if (qbeDate && !sol.requestDate.includes(qbeDate)) return false;
        if (qbeModifiedBy && !modBy.includes(qbeModifiedBy.toUpperCase())) return false;
        if (qbeModifiedAt && !modAt.includes(qbeModifiedAt.toUpperCase())) return false;
      }

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [
    solicitudes, propertiesById, searchTerm, filterStatus, filterCategory, layoutMode,
    qbeId, qbeTitle, qbeStatus, qbePriority, qbeCategory, qbeConjunto, qbeCommune,
    qbeRegion, qbeAddress, qbeApplicant, qbeWorkOrder, qbeDate, qbeModifiedBy, qbeModifiedAt
  ]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDIENTE': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'EN_PROCESO': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'DETENIDA': return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'FINALIZADA': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'APROBADA_JEFATURA': return 'bg-purple-100 text-purple-700 border-purple-200 font-extrabold';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'CRÍTICA': return <AlertTriangle className="text-rose-600 animate-pulse" size={14} />;
      case 'ALTA': return <TrendingUp className="text-orange-500" size={14} />;
      case 'MEDIA': return <Clock className="text-blue-500" size={14} />;
      default: return <div className="w-3 h-3 rounded-full bg-slate-300" />;
    }
  };

  const handleAddUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSolicitud || !newUpdateContent.trim()) return;

    const normalizedContent = normalizeTextForApp(newUpdateContent);

    const newUpdate: SolicitudUpdate = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      content: normalizedContent,
      user: currentUser,
      timestamp: Date.now()
    };

    const updatedSolicitud: Solicitud = {
      ...selectedSolicitud,
      updates: [newUpdate, ...selectedSolicitud.updates]
    };

    const audited = withAuditing(updatedSolicitud, selectedSolicitud, currentUser);
    onSave(audited);
    setSelectedSolicitud(audited);
    setNewUpdateContent('');
    setIsUpdateFormOpen(false);
  };

  const handleToggleSubtask = (subtaskId: string) => {
    if (!selectedSolicitud) return;
    const currentSubtasks = selectedSolicitud.subtasks || [];
    const updatedSubtasks = currentSubtasks.map(sub => {
      if (sub.id === subtaskId) {
        const nextStatus = sub.status === 'FINALIZADA' ? 'PENDIENTE' : 'FINALIZADA';
        return {
          ...sub,
          status: nextStatus as any,
          completedAt: nextStatus === 'FINALIZADA' ? new Date().toISOString() : undefined
        };
      }
      return sub;
    });

    const updatedSolicitud: Solicitud = {
      ...selectedSolicitud,
      subtasks: updatedSubtasks
    };
    const audited = withAuditing(updatedSolicitud, selectedSolicitud, currentUser);
    onSave(audited);
    setSelectedSolicitud(audited);
  };

  const handleDeleteSubtask = (subtaskId: string) => {
    if (!selectedSolicitud) return;
    const currentSubtasks = selectedSolicitud.subtasks || [];
    const updatedSubtasks = currentSubtasks.filter(sub => sub.id !== subtaskId);

    const updatedSolicitud: Solicitud = {
      ...selectedSolicitud,
      subtasks: updatedSubtasks
    };
    const audited = withAuditing(updatedSolicitud, selectedSolicitud, currentUser);
    onSave(audited);
    setSelectedSolicitud(audited);
  };

  const handleCreateSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSolicitud || !newSubtaskTitle.trim()) return;

    const newSub = {
      id: crypto.randomUUID(),
      title: newSubtaskTitle.trim(),
      description: newSubtaskDescription.trim() || undefined,
      status: 'PENDIENTE' as const,
      dueDate: newSubtaskDueDate || undefined,
      assignedTo: newSubtaskAssignedTo.trim() || undefined
    };

    const updatedSolicitud: Solicitud = {
      ...selectedSolicitud,
      subtasks: [...(selectedSolicitud.subtasks || []), newSub]
    };

    const audited = withAuditing(updatedSolicitud, selectedSolicitud, currentUser);
    onSave(audited);
    setSelectedSolicitud(audited);
    
    // Reset Form
    setNewSubtaskTitle('');
    setNewSubtaskDescription('');
    setNewSubtaskDueDate('');
    setNewSubtaskAssignedTo('');
    setIsSubtaskFormOpen(false);
  };

  const handleUpdateStatus = (status: 'PENDIENTE' | 'EN_PROCESO' | 'DETENIDA' | 'FINALIZADA' | 'APROBADA_JEFATURA') => {
    if (!selectedSolicitud) return;

    const systemUpdate: SolicitudUpdate = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      content: `EL ESTADO DE LA SOLICITUD DE MANTENCIÓN FUE ACTUALIZADO A: ${status}`,
      user: 'SISTEMA',
      timestamp: Date.now()
    };

    const updated: Solicitud = {
      ...selectedSolicitud,
      status,
      updates: [systemUpdate, ...selectedSolicitud.updates]
    };

    const audited = withAuditing(updated, selectedSolicitud, currentUser);
    onSave(audited);
    setSelectedSolicitud(audited);
  };

  const handleOpenOTForm = () => {
    if (!selectedSolicitud) return;
    setOtItemDescription(`REPARACIÓN: ${selectedSolicitud.title}`);
    setOtDeliveryDate(new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString().split('T')[0]); // 1 week default
    setIsOTFormOpen(true);
  };

  const handleGenerateOTSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSolicitud) return;

    const supplierRef = suppliers.find(s => s.id === otSupplierId);
    if (!supplierRef) {
      alert('Por favor, seleccione un proveedor válido para la Orden de Trabajo.');
      return;
    }

    const year = new Date().getFullYear();
    const count = workOrders.length + 1;
    const otFolio = `OT-${year}-${count.toString().padStart(3, "0")}`;

    const lineItem: WorkOrderLineItem = {
      id: crypto.randomUUID(),
      description: otItemDescription.toUpperCase(),
      quantity: otQuantity > 0 ? otQuantity : 1,
      receivedQuantity: 0,
      unitPrice: otUnitPrice >= 0 ? otUnitPrice : 0,
      total: (otQuantity > 0 ? otQuantity : 1) * (otUnitPrice >= 0 ? otUnitPrice : 0),
      status: 'PENDIENTE'
    };

    const isFactura = supplierRef.taxDocumentType === 'FACTURA';
    const subtotal = lineItem.total;
    const iva = isFactura ? Math.round(subtotal * 0.19) : 0;
    const total = subtotal + iva;

    // Build the WorkOrder object complying with standard structure
    const newOT: WorkOrder = {
      id: crypto.randomUUID(),
      folio: otFolio,
      issueDate: new Date().toISOString().split("T")[0],
      preparedBy: currentUser,
      preparedByDept: "Inmobiliario",
      preparedByPhone: "N/A",
      preparedByEmail: `${currentUser.toLowerCase().replace(/\s+/g, '')}@inmobiliariapro.cl`,
      preparedAt: new Date().toISOString(),
      supplierId: supplierRef.id,
      supplierName: supplierRef.name,
      supplierTaxId: supplierRef.taxId,
      supplierTaxDocumentType: supplierRef.taxDocumentType,
      supplierAddress: supplierRef.address || "SANTIAGO CENTRO",
      supplierContact: supplierRef.contactName || "N/A",
      supplierPhone: supplierRef.phone || "N/A",
      supplierEmail: supplierRef.email || "N/A",
      quoteNumber: `SOL-${selectedSolicitud.id.split('-')[0].toUpperCase()}`,
      requestDate: new Date().toISOString().split("T")[0],
      reqDept: "Operaciones",
      deliveryDate: otDeliveryDate,
      paymentTerms: otPaymentTerms,
      deliveryAddress: selectedSolicitud.propertyLabel,
      items: [lineItem],
      subtotal,
      iva,
      total,
      specialInstructions: `OT GENERADA AUTOMÁTICAMENTE DESDE SOLICITUD DE MANTENCIÓN: ${selectedSolicitud.title}. DETALLE ADICIONAL: ${selectedSolicitud.description}`,
      status: 'BORRADOR', // As standard formulada
      propertyId: selectedSolicitud.propertyId,
      propertyLabel: selectedSolicitud.propertyLabel,
      accountCode: otAccountCode,
      timestamp: Date.now(),
      lockedBy: null,
      lockedAt: null
    };

    // Call callback to add work order at main App state
    onAddWorkOrder(newOT);

    // Update maintenance request reference and timeline
    const workOrderUpdate: SolicitudUpdate = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      content: `SE HA EMITIDO LA ORDEN DE TRABAJO ${newOT.folio} PARA EL PROVEEDOR "${newOT.supplierName.toUpperCase()}" POR UN TOTAL DE $${newOT.total.toLocaleString('es-CL')}. ESTADO: BORRADOR (ASIGNADA Y PENDIENTE DE VISTO BUENO EN SISTEMA ERP).`,
      user: 'SISTEMA',
      timestamp: Date.now()
    };

    const updatedSolicitud: Solicitud = {
      ...selectedSolicitud,
      status: 'EN_PROCESO', // Move status seamlessly to EN_PROCESO once work order is created
      workOrderId: newOT.id,
      workOrderFolio: newOT.folio,
      updates: [workOrderUpdate, ...selectedSolicitud.updates]
    };

    const audited = withAuditing(updatedSolicitud, selectedSolicitud, currentUser);
    onSave(audited);
    setSelectedSolicitud(audited);
    setIsOTFormOpen(false);

    // Clean form modal fields
    setOtSupplierId('');
    setOtItemDescription('');
    setOtQuantity(1);
    setOtUnitPrice(0);

    alert(`✅ ¡Excelente! Se ha generado exitosamente la Orden de Trabajo ${newOT.folio} para el proveedor ${newOT.supplierName}.`);
  };

  const handleExportGridExcel = () => {
    exportSolicitudesToExcel(
      filteredSolicitudes,
      properties,
      workOrders,
      `Solicitudes_Mantenimiento_JDE_Grid_${new Date().toISOString().split('T')[0]}`
    );
  };

  const renderDetailContent = (targetSol: Solicitud) => {
    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        {/* HEADER DETAILS */}
        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-200">
          <div className="flex justify-between items-start mb-6">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase border ${getStatusColor(targetSol.status)}`}>
                  {targetSol.status}
                </span>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  ID: {targetSol.id.split('-')[0]}
                </span>
              </div>
              <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">
                {targetSol.title}
              </h2>
              <p className="text-rose-600 font-bold text-xs uppercase flex items-center gap-2 max-w-md truncate" title={targetSol.propertyLabel}>
                <MapPin size={14} className="shrink-0" /> {targetSol.propertyLabel}
              </p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  if (confirm('¿Está seguro de que desea eliminar esta solicitud?')) {
                    onDelete(targetSol.id);
                    setSelectedSolicitud(null);
                  }
                }}
                className="p-3 text-slate-405 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all cursor-pointer"
                title="Eliminar Solicitud"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 py-6 border-y border-slate-100">
            <div className="space-y-1">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Categoría</p>
              <p className="text-xs font-black text-slate-700 uppercase">{targetSol.category}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Prioridad</p>
              <div className="flex items-center gap-2">
                {getPriorityIcon(targetSol.priority)}
                <p className="text-xs font-black text-slate-700 uppercase">{targetSol.priority}</p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha Petición</p>
              <p className="text-xs font-black text-slate-700 uppercase">{targetSol.requestDate}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Asignado A</p>
              <p className="text-xs font-black text-rose-600 uppercase">{targetSol.assignedTo || 'SIN ASIGNAR'}</p>
            </div>
          </div>

          {/* APPLICANT INFOBAR */}
          {(targetSol.applicantName || targetSol.applicantEmail) && (
            <div className="mt-6 flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                <User size={16} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1 font-sans">
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Solicitante</p>
                  <p className="text-xs font-black text-slate-700 uppercase">{targetSol.applicantName || 'S/I'}</p>
                </div>
                <div>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Email de Contacto</p>
                  <p className="text-xs font-bold text-slate-650 lowercase flex items-center gap-1.5"><Mail size={12} className="text-slate-400" /> {targetSol.applicantEmail || 'S/I'}</p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-6 space-y-2">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Descripción del Requerimiento</p>
            <p className="text-sm text-slate-600 font-semibold leading-relaxed bg-slate-50 p-5 rounded-2xl border border-slate-100 whitespace-pre-wrap">
              {targetSol.description}
            </p>
          </div>

          {targetSol.category === 'REEMBOLSO' && (
            <div className="mt-6 p-5 rounded-2xl bg-emerald-50 border-2 border-emerald-200 space-y-4">
              <div className="flex items-center gap-2 text-emerald-800">
                <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                  <DollarSign size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider">Detalles del Reembolso Solicitado</h4>
                  <p className="text-[9px] text-emerald-600 font-extrabold uppercase">Gastos de reparación acreditados por arrendatario</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white border border-emerald-100 rounded-xl p-3">
                  <span className="text-[8px] font-black text-emerald-700 block uppercase tracking-widest">Monto del Reembolso</span>
                  <span className="text-lg font-black text-emerald-950 font-mono">
                    ${targetSol.reimbursementAmount?.toLocaleString('es-CL')} CLP
                  </span>
                </div>

                {targetSol.reimbursementBankInfo && (
                  <div className="bg-white border border-emerald-100 rounded-xl p-3 space-y-1">
                    <span className="text-[8px] font-black text-emerald-700 block uppercase tracking-widest">Cuenta de Transferencia Bancaria</span>
                    <p className="text-[10px] font-bold text-slate-700 uppercase leading-normal">
                      <strong>Banco:</strong> {targetSol.reimbursementBankInfo.bankName}<br />
                      <strong>Tipo:</strong> {targetSol.reimbursementBankInfo.accountType.replace('_', ' ')}<br />
                      <strong>N° Cuenta:</strong> {targetSol.reimbursementBankInfo.accountNumber}<br />
                      <strong>RUT:</strong> {targetSol.reimbursementBankInfo.rut}<br />
                      <strong>Nombre:</strong> {targetSol.reimbursementBankInfo.holderName}
                    </p>
                  </div>
                )}
              </div>

              {targetSol.reimbursementReceipts && targetSol.reimbursementReceipts.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[8px] font-black text-emerald-700 block uppercase tracking-widest font-mono">Documentos y Boletas de Respaldo</span>
                  <div className="grid grid-cols-2 gap-2">
                    {targetSol.reimbursementReceipts.map((rec, i) => (
                      <div key={i} className="relative group rounded-lg overflow-hidden border border-emerald-200 aspect-video bg-white flex items-center justify-center">
                        {rec.startsWith('data:image') || rec.startsWith('http') ? (
                          <img src={rec} alt={`Boleta ${i+1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="flex flex-col items-center justify-center p-3 text-center">
                            <FileText size={24} className="text-emerald-600 mb-1" />
                            <span className="text-[8px] font-black uppercase text-emerald-800">Ver Archivo Adjunto</span>
                          </div>
                        )}
                        <a 
                          href={rec} 
                          target="_blank"
                          rel="noreferrer"
                          download={`Respaldo_Reembolso_${i+1}`} 
                          className="absolute bottom-1 right-1 bg-emerald-900/80 hover:bg-emerald-900 text-white px-2 py-0.5 text-[8px] font-black rounded uppercase flex items-center gap-1 opacity-100 transition-opacity"
                        >
                          <Download size={8} /> Ver / Descargar
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {targetSol.images && targetSol.images.length > 0 && (
            <div className="mt-6 space-y-2">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Evidencia Fotográfica (Arrendatario)</p>
              <div className="grid grid-cols-2 gap-3">
                {targetSol.images.map((img, i) => (
                  <div key={i} className="relative group rounded-xl overflow-hidden border border-slate-200 shadow-sm aspect-video bg-slate-50 flex items-center justify-center">
                    <img src={img} alt={`Adjunto ${i+1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <a 
                      href={img} 
                      download={`Evidencia_${i+1}.png`} 
                      className="absolute bottom-2 right-2 bg-slate-900/80 hover:bg-slate-900 text-white px-2.5 py-1 text-[9px] font-black rounded-lg uppercase flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Download size={10} /> Descargar
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* QUICK ACTIONS FOR STATUS */}
          <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap items-center gap-2">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-2">Progreso rápido:</span>
            <button 
              onClick={() => handleUpdateStatus('PENDIENTE')}
              className="px-3.5 py-2 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer"
            >
              Pendiente
            </button>
            <button 
              onClick={() => handleUpdateStatus('EN_PROCESO')}
              className="px-3.5 py-2 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer"
            >
              En Proceso
            </button>
            <button 
              onClick={() => handleUpdateStatus('DETENIDA')}
              className="px-3.5 py-2 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer"
            >
              Detener
            </button>
            <button 
              onClick={() => handleUpdateStatus('FINALIZADA')}
              className="px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer"
            >
              Finalizar
            </button>
            <button 
              onClick={() => handleUpdateStatus('APROBADA_JEFATURA')}
              className="px-3.5 py-2 bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 size={12} /> Aprobar Jefatura
            </button>
          </div>

          {/* OT DEVIATION INTERMEDIATE BANNER */}
          {targetSol.status === 'APROBADA_JEFATURA' && !targetSol.workOrderId && (
            <div className="mt-6 p-6 rounded-[24px] bg-purple-50/75 border-2 border-purple-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in zoom-in-95 duration-250">
              <div className="flex items-center gap-3.5 text-left">
                <div className="p-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl shadow-lg shadow-purple-150">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <p className="text-sm font-black text-purple-900 uppercase tracking-tight">Caso aprobado por Jefatura</p>
                  <p className="text-[10px] text-purple-700 font-extrabold uppercase mt-0.5">El requerimiento técnico está liberado para emitir Orden de Trabajo (OT) a contratista</p>
                </div>
              </div>
              <button
                onClick={handleOpenOTForm}
                className="flex items-center gap-2 px-5 py-3 bg-purple-700 hover:bg-purple-800 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md hover:shadow-lg hover:shadow-purple-200 active:scale-95 cursor-pointer shrink-0"
              >
                <Hammer size={14} /> Emitir OT ERP
              </button>
            </div>
          )}

          {targetSol.workOrderId && (
            <div className="mt-6 p-6 rounded-[24px] bg-emerald-50/75 border-2 border-emerald-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in zoom-in-95 duration-250">
              <div className="flex items-center gap-3.5 text-left">
                <div className="p-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl shadow-lg shadow-emerald-150">
                  <Wrench size={22} />
                </div>
                <div>
                  <p className="text-sm font-black text-emerald-900 uppercase tracking-tight">Orden de Trabajo (OT) Asociada</p>
                  <p className="text-[10px] text-emerald-700 font-extrabold uppercase mt-0.5">La orden se generó exitosamente con Folio #{targetSol.workOrderFolio}</p>
                </div>
              </div>
              <button
                onClick={() => onNavigateToModule('ORDENES')}
                className="flex items-center gap-2 px-5 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md hover:shadow-lg hover:shadow-emerald-200 active:scale-95 cursor-pointer shrink-0"
              >
                Ver OTs de Trabajo <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>

        {/* TRACKING AND AUDIT HISTORY CARD */}
        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-2xl">
              <History size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Historial de Trazabilidad y Auditoría</h3>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Control cronológico completo de cambios de estado y autorías</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* AUDIT SUMMARY STATS */}
            <div className="space-y-4 bg-slate-50 p-6 rounded-[24px] border border-slate-150">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">Detalles de Control de Calidad</h4>
              <div className="space-y-3 font-sans text-xs">
                <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm col-span-2">
                  <span className="font-bold text-slate-500 uppercase text-[9.5px]">Creador Original</span>
                  <span className="font-extrabold text-slate-700 uppercase">{targetSol.userCreator || 'SISTEMA'}</span>
                </div>
                <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                  <span className="font-bold text-slate-500 uppercase text-[9.5px]">Fecha de Creación</span>
                  <span className="font-mono text-slate-700">{targetSol.requestDate}</span>
                </div>
                <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                  <span className="font-bold text-slate-500 uppercase text-[9.5px]">Última Modificación</span>
                  <span className="font-mono text-slate-700">{targetSol.lastModifiedAt || targetSol.requestDate}</span>
                </div>
                <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm col-span-2">
                  <span className="font-bold text-slate-500 uppercase text-[9.5px]">Autor Último Cambio</span>
                  <span className="font-extrabold text-slate-700 uppercase">{targetSol.lastModifiedBy || targetSol.userCreator || 'SISTEMA'}</span>
                </div>
              </div>
            </div>

            {/* STATUS TIMELINE LOGS */}
            <div className="space-y-4">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">Evolución de Estados (Timeline)</h4>
              <div className="space-y-3 max-h-[190px] overflow-y-auto pr-2 custom-audit-scroll">
                {(!targetSol.statusHistory || targetSol.statusHistory.length === 0) ? (
                  <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100 italic text-slate-400 font-medium text-xs">
                    No se registra historial anterior de estados. El estado inicial es PENDIENTE.
                  </div>
                ) : (
                  [...targetSol.statusHistory].reverse().map((hist, i, arr) => (
                    <div key={i} className="flex gap-4 items-start relative pb-3 last:pb-0">
                      {i < arr.length - 1 && (
                        <span className="absolute left-[13px] top-7 bottom-0 w-0.5 bg-slate-200" />
                      )}
                      <div className="shrink-0 mt-1">
                        <div className="w-7 h-7 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center font-bold text-rose-600 text-[10px]">
                          {arr.length - i}
                        </div>
                      </div>
                      <div className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-150 shadow-sm relative text-xs">
                        <div className="flex justify-between items-center mb-1 flex-wrap gap-2">
                          <span className={`px-2.5 py-0.5 rounded-lg text-[8px] font-black uppercase text-center leading-none border inline-block ${getStatusColor(hist.status)}`}>
                            {hist.status}
                          </span>
                          <span className="text-[9.5px] font-mono text-slate-500 font-bold">{hist.date}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">
                          Por: <strong className="text-slate-700">{hist.user || 'SISTEMA'}</strong>
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* TWO SIDES GRID: SUBTASKS AND TIMELINE UPDATES */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* COLUMN 1: SUBTASKS */}
          <div className="bg-white rounded-[32px] p-8 border border-slate-200 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <CheckCircle2 className="text-rose-600" size={20} />
                  Plan de Trabajo (Tareas)
                </h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                  Subtareas y control de asignaciones
                </p>
              </div>
              
              <button 
                onClick={() => setIsSubtaskFormOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white rounded-xl font-black text-[9px] uppercase shadow-md shadow-rose-100 hover:bg-rose-700 transition-all border-b-2 border-rose-700 font-sans cursor-pointer"
              >
                <Plus size={12} /> Nueva Tarea
              </button>
            </div>

            <div className="space-y-3">
              {(!targetSol.subtasks || targetSol.subtasks.length === 0) ? (
                <div className="bg-slate-50 rounded-2xl p-8 border border-dashed border-slate-200 text-center text-slate-400">
                  <p className="text-xs font-bold uppercase tracking-wider">No se han registrado subtareas</p>
                </div>
              ) : (
                targetSol.subtasks.map(sub => {
                  const isDone = sub.status === 'FINALIZADA';
                  return (
                    <div 
                      key={sub.id}
                      className={`flex items-start justify-between p-4 rounded-2xl border transition-all ${
                        isDone ? 'bg-slate-50 border-slate-150' : 'bg-white border-slate-200 hover:border-rose-200 shadow-sm'
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <button 
                          type="button"
                          onClick={() => handleToggleSubtask(sub.id)}
                          className="text-rose-600 p-0.5 rounded focus:outline-none shrink-0"
                        >
                          {isDone ? (
                            <CheckSquare size={18} className="text-emerald-600" />
                          ) : (
                            <Square size={18} className="text-slate-300" />
                          )}
                        </button>
                        
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-bold uppercase tracking-tight break-words ${isDone ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                            {sub.title}
                          </p>
                          {sub.description && (
                            <p className="text-[10px] text-slate-500 mt-0.5 font-medium whitespace-pre-wrap">{sub.description}</p>
                          )}
                          
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[9px] font-black text-slate-400 uppercase">
                            {sub.dueDate && (
                              <span className="flex items-center gap-1">
                                <Calendar size={10} /> Plazo: {sub.dueDate}
                              </span>
                            )}
                            {sub.assignedTo && (
                              <span className="flex items-center gap-1 text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                                <User size={10} /> {sub.assignedTo}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button 
                        type="button"
                        onClick={() => confirm('¿Eliminar esta subtarea?') && handleDeleteSubtask(sub.id)}
                        className="text-slate-300 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors shrink-0 ml-2 cursor-pointer"
                        title="Eliminar Subtarea"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* COLUMN 2: TRACK UPDATES */}
          <div className="bg-white rounded-[32px] p-8 border border-slate-200 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <History className="text-rose-600" size={20} />
                  Historial de Avances
                </h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                  Bitácora de seguimiento semanal
                </p>
              </div>
              
              <button 
                onClick={() => setIsUpdateFormOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white rounded-xl font-black text-[9px] uppercase shadow-md shadow-rose-100 hover:bg-rose-700 transition-all border-b-2 border-rose-700 cursor-pointer font-sans"
              >
                <Plus size={14} /> Registrar Avance
              </button>
            </div>

            <div className="relative space-y-6 before:absolute before:left-6 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {!targetSol.updates || targetSol.updates.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 border border-dashed border-slate-200 text-center">
                  <p className="text-xs font-bold text-slate-400 uppercase">Sin avances registrados aún</p>
                </div>
              ) : (
                targetSol.updates.map((update, idx) => (
                  <div key={update.id} className="relative pl-12 animate-in slide-in-from-left-4" style={{ animationDelay: `${idx * 80}ms` }}>
                    <div className="absolute left-[18px] top-2.5 w-3 h-3 rounded-full bg-rose-600 border-2 border-white shadow-sm z-10" />
                    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 hover:border-rose-200 transition-all space-y-2">
                      <div className="flex justify-between items-center bg-slate-50 -mx-5 -mt-5 px-5 py-2.5 rounded-t-2xl border-b border-slate-100">
                        <div className="flex items-center gap-2 animate-none">
                          <div className="w-6 h-6 bg-rose-100 text-rose-700 rounded-lg flex items-center justify-center">
                            <User size={12} />
                          </div>
                          <div className="flex flex-col">
                            <p className="text-[9px] font-black text-slate-900 uppercase leading-none">{update.user}</p>
                            <p className="text-[8px] font-black text-slate-400 uppercase mt-0.5">{update.date}</p>
                          </div>
                        </div>
                        <span className="text-[8px] font-black text-slate-400 bg-slate-200/50 px-1.5 py-0.5 rounded">#{targetSol.updates.length - idx}</span>
                      </div>
                      <p className="text-xs text-slate-650 leading-relaxed font-semibold whitespace-pre-wrap pt-1">
                        {update.content}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-slate-50 overflow-auto">
      {/* HEADER */}
      <div className="bg-white border-b border-slate-200 py-3 px-4 md:px-6 shrink-0 overflow-x-auto min-w-0">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-600 text-white rounded-xl shadow-md">
              <ClipboardList size={18} />
            </div>
            <div>
              <h1 className="text-base font-black text-slate-900 uppercase tracking-tight leading-none">Solicitudes de Mantención</h1>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">Control de requerimientos y aprobación por Jefatura</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {/* Layout Mode Toggler */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 mr-1 shrink-0">
              <button
                type="button"
                onClick={() => setLayoutMode('JDE_GRID')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-black uppercase transition-all cursor-pointer ${
                  layoutMode === 'JDE_GRID'
                    ? 'bg-white text-slate-800 shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Vista Grilla ERP Excel"
              >
                <Table size={12} />
                <span className="hidden xs:inline">Grilla</span>
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('CARPETAS')}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[10px] font-black uppercase transition-all cursor-pointer ${
                  layoutMode === 'CARPETAS'
                    ? 'bg-white text-rose-600 shadow-sm border border-rose-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Vista de Carpetas"
              >
                <LayoutGrid size={12} />
                <span className="hidden xs:inline">Carpetas</span>
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
              <input 
                type="text"
                placeholder="Buscar..."
                className="pl-8 pr-2.5 py-1.5 bg-slate-100 border-transparent focus:bg-white focus:border-rose-650 rounded-lg text-xs font-bold outline-none transition-all w-24 sm:w-36 lg:w-40"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select 
              className="px-2 py-1.5 bg-slate-100 border-transparent rounded-lg text-[11px] font-bold outline-none focus:bg-white focus:border-rose-600 transition-all text-slate-700 uppercase"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="ALL">TODOS LOS ESTADOS</option>
              <option value="PENDIENTE">PENDIENTE</option>
              <option value="EN_PROCESO">EN PROCESO</option>
              <option value="DETENIDA">DETENIDA</option>
              <option value="FINALIZADA">FINALIZADA</option>
              <option value="APROBADA_JEFATURA">APROBADA POR JEFATURA</option>
            </select>
            <select 
              className="px-2 py-1.5 bg-slate-100 border-transparent rounded-lg text-[11px] font-bold outline-none focus:bg-white focus:border-rose-600 transition-all text-slate-700 uppercase animate-none"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="ALL">TODAS LAS CATEGORÍAS</option>
              <option value="REQUERIMIENTO">REQUERIMIENTO</option>
              <option value="MEJORA">MEJORA</option>
              <option value="CONSULTA">CONSULTA</option>
              <option value="DOCUMENTACIÓN">DOCUMENTACIÓN</option>
              <option value="SERVICIOS">SERVICIOS</option>
              <option value="REEMBOLSO">REEMBOLSOS DE GASTOS</option>
            </select>
            <button 
              type="button"
              onClick={() => setIsFormOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-black text-[11px] uppercase shadow-md shadow-rose-100 cursor-pointer transition-all active:scale-95 whitespace-nowrap"
            >
              <Plus size={14} /> <span className="hidden sm:inline">Nueva Solicitud</span><span className="inline sm:hidden">Nueva</span>
            </button>

            <button
              type="button"
              onClick={() => setIsP4310RequisitionOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#002D62] hover:bg-[#0A4B82] text-white rounded-lg font-black text-[11px] uppercase shadow-md cursor-pointer transition-all active:scale-95 whitespace-nowrap"
              title="P4310 - Emisión de Solicitud de Compra / Requisición ERP con Catálogo Maestro F4101"
            >
              <span className="bg-white/20 text-amber-300 px-1 py-0.2 rounded text-[9px] font-mono">P4310</span>
              <span>Nueva Solicitud ERP</span>
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-auto flex flex-col md:flex-row relative min-h-0">
        {layoutMode === 'CARPETAS' ? (
          <>
            {/* LIST */}
        <div className="w-full md:w-1/3 shrink-0 border-r border-slate-200 bg-white overflow-y-auto custom-audit-scroll max-h-[360px] md:max-h-none">
          <div className="p-4 space-y-3">
            {filteredSolicitudes.length === 0 ? (
              <div className="py-20 text-center space-y-4">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                  <ClipboardList size={32} />
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No se encontraron solicitudes</p>
              </div>
            ) : (
              filteredSolicitudes.map(sol => (
                <button
                  key={sol.id}
                  onClick={() => setSelectedSolicitud(sol)}
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all group ${
                    selectedSolicitud?.id === sol.id 
                      ? 'border-rose-600 bg-rose-50/30' 
                      : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase border ${getStatusColor(sol.status)}`}>
                      {sol.status}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {getPriorityIcon(sol.priority)}
                      <span className="text-[9px] font-black text-slate-400 uppercase">{sol.priority}</span>
                    </div>
                  </div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-1 group-hover:text-rose-600 transition-colors line-clamp-2">
                    <span className="flex items-center gap-1.5 flex-wrap">
                      {sol.isTest && (
                        <span className="shrink-0 bg-amber-100 text-amber-800 border border-amber-300 px-1 py-0.5 rounded text-[7px] font-black uppercase tracking-widest leading-none">TEST</span>
                      )}
                      <span>{sol.title}</span>
                    </span>
                  </h3>
                  <div className="space-y-1 mt-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase">
                      <MapPin size={12} className="text-slate-450" />
                      {sol.propertyLabel}
                    </div>
                    {sol.applicantName && (
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase">
                        <User size={12} className="text-slate-450" />
                        Sol: {sol.applicantName}
                      </div>
                    )}
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase">
                      <Calendar size={12} />
                      {sol.requestDate}
                    </div>
                    <div className="flex items-center gap-1 text-[9px] font-black text-rose-600 uppercase">
                      <MessageSquare size={12} />
                      {sol.updates?.length || 0} Avances
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* DETAILS */}
        <div className="flex-1 bg-slate-50 overflow-y-auto custom-audit-scroll">
          {selectedSolicitud ? (
            <div className="p-8 max-w-4xl mx-auto space-y-8">
              {/* HEADER DETAILS */}
              <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-200">
                <div className="flex justify-between items-start mb-6">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase border ${getStatusColor(selectedSolicitud.status)}`}>
                        {selectedSolicitud.status}
                      </span>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        ID: {selectedSolicitud.id.split('-')[0]}
                      </span>
                    </div>
                    <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic">
                      {selectedSolicitud.title}
                    </h2>
                    <p className="text-rose-600 font-bold text-xs uppercase flex items-center gap-2">
                      <MapPin size={14} /> {selectedSolicitud.propertyLabel}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        if (confirm('¿Está seguro de que desea eliminar esta solicitud?')) {
                          onDelete(selectedSolicitud.id);
                          setSelectedSolicitud(null);
                        }
                      }}
                      className="p-3 text-slate-405 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all cursor-pointer"
                      title="Eliminar Solicitud"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 py-6 border-y border-slate-100">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Categoría</p>
                    <p className="text-xs font-black text-slate-700 uppercase">{selectedSolicitud.category}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Prioridad</p>
                    <div className="flex items-center gap-2">
                      {getPriorityIcon(selectedSolicitud.priority)}
                      <p className="text-xs font-black text-slate-700 uppercase">{selectedSolicitud.priority}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha Petición</p>
                    <p className="text-xs font-black text-slate-700 uppercase">{selectedSolicitud.requestDate}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Asignado A</p>
                    <p className="text-xs font-black text-rose-600 uppercase">{selectedSolicitud.assignedTo || 'SIN ASIGNAR'}</p>
                  </div>
                </div>

                {/* APPLICANT INFOBAR */}
                {(selectedSolicitud.applicantName || selectedSolicitud.applicantEmail) && (
                  <div className="mt-6 flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                      <User size={16} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1 font-sans">
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Solicitante</p>
                        <p className="text-xs font-black text-slate-700 uppercase">{selectedSolicitud.applicantName || 'S/I'}</p>
                      </div>
                      <div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Email de Contacto</p>
                        <p className="text-xs font-bold text-slate-650 lowercase flex items-center gap-1.5"><Mail size={12} className="text-slate-400" /> {selectedSolicitud.applicantEmail || 'S/I'}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-6 space-y-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Descripción del Requerimiento</p>
                  <p className="text-sm text-slate-600 font-semibold leading-relaxed bg-slate-50 p-5 rounded-2xl border border-slate-100 whitespace-pre-wrap">
                    {selectedSolicitud.description}
                  </p>
                </div>

                {/* QUICK ACTIONS FOR STATUS */}
                <div className="mt-6 pt-6 border-t border-slate-100 flex flex-wrap items-center gap-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-2">Progreso rápido:</span>
                  <button 
                    onClick={() => handleUpdateStatus('PENDIENTE')}
                    className="px-3.5 py-2 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer"
                  >
                    Pendiente
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus('EN_PROCESO')}
                    className="px-3.5 py-2 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer"
                  >
                    En Proceso
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus('DETENIDA')}
                    className="px-3.5 py-2 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer"
                  >
                    Detener
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus('FINALIZADA')}
                    className="px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer"
                  >
                    Finalizar
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus('APROBADA_JEFATURA')}
                    className="px-3.5 py-2 bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 size={12} /> Aprobar Jefatura
                  </button>
                </div>

                {/* OT DEVIATION INTERMEDIATE BANNER */}
                {selectedSolicitud.status === 'APROBADA_JEFATURA' && !selectedSolicitud.workOrderId && (
                  <div className="mt-6 p-6 rounded-[24px] bg-purple-50/75 border-2 border-purple-105 border-purple-200 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in zoom-in-95 duration-250">
                    <div className="flex items-center gap-3.5 text-left">
                      <div className="p-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl shadow-lg shadow-purple-150">
                        <CheckCircle2 size={22} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-purple-900 uppercase tracking-tight">Caso aprobado por Jefatura</p>
                        <p className="text-[10px] text-purple-700 font-extrabold uppercase mt-0.5">El requerimiento técnico está liberado para emitir Orden de Trabajo (OT) a contratista</p>
                      </div>
                    </div>
                    <button
                      onClick={handleOpenOTForm}
                      className="flex items-center gap-2 px-5 py-3 bg-purple-700 hover:bg-purple-800 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md hover:shadow-lg hover:shadow-purple-200 active:scale-95 cursor-pointer shrink-0"
                    >
                      <Hammer size={14} /> Emitir OT ERP
                    </button>
                  </div>
                )}

                {selectedSolicitud.workOrderId && (
                  <div className="mt-6 p-6 rounded-[24px] bg-emerald-50/75 border-2 border-emerald-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in zoom-in-95 duration-250">
                    <div className="flex items-center gap-3.5 text-left">
                      <div className="p-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl shadow-lg shadow-emerald-150">
                        <Wrench size={22} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-emerald-900 uppercase tracking-tight">Orden de Trabajo (OT) Asociada</p>
                        <p className="text-[10px] text-emerald-700 font-extrabold uppercase mt-0.5">La orden se generó exitosamente con Folio #{selectedSolicitud.workOrderFolio}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onNavigateToModule('ORDENES')}
                      className="flex items-center gap-2 px-5 py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md hover:shadow-lg hover:shadow-emerald-200 active:scale-95 cursor-pointer shrink-0"
                    >
                      Ver OTs de Trabajo <ArrowRight size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* TWO SIDES GRID: SUBTASKS AND TIMELINE UPDATES */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* COLUMN 1: SUBTASKS */}
                <div className="bg-white rounded-[32px] p-8 border border-slate-200 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                        <CheckCircle2 className="text-rose-600" size={20} />
                        Plan de Trabajo (Tareas)
                      </h3>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                        Subtareas y control de asignaciones
                      </p>
                    </div>
                    
                    <button 
                      onClick={() => setIsSubtaskFormOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white rounded-xl font-black text-[9px] uppercase shadow-md shadow-rose-100 hover:bg-rose-700 transition-all border-b-2 border-rose-700 font-sans cursor-pointer"
                    >
                      <Plus size={12} /> Nueva Tarea
                    </button>
                  </div>

                  <div className="space-y-3">
                    {(!selectedSolicitud.subtasks || selectedSolicitud.subtasks.length === 0) ? (
                      <div className="bg-slate-50 rounded-2xl p-8 border border-dashed border-slate-200 text-center text-slate-400">
                        <p className="text-xs font-bold uppercase tracking-wider">No se han registrado subtareas</p>
                      </div>
                    ) : (
                      selectedSolicitud.subtasks.map(sub => {
                        const isDone = sub.status === 'FINALIZADA';
                        return (
                          <div 
                            key={sub.id}
                            className={`flex items-start justify-between p-4 rounded-2xl border transition-all ${
                              isDone ? 'bg-slate-50 border-slate-150' : 'bg-white border-slate-200 hover:border-rose-200 shadow-sm'
                            }`}
                          >
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <button 
                                type="button"
                                onClick={() => handleToggleSubtask(sub.id)}
                                className="text-rose-600 p-0.5 rounded focus:outline-none shrink-0"
                              >
                                {isDone ? (
                                  <CheckSquare size={18} className="text-emerald-600" />
                                ) : (
                                  <Square size={18} className="text-slate-300" />
                                )}
                              </button>
                              
                              <div className="min-w-0 flex-1">
                                <p className={`text-xs font-bold uppercase tracking-tight break-words ${isDone ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                                  {sub.title}
                                </p>
                                {sub.description && (
                                  <p className="text-[10px] text-slate-500 mt-0.5 font-medium whitespace-pre-wrap">{sub.description}</p>
                                )}
                                
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[9px] font-black text-slate-400 uppercase">
                                  {sub.dueDate && (
                                    <span className="flex items-center gap-1">
                                      <Calendar size={10} /> Plazo: {sub.dueDate}
                                    </span>
                                  )}
                                  {sub.assignedTo && (
                                    <span className="flex items-center gap-1 text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                                      <User size={10} /> {sub.assignedTo}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <button 
                              type="button"
                              onClick={() => confirm('¿Eliminar esta subtarea?') && handleDeleteSubtask(sub.id)}
                              className="text-slate-300 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors shrink-0 ml-2 cursor-pointer"
                              title="Eliminar Subtarea"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* COLUMN 2: TRACK UPDATES */}
                <div className="bg-white rounded-[32px] p-8 border border-slate-200 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                        <History className="text-rose-600" size={20} />
                        Historial de Avances
                      </h3>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                        Bitácora de seguimiento semanal
                      </p>
                    </div>
                    
                    <button 
                      onClick={() => setIsUpdateFormOpen(true)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white rounded-xl font-black text-[9px] uppercase shadow-md shadow-rose-100 hover:bg-rose-700 transition-all border-b-2 border-rose-700 cursor-pointer font-sans"
                    >
                      <Plus size={14} /> Registrar Avance
                    </button>
                  </div>

                  <div className="relative space-y-6 before:absolute before:left-6 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {!selectedSolicitud.updates || selectedSolicitud.updates.length === 0 ? (
                      <div className="bg-white rounded-3xl p-8 border border-dashed border-slate-200 text-center">
                        <p className="text-xs font-bold text-slate-400 uppercase">Sin avances registrados aún</p>
                      </div>
                    ) : (
                      selectedSolicitud.updates.map((update, idx) => (
                        <div key={update.id} className="relative pl-12 animate-in slide-in-from-left-4" style={{ animationDelay: `${idx * 80}ms` }}>
                          <div className="absolute left-[18px] top-2.5 w-3 h-3 rounded-full bg-rose-600 border-2 border-white shadow-sm z-10" />
                          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 hover:border-rose-200 transition-all space-y-2">
                            <div className="flex justify-between items-center bg-slate-50 -mx-5 -mt-5 px-5 py-2.5 rounded-t-2xl border-b border-slate-100">
                              <div className="flex items-center gap-2 animate-none">
                                <div className="w-6 h-6 bg-rose-100 text-rose-700 rounded-lg flex items-center justify-center">
                                  <User size={12} />
                                </div>
                                <div className="flex flex-col">
                                  <p className="text-[9px] font-black text-slate-900 uppercase leading-none">{update.user}</p>
                                  <p className="text-[8px] font-black text-slate-400 uppercase mt-0.5">{update.date}</p>
                                </div>
                              </div>
                              <span className="text-[8px] font-black text-slate-400 bg-slate-200/50 px-1.5 py-0.5 rounded">#{selectedSolicitud.updates.length - idx}</span>
                            </div>
                            <p className="text-xs text-slate-650 leading-relaxed font-semibold whitespace-pre-wrap pt-1">
                              {update.content}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-6">
              <div className="w-32 h-32 bg-white rounded-[40px] shadow-xl flex items-center justify-center text-slate-200">
                <FileText size={64} />
              </div>
              <div className="max-w-xs">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Seleccione una Solicitud</h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-2">
                  Elija un caso de la lista lateral para ver el detalle de solicitudes y actualizar sus hitos.
                </p>
              </div>
            </div>
          )}
        </div>
      </>
    ) : (
      <>
        {/* ERP COMPACT GRILLA CONTROLLER */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#F8FAFC]">
          {/* ERP SYSTEM AUDIT & METRICS ACTIONBAR */}
          <div className="bg-[#ECEFF1] border-b border-slate-300 px-6 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2.5 text-xs font-bold text-[#1e293b] shrink-0 font-sans">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-slate-700 text-white rounded-md px-2 py-0.5 text-[9px] font-black font-mono">FORM: W1511C</span>
              <span className="bg-[#fffbeb] border border-amber-350 text-amber-800 rounded-md px-2 py-0.5 text-[9px] font-black">GRID ORIGINAL ERP</span>
              <span className="text-[10px] font-black uppercase text-slate-600 tracking-wider">MANTENIMIENTO DE SOLICITUDES DE TRABAJO (QBE ACTIVO)</span>
            </div>
            
            <div className="flex items-center gap-3 self-end md:self-auto font-sans">
              <span className="text-[10px] font-mono text-slate-500 bg-white py-1 px-3 rounded-lg border border-slate-250 font-black shadow-sm">
                GRILLA REGISTROS: <strong className="text-rose-600">{filteredSolicitudes.length}</strong> DE <strong>{solicitudes.length}</strong>
              </span>
              
              <button
                type="button"
                onClick={handleExportGridExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[9.5px] font-black uppercase tracking-wider cursor-pointer active:scale-95 transition-all shadow-md shadow-emerald-50 whitespace-nowrap font-sans"
                title="Exportar registros filtrados a formato Excel (.xlsx) estructurado con Sub-tareas"
              >
                <FileSpreadsheet size={13} /> Exportar ERP Grid
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setQbeId('');
                  setQbeTitle('');
                  setQbeStatus('ALL');
                  setQbePriority('ALL');
                  setQbeCategory('ALL');
                  setQbeConjunto('');
                  setQbeCommune('');
                  setQbeRegion('');
                  setQbeAddress('');
                  setQbeApplicant('');
                  setQbeWorkOrder('');
                  setQbeDate('');
                  setQbeModifiedBy('');
                  setQbeModifiedAt('');
                  setSelectedSolicitud(null);
                }}
                className="px-2.5 py-1.5 text-[9.5px] font-black uppercase bg-white hover:bg-slate-50 text-slate-600 rounded-xl transition-all cursor-pointer border border-slate-205 shadow-sm font-sans"
                title="Limpiar todos los filtros Query By Example de las columnas"
              >
                Limpiar QBE
              </button>
              <GridDimensionControls
                defaultRowHeight={defaultRowHeight}
                onSetRowHeight={setDefaultRowHeight}
                onResetColumns={resetWidths}
                onResetRows={resetHeights}
                onResetAll={resetAll}
              />
            </div>
          </div>

          {/* ERP SPREADSHEET SCROLL CONTAINER */}
          <div className="flex-1 overflow-auto bg-white border-b border-slate-200 custom-audit-scroll">
            <table className="w-full text-left border-collapse table-fixed min-w-[1640px]">
              <thead className="bg-[#EAEAEA] sticky top-0 z-20 text-slate-705 border-b border-slate-350 shadow-sm font-sans uppercase">
                <tr className="divide-x divide-slate-300">
                  <th style={{ width: `${widths.seq}px` }} className="relative p-2.5 text-[10px] font-black text-center bg-[#E0E0E0] text-slate-700 select-none">
                    Seq.
                    <div onMouseDown={(e) => onMouseDown(e, 'seq')} onDoubleClick={() => onColumnDoubleClick('seq')} className="resizer" title="Arrastrar para cambiar ancho. Doble clic para restablecer." />
                  </th>
                  <th style={{ width: `${widths.id}px` }} className="relative p-2.5 text-[10px] font-black text-center bg-[#EBEBEB] text-slate-700 select-none">
                    ID Req.
                    <div onMouseDown={(e) => onMouseDown(e, 'id')} onDoubleClick={() => onColumnDoubleClick('id')} className="resizer" title="Arrastrar para cambiar ancho. Doble clic para restablecer." />
                  </th>
                  <th style={{ width: `${widths.title}px` }} className="relative p-2.5 text-[10px] font-black bg-[#EBEBEB] text-slate-700 select-none">
                    Detalle Solicitud (Glosa Requerimiento)
                    <div onMouseDown={(e) => onMouseDown(e, 'title')} onDoubleClick={() => onColumnDoubleClick('title')} className="resizer" title="Arrastrar para cambiar ancho. Doble clic para restablecer." />
                  </th>
                  <th style={{ width: `${widths.status}px` }} className="relative p-2.5 text-[10px] font-black text-center bg-[#EBEBEB] text-slate-700 select-none">
                    Estado ERP
                    <div onMouseDown={(e) => onMouseDown(e, 'status')} onDoubleClick={() => onColumnDoubleClick('status')} className="resizer" title="Arrastrar para cambiar ancho. Doble clic para restablecer." />
                  </th>
                  <th style={{ width: `${widths.priority}px` }} className="relative p-2.5 text-[10px] font-black text-center bg-[#EBEBEB] text-slate-700 select-none">
                    Prioridad
                    <div onMouseDown={(e) => onMouseDown(e, 'priority')} onDoubleClick={() => onColumnDoubleClick('priority')} className="resizer" title="Arrastrar para cambiar ancho. Doble clic para restablecer." />
                  </th>
                  <th style={{ width: `${widths.category}px` }} className="relative p-2.5 text-[10px] font-black text-center bg-[#EBEBEB] text-slate-700 select-none">
                    Categoría
                    <div onMouseDown={(e) => onMouseDown(e, 'category')} onDoubleClick={() => onColumnDoubleClick('category')} className="resizer" title="Arrastrar para cambiar ancho. Doble clic para restablecer." />
                  </th>
                  <th style={{ width: `${widths.property}px` }} className="relative p-2.5 text-[10px] font-black bg-[#EBEBEB] text-slate-700 select-none">
                    Condominio / Conjunto
                    <div onMouseDown={(e) => onMouseDown(e, 'property')} onDoubleClick={() => onColumnDoubleClick('property')} className="resizer" title="Arrastrar para cambiar ancho. Doble clic para restablecer." />
                  </th>
                  <th style={{ width: `${widths.commune}px` }} className="relative p-2.5 text-[10px] font-black bg-[#EBEBEB] text-slate-700 select-none">
                    Comuna
                    <div onMouseDown={(e) => onMouseDown(e, 'commune')} onDoubleClick={() => onColumnDoubleClick('commune')} className="resizer" title="Arrastrar para cambiar ancho. Doble clic para restablecer." />
                  </th>
                  <th style={{ width: `${widths.date}px` }} className="relative p-2.5 text-[10px] font-black text-center bg-[#EBEBEB] text-slate-700 select-none font-sans">
                    Fecha Petición
                    <div onMouseDown={(e) => onMouseDown(e, 'date')} onDoubleClick={() => onColumnDoubleClick('date')} className="resizer" title="Arrastrar para cambiar ancho. Doble clic para restablecer." />
                  </th>
                  <th style={{ width: `${widths.assignee}px` }} className="relative p-2.5 text-[10px] font-black bg-[#EBEBEB] text-slate-700 select-none">
                    Asignado A
                    <div onMouseDown={(e) => onMouseDown(e, 'assignee')} onDoubleClick={() => onColumnDoubleClick('assignee')} className="resizer" title="Arrastrar para cambiar ancho. Doble clic para restablecer." />
                  </th>
                  <th style={{ width: `${widths.ot}px` }} className="relative p-2.5 text-[10px] font-black text-center bg-[#EBEBEB] text-slate-700 select-none">
                    OT Asociada
                    <div onMouseDown={(e) => onMouseDown(e, 'ot')} onDoubleClick={() => onColumnDoubleClick('ot')} className="resizer" title="Arrastrar para cambiar ancho. Doble clic para restablecer." />
                  </th>
                  <th style={{ width: `${widths.modifiedAt}px` }} className="relative p-2.5 text-[10px] font-black text-center bg-[#EBEBEB] text-slate-700 select-none font-sans">
                    Última Modif.
                    <div onMouseDown={(e) => onMouseDown(e, 'modifiedAt')} onDoubleClick={() => onColumnDoubleClick('modifiedAt')} className="resizer" title="Arrastrar para cambiar ancho. Doble clic para restablecer." />
                  </th>
                  <th style={{ width: `${widths.modifiedBy}px` }} className="relative p-2.5 text-[10px] font-black text-center bg-[#EBEBEB] text-slate-700 select-none font-sans">
                    Autor Modif.
                    <div onMouseDown={(e) => onMouseDown(e, 'modifiedBy')} onDoubleClick={() => onColumnDoubleClick('modifiedBy')} className="resizer" title="Arrastrar para cambiar ancho. Doble clic para restablecer." />
                  </th>
                  <th style={{ width: `${widths.actions}px` }} className="relative p-2.5 text-[10px] font-black text-center bg-[#EBEBEB] text-slate-700 select-none">
                    Acciones
                    <div onMouseDown={(e) => onMouseDown(e, 'actions')} onDoubleClick={() => onColumnDoubleClick('actions')} className="resizer" title="Arrastrar para cambiar ancho. Doble clic para restablecer." />
                  </th>
                </tr>
                
                {/* QBE FILTERS ROW */}
                <tr className="bg-[#FCFBE3] divide-x divide-amber-200/80 border-b border-amber-250">
                  <td className="p-1 px-1.5 text-center bg-[#F4F3D6] text-amber-800 font-extrabold text-[8.5px] tracking-wider select-none">QBE</td>
                  <td className="p-1">
                    <div className="flex items-center gap-0.5">
                      <input 
                        type="text"
                        placeholder="*"
                        value={qbeId}
                        onChange={(e) => { setQbeId(e.target.value); setSelectedSolicitud(null); }}
                        className="flex-1 min-w-0 bg-[#fefdf0] border border-amber-200 text-slate-800 text-[10px] uppercase font-bold py-1 px-1 rounded text-center outline-none focus:bg-white focus:border-rose-450 font-mono"
                        title="Filtro de Solicitud por ID"
                      />
                      <button 
                        type="button"
                        onClick={() => openLookupAssistant('SOLICITUDES', qbeId)}
                        className="p-1 shrink-0 bg-white hover:bg-rose-50 border border-slate-200 text-slate-500 hover:text-rose-600 rounded cursor-pointer transition-all active:scale-95"
                        title="Consultar Maestro de Solicitudes"
                      >
                        <Search size={10} />
                      </button>
                    </div>
                  </td>
                  <td className="p-1">
                    <input 
                      type="text"
                      placeholder="Buscar glosa..."
                      value={qbeTitle}
                      onChange={(e) => { setQbeTitle(e.target.value); setSelectedSolicitud(null); }}
                      className="w-full bg-[#fefdf0] border border-amber-200 text-slate-800 text-[10px] uppercase font-bold py-1 px-2 rounded outline-none focus:bg-white focus:border-rose-455 font-sans"
                      title="Filtro por título de requerimiento"
                    />
                  </td>
                  <td className="p-1">
                    <select 
                      value={qbeStatus}
                      onChange={(e) => { setQbeStatus(e.target.value); setSelectedSolicitud(null); }}
                      className="w-full bg-[#fefdf0] border border-amber-200 text-slate-800 text-[9px] uppercase font-black px-1 py-1 rounded outline-none focus:bg-white focus:border-rose-455 font-sans"
                    >
                      <option value="ALL">*</option>
                      <option value="PENDIENTE">PENDIENTE</option>
                      <option value="EN_PROCESO">EN PROCESO</option>
                      <option value="DETENIDA">DETENIDA</option>
                      <option value="FINALIZADA">FINALIZADA</option>
                      <option value="APROBADA_JEFATURA">APROBADA</option>
                    </select>
                  </td>
                  <td className="p-1">
                    <select 
                      value={qbePriority}
                      onChange={(e) => { setQbePriority(e.target.value); setSelectedSolicitud(null); }}
                      className="w-full bg-[#fefdf0] border border-amber-200 text-slate-800 text-[9px] uppercase font-black px-1 py-1 rounded outline-none focus:bg-white focus:border-rose-455 font-sans"
                    >
                      <option value="ALL">*</option>
                      <option value="BAJA">BAJA</option>
                      <option value="MEDIA">MEDIA</option>
                      <option value="ALTA">ALTA</option>
                      <option value="CRÍTICA">CRÍTICA</option>
                    </select>
                  </td>
                  <td className="p-1">
                    <select 
                      value={qbeCategory}
                      onChange={(e) => { setQbeCategory(e.target.value); setSelectedSolicitud(null); }}
                      className="w-full bg-[#fefdf0] border border-amber-200 text-slate-800 text-[9px] uppercase font-black px-1 py-1 rounded outline-none focus:bg-white focus:border-rose-455 font-sans"
                    >
                      <option value="ALL">*</option>
                      <option value="REQUERIMIENTO">REQUERIMIENTO</option>
                      <option value="MEJORA">MEJORA</option>
                      <option value="CONSULTA">CONSULTA</option>
                      <option value="DOCUMENTACIÓN">DOCUMENTO</option>
                      <option value="SERVICIOS">SERVICIOS</option>
                      <option value="REEMBOLSO">REEMBOLSO</option>
                    </select>
                  </td>
                  <td className="p-1">
                    <div className="flex items-center gap-0.5">
                      <select 
                        value={qbeConjunto}
                        onChange={(e) => { setQbeConjunto(e.target.value); setSelectedSolicitud(null); }}
                        className="flex-1 min-w-0 bg-[#fefdf0] border border-amber-200 text-slate-800 text-[9px] uppercase font-black px-1 py-1 rounded outline-none focus:bg-white focus:border-rose-455 font-sans"
                      >
                        <option value="">*</option>
                        {uniqueConjuntos.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <button 
                        type="button"
                        onClick={() => openLookupAssistant('PROPIEDADES', qbeConjunto)}
                        className="p-1 shrink-0 bg-white hover:bg-rose-50 border border-slate-200 text-slate-500 hover:text-rose-600 rounded cursor-pointer transition-all active:scale-95"
                        title="Consultar Maestro de Condominios y Propiedades"
                      >
                        <Search size={10} />
                      </button>
                    </div>
                  </td>
                  <td className="p-1">
                    <div className="flex items-center gap-0.5">
                      <select 
                        value={qbeCommune}
                        onChange={(e) => { setQbeCommune(e.target.value); setSelectedSolicitud(null); }}
                        className="flex-1 min-w-0 bg-[#fefdf0] border border-amber-200 text-slate-800 text-[9px] uppercase font-black px-1 py-1 rounded outline-none focus:bg-white focus:border-rose-455 font-sans"
                      >
                        <option value="">*</option>
                        {uniqueCommunes.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <button 
                        type="button"
                        onClick={() => openLookupAssistant('COMUNAS', qbeCommune)}
                        className="p-1 shrink-0 bg-white hover:bg-rose-50 border border-slate-200 text-slate-500 hover:text-rose-600 rounded cursor-pointer transition-all active:scale-95"
                        title="Consultar Maestro de Comunas"
                      >
                        <Search size={10} />
                      </button>
                    </div>
                  </td>
                  <td className="p-1">
                    <input 
                      type="date"
                      value={qbeDate}
                      onChange={(e) => { setQbeDate(e.target.value); setSelectedSolicitud(null); }}
                      onClick={(e) => { try { e.currentTarget.showPicker(); } catch (error) {} }}
                      className="w-full bg-[#fefdf0] hover:bg-[#fffcea] border border-amber-200 text-slate-800 text-[10px] uppercase font-bold py-1 px-1 rounded text-center outline-none focus:bg-white focus:border-rose-455 font-mono cursor-pointer transition-colors"
                      title="Seleccione fecha de petición en calendario"
                    />
                  </td>
                  <td className="p-1">
                    <div className="flex items-center gap-0.5">
                      <input 
                        type="text"
                        placeholder="Asignación..."
                        value={qbeApplicant}
                        onChange={(e) => { setQbeApplicant(e.target.value); setSelectedSolicitud(null); }}
                        className="flex-1 min-w-0 bg-[#fefdf0] border border-amber-200 text-slate-800 text-[10px] uppercase font-bold py-1 px-2 rounded outline-none focus:bg-white focus:border-rose-455 font-sans"
                      >
                      </input>
                      <button 
                        type="button"
                        onClick={() => openLookupAssistant('CONTRATISTAS', qbeApplicant)}
                        className="p-1 shrink-0 bg-white hover:bg-rose-50 border border-slate-200 text-slate-500 hover:text-rose-600 rounded cursor-pointer transition-all active:scale-95"
                        title="Consultar Maestro de Contratistas"
                      >
                        <Search size={10} />
                      </button>
                    </div>
                  </td>

                  <td className="p-1">
                    <div className="flex items-center gap-0.5">
                      <input 
                        type="text"
                        placeholder="OT-XXXX"
                        value={qbeWorkOrder}
                        onChange={(e) => { setQbeWorkOrder(e.target.value); setSelectedSolicitud(null); }}
                        className="flex-1 min-w-0 bg-[#fefdf0] border border-amber-200 text-slate-800 text-[10px] uppercase font-bold py-1 px-1 rounded text-center outline-none focus:bg-white focus:border-rose-455 font-mono"
                      />
                      <button 
                        type="button"
                        onClick={() => openLookupAssistant('OT', qbeWorkOrder)}
                        className="p-1 shrink-0 bg-white hover:bg-rose-50 border border-slate-200 text-slate-500 hover:text-rose-600 rounded cursor-pointer transition-all active:scale-95"
                        title="Consultar Maestro de Órdenes de Trabajo"
                      >
                        <Search size={10} />
                      </button>
                    </div>
                  </td>

                  <td className="p-1">
                    <input 
                      type="date"
                      value={qbeModifiedAt}
                      onChange={(e) => { setQbeModifiedAt(e.target.value); setSelectedSolicitud(null); }}
                      onClick={(e) => { try { e.currentTarget.showPicker(); } catch (error) {} }}
                      className="w-full bg-[#fefdf0] hover:bg-[#fffcea] border border-amber-200 text-slate-800 text-[10px] uppercase font-bold py-1 px-1 rounded text-center outline-none focus:bg-white focus:border-rose-455 font-mono cursor-pointer transition-colors"
                      title="Seleccione fecha de modificación"
                    />
                  </td>
                  <td className="p-1">
                    <input 
                      type="text"
                      placeholder="Autor..."
                      value={qbeModifiedBy}
                      onChange={(e) => { setQbeModifiedBy(e.target.value); setSelectedSolicitud(null); }}
                      className="w-full bg-[#fefdf0] border border-amber-200 text-slate-800 text-[10px] uppercase font-bold py-1 px-2 rounded outline-none focus:bg-white focus:border-rose-455 font-sans"
                      title="Filtrar por autor de última modificación"
                    />
                  </td>
                  <td className="p-1 bg-[#F4F3D6] text-center">
                    <span className="text-[8px] font-black text-amber-600 block leading-none font-sans">QBE ACTIVO</span>
                  </td>
                </tr>
              </thead>
              
              <tbody className="divide-y divide-slate-205 text-[11px] font-semibold text-slate-700 bg-white font-sans">
                {filteredSolicitudes.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="p-16 text-center text-slate-400 font-bold uppercase tracking-widest bg-slate-50/50">
                      No existen registros para los filtros QBE aplicados en las columnas.
                    </td>
                  </tr>
                ) : (
                  filteredSolicitudes.map((sol, index) => {
                    const prop = propertiesById.get(sol.propertyId);
                    const isSelected = selectedSolicitud?.id === sol.id;

                    const assocWO = sol.workOrderId 
                      ? workOrdersById.get(sol.workOrderId) 
                      : (sol.workOrderFolio ? workOrdersByFolio.get(sol.workOrderFolio.toUpperCase()) : undefined);
                    
                    // Duration & SLA Level calculation
                    const reqDateObj = new Date(sol.requestDate);
                    let daysElapsed = 0;
                    const isCompleted = sol.status === 'FINALIZADA' || sol.status === 'APROBADA_JEFATURA';

                    if (isCompleted) {
                      const finalHistory = sol.statusHistory?.find(sh => sh.status === 'FINALIZADA' || sh.status === 'APROBADA_JEFATURA');
                      const finalDateStr = finalHistory?.date || sol.lastModifiedAt || sol.requestDate;
                      const parts = finalDateStr.split(' ')[0].split('-');
                      const finalDateObj = parts.length === 3 ? new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])) : new Date(finalDateStr);
                      if (!isNaN(finalDateObj.getTime())) {
                        daysElapsed = Math.max(0, Math.floor((finalDateObj.getTime() - reqDateObj.getTime()) / (1000 * 60 * 60 * 24)));
                      }
                    } else {
                      const today = new Date();
                      daysElapsed = Math.max(0, Math.floor((today.getTime() - reqDateObj.getTime()) / (1000 * 60 * 60 * 24)));
                    }

                    let slaText = 'PENDIENTE';
                    let slaBg = 'bg-slate-150 text-slate-700 border-slate-350';
                    if (isCompleted) {
                      if (daysElapsed <= 3) {
                        slaText = '⚡ SÚPER EFF. (0-3d)';
                        slaBg = 'bg-emerald-50 text-emerald-750 border-emerald-300';
                      } else if (daysElapsed <= 7) {
                        slaText = '✔ A TIEMPO (4-7d)';
                        slaBg = 'bg-indigo-50 text-indigo-750 border-indigo-250';
                      } else if (daysElapsed <= 15) {
                        slaText = '⚠ CON RETRASO (8-15d)';
                        slaBg = 'bg-amber-50 text-amber-750 border-amber-300';
                      } else {
                        slaText = '❌ FUERA DE SLA (>15d)';
                        slaBg = 'bg-rose-50 text-rose-750 border-rose-300';
                      }
                    } else {
                      if (daysElapsed <= 5) {
                        slaText = '⏳ EN PLAZO (0-5d)';
                        slaBg = 'bg-blue-50 text-blue-750 border-blue-250';
                      } else if (daysElapsed <= 15) {
                        slaText = '⏱ ADVERTENCIA (6-15d)';
                        slaBg = 'bg-yellow-50 text-amber-800 border-amber-350';
                      } else {
                        slaText = '🚨 EXCEDIDO (>15d)';
                        slaBg = 'bg-red-50 text-red-750 border-red-300';
                      }
                    }
                    
                    return (
                      <tr 
                        key={sol.id}
                        style={{ height: `${getRowHeight(sol.id)}px` }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setInspectTarget(sol);
                        }}
                        onClick={() => setSelectedSolicitud(sol)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setGridContextMenu({ x: e.clientX, y: e.clientY, sol });
                        }}
                        className={`divide-x divide-slate-150 hover:bg-[#fff9f9] cursor-pointer transition-colors ${
                          isSelected 
                            ? 'bg-rose-50/50 font-bold border-l-4 border-l-rose-600 shadow-sm' 
                            : 'even:bg-slate-50/40'
                        }`}
                        title="Doble clic para Consultar Atributos F980011D. Un clic para abrir Ficha"
                      >
                        <td className="relative p-2.5 text-center text-[10px] font-bold text-slate-400 bg-slate-105 bg-slate-100/50">
                          {index + 1}
                          <div
                            onMouseDown={(e) => onRowMouseDown(e, sol.id)}
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              onRowDoubleClick(sol.id);
                            }}
                            className="row-resizer"
                            title="Arrastrar para cambiar alto de fila (Shift para todas). Doble clic para restablecer."
                          />
                        </td>
                        <td className="p-2.5 text-center font-mono text-slate-550 font-bold text-[10px]">{sol.id.split('-')[0]}</td>
                        <td className="p-2.5 truncate uppercase font-extrabold text-[#111827]" title={sol.title}>
                          <div className="flex items-center gap-1.5">
                            {sol.isTest && (
                              <span className="shrink-0 bg-amber-100 text-amber-850 border border-amber-300 px-1 py-0.5 rounded text-[7px] font-black uppercase tracking-widest leading-none">TEST</span>
                            )}
                            <span className="truncate">{sol.title}</span>
                          </div>
                        </td>
                        <td className="p-2.5 text-center">
                          <span className={`px-2.5 py-0.5 rounded-lg text-[8px] font-black uppercase text-center leading-none border inline-block ${getStatusColor(sol.status)}`}>
                            {sol.status}
                          </span>
                        </td>
                        <td className="p-2.5 text-center">
                          <span className="inline-flex items-center gap-1.5">
                            {getPriorityIcon(sol.priority)}
                            <span className="text-[9px] font-black uppercase text-slate-600">{sol.priority}</span>
                          </span>
                        </td>
                        <td className="p-2.5 text-center uppercase text-[9px] text-slate-500 font-black">{sol.category}</td>
                        <td className="p-2.5 truncate uppercase text-slate-600 font-bold opacity-90" title={sol.propertyLabel}>
                          {prop?.conjunto || prop?.building || 'SIN ESPECIFICAR'}
                        </td>
                        <td className="p-1.5 px-2.5 truncate uppercase text-slate-550 font-bold opacity-80">{prop?.commune || 'SANTIAGO'}</td>
                        <td className="p-1.5 px-2.5 text-center font-mono text-[9.5px] text-slate-500">{sol.requestDate}</td>
                        <td className="p-1.5 px-2.5 truncate font-extrabold text-slate-600 uppercase" title={sol.applicantName}>
                          {sol.applicantName || 'SISTEMA'}
                        </td>

                        <td className="p-2.5 text-center">
                          {sol.workOrderFolio ? (
                            <span className="text-[9.5px] font-extrabold bg-slate-105 text-slate-700 px-2 py-0.5 rounded border border-slate-300 font-mono">
                              {sol.workOrderFolio}
                            </span>
                          ) : (
                            <span className="text-[9px] font-black text-slate-400">PENDIENTE OT</span>
                          )}
                        </td>

                        <td className="p-2 text-center font-mono text-[9.5px] text-slate-500">
                          {sol.lastModifiedAt || sol.requestDate}
                        </td>
                        <td className="p-2 text-center uppercase font-bold text-[9.5px] text-slate-600 truncate" title={sol.lastModifiedBy || sol.userCreator || 'SISTEMA'}>
                          {sol.lastModifiedBy || sol.userCreator || 'SISTEMA'}
                        </td>
                        <td className="p-2 text-center bg-slate-50/50">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSolicitud(sol);
                              }}
                              className="px-2 py-1 text-[8.5px] font-black uppercase bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white rounded border border-rose-250 transition-all cursor-pointer font-sans"
                            >
                              Ficha
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setInspectTarget(sol);
                              }}
                              className="p-1 text-slate-500 hover:text-[#0B3C5D] hover:bg-amber-100 rounded border border-slate-200 transition-all cursor-pointer"
                              title="F980011D: Consultar Maestro de Atributos"
                            >
                              <Database size={12} />
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
        </div>

        {/* FLOATING INSPECTOR SIDEBAR */}
        <AnimatePresence>
          {selectedSolicitud && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="w-full md:w-[650px] lg:w-[700px] shrink-0 border-l border-slate-205 bg-slate-100 h-full overflow-hidden shadow-2xl relative z-40 flex flex-col font-sans"
            >
              {/* DRAWER HEADER */}
              <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-50 shadow-sm shrink-0">
                <div className="flex items-center gap-2">
                  <span className="bg-[#475569] text-white px-2 py-0.5 rounded text-[8.5px] font-mono leading-none font-black uppercase">P1511C | DETALLE</span>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">Inspector General de Requerimiento</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSolicitud(null)}
                  className="p-1 px-3 text-[10px] font-extrabold bg-rose-50 text-rose-600 border border-rose-250 rounded-lg hover:bg-rose-100 transition-colors uppercase cursor-pointer"
                >
                  ✕ Cerrar Ficha
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-audit-scroll p-6 bg-slate-50">
                {renderDetailContent(selectedSolicitud)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </>
    )}
  </div>

      {/* FORM: NEW SOLICITUD MODAL (ASSETFLOW ENTERPRISE MULTI-STAGE ASSISTANT) */}
      <NewSolicitudModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        properties={properties}
        leaseContracts={leaseContracts}
        uniqueCommunes={uniqueCommunes}
        uniqueConjuntos={uniqueConjuntos}
        currentUser={currentUser}
        onSave={onSave}
        onAddProperty={onAddProperty}
        onSelectCreatedSolicitud={(newSol) => setSelectedSolicitud(newSol)}
      />


      {/* FORM: SUBTASK FORM MODAL */}
      {isSubtaskFormOpen && selectedSolicitud && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[32px] w-full max-w-md max-h-[90vh] shadow-2xl overflow-hidden flex flex-col font-sans"
          >
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
              <h3 className="text-md font-black text-slate-900 uppercase tracking-tight">Agregar Tarea Operativa</h3>
              <button onClick={() => setIsSubtaskFormOpen(false)} className="p-1 hover:bg-slate-200 rounded-full transition-colors cursor-pointer text-slate-400">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubtask} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Título de la Tarea*</label>
                <input 
                  type="text" 
                  required 
                  value={newSubtaskTitle}
                  onChange={e => setNewSubtaskTitle(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 uppercase outline-none focus:bg-white focus:border-rose-600 transition-all"
                  placeholder="QUÉ SE DEBE HACER (EJ: ENVIAR RESPUESTA EMAIL)"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Descripción / Instrucciones Adicionales</label>
                <textarea 
                  value={newSubtaskDescription}
                  onChange={e => setNewSubtaskDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700 outline-none focus:bg-white focus:border-rose-600 transition-all"
                  placeholder="Instrucciones menores o bitácora..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Plazo de entrega</label>
                  <input 
                    type="date" 
                    value={newSubtaskDueDate}
                    onChange={e => setNewSubtaskDueDate(e.target.value)}
                    onClick={(e) => { try { e.currentTarget.showPicker(); } catch (error) {} }}
                    className="w-full bg-slate-50 hover:bg-slate-100 border-2 border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-705 outline-none focus:bg-white focus:border-rose-600 transition-all cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Responsable</label>
                  <input 
                    type="text" 
                    value={newSubtaskAssignedTo}
                    onChange={e => setNewSubtaskAssignedTo(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 uppercase outline-none focus:bg-white focus:border-rose-600 transition-all"
                    placeholder="Diego Díaz"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsSubtaskFormOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs uppercase hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 bg-rose-600 text-white rounded-xl font-black text-xs uppercase hover:bg-rose-700 shadow-md shadow-rose-100 transition-all cursor-pointer"
                >
                  Asignar Tarea
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* FORM: TIMELINE UPDATE FORM MODAL */}
      {isUpdateFormOpen && selectedSolicitud && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[32px] w-full max-w-md max-h-[90vh] shadow-2xl overflow-hidden flex flex-col font-sans"
          >
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
              <h3 className="text-md font-black text-slate-900 uppercase tracking-tight">Registrar Nuevo Avance</h3>
              <button onClick={() => setIsUpdateFormOpen(false)} className="p-1 hover:bg-slate-200 rounded-full transition-colors cursor-pointer text-slate-400">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddUpdate} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Contenido del Avance / Comentario*</label>
                <textarea 
                  required
                  value={newUpdateContent}
                  onChange={e => setNewUpdateContent(normalizeTextForApp(e.target.value))}
                  rows={4}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-4 py-3 text-xs font-medium text-slate-850 outline-none focus:bg-white focus:border-rose-600 transition-all"
                  placeholder="Ej: Se coordinó con la gerencia para obtener la firma del documento. Se estima entrega para mañana."
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsUpdateFormOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs uppercase hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-5 py-2.5 bg-rose-600 text-white rounded-xl font-black text-xs uppercase hover:bg-rose-700 shadow-md shadow-rose-100 transition-all cursor-pointer"
                >
                  Postear Comentario
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* FORM: OT GENERATION FORM MODAL */}
      {isOTFormOpen && selectedSolicitud && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[40px] w-full max-w-xl max-h-[90vh] shadow-2xl overflow-hidden flex flex-col font-sans text-slate-800"
          >
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-4">
                <div className="bg-purple-600 p-3 rounded-2xl text-white animate-none">
                  <Hammer size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Generar Orden de Trabajo ERP</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Confección estandarizada de OT para contratista</p>
                </div>
              </div>
              <button onClick={() => setIsOTFormOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors cursor-pointer text-slate-400">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleGenerateOTSubmit} className="p-8 space-y-5 max-h-[70vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-550 uppercase tracking-widest ml-1">Proveedor / Contratista *</label>
                <select 
                  required
                  value={otSupplierId}
                  onChange={e => setOtSupplierId(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold text-slate-700 uppercase outline-none focus:bg-white focus:border-purple-600 transition-all"
                >
                  <option value="">-- SELECCIONE CONTRATISTA DE LA CARTERA --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.taxId} • SCO COMPLIANCE: {s.complianceMatches ? '100% CUMPLIDO' : 'SUJETA A EVALUACIÓN'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-550 uppercase tracking-widest ml-1">Glosa / Detalle del Servicio *</label>
                <input 
                  type="text" 
                  required 
                  value={otItemDescription}
                  onChange={e => setOtItemDescription(e.target.value)}
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold text-slate-800 uppercase outline-none focus:bg-white focus:border-purple-600 transition-all"
                  placeholder="DESCRIPCIÓN DE LA OBRA O ACCIÓN DE MANTENIMIENTO"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-550 uppercase tracking-widest ml-1">Cantidad</label>
                  <input 
                    type="number" 
                    required 
                    min={1}
                    value={otQuantity}
                    onChange={e => setOtQuantity(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-purple-600 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-550 uppercase tracking-widest ml-1">Precio Unitario ($ Neto)</label>
                  <input 
                    type="number" 
                    required 
                    min={0}
                    value={otUnitPrice}
                    onChange={e => setOtUnitPrice(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-purple-600 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-550 uppercase tracking-widest ml-1">Condición de Pago</label>
                  <select 
                    value={otPaymentTerms}
                    onChange={e => setOtPaymentTerms(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold text-slate-705 uppercase outline-none focus:bg-white focus:border-purple-600 transition-all"
                  >
                    <option value="FACTURA 30 DÍAS">FACTURA 30 DÍAS</option>
                    <option value="FACTURA 60 DÍAS">FACTURA 60 DÍAS</option>
                    <option value="CONTADO / EFECTIVO">CONTADO / EFECTIVO</option>
                    <option value="ANTICIPO 50% / SALDO 50%">ANTICIPO 50% / SALDO 50%</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-550 uppercase tracking-widest ml-1">Cuenta Contable Impútación</label>
                  <select 
                    value={otAccountCode}
                    onChange={e => setOtAccountCode(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold text-slate-705 uppercase outline-none focus:bg-white focus:border-purple-600 transition-all"
                  >
                    <option value="5102010">5102010 - GASTOS DE MANTENCIÓN PROPIEDAD</option>
                    <option value="5102020">5102020 - REPARACIONES MENORES EQUIPOS</option>
                    <option value="5102030">5102030 - CONTRATOS DE SERVICIOS GENERALES</option>
                    <option value="1103010">1103010 - ACTIVOS FIJOS EN CONSTRUCCIÓN</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-550 uppercase tracking-widest ml-1">Fecha de Entrega / Término de Obras</label>
                <input 
                  type="date" 
                  required
                  value={otDeliveryDate}
                  onChange={e => setOtDeliveryDate(e.target.value)}
                  onClick={(e) => { try { e.currentTarget.showPicker(); } catch (error) {} }}
                  className="w-full bg-slate-50 hover:bg-slate-100 border-2 border-slate-100 rounded-2xl px-4 py-3.5 text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-purple-600 transition-all cursor-pointer"
                />
              </div>

              <div className="bg-slate-100 p-4 rounded-3xl space-y-1.5 border border-slate-200">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Resumen de Importes Estimados</p>
                <div className="flex justify-between items-center text-xs text-left">
                  <span className="font-bold text-slate-500 uppercase">Monto Neto:</span>
                  <span className="font-black text-slate-800">${(otQuantity * otUnitPrice).toLocaleString('es-CL')} CLP</span>
                </div>
                <div className="flex justify-between items-center text-xs text-left">
                  <span className="font-bold text-slate-500 uppercase">IVA Estimado (19%):</span>
                  <span className="font-black text-slate-600">${Math.round(otQuantity * otUnitPrice * 0.19).toLocaleString('es-CL')} CLP</span>
                </div>
                <div className="flex justify-between items-center text-sm pt-1.5 border-t border-slate-200 text-left">
                  <span className="font-black text-slate-900 uppercase">Total Estimado Orden:</span>
                  <span className="font-black text-purple-700">${Math.round(otQuantity * otUnitPrice * 1.19).toLocaleString('es-CL')} CLP</span>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button 
                  type="button" 
                  onClick={() => setIsOTFormOpen(false)}
                  className="px-6 py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase hover:bg-slate-200 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-8 py-3.5 bg-purple-700 text-white rounded-2xl font-black text-xs uppercase hover:bg-purple-800 shadow-lg shadow-purple-100 transition-all cursor-pointer"
                >
                  Confirmar y Generar OT
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ERP MASTER SELECTOR SEARCH ASSIST / LUPA MODAL */}
      {activeLookupMaster !== 'NONE' && (
        <div 
          onClick={closeLookupAssistant}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="bg-amber-600 p-2.5 rounded-2xl text-white shadow-sm shadow-amber-200">
                  <Search size={18} />
                </div>
                <div>
                  <h3 className="text-md font-black text-slate-900 uppercase tracking-tight">
                    {activeLookupMaster === 'PROPIEDADES' ? 'Asistente de Consulta: Maestro de Condominios y Propiedades' :
                     activeLookupMaster === 'COMUNAS' ? 'Asistente de Consulta: Comunas' :
                     activeLookupMaster === 'SOLICITUDES' ? 'Asistente de Consulta: ID Requerimientos' :
                     activeLookupMaster === 'OT' ? 'Asistente de Consulta: Órdenes de Trabajo' :
                     'Asistente de Consulta: Contratistas / Personal'}
                  </h3>
                  <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    {activeLookupMaster === 'PROPIEDADES' 
                      ? 'Seleccione un Condominio o Unidad para filtrar la grilla de requerimientos' 
                      : 'Fórmula de Búsqueda Visual AssetFlow Enterprise'}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={closeLookupAssistant} 
                className="p-2 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-full transition-colors cursor-pointer"
                title="Cerrar asistente"
              >
                <X size={18} />
              </button>
            </div>

            {/* Selector Search Input & Tabs */}
            <div className="p-4 bg-amber-500/5 border-b border-amber-500/10 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-amber-600 pointer-events-none" />
                  <input 
                    type="text" 
                    value={lookupSearchTerm}
                    onChange={(e) => setLookupSearchTerm(e.target.value)}
                    placeholder={
                      activeLookupMaster === 'PROPIEDADES' 
                        ? (drilldownCondo
                            ? `BUSCAR UNIDAD EN ${drilldownCondo} (CÓDIGO, TIPO, DIRECCIÓN)...`
                            : (propLookupTab === 'CONDOMINIOS' ? "BUSCAR POR CONDOMINIO, COMUNA O REGIÓN..." : "BUSCAR POR CÓDIGO, CONDOMINIO O DIRECCIÓN...")) 
                        : "FILTRAR REGISTROS DE FORMA DINÁMICA..."
                    }
                    className="w-full bg-white border border-amber-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold uppercase text-slate-800 outline-none focus:border-amber-500 font-mono placeholder:text-[10.5px] placeholder:font-normal placeholder:tracking-normal shadow-sm"
                    autoFocus
                  />
                </div>
                {lookupSearchTerm && (
                  <button 
                    type="button"
                    onClick={() => setLookupSearchTerm('')} 
                    className="px-3 py-2 text-[10px] font-black uppercase text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-xl transition-all cursor-pointer"
                  >
                    Limpiar
                  </button>
                )}
              </div>

              {/* Special Navigation Tabs for PROPIEDADES */}
              {activeLookupMaster === 'PROPIEDADES' && !editingRecordId && (
                drilldownCondo ? (
                  <div className="flex items-center justify-between gap-3 pt-1 border-t border-amber-200/40">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => { setDrilldownCondo(null); setDrilldownSearchTerm(''); }}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 font-black rounded-xl uppercase tracking-tight flex items-center gap-1.5 border border-slate-200 shadow-sm cursor-pointer text-[10.5px] transition-all"
                      >
                        <ArrowLeft size={13} /> ← Volver a Condominios
                      </button>
                      <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl">
                        <Building2 size={15} className="text-indigo-600" />
                        <span className="font-black text-indigo-950 uppercase text-[11px] tracking-tight">{drilldownCondo}</span>
                        <span className="px-2 py-0.5 bg-indigo-600 text-white rounded-md text-[10px] font-black">
                          {condosGrouped.find(c => c.name === drilldownCondo)?.unitsCount || 0} unidades
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setQbeConjunto(drilldownCondo);
                        setSelectedSolicitud(null);
                        closeLookupAssistant();
                        notify(`Condominio "${drilldownCondo}" aplicado a la grilla`, 'info');
                      }}
                      className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[10px] font-black uppercase transition-all shadow-sm cursor-pointer flex items-center gap-1.5"
                    >
                      Filtrar Todo el Condominio
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-amber-200/40">
                    <div className="flex items-center gap-1.5 bg-slate-200/80 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => { setPropLookupTab('CONDOMINIOS'); setDrilldownCondo(null); }}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                          propLookupTab === 'CONDOMINIOS'
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        🏢 Por Condominios / Conjuntos ({condosGrouped.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => { setPropLookupTab('UNIDADES'); setDrilldownCondo(null); }}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${
                          propLookupTab === 'UNIDADES'
                            ? 'bg-amber-600 text-white shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        🏠 Por Unidades Individuales ({properties.length})
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setQbeConjunto('');
                        setSelectedSolicitud(null);
                        closeLookupAssistant();
                        notify('Filtro de condominio reestablecido a todos (*)', 'info');
                      }}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer"
                      title="Mostrar solicitudes de todos los condominios"
                    >
                      * Ver Todos
                    </button>
                  </div>
                )
              )}
            </div>

            {/* List Table Container or edit form */}
            <div className="flex-1 overflow-auto p-4 max-h-[55vh]">
              {editingRecordId ? (
                <div className="space-y-4 font-sans text-slate-800 bg-slate-50 p-5 rounded-2xl border border-slate-100 max-w-lg mx-auto shadow-sm">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div>
                      <span className="text-xs font-black text-rose-600 uppercase tracking-wider block">
                        Editando Registro ({editRecordType === 'PROPIEDADES' ? `Propiedad #${editPropCode}` : editRecordType})
                      </span>
                      <span className="text-[10px] text-slate-400">Modifique los parámetros y presione guardar cambios</span>
                    </div>
                    <button 
                      type="button" 
                      onClick={() => { setEditingRecordId(null); setEditRecordType(null); }}
                      className="text-xs font-black text-amber-700 hover:text-amber-900 underline uppercase cursor-pointer"
                    >
                      ← Volver a la Lista
                    </button>
                  </div>
                  
                  {editRecordType === 'PROPIEDADES' && (
                    <div className="space-y-3 text-left">
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Código de Unidad</label>
                        <input 
                          type="text" 
                          value={editPropCode} 
                          onChange={e => setEditPropCode(e.target.value)} 
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-amber-500 uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Condominio / Edificio</label>
                        <input 
                          type="text" 
                          value={editPropBuilding} 
                          onChange={e => setEditPropBuilding(e.target.value)} 
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-amber-500 uppercase"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3 pb-1">
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Comuna</label>
                          <input 
                            type="text" 
                            value={editPropCommune} 
                            onChange={e => {
                              const val = e.target.value;
                              setEditPropCommune(val);
                              const reg = getRegionByCommune(val);
                              if (reg) {
                                setEditPropRegion(reg.shortName || reg.name);
                              }
                            }} 
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-amber-500 uppercase"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Región (Estandarizada)</label>
                          <select 
                            value={editPropRegion} 
                            onChange={e => setEditPropRegion(e.target.value)} 
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-amber-500 uppercase font-sans"
                          >
                            {CHILE_TERRITORY_MASTER.map(r => (
                              <option key={r.code} value={r.shortName || r.name}>
                                {r.name} ({r.code})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Dirección Completa</label>
                        <input 
                          type="text" 
                          value={editPropAddress} 
                          onChange={e => setEditPropAddress(e.target.value)} 
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-amber-500 uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Tipo de Propiedad</label>
                        <select 
                          value={editPropType} 
                          onChange={e => setEditPropType(e.target.value as any)} 
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-amber-500"
                        >
                          <option value="DEPARTAMENTO">DEPARTAMENTO</option>
                          <option value="CASA">CASA</option>
                          <option value="BODEGA">BODEGA</option>
                          <option value="ESTACIONAMIENTO">ESTACIONAMIENTO</option>
                          <option value="LOCAL">LOCAL</option>
                          <option value="OFICINA">OFICINA</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {editRecordType === 'COMUNAS' && (
                    <div className="space-y-3 text-left">
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Nombre de Comuna</label>
                        <input 
                          type="text" 
                          value={editCommuneNewVal} 
                          onChange={e => setEditCommuneNewVal(e.target.value)} 
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-amber-500 uppercase"
                        />
                        <p className="text-[9.5px] text-slate-400 mt-2 font-medium">Nota: El cambio modificará la comuna en todas las unidades correspondientes.</p>
                      </div>
                    </div>
                  )}

                  {editRecordType === 'SOLICITUDES' && (
                    <div className="space-y-3 text-left">
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Título de Requerimiento</label>
                        <input 
                          type="text" 
                          value={editSolTitle} 
                          onChange={e => setEditSolTitle(e.target.value)} 
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-amber-500 uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Descripción / Detalle</label>
                        <textarea 
                          rows={3}
                          value={editSolDesc} 
                          onChange={e => setEditSolDesc(e.target.value)} 
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-amber-500 uppercase"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Estado</label>
                          <select 
                            value={editSolStatus} 
                            onChange={e => setEditSolStatus(e.target.value as any)} 
                            className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs font-bold outline-none focus:border-amber-500"
                          >
                            <option value="PENDIENTE">PENDIENTE</option>
                            <option value="EN_PROCESO">EN PROCESO</option>
                            <option value="DETENIDA">DETENIDA</option>
                            <option value="FINALIZADA">FINALIZADA</option>
                            <option value="APROBADA_JEFATURA">APROBADA JEFATURA</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Prioridad</label>
                          <select 
                            value={editSolPriority} 
                            onChange={e => setEditSolPriority(e.target.value as any)} 
                            className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs font-bold outline-none focus:border-amber-500"
                          >
                            <option value="BAJA">BAJA</option>
                            <option value="MEDIA">MEDIA</option>
                            <option value="ALTA">ALTA</option>
                            <option value="CRÍTICA">CRÍTICA</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Categoría</label>
                          <select 
                            value={editSolCategory} 
                            onChange={e => setEditSolCategory(e.target.value as any)} 
                            className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs font-bold outline-none focus:border-amber-500"
                          >
                            <option value="REQUERIMIENTO">REQUERIMIENTO</option>
                            <option value="MEJORA">MEJORA</option>
                            <option value="CONSULTA">CONSULTA</option>
                            <option value="DOCUMENTACIÓN">DOCUMENTACIÓN</option>
                            <option value="SERVICIOS">SERVICIOS</option>
                            <option value="REEMBOLSO">REEMBOLSO</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {editRecordType === 'CONTRATISTAS' && (
                    <div className="space-y-3 text-left">
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Empresa / Contratista</label>
                        <input 
                          type="text" 
                          value={editSupplierName} 
                          onChange={e => setEditSupplierName(e.target.value)} 
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-amber-500 uppercase"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">RUT / ID Tributario</label>
                          <input 
                            type="text" 
                            value={editSupplierTaxId} 
                            onChange={e => setEditSupplierTaxId(e.target.value)} 
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-amber-500 uppercase"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Teléfono</label>
                          <input 
                            type="text" 
                            value={editSupplierPhone} 
                            onChange={e => setEditSupplierPhone(e.target.value)} 
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-amber-500 uppercase"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Correo de Contacto</label>
                        <input 
                          type="text" 
                          value={editSupplierEmail} 
                          onChange={e => setEditSupplierEmail(e.target.value)} 
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Banco Asociado</label>
                        <input 
                          type="text" 
                          value={editSupplierBankName} 
                          onChange={e => setEditSupplierBankName(e.target.value)} 
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-amber-500 uppercase"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 font-sans">Tipo Cuenta</label>
                          <input 
                            type="text" 
                            value={editSupplierAccountType} 
                            onChange={e => setEditSupplierAccountType(e.target.value)} 
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-amber-500 uppercase"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1 font-sans">N° de Cuenta</label>
                          <input 
                            type="text" 
                            value={editSupplierAccountNumber} 
                            onChange={e => setEditSupplierAccountNumber(e.target.value)} 
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-amber-500 uppercase"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {editRecordType === 'OT' && (
                    <div className="space-y-3 text-left">
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">N° Folio OT</label>
                        <input 
                          type="text" 
                          value={editWOFolio} 
                          onChange={e => setEditWOFolio(e.target.value)} 
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-amber-500 uppercase font-mono"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Preparador</label>
                          <input 
                            type="text" 
                            value={editWOPreparedBy} 
                            onChange={e => setEditWOPreparedBy(e.target.value)} 
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-amber-500 uppercase"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Depto Emisor</label>
                          <input 
                            type="text" 
                            value={editWOPreparedByDept} 
                            onChange={e => setEditWOPreparedByDept(e.target.value)} 
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-amber-500 uppercase"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Condiciones de Pago</label>
                        <input 
                          type="text" 
                          value={editWOPaymentTerms} 
                          onChange={e => setEditWOPaymentTerms(e.target.value)} 
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-amber-500 uppercase"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-slate-500 uppercase mb-1">Dirección de Entrega</label>
                        <input 
                          type="text" 
                          value={editWODeliverAddress} 
                          onChange={e => setEditWODeliverAddress(e.target.value)} 
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-amber-500 uppercase"
                        />
                      </div>
                    </div>
                  )}

                  <div className="pt-4 flex justify-end gap-2 border-t mt-4">
                    <button
                      type="button"
                      onClick={() => { setEditingRecordId(null); setEditRecordType(null); }}
                      className="px-5 py-2.5 bg-slate-250 hover:bg-slate-300 text-slate-600 rounded-xl font-bold text-[10px] uppercase transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEditedRecord}
                      className="px-6 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-black text-[10px] uppercase tracking-wide shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Save size={14} /> Guardar Cambios
                    </button>
                  </div>
                </div>
              ) : (
                <table className="w-full text-left border-collapse table-fixed">
                  <thead>
                    <tr className="bg-slate-100 uppercase text-[9px] text-slate-500 border-b border-slate-200">
                      {activeLookupMaster === 'PROPIEDADES' ? (
                        propLookupTab === 'CONDOMINIOS' ? (
                          drilldownCondo ? (
                            <>
                              <th className="p-2.5 font-black w-24">CÓDIGO</th>
                              <th className="p-2.5 font-black w-32">TIPO / USO</th>
                              <th className="p-2.5 font-black">DIRECCIÓN & UBICACIÓN</th>
                              <th className="p-2.5 font-black w-36">COMUNA & REGIÓN</th>
                              <th className="p-2.5 font-black text-right w-44">GESTIÓN UNIDAD</th>
                            </>
                          ) : (
                            <>
                              <th className="p-2.5 font-black w-52">CONDOMINIO / EDIFICIO (CONJUNTO)</th>
                              <th className="p-2.5 font-black w-36">COMUNA & REGIÓN</th>
                              <th className="p-2.5 font-black w-36 text-center">UNIDADES (DRILL-DOWN)</th>
                              <th className="p-2.5 font-black text-right w-48">ACCIÓN</th>
                            </>
                          )
                        ) : (
                          <>
                            <th className="p-2.5 font-black w-20">CÓDIGO</th>
                            <th className="p-2.5 font-black w-40">CONDOMINIO / EDIFICIO</th>
                            <th className="p-2.5 font-black">COMUNA</th>
                            <th className="p-2.5 font-black text-right w-24">GESTIÓN</th>
                          </>
                        )
                      ) : activeLookupMaster === 'COMUNAS' ? (
                        <>
                          <th className="p-2 font-black w-24">REGISTRO</th>
                          <th className="p-2 font-black">COMUNA</th>
                          <th className="p-2 font-black text-right w-20">REVISAR</th>
                        </>
                      ) : activeLookupMaster === 'SOLICITUDES' ? (
                        <>
                          <th className="p-2 font-black w-20">REQ ID</th>
                          <th className="p-2 font-black w-32">TÍTULO CASO</th>
                          <th className="p-2 font-black">PROPIEDAD</th>
                          <th className="p-2 font-black text-right w-20">ACCIONES</th>
                        </>
                      ) : activeLookupMaster === 'OT' ? (
                        <>
                          <th className="p-2 font-black w-24">FOLIO OT</th>
                          <th className="p-2 font-black">PROVEEDOR ADJUDICADO</th>
                          <th className="p-2 font-black text-right w-20">EDITAR</th>
                        </>
                      ) : (
                        <>
                          <th className="p-2 font-black w-24">RUT / ID</th>
                          <th className="p-2 font-black">CONTRATISTA / EMPRESA</th>
                          <th className="p-2 font-black text-right w-20">EDITAR</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px] font-semibold text-slate-700 font-mono">
                    {(() => {
                      const normSearch = lookupSearchTerm.toUpperCase().trim();
                      
                      if (activeLookupMaster === 'PROPIEDADES') {
                        if (propLookupTab === 'CONDOMINIOS') {
                          if (drilldownCondo) {
                            const selectedCondoObj = condosGrouped.find(c => c.name === drilldownCondo);
                            const condoUnits = selectedCondoObj ? selectedCondoObj.units : [];
                            const filteredUnits = condoUnits.filter(p => {
                              if (!normSearch) return true;
                              return p.code.toUpperCase().includes(normSearch) ||
                                (p.address || '').toUpperCase().includes(normSearch) ||
                                (p.type || '').toUpperCase().includes(normSearch) ||
                                (p.commune || '').toUpperCase().includes(normSearch);
                            });

                            if (filteredUnits.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={5} className="p-6 text-center text-xs text-slate-400 font-black uppercase py-8">
                                    No se encontraron unidades en "{drilldownCondo}" que coincidan con "{lookupSearchTerm}"
                                  </td>
                                </tr>
                              );
                            }

                            const displayUnits = filteredUnits.slice(0, 150);

                            return (
                              <>
                                {displayUnits.map(p => (
                                  <tr 
                                    key={p.id}
                                    onClick={() => {
                                      setQbeConjunto(drilldownCondo);
                                      setQbeAddress(p.address || '');
                                      setSelectedSolicitud(null);
                                      closeLookupAssistant();
                                      notify(`Unidad #${p.code} (${drilldownCondo}) seleccionada para filtrar requerimientos`, 'info');
                                    }}
                                    className="hover:bg-amber-50 cursor-pointer divide-x divide-slate-100 border-b border-slate-100 transition-colors"
                                  >
                                    <td className="p-2.5">
                                      <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded-md font-black text-[11px] inline-block font-mono">
                                        #{p.code}
                                      </span>
                                    </td>
                                    <td className="p-2.5 font-sans">
                                      <span className="font-bold text-slate-800 text-[11px] uppercase block">
                                        {p.type || 'DEPARTAMENTO'}
                                      </span>
                                    </td>
                                    <td className="p-2.5 font-sans">
                                      <span className="font-bold text-slate-800 text-[11px] uppercase block">
                                        {p.address || selectedCondoObj?.address || 'Sin dirección específica'}
                                      </span>
                                    </td>
                                    <td className="p-2.5 font-sans">
                                      <span className="font-bold text-slate-700 text-[11px] uppercase block">{p.commune || selectedCondoObj?.commune || 'S/C'}</span>
                                      <span className="text-[9.5px] text-indigo-600 font-bold uppercase block">{p.region || selectedCondoObj?.region || 'METROPOLITANA'}</span>
                                    </td>
                                    <td className="p-2.5 text-right">
                                      <div className="flex items-center justify-end gap-1.5">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setQbeConjunto(drilldownCondo);
                                            setQbeAddress(p.address || '');
                                            setSelectedSolicitud(null);
                                            closeLookupAssistant();
                                            notify(`Unidad #${p.code} (${drilldownCondo}) seleccionada`, 'info');
                                          }}
                                          className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[9.5px] font-black uppercase transition-all shadow-sm cursor-pointer"
                                        >
                                          Elegir Unidad
                                        </button>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleStartEditProp(p);
                                          }}
                                          className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[9.5px] font-black uppercase transition-all cursor-pointer"
                                          title="Editar parámetros de esta propiedad"
                                        >
                                          Editar
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                                {filteredUnits.length > 150 && (
                                  <tr>
                                    <td colSpan={5} className="p-3 text-center text-[10px] text-slate-500 bg-slate-50 font-bold uppercase">
                                      Mostrando las primeras 150 unidades de {filteredUnits.length}. Use el buscador superior para filtrar una unidad específica.
                                    </td>
                                  </tr>
                                )}
                              </>
                            );
                          }

                          const list = condosGrouped.filter(c => {
                            return !normSearch || 
                              c.name.includes(normSearch) || 
                              c.commune.includes(normSearch) || 
                              c.region.toUpperCase().includes(normSearch) ||
                              c.address.toUpperCase().includes(normSearch);
                          });

                          if (list.length === 0) {
                            return (
                              <tr>
                                <td colSpan={4} className="p-6 text-center text-xs text-slate-400 font-black uppercase py-8">
                                  No se encontraron condominios que coincidan con "{lookupSearchTerm}"
                                </td>
                              </tr>
                            );
                          }

                          return list.map(c => {
                            const isExpanded = !!expandedCondoRows[c.name];
                            return (
                              <React.Fragment key={c.name}>
                                <tr 
                                  onClick={() => {
                                    setQbeConjunto(c.name);
                                    setSelectedSolicitud(null);
                                    closeLookupAssistant();
                                    notify(`Condominio "${c.name}" aplicado a la grilla`, 'info');
                                  }}
                                  className={`hover:bg-amber-50 cursor-pointer divide-x divide-slate-100 border-b border-slate-100 transition-colors ${
                                    isExpanded ? 'bg-indigo-50/40' : ''
                                  }`}
                                >
                                  <td className="p-2.5">
                                    <span className="font-black text-slate-800 uppercase block tracking-tight">{c.name}</span>
                                    <span className="text-[9.5px] text-slate-400 font-sans block truncate max-w-[240px]">
                                      {c.address || 'Sin dirección principal'}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDrilldownCondo(c.name);
                                        setDrilldownSearchTerm('');
                                      }}
                                      className="text-[9.5px] text-indigo-600 hover:text-indigo-800 font-black uppercase flex items-center gap-1 mt-1 cursor-pointer transition-colors"
                                    >
                                      <Layers size={11} /> Desglosar unidades (Drill-Down) →
                                    </button>
                                  </td>
                                  <td className="p-2.5 font-sans">
                                    <span className="font-bold text-slate-700 uppercase block text-[11px]">{c.commune || 'S/C'}</span>
                                    <span className="text-[9.5px] text-indigo-600 font-bold uppercase block">{c.region}</span>
                                  </td>
                                  <td className="p-2.5 text-center">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleCondoRow(c.name);
                                      }}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-lg text-[10px] font-black cursor-pointer transition-all shadow-xs"
                                      title="Expandir / colapsar unidades de este conjunto"
                                    >
                                      <span>{c.unitsCount} {c.unitsCount === 1 ? 'unidad' : 'unidades'}</span>
                                      {isExpanded ? <ChevronDown size={13} className="text-purple-700" /> : <ChevronRight size={13} className="text-purple-700" />}
                                    </button>
                                  </td>
                                  <td className="p-2.5 text-right">
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setDrilldownCondo(c.name);
                                          setDrilldownSearchTerm('');
                                        }}
                                        className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[9.5px] font-black uppercase transition-all shadow-sm cursor-pointer flex items-center gap-1"
                                        title={`Ver desglose individual de todas las ${c.unitsCount} unidades`}
                                      >
                                        <Layers size={11} /> Desglosar
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setQbeConjunto(c.name);
                                          setSelectedSolicitud(null);
                                          closeLookupAssistant();
                                          notify(`Condominio "${c.name}" aplicado a la grilla`, 'info');
                                        }}
                                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[9.5px] font-black uppercase transition-all shadow-sm cursor-pointer"
                                      >
                                        Seleccionar
                                      </button>
                                    </div>
                                  </td>
                                </tr>

                                {isExpanded && (
                                  <tr className="bg-slate-50 border-b-2 border-indigo-200/60">
                                    <td colSpan={4} className="p-3 pl-6">
                                      <div className="bg-white border border-indigo-100 rounded-xl p-3 shadow-xs">
                                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                                          <div className="flex items-center gap-1.5 text-indigo-900 font-black text-[10.5px] uppercase">
                                            <Building2 size={13} className="text-indigo-600" />
                                            <span>Unidades Registradas en {c.name} ({c.unitsCount})</span>
                                          </div>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setDrilldownCondo(c.name);
                                              setDrilldownSearchTerm('');
                                            }}
                                            className="text-[10px] text-indigo-600 hover:text-indigo-800 font-black uppercase flex items-center gap-1 cursor-pointer underline"
                                          >
                                            Abrir Vista Completa Drill-Down ({c.unitsCount} unidades) →
                                          </button>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                          {c.units.slice(0, 9).map(u => (
                                            <div
                                              key={u.id}
                                              className="flex items-center justify-between p-2 rounded-lg bg-slate-50 hover:bg-amber-50/70 border border-slate-200/70 transition-all text-[10px]"
                                            >
                                              <div className="flex items-center gap-1.5 truncate pr-1">
                                                <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded font-black font-mono text-[9.5px]">
                                                  #{u.code}
                                                </span>
                                                <span className="font-bold text-slate-700 truncate max-w-[130px] font-sans">
                                                  {u.address || u.type || 'Unidad'}
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-1 flex-shrink-0">
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setQbeConjunto(c.name);
                                                    setQbeAddress(u.address || '');
                                                    setSelectedSolicitud(null);
                                                    closeLookupAssistant();
                                                    notify(`Unidad #${u.code} (${c.name}) seleccionada`, 'info');
                                                  }}
                                                  className="px-2 py-0.5 bg-amber-600 hover:bg-amber-700 text-white font-black rounded text-[8.5px] uppercase cursor-pointer"
                                                  title="Filtrar por esta unidad específica"
                                                >
                                                  Elegir
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleStartEditProp(u);
                                                  }}
                                                  className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black rounded text-[8.5px] uppercase cursor-pointer"
                                                  title="Editar parámetros de esta propiedad"
                                                >
                                                  Editar
                                                </button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>

                                        {c.unitsCount > 9 && (
                                          <div className="pt-2 mt-2 border-t border-slate-100 text-center">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setDrilldownCondo(c.name);
                                                setDrilldownSearchTerm('');
                                              }}
                                              className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black rounded-lg text-[9.5px] uppercase cursor-pointer transition-colors"
                                            >
                                              + Ver las {c.unitsCount - 9} unidades restantes en pantalla completa Drill-Down
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          });
                        }

                        // UNIDADES INDIVIDUALES TAB
                        const list = properties.filter(p => {
                          const condo = (p.conjunto || p.building || '').toUpperCase();
                          const comm = (p.commune || '').toUpperCase();
                          return !normSearch || condo.includes(normSearch) || comm.includes(normSearch) || p.code.toUpperCase().includes(normSearch);
                        });
                        
                        if (list.length === 0) {
                          return <tr><td colSpan={4} className="p-4 text-center text-[10px] text-slate-400 font-black uppercase py-8">Sin resultados</td></tr>;
                        }

                        return list.map(p => {
                          const condoName = (p.conjunto || p.building || 'PROP').toUpperCase();
                          return (
                            <tr 
                              key={p.id} 
                              onClick={() => {
                                setQbeConjunto(condoName);
                                setSelectedSolicitud(null);
                                closeLookupAssistant();
                                notify(`Unidad #${p.code} (${condoName}) seleccionada`, 'info');
                              }}
                              className="hover:bg-amber-50 cursor-pointer divide-x divide-slate-50 border-b border-slate-100 transition-colors"
                            >
                              <td className="p-2 text-rose-600 font-extrabold">{p.code}</td>
                              <td className="p-2 text-slate-800 font-sans font-bold">{condoName}</td>
                              <td className="p-2 text-slate-500 font-sans">{p.commune.toUpperCase()}</td>
                              <td className="p-2 text-right flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setQbeConjunto(condoName);
                                    setSelectedSolicitud(null);
                                    closeLookupAssistant();
                                  }}
                                  className="px-2 py-1 bg-amber-600 text-white hover:bg-amber-700 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer"
                                >
                                  Elegir
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartEditProp(p);
                                  }}
                                  className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer"
                                  title="Editar parámetros de esta propiedad"
                                >
                                  Editar
                                </button>
                              </td>
                            </tr>
                          );
                        });
                      }

                      if (activeLookupMaster === 'COMUNAS') {
                        const list = (uniqueCommunes as string[]).filter(c => !normSearch || c.toUpperCase().includes(normSearch));
                        
                        if (list.length === 0) {
                          return <tr><td colSpan={3} className="p-4 text-center text-[10px] text-slate-400 font-black uppercase py-8">Sin resultados</td></tr>;
                        }

                        return list.map((c, idx) => (
                          <tr 
                            key={c} 
                            onClick={() => {
                              setQbeCommune(c);
                              setSelectedSolicitud(null);
                              closeLookupAssistant();
                            }}
                            className="hover:bg-amber-50 cursor-pointer border-b border-slate-100 transition-colors"
                          >
                            <td className="p-2 text-slate-400">REG-{idx + 1}</td>
                            <td className="p-2 text-slate-800 font-sans font-bold uppercase">{c}</td>
                            <td className="p-2 text-right">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartEditCommune(c);
                                }}
                                className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-600 hover:text-white text-amber-700 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer"
                              >
                                Editar
                              </button>
                            </td>
                          </tr>
                        ));
                      }

                      if (activeLookupMaster === 'SOLICITUDES') {
                        const list = solicitudes.filter(s => {
                          const shortId = s.id.split('-')[0].toUpperCase();
                          const title = s.title.toUpperCase();
                          const propLabel = (s.propertyLabel || '').toUpperCase();
                          return !normSearch || shortId.includes(normSearch) || title.includes(normSearch) || propLabel.includes(normSearch);
                        });

                        if (list.length === 0) {
                          return <tr><td colSpan={4} className="p-4 text-center text-[10px] text-slate-400 font-black uppercase py-8">Sin resultados</td></tr>;
                        }

                        return list.map(s => {
                          const shortId = s.id.split('-')[0].toUpperCase();
                          return (
                            <tr 
                              key={s.id} 
                              onClick={() => {
                                setQbeId(shortId);
                                setSelectedSolicitud(null);
                                closeLookupAssistant();
                              }}
                              className="hover:bg-amber-50 cursor-pointer divide-x divide-slate-50 border-b border-slate-100 transition-colors"
                            >
                              <td className="p-2 text-rose-600 font-extrabold">{shortId}</td>
                              <td className="p-2 text-slate-800 font-sans font-bold truncate max-w-[150px]" title={s.title}>{s.title}</td>
                              <td className="p-2 text-slate-500 font-sans">{s.propertyLabel}</td>
                              <td className="p-2 text-right">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartEditSolicitud(s);
                                  }}
                                  className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-600 hover:text-white text-amber-700 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer"
                                >
                                  Editar
                                </button>
                              </td>
                            </tr>
                          );
                        });
                      }

                      if (activeLookupMaster === 'OT') { 
                        const list = workOrders.filter(w => {
                          const folio = (w.folio || '').toUpperCase();
                          const supp = (w.supplierName || '').toUpperCase();
                          return !normSearch || folio.includes(normSearch) || supp.includes(normSearch);
                        });

                        if (list.length === 0) {
                          return <tr><td colSpan={3} className="p-4 text-center text-[10px] text-slate-400 font-black uppercase py-8">Sin resultados</td></tr>;
                        }

                        return list.map(w => (
                          <tr 
                            key={w.id} 
                            onClick={() => {
                              setQbeWorkOrder(w.folio);
                              setSelectedSolicitud(null);
                              closeLookupAssistant();
                            }}
                            className="hover:bg-amber-50 cursor-pointer border-b border-slate-100 transition-colors"
                          >
                            <td className="p-2 text-rose-600 font-extrabold">{w.folio}</td>
                            <td className="p-2 text-slate-800 font-sans font-semibold">{w.supplierName}</td>
                            <td className="p-2 text-right">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartEditWorkOrder(w);
                                }}
                                className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-600 hover:text-white text-amber-700 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer"
                              >
                                Editar
                              </button>
                            </td>
                          </tr>
                        ));
                      }

                      if (activeLookupMaster === 'CONTRATISTAS') {
                        const list = suppliers.filter(s => {
                          const name = s.name.toUpperCase();
                          const tax = s.taxId.toUpperCase();
                          return !normSearch || name.includes(normSearch) || tax.includes(normSearch);
                        });

                        if (list.length === 0) {
                          return <tr><td colSpan={3} className="p-4 text-center text-[10px] text-slate-400 font-black uppercase py-8">Sin resultados</td></tr>;
                        }

                        return list.map(s => (
                          <tr 
                            key={s.id} 
                            onClick={() => {
                              setQbeApplicant(s.name.toUpperCase());
                              setSelectedSolicitud(null);
                              closeLookupAssistant();
                            }}
                            className="hover:bg-amber-50 cursor-pointer divide-x divide-slate-100 border-b border-slate-100 transition-colors"
                          >
                            <td className="p-2 text-slate-500 font-mono">{s.taxId}</td>
                            <td className="p-2 text-slate-800 font-sans font-bold uppercase">{s.name.toUpperCase()}</td>
                            <td className="p-2 text-right">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartEditSupplier(s);
                                }}
                                className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-600 hover:text-white text-amber-700 rounded-lg text-[9px] font-black uppercase transition-all cursor-pointer"
                              >
                                Editar
                              </button>
                            </td>
                          </tr>
                        ));
                      }

                      return null;
                    })()}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              {editingRecordId ? (
                <button
                  type="button"
                  onClick={() => { setEditingRecordId(null); setEditRecordType(null); }}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-[10px] uppercase transition-all cursor-pointer"
                >
                  ← Volver a la Lista
                </button>
              ) : (
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Haga clic en un registro para seleccionarlo y aplicarlo a la grilla
                </span>
              )}
              <button 
                type="button" 
                onClick={closeLookupAssistant} 
                className="px-5 py-2.5 bg-slate-800 text-white rounded-xl font-black text-[10px] uppercase hover:bg-slate-900 transition-all cursor-pointer shadow-sm"
              >
                Cerrar Asistente
              </button>
            </div>
          </motion.div>
        </div>
      )}



      {inspectTarget && (
        <F980011DModal
          isOpen={!!inspectTarget}
          onClose={() => setInspectTarget(null)}
          registryId={inspectTarget.id || ''}
          entityType="SOLICITUD"
          originalData={inspectTarget}
          currentUser={currentUser}
        />
      )}

      {/* ERP P4310 REQUISITION ENTRY WORKBENCH */}
      {isP4310RequisitionOpen && (
        <JDEP4310OrderEntryModal
          isOpen={isP4310RequisitionOpen}
          onClose={() => setIsP4310RequisitionOpen(false)}
          mode="REQUISITION"
          suppliers={suppliers}
          properties={properties}
          existingOrders={workOrders}
          currentUser={currentUser}
          onSaveSolicitud={(newSol) => {
            onSave(newSol);
            setIsP4310RequisitionOpen(false);
          }}
        />
      )}

      {/* ERP CONTEXT MENU */}
      {gridContextMenu && (
        <JDEGridContextMenu
          isOpen={!!gridContextMenu}
          x={gridContextMenu.x}
          y={gridContextMenu.y}
          programCode="P18500"
          programTitle="Solicitudes de Mantención de Inquilinos"
          collectionName="solicitudes"
          recordId={gridContextMenu.sol.id}
          recordFolio={gridContextMenu.sol.code || gridContextMenu.sol.id}
          onClose={() => setGridContextMenu(null)}
          onViewDetail={() => {
            setSelectedSolicitud(gridContextMenu.sol);
            setGridContextMenu(null);
          }}
          onExportExcel={() => {
            handleExportGridExcel();
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

export default SolicitudesModule;
