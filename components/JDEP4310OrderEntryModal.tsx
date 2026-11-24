import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  X, Check, Search, ShieldCheck, Database, FileText, 
  AlertTriangle, Plus, Trash2, ChevronDown, Sparkles,
  ArrowRight, DollarSign, Calendar, MapPin, User, Building,
  Layers, Package, Lock, CheckCircle2, RefreshCw, Send,
  HelpCircle, Eye, ClipboardList, Info, FileSpreadsheet
} from 'lucide-react';
import { 
  Supplier, Property, WorkOrder, WorkOrderLineItem, 
  TaxDocumentType, WorkOrderStatus, Solicitud 
} from '../types';
import { 
  MasterItem, getMasterItems, findMasterItemByCode, 
  saveMasterItem, submitItemCreationRequest, ItemCreationRequest 
} from '../lib/itemMasterData';
import { evaluateApprovalRoute } from '../lib/approvalRoutesData';

export interface JDEP4310OrderEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'WORK_ORDER' | 'REQUISITION'; // OP vs SQ
  suppliers: Supplier[];
  properties: Property[];
  existingOrders?: WorkOrder[];
  currentUser: string;
  userRole?: string;
  onSaveWorkOrder?: (wo: WorkOrder) => void;
  onSaveSolicitud?: (sol: Solicitud) => void;
  initialPropertyId?: string;
}

export const JDEP4310OrderEntryModal: React.FC<JDEP4310OrderEntryModalProps> = ({
  isOpen,
  onClose,
  mode = 'WORK_ORDER',
  suppliers,
  properties,
  existingOrders = [],
  currentUser,
  userRole = 'ADMINISTRADOR',
  onSaveWorkOrder,
  onSaveSolicitud,
  initialPropertyId
}) => {
  if (!isOpen) return null;

  const activeSuppliers = useMemo(() => {
    return suppliers.filter(s => s.status === 'ACTIVE' || !s.status);
  }, [suppliers]);

  // Master Catalog Items
  const [catalogItems, setCatalogItems] = useState<MasterItem[]>(() => getMasterItems());

  // Reload catalog items when opening
  useEffect(() => {
    setCatalogItems(getMasterItems());
  }, [isOpen]);

  // Document Type: OP (Orden de Compra / Trabajo) or SQ (Solicitud de Inquilino)
  const [docType, setDocType] = useState<'OP' | 'SQ'>(mode === 'REQUISITION' ? 'SQ' : 'OP');

  // Supplier / Address Book (F0101) Selection & Data
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [supplierRutInput, setSupplierRutInput] = useState('');
  const [isAddressBookModalOpen, setIsAddressBookModalOpen] = useState(false);
  const [addressBookSearch, setAddressBookSearch] = useState('');

  // Basic Identification Fields (Cabecera ERP F4301)
  const [orderFolio, setOrderFolio] = useState(() => {
    const prefix = mode === 'REQUISITION' ? 'SOL' : 'OT';
    return `${prefix}-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  });
  const [propertyId, setPropertyId] = useState<string>(initialPropertyId || (properties[0]?.id || ''));
  const [preparedBy, setPreparedBy] = useState(currentUser || 'ADMINISTRADOR');
  const [preparedByDept, setPreparedByDept] = useState('CONTROL INMOBILIARIO');
  const [preparedByPhone, setPreparedByPhone] = useState('+56 9 8412 9000');
  const [preparedByEmail, setPreparedByEmail] = useState(currentUser.includes('@') ? currentUser : 'operaciones@assetflow.cl');
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [quoteNumber, setQuoteNumber] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('30 DÍAS CRÉDITO');
  
  // Mandatory RULE[AGENTS_md] Fields:
  const [category, setCategory] = useState('MANTENCIÓN PREVENTIVA');
  const [specialty, setSpecialty] = useState('TECHUMBRES');
  const [associatedInvoice, setAssociatedInvoice] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Selected property object
  const selectedProperty = useMemo(() => {
    return properties.find(p => p.id === propertyId);
  }, [properties, propertyId]);

  const propertyLabel = useMemo(() => {
    if (!selectedProperty) return 'Edificio Principal';
    return `${selectedProperty.building || selectedProperty.address || selectedProperty.code || 'Inmueble'} (Piso ${selectedProperty.floor || '1'})`;
  }, [selectedProperty]);

  // Update delivery address when property changes
  useEffect(() => {
    if (selectedProperty) {
      setDeliveryAddress(`${selectedProperty.building || selectedProperty.address || ''} - PISO ${selectedProperty.floor || '1'}`.trim());
    }
  }, [selectedProperty]);

  // Detail Grid Lines (ERP F4311 Line Items)
  interface GridLine {
    lineId: string;
    lineNumber: number; // 1.000, 2.000, 3.000...
    itemCode: string;
    description: string;
    uom: string;
    quantity: number;
    unitPrice: number;
    total: number;
    specialty: string;
    accountCode: string;
  }

  const [lines, setLines] = useState<GridLine[]>([
    {
      lineId: 'line-1',
      lineNumber: 1.000,
      itemCode: 'TECH-001',
      description: 'MEMBRANA ASFÁLTICA GRAVILLADA 4MM (ROLLO 10M2)',
      uom: 'UN',
      quantity: 2,
      unitPrice: 48500,
      total: 97000,
      specialty: 'TECHUMBRES',
      accountCode: '5.1.04.01.001'
    }
  ]);

  // Active line index for extended search lookup
  const [activeLineIndexForSearch, setActiveLineIndexForSearch] = useState<number | null>(null);
  const [isItemMasterModalOpen, setIsItemMasterModalOpen] = useState(false);
  const [itemSearchText, setItemSearchText] = useState('');
  const [itemSearchCategory, setItemSearchCategory] = useState('ALL');
  const [itemSearchSpecialty, setItemSearchSpecialty] = useState('ALL');

  // Modal for Requesting New Item Creation (for standard users)
  const [isNewItemRequestModalOpen, setIsNewItemRequestModalOpen] = useState(false);
  const [newProposedDesc, setNewProposedDesc] = useState('');
  const [newProposedCat, setNewProposedCat] = useState('MANTENCIÓN PREVENTIVA');
  const [newProposedSpec, setNewProposedSpec] = useState('SERVICIOS GENERALES');
  const [newProposedUom, setNewProposedUom] = useState('UN');
  const [newProposedCost, setNewProposedCost] = useState<number>(25000);
  const [newProposedJustification, setNewProposedJustification] = useState('');
  const [itemRequestFeedback, setItemRequestFeedback] = useState<string | null>(null);

  // Totals calculation
  const subtotal = useMemo(() => {
    return lines.reduce((acc, line) => acc + (line.quantity * line.unitPrice), 0);
  }, [lines]);

  const iva = useMemo(() => {
    return Math.round(subtotal * 0.19);
  }, [subtotal]);

  const grandTotal = useMemo(() => {
    return subtotal + iva;
  }, [subtotal, iva]);

  // Hierarchical approval route evaluation in real time based on grandTotal
  const approvalEvaluation = useMemo(() => {
    return evaluateApprovalRoute(docType, grandTotal);
  }, [docType, grandTotal]);

  // Invoice duplication check
  const duplicateInvoiceWarning = useMemo(() => {
    if (!associatedInvoice.trim()) return null;
    const cleanInvoice = associatedInvoice.trim().toUpperCase();
    const match = existingOrders.find(o => o.associatedInvoice?.trim().toUpperCase() === cleanInvoice);
    if (match) {
      return `¡Atención! La factura "${cleanInvoice}" ya se encuentra registrada en la orden ${match.folio} (${match.supplierName}). Verifique para evitar duplicidad de desembolsos NIA 240.`;
    }
    return null;
  }, [associatedInvoice, existingOrders]);

  // Sync supplier from rut input or search
  const handleSelectSupplier = (s: Supplier) => {
    setSelectedSupplier(s);
    setSupplierRutInput(s.taxId);
    setIsAddressBookModalOpen(false);
  };

  const handleRutInputChange = (val: string) => {
    setSupplierRutInput(val);
    const match = activeSuppliers.find(s => s.taxId.toUpperCase().trim() === val.toUpperCase().trim());
    if (match) {
      setSelectedSupplier(match);
    } else {
      setSelectedSupplier(null);
    }
  };

  // Add new line to grid
  const handleAddLine = () => {
    const nextLineNum = (lines.length + 1) * 1.0;
    const newLine: GridLine = {
      lineId: `line-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      lineNumber: Number(nextLineNum.toFixed(3)),
      itemCode: '',
      description: 'SELECCIONE ARTÍCULO DEL CATÁLOGO F4101...',
      uom: 'UN',
      quantity: 1,
      unitPrice: 0,
      total: 0,
      specialty: specialty,
      accountCode: '5.1.04.01.001'
    };
    setLines([...lines, newLine]);
    // Automatically open item search for the new line
    setActiveLineIndexForSearch(lines.length);
    setIsItemMasterModalOpen(true);
  };

  const handleRemoveLine = (idx: number) => {
    if (lines.length <= 1) {
      alert('La orden debe contener al menos una línea de detalle catalogada.');
      return;
    }
    const updated = lines.filter((_, i) => i !== idx).map((l, i) => ({
      ...l,
      lineNumber: Number(((i + 1) * 1.0).toFixed(3))
    }));
    setLines(updated);
  };

  const handleLineQtyChange = (idx: number, qty: number) => {
    const safeQty = Math.max(1, qty);
    setLines(prev => {
      const copy = [...prev];
      copy[idx] = {
        ...copy[idx],
        quantity: safeQty,
        total: safeQty * copy[idx].unitPrice
      };
      return copy;
    });
  };

  const handleLinePriceChange = (idx: number, price: number) => {
    const safePrice = Math.max(0, price);
    setLines(prev => {
      const copy = [...prev];
      copy[idx] = {
        ...copy[idx],
        unitPrice: safePrice,
        total: copy[idx].quantity * safePrice
      };
      return copy;
    });
  };

  // Open item search for a specific line
  const handleOpenItemSearch = (lineIndex: number) => {
    setActiveLineIndexForSearch(lineIndex);
    setIsItemMasterModalOpen(true);
  };

  // Apply selected catalog item to the active line
  const handleApplyCatalogItem = (item: MasterItem) => {
    if (activeLineIndexForSearch === null) return;
    setLines(prev => {
      const copy = [...prev];
      const target = copy[activeLineIndexForSearch];
      if (target) {
        copy[activeLineIndexForSearch] = {
          ...target,
          itemCode: item.itemCode,
          description: item.description,
          uom: item.unitOfMeasure,
          unitPrice: item.standardCost,
          total: target.quantity * item.standardCost,
          specialty: item.specialty,
          accountCode: item.suggestedAccountCode
        };
      }
      return copy;
    });
    // Also auto-suggest category and specialty if available
    if (item.category) setCategory(item.category);
    if (item.specialty) setSpecialty(item.specialty);

    setIsItemMasterModalOpen(false);
    setActiveLineIndexForSearch(null);
  };

  // Handle direct item code typed into cell
  const handleDirectItemCodeChange = (lineIndex: number, code: string) => {
    const item = findMasterItemByCode(code);
    setLines(prev => {
      const copy = [...prev];
      if (item) {
        copy[lineIndex] = {
          ...copy[lineIndex],
          itemCode: item.itemCode,
          description: item.description,
          uom: item.unitOfMeasure,
          unitPrice: item.standardCost,
          total: copy[lineIndex].quantity * item.standardCost,
          specialty: item.specialty,
          accountCode: item.suggestedAccountCode
        };
      } else {
        copy[lineIndex] = {
          ...copy[lineIndex],
          itemCode: code.toUpperCase(),
          description: code.trim() ? '⚠ CÓDIGO NO EXISTE EN CATÁLOGO F4101 (Presione Lupa para Buscar)' : ''
        };
      }
      return copy;
    });
  };

  // Submit request for new item creation
  const handleSubmitNewItemRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProposedDesc.trim()) {
      alert('Por favor ingrese la descripción técnica del artículo solicitado.');
      return;
    }

    if (userRole === 'ADMINISTRADOR') {
      // Admin can immediately approve and add to master catalog
      const newCode = `ITEM-${Date.now().toString(36).toUpperCase()}`;
      const newItem: MasterItem = {
        itemCode: newCode,
        description: newProposedDesc.trim().toUpperCase(),
        unitOfMeasure: newProposedUom,
        standardCost: Number(newProposedCost) || 0,
        suggestedAccountCode: '5.1.04.01.001',
        category: newProposedCat,
        specialty: newProposedSpec,
        stockStatus: 'ACTIVO',
        searchTokens: `${newCode} ${newProposedDesc} ${newProposedCat} ${newProposedSpec}`.toUpperCase()
      };
      saveMasterItem(newItem);
      setCatalogItems(getMasterItems());
      setItemRequestFeedback(`¡Artículo ${newCode} creado e incorporado exitosamente al catálogo oficial F4101!`);
      setTimeout(() => {
        setIsNewItemRequestModalOpen(false);
        setItemRequestFeedback(null);
        if (activeLineIndexForSearch !== null) {
          handleApplyCatalogItem(newItem);
        }
      }, 1200);
    } else {
      // Normal user creates request to steward/admin
      submitItemCreationRequest({
        requestedBy: currentUser,
        proposedDescription: newProposedDesc.trim().toUpperCase(),
        category: newProposedCat,
        specialty: newProposedSpec,
        unitOfMeasure: newProposedUom,
        estimatedCost: Number(newProposedCost) || 0,
        justification: newProposedJustification.trim() || 'Requerimiento de terreno para mantención estandarizada'
      });
      setItemRequestFeedback('Solicitud de alta enviada al Administrador / Data Steward. Se notificará cuando sea estandarizado.');
      setTimeout(() => {
        setIsNewItemRequestModalOpen(false);
        setItemRequestFeedback(null);
      }, 1800);
    }
  };

  // Validation & Final Submission
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitOrder = () => {
    if (!selectedSupplier && !supplierRutInput.trim()) {
      alert('Debe seleccionar o indicar el RUT de un proveedor del maestro (Libreta de Direcciones F0101).');
      return;
    }

    // Verify all lines have valid items
    const invalidLines = lines.filter(l => !l.itemCode || l.description.includes('NO EXISTE'));
    if (invalidLines.length > 0) {
      alert('Todas las líneas del grid deben corresponder a artículos catalogados y validados del Maestro F4101. Utilice el botón de la linterna/lupa para seleccionar del catálogo oficial.');
      return;
    }

    if (lines.length === 0) {
      alert('Debe incluir al menos una línea de artículo o servicio.');
      return;
    }

    setIsSubmitting(true);

    const supplierName = selectedSupplier?.name || 'PROVEEDOR GENERAL';
    const supplierTaxId = selectedSupplier?.taxId || supplierRutInput;
    const supplierAddress = selectedSupplier?.address || '';
    const supplierContact = selectedSupplier?.contactPerson || '';
    const supplierPhone = selectedSupplier?.phone || '';
    const supplierEmail = selectedSupplier?.email || '';
    const supplierDocType = (selectedSupplier?.taxDocumentType || 'FACTURA') as TaxDocumentType;

    const workOrderItems: WorkOrderLineItem[] = lines.map(l => ({
      id: l.lineId,
      description: `[${l.itemCode}] ${l.description} (${l.uom})`,
      quantity: l.quantity,
      receivedQuantity: 0,
      unitPrice: l.unitPrice,
      total: l.total,
      status: 'PENDIENTE'
    }));

    const now = new Date().toISOString();

    if (docType === 'OP' || mode === 'WORK_ORDER') {
      const newWorkOrder: WorkOrder = {
        id: `wo_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        folio: orderFolio,
        issueDate: now.split('T')[0],
        timestamp: Date.now(),
        propertyId: propertyId || 'MUTU_PROP_DEFAULT',
        propertyLabel: propertyLabel || 'Edificio Principal',
        lockedBy: null,
        lockedAt: null,
        preparedBy,
        preparedByDept,
        preparedByPhone,
        preparedByEmail,
        preparedAt: now,
        supplierId: selectedSupplier?.id || `supp_custom_${Date.now()}`,
        supplierName,
        supplierTaxId,
        supplierTaxDocumentType: supplierDocType,
        supplierAddress,
        supplierContact,
        supplierPhone,
        supplierEmail,
        quoteNumber: quoteNumber || `COT-${Date.now().toString().slice(-4)}`,
        requestDate: now.split('T')[0],
        reqDept: preparedByDept,
        deliveryDate,
        paymentTerms,
        deliveryAddress: deliveryAddress || 'TERRENO EDIFICIO ASSETFLOW',
        items: workOrderItems,
        subtotal,
        iva,
        total: grandTotal,
        specialInstructions: specialInstructions || 'Cumplir protocolos de seguridad ERP y entregar HES/Acta de Recepción.',
        category,
        specialty,
        associatedInvoice: associatedInvoice.trim().toUpperCase(),
        status: 'PENDIENTE_VB',
        evaluationNotes: `Emitida mediante módulo ERP (P4310). Asignada a ruta jerárquica ${approvalEvaluation.route.routeCode}.`
      };

      if (onSaveWorkOrder) {
        onSaveWorkOrder(newWorkOrder);
      }
    } else {
      // Requisition / Solicitud mode
      const newSolicitud: Solicitud = {
        id: `sol_${Date.now()}`,
        title: `[ERP P4310] Requerimiento ${category} - ${specialty}`,
        description: `Requerimiento formulado en P4310. Proveedor sugerido: ${supplierName} (${supplierTaxId}). Total estimativo: $${grandTotal.toLocaleString('es-CL')}. Folio: ${orderFolio}`,
        status: 'PENDIENTE',
        priority: grandTotal > 3000000 ? 'ALTA' : 'MEDIA',
        category: 'REQUERIMIENTO',
        propertyId: propertyId || 'MUTU_PROP_DEFAULT',
        propertyLabel: propertyLabel || 'Edificio Principal',
        requestDate: now.split('T')[0],
        userCreator: preparedBy,
        timestamp: Date.now(),
        updates: [],
        assignedTo: 'DEPTO_MANTENCION',
        applicantName: preparedBy,
        applicantEmail: preparedByEmail,
        phone: preparedByPhone
      };

      if (onSaveSolicitud) {
        onSaveSolicitud(newSolicitud);
      }
    }

    setIsSubmitting(false);
    onClose();
  };

  // Filtered items in Extended Search Modal
  const filteredCatalogModalItems = useMemo(() => {
    return catalogItems.filter(item => {
      const matchCat = itemSearchCategory === 'ALL' || item.category === itemSearchCategory;
      const matchSpec = itemSearchSpecialty === 'ALL' || item.specialty === itemSearchSpecialty;
      const matchQuery = !itemSearchText.trim() || 
        item.itemCode.toLowerCase().includes(itemSearchText.toLowerCase()) ||
        item.description.toLowerCase().includes(itemSearchText.toLowerCase()) ||
        (item.searchTokens && item.searchTokens.toLowerCase().includes(itemSearchText.toLowerCase()));
      return matchCat && matchSpec && matchQuery;
    });
  }, [catalogItems, itemSearchCategory, itemSearchSpecialty, itemSearchText]);

  // Categories & Specialties list
  const catalogCategories = useMemo(() => {
    const set = new Set<string>();
    catalogItems.forEach(i => set.add(i.category));
    return Array.from(set);
  }, [catalogItems]);

  const catalogSpecialties = useMemo(() => {
    const set = new Set<string>();
    catalogItems.forEach(i => set.add(i.specialty));
    return Array.from(set);
  }, [catalogItems]);

  // Address book filtered
  const filteredAddressBook = useMemo(() => {
    const q = addressBookSearch.trim().toLowerCase();
    if (!q) return activeSuppliers;
    return activeSuppliers.filter(s => 
      s.taxId.toLowerCase().includes(q) ||
      s.name.toLowerCase().includes(q) ||
      (s.specialty && s.specialty.toLowerCase().includes(q)) ||
      (s.contactPerson && s.contactPerson.toLowerCase().includes(q))
    );
  }, [activeSuppliers, addressBookSearch]);

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 select-none">
      <div className="bg-[#f0f3f6] rounded-xl w-full max-w-6xl shadow-2xl border-2 border-[#002D62] overflow-hidden flex flex-col h-[94vh] animate-in zoom-in-95">
        
        {/* ======================================================== */}
        {/* ERP AUTHENTIC TITLE BAR & FAST ACTION TOOLBAR        */}
        {/* ======================================================== */}
        <div className="bg-gradient-to-r from-[#002D62] via-[#0A4B82] to-[#002D62] text-white px-4 py-2 flex items-center justify-between border-b border-[#001D42] shadow-md">
          <div className="flex items-center gap-3">
            <div className="bg-[#E6F0FA] text-[#002D62] px-2 py-0.5 rounded text-[11px] font-mono font-black border border-white/20">
              P4310
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-black uppercase tracking-wide flex items-center gap-1.5">
                  <Layers size={16} className="text-amber-400" />
                  AssetFlow Enterprise - Entrada de Órdenes y Solicitudes
                </h1>
                <span className="text-[9px] bg-amber-500/20 text-amber-300 border border-amber-400/40 px-2 py-0.5 rounded-full font-bold uppercase">
                  Catálogo Estandarizado F4101
                </span>
              </div>
              <p className="text-[9.5px] text-blue-100 font-medium">
                Emisión de Orden de Compra (OP) / Solicitud (SQ) con Integración a Matriz Jerárquica P43008
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSubmitOrder}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-black uppercase transition-all shadow-md border border-emerald-400 cursor-pointer active:scale-95 disabled:opacity-50"
              title="Guardar y Confirmar Emisión (Ctrl+Enter)"
            >
              <CheckCircle2 size={15} />
              <span>Emitir {docType === 'OP' ? 'Orden de Trabajo' : 'Solicitud'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded text-white transition-colors cursor-pointer"
              title="Cancelar y Cerrar"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* ERP Navigation & Status Bar */}
        <div className="bg-[#D9E2EC] border-b border-[#BCCCDC] px-4 py-1.5 flex items-center justify-between text-[11px] text-slate-800 font-semibold">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 font-mono text-[10px]">
              <span className="text-slate-500">PROGRAMA:</span> <strong>P4310_W4310A</strong>
            </span>
            <span className="h-3 w-[1px] bg-slate-400" />
            <span className="flex items-center gap-1 font-mono text-[10px]">
              <span className="text-slate-500">FOLIO ERP:</span> <strong className="text-indigo-800">{orderFolio}</strong>
            </span>
            <span className="h-3 w-[1px] bg-slate-400" />
            <span className="flex items-center gap-1.5">
              <span className="text-slate-500">TIPO DE DOCTO:</span>
              <select
                value={docType}
                onChange={e => setDocType(e.target.value as 'OP' | 'SQ')}
                className="bg-white border border-slate-300 rounded px-2 py-0.5 text-[10px] font-bold uppercase outline-none"
              >
                <option value="OP">OP - Orden de Compra / Orden de Trabajo (Purchase Order)</option>
                <option value="SQ">SQ - Solicitud de Compra / Requisición (Requisition)</option>
              </select>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-600">
              Ruta Jerárquica: <strong className="text-emerald-700 font-mono">{approvalEvaluation.route.routeCode}</strong> ({approvalEvaluation.applicableSteps.length} niveles requeridos)
            </span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* MAIN BODY: HEADER FORM + DETAIL GRID                     */}
        {/* ======================================================== */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-audit-scroll">

          {/* 1. SECCIÓN CABECERA: DATOS BÁSICOS & PROVEEDOR (F0101) */}
          <div className="bg-white rounded-lg border border-slate-300 p-3.5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h2 className="text-[11px] font-black uppercase tracking-wider text-[#002D62] flex items-center gap-2">
                <User size={14} className="text-[#002D62]" />
                1. Cabecera de Identificación Básica y Proveedor Titular (F0101 Address Book)
              </h2>
              <span className="text-[9.5px] font-bold text-slate-500">
                Llenado obligatorio de campos de imputación
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-[11px]">
              
              {/* CAMPO RUT PROVEEDOR CON VISUAL PROMPT ERP (Lupa Libreta de Direcciones) */}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-700 uppercase flex items-center justify-between">
                  <span>RUT Proveedor / N° Dirección (F0101) *</span>
                  {selectedSupplier && (
                    <span className="text-[8px] text-emerald-700 font-bold bg-emerald-50 px-1 rounded">
                      VERIFICADO
                    </span>
                  )}
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={supplierRutInput}
                    onChange={e => handleRutInputChange(e.target.value)}
                    placeholder="76.123.456-7"
                    className="flex-1 bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-[11px] font-mono font-bold uppercase outline-none focus:bg-white focus:border-blue-600 focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setAddressBookSearch('');
                      setIsAddressBookModalOpen(true);
                    }}
                    className="px-2.5 py-1.5 bg-[#002D62] hover:bg-[#0A4B82] text-white rounded text-[10px] font-bold flex items-center gap-1 shadow-xs cursor-pointer transition-colors"
                    title="Consultar Maestro de Proveedores / Libreta de Direcciones (F0101)"
                  >
                    <Search size={13} />
                    <span>F0101</span>
                  </button>
                </div>
                {selectedSupplier ? (
                  <p className="text-[9px] font-bold text-slate-700 truncate" title={selectedSupplier.name}>
                    {selectedSupplier.name}
                  </p>
                ) : (
                  <p className="text-[8px] text-amber-700 font-semibold">
                    Use el botón "F0101" para seleccionar un proveedor activo del catálogo.
                  </p>
                )}
              </div>

              {/* RAZÓN SOCIAL / NOMBRE PROVEEDOR */}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-700 uppercase">
                  Razón Social Titular
                </label>
                <input
                  type="text"
                  readOnly
                  value={selectedSupplier?.name || 'SIN SELECCIONAR'}
                  className="w-full bg-slate-100 border border-slate-300 rounded px-2.5 py-1.5 text-[11px] font-bold uppercase text-slate-700 outline-none truncate"
                />
              </div>

              {/* ACTIVO / UNIDAD INMOBILIARIA */}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-700 uppercase flex items-center justify-between">
                  <span>Activo Inmobiliario Imputado *</span>
                </label>
                <select
                  value={propertyId}
                  onChange={e => setPropertyId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-[11px] font-bold uppercase text-slate-800 outline-none focus:bg-white focus:border-blue-600 cursor-pointer"
                >
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.building} - PISO {p.floor} ({p.address})
                    </option>
                  ))}
                </select>
              </div>

              {/* SOLICITANTE / DEPTO */}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-700 uppercase">
                  Solicitante Responsable
                </label>
                <input
                  type="text"
                  value={preparedBy}
                  onChange={e => setPreparedBy(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-[11px] font-bold uppercase text-slate-800 outline-none focus:bg-white focus:border-blue-600"
                />
              </div>

            </div>

            {/* SEGUNDA FILA: CATEGORÍA, ESPECIALIDAD, FACTURA Y CONDICIONES (MANDATORIOS RULE[AGENTS_md]) */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-[11px] pt-1">
              
              {/* CATEGORÍA DE TRABAJO */}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-700 uppercase">
                  Categoría del Trabajo (RULE AGENTS) *
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-[11px] font-bold uppercase text-slate-800 outline-none focus:bg-white focus:border-blue-600 cursor-pointer"
                >
                  <option value="MANTENCIÓN PREVENTIVA">MANTENCIÓN PREVENTIVA</option>
                  <option value="MANTENCIÓN CORRECTIVA">MANTENCIÓN CORRECTIVA</option>
                  <option value="EMERGENCIA OPERACIONAL">EMERGENCIA OPERACIONAL</option>
                  <option value="MEJORA DE CAPITAL (CAPEX)">MEJORA DE CAPITAL (CAPEX)</option>
                  <option value="SERVICIOS GENERALES">SERVICIOS GENERALES</option>
                </select>
              </div>

              {/* ESPECIALIDAD / RUBRO */}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-700 uppercase">
                  Especialidad / Rubro (RULE AGENTS) *
                </label>
                <select
                  value={specialty}
                  onChange={e => setSpecialty(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-[11px] font-bold uppercase text-slate-800 outline-none focus:bg-white focus:border-blue-600 cursor-pointer"
                >
                  <option value="TECHUMBRES">TECHUMBRES & CUBIERTAS</option>
                  <option value="PLOMERÍA">PLOMERÍA & GASFITERÍA</option>
                  <option value="ELECTRICIDAD">ELECTRICIDAD & FUERZA</option>
                  <option value="CLIMATIZACIÓN">CLIMATIZACIÓN & HVAC</option>
                  <option value="PINTURA">PINTURA & REVESTIMIENTOS</option>
                  <option value="ALFOMBRAS">ALFOMBRAS & PAVIMENTOS</option>
                  <option value="CERRAJERÍA">CERRAJERÍA & ACCESOS</option>
                  <option value="ASCENSORES">ASCENSORES & TRANSPORTE</option>
                  <option value="SERVICIOS GENERALES">SERVICIOS GENERALES</option>
                </select>
              </div>

              {/* FACTURA / DOCUMENTO TRIBUTARIO ASOCIADO */}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-700 uppercase flex items-center justify-between">
                  <span>Factura / Docto Asociado (RULE AGENTS)</span>
                  {duplicateInvoiceWarning && (
                    <span className="text-[8px] text-amber-700 font-bold bg-amber-100 px-1 rounded flex items-center gap-0.5">
                      <AlertTriangle size={9} /> DUPLICADO
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  placeholder="Ej: FACTURA N°14320"
                  value={associatedInvoice}
                  onChange={e => setAssociatedInvoice(e.target.value)}
                  className={`w-full bg-slate-50 border rounded px-2.5 py-1.5 text-[11px] font-mono font-bold uppercase outline-none focus:bg-white ${
                    duplicateInvoiceWarning 
                      ? 'border-amber-400 bg-amber-50 text-amber-950' 
                      : 'border-slate-300 focus:border-blue-600'
                  }`}
                />
              </div>

              {/* CONDICIONES DE PAGO & COTIZACIÓN */}
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-700 uppercase flex items-center justify-between">
                  <span>Condiciones de Pago & Cotización N°</span>
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <select
                    value={paymentTerms}
                    onChange={e => setPaymentTerms(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded px-2 py-1.5 text-[10px] font-bold uppercase text-slate-800 outline-none"
                  >
                    <option value="30 DÍAS CRÉDITO">30 DÍAS</option>
                    <option value="CONTADO INMEDIATO">CONTADO</option>
                    <option value="50% ANTICIPO / 50% RECEPCIÓN">50% ANTICIPO</option>
                    <option value="60 DÍAS CRÉDITO">60 DÍAS</option>
                  </select>
                  <input
                    type="text"
                    placeholder="COT-..."
                    value={quoteNumber}
                    onChange={e => setQuoteNumber(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded px-2 py-1.5 text-[10px] font-mono font-bold uppercase text-slate-800 outline-none"
                  />
                </div>
              </div>

            </div>

            {duplicateInvoiceWarning && (
              <div className="bg-amber-50 border border-amber-300 text-amber-900 px-3 py-1.5 rounded text-[10px] font-semibold flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                <span>{duplicateInvoiceWarning}</span>
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* 2. SECCIÓN GRID: DETALLE DE LÍNEAS DE ARTÍCULOS (F4111)   */}
          {/* ======================================================== */}
          <div className="bg-white rounded-lg border border-slate-300 shadow-xs overflow-hidden flex flex-col">
            
            {/* GRID TOOLBAR */}
            <div className="bg-[#EBF1F5] px-4 py-2 border-b border-slate-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package size={15} className="text-[#002D62]" />
                <h3 className="text-xs font-black uppercase tracking-wider text-[#002D62]">
                  2. Grid de Detalle de Artículos y Servicios Catalogados (F4311)
                </h3>
                <span className="text-[9px] bg-blue-100 text-blue-900 border border-blue-300 px-2 py-0.5 rounded font-bold">
                  {lines.length} {lines.length === 1 ? 'Línea' : 'Líneas'}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAddLine}
                  className="flex items-center gap-1 px-3 py-1 bg-[#002D62] hover:bg-[#0A4B82] text-white rounded text-[10px] font-bold uppercase transition-colors shadow-xs cursor-pointer"
                  title="Agregar Línea de Artículo Catalogado"
                >
                  <Plus size={13} />
                  <span>Insertar Línea Catalogada</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNewProposedDesc('');
                    setNewProposedJustification('');
                    setIsNewItemRequestModalOpen(true);
                  }}
                  className="flex items-center gap-1 px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded text-[10px] font-bold uppercase transition-colors cursor-pointer"
                  title="Solicitar al Administrador / Data Steward la Creación de un Nuevo Artículo Estandarizado"
                >
                  <Sparkles size={13} className="text-amber-600" />
                  <span>¿Falta Artículo? Solicitar Alta al Steward</span>
                </button>
              </div>
            </div>

            {/* TABLA ESTILO ERP EXCEL CON ENCABEZADOS Y CELDAS DE RESIZING */}
            <div className="overflow-x-auto max-h-[380px] custom-audit-scroll">
              <table className="w-full text-left border-collapse table-fixed min-w-[1000px]">
                <thead className="sticky top-0 z-10 bg-[#E1E8EE] border-b border-slate-300 text-[10px] font-black text-slate-700 uppercase tracking-tight">
                  <tr className="h-7">
                    <th className="w-16 border-r border-slate-300 px-2 text-center">N° Línea</th>
                    <th className="w-44 border-r border-slate-300 px-2">Código Item (LITM) *</th>
                    <th className="w-80 border-r border-slate-300 px-2">Descripción Estandarizada F4101 (DSC1)</th>
                    <th className="w-16 border-r border-slate-300 px-2 text-center">UOM</th>
                    <th className="w-24 border-r border-slate-300 px-2 text-right">Cantidad *</th>
                    <th className="w-32 border-r border-slate-300 px-2 text-right">Precio Unitario ($)</th>
                    <th className="w-36 border-r border-slate-300 px-2 text-right">Total Línea ($)</th>
                    <th className="w-28 border-r border-slate-300 px-2 text-center">Rubro / Imputación</th>
                    <th className="w-14 px-2 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-[11px]">
                  {lines.map((line, idx) => (
                    <tr 
                      key={line.lineId}
                      className="even:bg-slate-50 odd:bg-white hover:bg-[#FFFFA6]/60 transition-colors h-9"
                    >
                      {/* N° LÍNEA */}
                      <td className="px-2 text-center font-mono font-bold text-slate-500 border-r border-slate-200">
                        {line.lineNumber.toFixed(3)}
                      </td>

                      {/* CÓDIGO ITEM CON VISUAL PROMPT ERP */}
                      <td className="px-2 border-r border-slate-200">
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={line.itemCode}
                            onChange={e => handleDirectItemCodeChange(idx, e.target.value)}
                            placeholder="TECH-001..."
                            className="w-full bg-transparent font-mono font-black text-blue-900 uppercase outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 rounded px-1 py-0.5"
                          />
                          <button
                            type="button"
                            onClick={() => handleOpenItemSearch(idx)}
                            className="p-1 bg-slate-200 hover:bg-[#002D62] hover:text-white rounded text-slate-700 transition-colors cursor-pointer shrink-0"
                            title="Buscar en Maestro de Artículos (F4101)"
                          >
                            <Search size={12} />
                          </button>
                        </div>
                      </td>

                      {/* DESCRIPCIÓN ESTANDARIZADA (BLOQUEADA PARA FORZAR ESTANDARIZACIÓN) */}
                      <td className="px-2 border-r border-slate-200 font-semibold text-slate-800 truncate" title={line.description}>
                        <div className="flex items-center gap-1.5">
                          {line.description.includes('NO EXISTE') ? (
                            <span className="text-rose-600 font-bold text-[10px] flex items-center gap-1">
                              <AlertTriangle size={12} /> {line.description}
                            </span>
                          ) : (
                            <span className="truncate">{line.description}</span>
                          )}
                        </div>
                      </td>

                      {/* UNIDAD DE MEDIDA */}
                      <td className="px-2 text-center font-mono font-bold text-slate-600 border-r border-slate-200">
                        {line.uom}
                      </td>

                      {/* CANTIDAD */}
                      <td className="px-2 text-right border-r border-slate-200">
                        <input
                          type="number"
                          min="1"
                          value={line.quantity}
                          onChange={e => handleLineQtyChange(idx, parseInt(e.target.value) || 1)}
                          className="w-full text-right bg-transparent font-mono font-bold text-slate-900 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 rounded px-1 py-0.5"
                        />
                      </td>

                      {/* PRECIO UNITARIO */}
                      <td className="px-2 text-right border-r border-slate-200">
                        <input
                          type="number"
                          min="0"
                          value={line.unitPrice}
                          onChange={e => handleLinePriceChange(idx, parseInt(e.target.value) || 0)}
                          className="w-full text-right bg-transparent font-mono font-bold text-slate-900 outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 rounded px-1 py-0.5"
                        />
                      </td>

                      {/* TOTAL LÍNEA */}
                      <td className="px-2 text-right font-mono font-black text-slate-900 border-r border-slate-200">
                        ${line.total.toLocaleString('es-CL')}
                      </td>

                      {/* RUBRO / CUENTA */}
                      <td className="px-2 text-center text-[10px] font-bold text-slate-600 border-r border-slate-200 truncate">
                        {line.specialty || specialty}
                      </td>

                      {/* ACCIONES */}
                      <td className="px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                          title="Eliminar Línea"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* RESUMEN DE TOTALES Y PREVISUALIZACIÓN DE RUTA P43008 */}
            <div className="bg-[#F8FAFC] border-t border-slate-300 p-3 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              
              {/* EVALUACIÓN DE FLUJO JERÁRQUICO P43008 */}
              <div className="bg-white border border-slate-200 rounded p-2.5 space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-[#002D62] flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-600" />
                    Ruta de Aprobación Jerárquica Activada (P43008)
                  </span>
                  <span className="text-[9px] font-mono font-bold bg-indigo-50 text-indigo-800 px-1.5 py-0.5 rounded border border-indigo-200">
                    {approvalEvaluation.route.routeCode}
                  </span>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto text-[9.5px]">
                  {approvalEvaluation.applicableSteps.map((s, idx) => (
                    <div 
                      key={s.id}
                      className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-1 rounded shrink-0"
                    >
                      <span className="font-bold text-slate-700">{s.stepNumber}. {s.approverTitle}</span>
                      {idx < approvalEvaluation.applicableSteps.length - 1 && (
                        <ArrowRight size={10} className="text-slate-400 ml-1" />
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-[8.5px] text-slate-500 font-semibold">
                  Exigencias para este monto: {approvalEvaluation.requirements.maxQuotesRequired} cotización(es) formal(es), 
                  {approvalEvaluation.requirements.requiresUafCheck ? ' Verificación UAF obligatoria, ' : ' Sin UAF previa, '}
                  SLA estimado: {approvalEvaluation.requirements.totalSlaHours}h hábiles.
                </p>
              </div>

              {/* CUADRO DE TOTALES */}
              <div className="flex flex-col items-end space-y-1 text-right">
                <div className="flex items-center justify-end gap-6 text-[11px] font-bold text-slate-600">
                  <span>Subtotal Neto:</span>
                  <span className="font-mono text-slate-900 w-28">${subtotal.toLocaleString('es-CL')}</span>
                </div>
                <div className="flex items-center justify-end gap-6 text-[11px] font-bold text-slate-600">
                  <span>IVA (19%):</span>
                  <span className="font-mono text-slate-900 w-28">${iva.toLocaleString('es-CL')}</span>
                </div>
                <div className="flex items-center justify-end gap-6 text-sm font-black text-[#002D62] pt-1 border-t border-slate-300">
                  <span className="uppercase">Total General CLP:</span>
                  <span className="font-mono text-emerald-700 text-base w-28">${grandTotal.toLocaleString('es-CL')}</span>
                </div>
              </div>

            </div>

          </div>

          {/* INSTRUCCIONES ESPECIALES */}
          <div className="bg-white rounded-lg border border-slate-300 p-3 space-y-1 shadow-xs">
            <label className="text-[9px] font-black text-slate-700 uppercase">
              Instrucciones Especiales & Observaciones de Entrega
            </label>
            <textarea
              rows={2}
              value={specialInstructions}
              onChange={e => setSpecialInstructions(e.target.value)}
              placeholder="Instrucciones al contratista, horario de intervención en el edificio, requerimientos de EPP..."
              className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-[11px] outline-none focus:bg-white focus:border-blue-600"
            />
          </div>

        </div>

        {/* ======================================================== */}
        {/* FOOTER BAR                                               */}
        {/* ======================================================== */}
        <div className="bg-[#E1E8EE] border-t border-slate-300 px-4 py-2.5 flex items-center justify-between">
          <div className="text-[10px] text-slate-600 font-medium flex items-center gap-2">
            <Lock size={12} className="text-[#002D62]" />
            <span>Datos blindados bajo protocolo de integridad. Las columnas de Categoría, Especialidad y Factura son inmutables.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-xs font-bold uppercase transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmitOrder}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-5 py-1.5 bg-[#002D62] hover:bg-[#0A4B82] text-white rounded text-xs font-black uppercase transition-all shadow-md cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <CheckCircle2 size={15} />
              <span>Emitir {docType === 'OP' ? 'Orden P4310' : 'Solicitud SQ'}</span>
            </button>
          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* MODAL 1: F0101 LIBRETA DE DIRECCIONES / PROVEEDORES      */}
      {/* ======================================================== */}
      {isAddressBookModalOpen && (
        <div className="fixed inset-0 z-[220] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border-2 border-[#002D62] shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-[#002D62] text-white px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search size={16} className="text-amber-400" />
                <h3 className="text-xs font-black uppercase tracking-wider">
                  F0101 - Consulta de Libreta de Direcciones / Maestro de Proveedores
                </h3>
              </div>
              <button 
                onClick={() => setIsAddressBookModalOpen(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3 bg-slate-50 border-b border-slate-200">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar por RUT, Razón Social, Giro o Especialidad..."
                  value={addressBookSearch}
                  onChange={e => setAddressBookSearch(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-8 py-2 text-xs font-bold uppercase outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500"
                  autoFocus
                />
                <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[400px]">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead className="sticky top-0 bg-[#E1E8EE] border-b border-slate-300 text-[10px] font-black uppercase text-slate-700">
                  <tr>
                    <th className="p-2">RUT</th>
                    <th className="p-2">Razón Social</th>
                    <th className="p-2">Especialidad</th>
                    <th className="p-2">Estado</th>
                    <th className="p-2 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredAddressBook.map(s => (
                    <tr 
                      key={s.id}
                      onClick={() => handleSelectSupplier(s)}
                      className="hover:bg-[#FFFFA6]/70 cursor-pointer transition-colors"
                    >
                      <td className="p-2 font-mono font-bold text-blue-900">{s.taxId}</td>
                      <td className="p-2 font-bold text-slate-900">{s.name}</td>
                      <td className="p-2 text-slate-600">{s.specialty || 'GENERAL'}</td>
                      <td className="p-2">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-100 text-emerald-800">
                          {s.status || 'ACTIVO'}
                        </span>
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleSelectSupplier(s)}
                          className="px-2 py-0.5 bg-[#002D62] text-white rounded text-[10px] font-bold uppercase"
                        >
                          Seleccionar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredAddressBook.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 font-bold">
                        No se encontraron proveedores que coincidan con la búsqueda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-2.5 bg-slate-100 border-t border-slate-300 text-right">
              <button
                type="button"
                onClick={() => setIsAddressBookModalOpen(false)}
                className="px-4 py-1 bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 rounded text-xs font-bold uppercase"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: F4101 BÚSQUEDA EXTENDIDA DE ARTÍCULOS Y SERVICIOS */}
      {/* ======================================================== */}
      {isItemMasterModalOpen && (
        <div className="fixed inset-0 z-[220] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border-2 border-[#002D62] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[88vh]">
            <div className="bg-[#002D62] text-white px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package size={16} className="text-amber-400" />
                <h3 className="text-xs font-black uppercase tracking-wider">
                  F4101 - Búsqueda Extendida en el Catálogo Maestro de Artículos y Servicios
                </h3>
              </div>
              <button 
                onClick={() => {
                  setIsItemMasterModalOpen(false);
                  setActiveLineIndexForSearch(null);
                }}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* FILTROS EXTENDIDOS */}
            <div className="p-3 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar por código, descripción, material..."
                  value={itemSearchText}
                  onChange={e => setItemSearchText(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-8 py-1.5 text-xs font-bold uppercase outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-500"
                  autoFocus
                />
                <Search size={14} className="absolute left-2.5 top-2 text-slate-400" />
              </div>

              <div>
                <select
                  value={itemSearchCategory}
                  onChange={e => setItemSearchCategory(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold uppercase text-slate-800 outline-none"
                >
                  <option value="ALL">-- TODAS LAS CATEGORÍAS --</option>
                  {catalogCategories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={itemSearchSpecialty}
                  onChange={e => setItemSearchSpecialty(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold uppercase text-slate-800 outline-none"
                >
                  <option value="ALL">-- TODOS LOS RUBROS / ESPECIALIDADES --</option>
                  {catalogSpecialties.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* LISTADO DE ARTÍCULOS CATALOGADOS */}
            <div className="flex-1 overflow-y-auto max-h-[420px]">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead className="sticky top-0 bg-[#E1E8EE] border-b border-slate-300 text-[10px] font-black uppercase text-slate-700">
                  <tr>
                    <th className="p-2 w-28">Código LITM</th>
                    <th className="p-2">Descripción Estandarizada F4101</th>
                    <th className="p-2 w-16 text-center">UOM</th>
                    <th className="p-2 w-28 text-right">Costo Estándar</th>
                    <th className="p-2 w-32">Rubro</th>
                    <th className="p-2 w-20 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredCatalogModalItems.map(item => (
                    <tr 
                      key={item.itemCode}
                      onClick={() => handleApplyCatalogItem(item)}
                      className="hover:bg-[#FFFFA6]/70 cursor-pointer transition-colors"
                    >
                      <td className="p-2 font-mono font-black text-blue-900">{item.itemCode}</td>
                      <td className="p-2 font-bold text-slate-800">
                        <div>{item.description}</div>
                        {item.secondDescription && (
                          <div className="text-[9.5px] font-normal text-slate-500 italic">{item.secondDescription}</div>
                        )}
                      </td>
                      <td className="p-2 text-center font-mono font-bold text-slate-600">{item.unitOfMeasure}</td>
                      <td className="p-2 text-right font-mono font-black text-emerald-800">
                        ${item.standardCost.toLocaleString('es-CL')}
                      </td>
                      <td className="p-2 text-[10px] font-bold text-slate-600">{item.specialty}</td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleApplyCatalogItem(item)}
                          className="px-2.5 py-1 bg-[#002D62] hover:bg-[#0A4B82] text-white rounded text-[10px] font-bold uppercase"
                        >
                          Aplicar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredCatalogModalItems.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        <p className="font-bold">No se encontraron artículos catalogados para los filtros seleccionados.</p>
                        <p className="text-[10px] mt-1 text-slate-400">
                          Si necesita un nuevo artículo o servicio extraordinario, solicite su alta formal al Data Steward.
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-2.5 bg-slate-100 border-t border-slate-300 flex items-center justify-between">
              <span className="text-[10px] text-slate-600 font-bold">
                {filteredCatalogModalItems.length} ítems encontrados en el catálogo oficial
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsItemMasterModalOpen(false);
                  setActiveLineIndexForSearch(null);
                }}
                className="px-4 py-1 bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 rounded text-xs font-bold uppercase"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: SOLICITAR ALTA DE NUEVO ARTÍCULO AL STEWARD     */}
      {/* ======================================================== */}
      {isNewItemRequestModalOpen && (
        <div className="fixed inset-0 z-[230] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border-2 border-amber-500 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} />
                <h3 className="text-xs font-black uppercase tracking-wider">
                  {userRole === 'ADMINISTRADOR' 
                    ? 'Alta Rápida de Artículo en Catálogo F4101 (Modo Admin)' 
                    : 'Solicitud Formal de Alta de Nuevo Artículo al Steward'}
                </h3>
              </div>
              <button 
                onClick={() => setIsNewItemRequestModalOpen(false)}
                className="text-white/80 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitNewItemRequest} className="p-4 space-y-3 text-[11px]">
              <div className="bg-amber-50 border border-amber-200 p-2 rounded text-[10px] text-amber-900 font-semibold">
                Para mantener la base de datos limpia y estandarizada para métricas, los artículos no pueden ser ingresados libremente por usuarios no calificados. Complete la ficha técnica para su validación e incorporación.
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-700 uppercase">
                  Descripción Técnica Normalizada *
                </label>
                <input
                  type="text"
                  placeholder="Ej: VALVULA REGULADORA DE PRESION 1 PULGADA..."
                  value={newProposedDesc}
                  onChange={e => setNewProposedDesc(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-xs font-bold uppercase outline-none focus:bg-white focus:border-amber-600"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-700 uppercase">
                    Categoría *
                  </label>
                  <select
                    value={newProposedCat}
                    onChange={e => setNewProposedCat(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 text-[10px] font-bold uppercase"
                  >
                    <option value="MANTENCIÓN PREVENTIVA">MANTENCIÓN PREVENTIVA</option>
                    <option value="MANTENCIÓN CORRECTIVA">MANTENCIÓN CORRECTIVA</option>
                    <option value="EMERGENCIA OPERACIONAL">EMERGENCIA OPERACIONAL</option>
                    <option value="MEJORA DE CAPITAL (CAPEX)">MEJORA DE CAPITAL</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-700 uppercase">
                    Especialidad / Rubro *
                  </label>
                  <select
                    value={newProposedSpec}
                    onChange={e => setNewProposedSpec(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 text-[10px] font-bold uppercase"
                  >
                    <option value="TECHUMBRES">TECHUMBRES</option>
                    <option value="PLOMERÍA">PLOMERÍA</option>
                    <option value="ELECTRICIDAD">ELECTRICIDAD</option>
                    <option value="CLIMATIZACIÓN">CLIMATIZACIÓN</option>
                    <option value="PINTURA">PINTURA</option>
                    <option value="CERRAJERÍA">CERRAJERÍA</option>
                    <option value="SERVICIOS GENERALES">SERVICIOS GENERALES</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-700 uppercase">
                    Unidad de Medida (UOM) *
                  </label>
                  <select
                    value={newProposedUom}
                    onChange={e => setNewProposedUom(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 text-[10px] font-bold uppercase"
                  >
                    <option value="UN">UN - UNIDAD</option>
                    <option value="M2">M2 - METRO CUADRADO</option>
                    <option value="ML">ML - METRO LINEAL</option>
                    <option value="GL">GL - GLOBAL</option>
                    <option value="CJ">CJ - CAJA</option>
                    <option value="KG">KG - KILOGRAMO</option>
                    <option value="HR">HR - HORA HOMBRE</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-700 uppercase">
                    Costo Estimado de Referencia ($)
                  </label>
                  <input
                    type="number"
                    value={newProposedCost}
                    onChange={e => setNewProposedCost(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded px-2 py-1.5 text-[11px] font-mono font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-700 uppercase">
                  Justificación Técnica del Requerimiento
                </label>
                <textarea
                  rows={2}
                  value={newProposedJustification}
                  onChange={e => setNewProposedJustification(e.target.value)}
                  placeholder="Explique por qué es necesario este servicio o material para su posterior análisis..."
                  className="w-full bg-slate-50 border border-slate-300 rounded p-2 text-xs outline-none focus:bg-white focus:border-amber-600"
                />
              </div>

              {itemRequestFeedback && (
                <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-2 rounded text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle2 size={15} className="text-emerald-600" />
                  <span>{itemRequestFeedback}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsNewItemRequestModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-bold uppercase"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-black uppercase transition-all shadow-md cursor-pointer"
                >
                  {userRole === 'ADMINISTRADOR' ? 'Crear e Inyectar al Catálogo F4101' : 'Enviar Solicitud al Steward'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
export default JDEP4310OrderEntryModal;
