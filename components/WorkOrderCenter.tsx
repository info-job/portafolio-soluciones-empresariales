import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  WorkOrder,
  WorkOrderLineItem,
  Property,
  Supplier,
  USER_CREDENTIALS,
  WorkOrderStatus,
  PAYMENT_TERMS_CHILE,
  LineItemStatus,
  WorkOrderAction,
  Transaction,
} from "../types";
import { CHART_OF_ACCOUNTS } from "../lib/accountingData";
import { useResizableColumns } from "../lib/useResizableColumns";
import { maskFolioOrInvoice, checkDuplicateInvoice, maskMoneyCLP, allowOnlyDigitsKey } from "../lib/inputMasks";
import {
  Plus,
  Hammer,
  ChevronRight,
  Save,
  X,
  Search,
  Trash2,
  MapPin,
  Building2,
  AlertCircle,
  CheckCircle2,
  FileText,
  Database,
  Hash,
  Printer,
  Cloud,
  ExternalLink,
  ArrowLeft,
  DollarSign,
  ListPlus,
  ShieldCheck,
  Zap,
  ChevronDown,
  Percent,
  BookOpen,
  Eye,
  FileUp,
  FileSpreadsheet,
  User,
  ClipboardList,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Sparkles,
  Layers,
  Activity,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  FileDown,
  XCircle,
  Network,
} from "lucide-react";
import WorkOrderDocument from "./WorkOrderDocument";
import { exportToExcel, exportWorkOrdersToExcel } from "../lib/excelExport";
import { printHtmlElement, downloadElementAsPdf } from "../lib/printDocument";
import {
  formatCLP,
  calculateIVA,
  calculateRetention,
} from "../lib/chileanUtils";
import { extractQuoteData } from "../geminiService";
import { useNotification } from "./NotificationProvider";
import { JDEContextualMenu } from "./JDEContextualMenu";
import { JDEGridContextMenu } from "./JDEGridContextMenu";
import { F980011DModal } from "./F980011DModal";
import { downloadJDEWorkOrderVoucher } from "../lib/pdfGenerator";
import { JDEInterconnectionMapModal } from "./JDEInterconnectionMapModal";
import { InterAreaActionBanner } from "./InterAreaActionBanner";
import { GridDimensionControls } from "./common/GridDimensionControls";
import { JDEP4310OrderEntryModal } from "./JDEP4310OrderEntryModal";
import { JDELineApprovalModal } from "./JDELineApprovalModal";

const MAX_OT_ITEMS = 10;

const CUSTOM_PAYMENT_TERMS = [
  ...PAYMENT_TERMS_CHILE.filter((t) => !t.includes("ANTICIPO")),
  "ANTICIPO PERSONALIZADO / SALDO CONTRA RECEPCIÓN",
  "CONTRA FACTURA 100%",
];

export const WORK_CATEGORIES = [
  "MANTENCIÓN PREVENTIVA",
  "MANTENCIÓN CORRECTIVA",
  "REPARACIÓN EXTRAORDINARIA",
  "CERTIFICACIÓN / SELLO",
  "EMERGENCIA",
  "MEJORA / INSTALACIÓN",
  "SANITIZACIÓN / FUMIGACIÓN",
  "OTROS"
];

export const WORK_SPECIALTIES = [
  "TECHUMBRES",
  "PLOMERÍA / GASFITERÍA",
  "ALFOMBRAS / PISOS",
  "PINTURA",
  "ELECTRICIDAD",
  "CLIMATIZACIÓN",
  "ASCENSORES",
  "SEGURIDAD",
  "OBRA GRUESA / ALBAÑILERÍA",
  "SANITIZACIÓN / FUMIGACIÓN",
  "JARDINERÍA / PAISAJISMO",
  "OTROS"
];

interface WorkOrderCenterProps {
  workOrders: WorkOrder[];
  properties: Property[];
  suppliers: Supplier[];
  currentUser: string;
  onSave: (req: WorkOrder) => void;
  onDelete: (id: string) => void;
  onSeed?: () => void;
  onSync?: () => Promise<void>;
  companyLogo: string | null;
  transactions?: Transaction[];
  onAddTransaction?: (newTx: Transaction) => void;
}

const WorkOrderCenter: React.FC<WorkOrderCenterProps> = ({
  workOrders,
  properties,
  suppliers,
  currentUser,
  onSave,
  onDelete,
  onSeed,
  onSync,
  companyLogo,
  transactions = [],
  onAddTransaction,
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isP4310ModalOpen, setIsP4310ModalOpen] = useState(false);
  const [inspectTarget, setInspectTarget] = useState<WorkOrder | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDraftPreview, setIsDraftPreview] = useState(false);
  const [previewOrder, setPreviewOrder] = useState<WorkOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  // ERP Contextual Menu Overlay states
  const [isJDEMenuOpen, setIsJDEMenuOpen] = useState(false);
  const [selectedOTForJDE, setSelectedOTForJDE] = useState<WorkOrder | null>(
    null,
  );
  // AssetFlow Enterprise Floating Grid Context Menu (Right Click)
  const [gridContextMenu, setGridContextMenu] = useState<{
    x: number;
    y: number;
    order: WorkOrder;
  } | null>(null);

  // AssetFlow Enterprise Line Approval Workbench State (P43081)
  const [lineApprovalModalOrder, setLineApprovalModalOrder] = useState<WorkOrder | null>(null);

  // ERP QBE (Query By Example) columnar filter states
  const [colSearchFolio, setColSearchFolio] = useState("");
  const [colSearchProveedor, setColSearchProveedor] = useState("");
  const [colSearchUbicacion, setColSearchUbicacion] = useState("");
  const [colSearchResumen, setColSearchResumen] = useState("");
  const [colSearchCategoria, setColSearchCategoria] = useState("");
  const [colSearchEspecialidad, setColSearchEspecialidad] = useState("");
  const [colSearchFactura, setColSearchFactura] = useState("");
  const [colSearchTotal, setColSearchTotal] = useState("");
  const [colSearchEstado, setColSearchEstado] = useState("");

  // ERP Sorting states (AssetFlow Enterprise tri-state cycle)
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const handleSort = (field: string) => {
    if (sortField !== field) {
      // 1er Clic: Mayor a Menor / Más reciente a más antiguo (desc)
      setSortField(field);
      setSortOrder("desc");
    } else if (sortOrder === "desc") {
      // 2do Clic: Menor a Mayor / Más antiguo a más reciente (asc)
      setSortOrder("asc");
    } else {
      // 3er Clic: Restablecer al orden original natural de base de datos
      setSortField(null);
      setSortOrder("desc");
    }
  };

  // ERP UDC Lookup Modal states
  const [isStatusUDCOpen, setIsStatusUDCOpen] = useState(false);
  const [udcSearchTerm, setUdcSearchTerm] = useState("");
  const [selectedUdcIndex, setSelectedUdcIndex] = useState<number | null>(null);

  // ERP Asset/Supplier/WorkOrder Master Lookup states
  const [isFolioUDCOpen, setIsFolioUDCOpen] = useState(false);
  const [folioSearchTerm, setFolioSearchTerm] = useState("");
  const [selectedFolioIndex, setSelectedFolioIndex] = useState<number | null>(
    null,
  );

  const [isSupplierUDCOpen, setIsSupplierUDCOpen] = useState(false);
  const [supplierSearchTerm, setSupplierSearchTerm] = useState("");
  const [selectedSupplierIndex, setSelectedSupplierIndex] = useState<
    number | null
  >(null);

  const [isLocationUDCOpen, setIsLocationUDCOpen] = useState(false);
  const [locationSearchTerm, setLocationSearchTerm] = useState("");
  const [selectedLocationIndex, setSelectedLocationIndex] = useState<
    number | null
  >(null);

  // New UDC lookups for Categoría, Especialidad, and Factura
  const [isCategoryUDCOpen, setIsCategoryUDCOpen] = useState(false);
  const [categorySearchTerm, setCategorySearchTerm] = useState("");
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState<number | null>(null);

  const [isSpecialtyUDCOpen, setIsSpecialtyUDCOpen] = useState(false);
  const [specialtySearchTerm, setSpecialtySearchTerm] = useState("");
  const [selectedSpecialtyIndex, setSelectedSpecialtyIndex] = useState<number | null>(null);

  const [isFacturaUDCOpen, setIsFacturaUDCOpen] = useState(false);
  const [facturaSearchTerm, setFacturaSearchTerm] = useState("");
  const [selectedFacturaIndex, setSelectedFacturaIndex] = useState<number | null>(null);

  const uniqueInvoices = useMemo(() => {
    const list = new Set<string>();
    workOrders.forEach((o) => {
      if (o.associatedInvoice) {
        list.add(o.associatedInvoice);
      }
    });
    // Default system invoices
    list.add("F-10243");
    list.add("F-10244");
    list.add("F-10245");
    list.add("F-11050");
    list.add("F-12490");
    return Array.from(list);
  }, [workOrders]);

  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [selectedOTForTracking, setSelectedOTForTracking] =
    useState<WorkOrder | null>(null);
  const [trackingResponsible, setTrackingResponsible] = useState("");
  const [newAction, setNewAction] = useState({
    description: "",
    type: "REALIZADA" as "REALIZADA" | "PENDIENTE",
    deadline: "",
    actionResponsible: "",
    trackingResponsible: "",
    entryDate: new Date().toISOString().split("T")[0],
  });
  const descriptionInputRef = useRef<HTMLInputElement>(null);
  const [showInterconnectionModal, setShowInterconnectionModal] = useState(false);

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
      index: 42,
      folio: 120,
      proveedor: 180,
      ubicacion: 175,
      resumen: 260,
      categoria: 140,
      especialidad: 140,
      factura: 110,
      total: 120,
      estado: 180,
      acciones: 200,
    },
    initialRowHeight: 52,
    storageKey: 'work_orders'
  });

  const [formData, setFormData] = useState({
    supplierId: "",
    propertyId: "",
    quoteNumber: "",
    deliveryDate: "Por confirmar",
    paymentTerms: CUSTOM_PAYMENT_TERMS[0],
    advancePercent: 30,
    deliveryAddress: "Catedral N°1337, Santiago",
    specialInstructions: "",
    accountCode: "",
    category: "MANTENCIÓN PREVENTIVA",
    specialty: "TECHUMBRES",
    associatedInvoice: "",
    items: [] as WorkOrderLineItem[],
  });

  const [newItem, setNewItem] = useState({
    description: "",
    quantity: 1,
    unitPrice: 0,
  });

  const [isExtracting, setIsExtracting] = useState(false);
  const quoteFileInputRef = useRef<HTMLInputElement>(null);
  const { notify } = useNotification();

  const handleQuoteExtraction = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((res) => {
        reader.onload = () => res(reader.result as string);
        reader.readAsDataURL(file);
      });

      const data = await extractQuoteData(await base64Promise, file.type);

      if (data && !data.error) {
        // Find supplier by name or RUT if possible
        const matchedSupplier = activeSuppliers.find(
          (s) =>
            s.name.toUpperCase().includes(data.supplierName.toUpperCase()) ||
            (data.supplierTaxId && s.taxId.includes(data.supplierTaxId)),
        );

        setFormData((prev) => ({
          ...prev,
          supplierId: matchedSupplier?.id || "",
          quoteNumber: data.quoteNumber || "",
          items: data.items.map((item: any) => ({
            id: crypto.randomUUID(),
            description: item.description.toUpperCase(),
            quantity: item.quantity,
            receivedQuantity: 0,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
            status: "PENDIENTE",
          })),
        }));

        if (!matchedSupplier) {
          notify(
            `IA identificó al proveedor "${data.supplierName}" pero no está en el maestro.`,
            "info",
          );
        } else {
          notify("¡Cotización procesada con éxito!", "success");
        }
      } else if (data?.error) {
        notify(
          "No se pudo extraer la información. Verifique el documento.",
          "error",
        );
      }
    } catch (error) {
      console.error("Error extracting quote:", error);
      notify("Error al procesar la cotización.", "error");
    } finally {
      setIsExtracting(false);
      if (quoteFileInputRef.current) quoteFileInputRef.current.value = "";
    }
  };

  const isCustomAdvance =
    formData.paymentTerms === "ANTICIPO PERSONALIZADO / SALDO CONTRA RECEPCIÓN";

  // SOLO PROVEEDORES ACTIVOS (APROBADOS) PUEDEN RECIBIR OT
  const activeSuppliers = useMemo(
    () => suppliers.filter((s) => s.status === "ACTIVE"),
    [suppliers],
  );
  const userAccount = USER_CREDENTIALS[currentUser];

  const generateOTFolio = () => {
    const year = new Date().getFullYear();
    const count = workOrders.length + 1;
    return `OT-${year}-${count.toString().padStart(3, "0")}`;
  };

  const addItem = () => {
    if (formData.items.length >= MAX_OT_ITEMS) {
      notify(`Límite alcanzado: Máximo ${MAX_OT_ITEMS} líneas.`, "error");
      return;
    }

    const desc = newItem.description.trim().toUpperCase();
    if (!desc) {
      notify("Ingrese una descripción para el ítem.", "info");
      return;
    }

    const qty = newItem.quantity > 0 ? newItem.quantity : 1;
    const price = newItem.unitPrice > 0 ? newItem.unitPrice : 0;

    const item: WorkOrderLineItem = {
      id: crypto.randomUUID(),
      description: desc,
      quantity: qty,
      receivedQuantity: 0,
      unitPrice: price,
      total: qty * price,
      status: "PENDIENTE",
    };

    setFormData((p) => ({ ...p, items: [...p.items, item] }));
    setNewItem({ description: "", quantity: 1, unitPrice: 0 });
    setTimeout(() => descriptionInputRef.current?.focus(), 10);
  };

  const removeItem = (id: string) => {
    setFormData((p) => ({ ...p, items: p.items.filter((i) => i.id !== id) }));
  };

  const calculateTotals = (isInvoice: boolean) => {
    const subtotal = formData.items.reduce((sum, i) => sum + i.total, 0);
    const tax = isInvoice
      ? calculateIVA(subtotal)
      : calculateRetention(subtotal);
    return { subtotal, iva: tax, total: subtotal + tax };
  };

  const calculateConfidence = (data: any) => {
    const fields = [
      data.supplierId,
      data.propertyId,
      data.quoteNumber,
      data.deliveryDate,
      data.paymentTerms,
      data.deliveryAddress,
      data.specialInstructions,
    ];
    const filledFields = fields.filter(
      (f) => !!f && f !== "Por confirmar",
    ).length;
    const itemsCount = data.items.length;
    const totalPossible = fields.length + 1; // +1 for items
    const totalFilled = filledFields + (itemsCount > 0 ? 1 : 0);
    return Math.round((totalFilled / totalPossible) * 100);
  };

  const handleReviewDraft = (e: React.FormEvent) => {
    e.preventDefault();
    const supplier = activeSuppliers.find((s) => s.id === formData.supplierId);
    const property = properties.find((p) => p.id === formData.propertyId);

    if (!formData.supplierId) {
      notify("Error: Seleccione un Proveedor.", "error");
      return;
    }
    if (!formData.propertyId) {
      notify("Error: Seleccione una Propiedad.", "error");
      return;
    }
    if (formData.items.length === 0) {
      notify("Error: La orden debe tener al menos un ítem.", "error");
      return;
    }

    const finalPaymentTerms = isCustomAdvance
      ? `ANTICIPO ${formData.advancePercent}% / SALDO ${100 - formData.advancePercent}% CONTRA RECEPCIÓN`
      : formData.paymentTerms;

    const { subtotal, iva, total } = calculateTotals(
      supplier!.taxDocumentType === "FACTURA",
    );
    const nowISO = new Date().toISOString();

    const draftOT: WorkOrder = {
      id: crypto.randomUUID(),
      folio: generateOTFolio(),
      issueDate: new Date().toISOString().split("T")[0],
      preparedBy: currentUser,
      preparedByDept: userAccount.deptTitle,
      preparedByPhone: userAccount.phone || "N/A",
      preparedByEmail: userAccount.email,
      preparedAt: nowISO,
      supplierId: supplier!.id,
      supplierName: supplier!.name,
      supplierTaxId: supplier!.taxId,
      supplierTaxDocumentType: supplier!.taxDocumentType,
      supplierAddress: supplier!.address || "Santiago Centro",
      supplierContact: supplier!.contactName,
      supplierPhone: supplier!.phone,
      supplierEmail: supplier!.email,
      quoteNumber: formData.quoteNumber,
      requestDate: new Date().toISOString().split("T")[0],
      reqDept: "Inmobiliario",
      deliveryDate: formData.deliveryDate,
      paymentTerms: finalPaymentTerms,
      deliveryAddress: formData.deliveryAddress,
      items: formData.items,
      subtotal,
      iva,
      total,
      specialInstructions: formData.specialInstructions,
      category: formData.category,
      specialty: formData.specialty,
      associatedInvoice: formData.associatedInvoice,
      status: "BORRADOR",
      propertyId: property!.id,
      propertyLabel: `${property!.building} - PISO ${property!.floor}`,
      accountCode: formData.accountCode,
      timestamp: Date.now(),
      confidenceScore: calculateConfidence(formData),
      lockedBy: null,
      lockedAt: null,
    };

    setPreviewOrder(draftOT);
    setIsDraftPreview(true);
    setIsPreviewOpen(true);
  };

  const handleApproveExistingOT = (ot: WorkOrder) => {
    const now = new Date();
    const approveAction: WorkOrderAction = {
      id: crypto.randomUUID(),
      date: now.toISOString(),
      entryDate: now.toISOString().split("T")[0],
      type: "REALIZADA",
      user: currentUser,
      actionResponsible: "JEFATURA & CONTROL FINANCIERO",
      trackingResponsible: "ADQUISICIONES & COMPRAS",
      actionCategory: "APPROVAL",
      sourceArea: `JEFATURA (${currentUser})`,
      targetArea: "ADQUISICIONES & COMPRAS",
      description: `APROBACIÓN DE ORDEN Y CONTROL PRESUPUESTARIO CONFORME (ERP EDO 220 -> 230). Visto bueno otorgado. Hito inter-área pendiente: Compras debe emitir e imprimir la orden formal (R43500) para habilitar recepción en Bodega.`,
    };

    const updatedOT: WorkOrder = {
      ...ot,
      status: "APROBADA",
      authorizedBy: currentUser,
      authorizationDate: now.toISOString().split("T")[0],
      authorizedAt: now.toISOString(),
      complianceApprovedBy: "ING. CLAUDIA VALENZUELA (COMPLIANCE ERP)",
      complianceApprovedAt: new Date(
        now.getTime() - 1000 * 60 * 30,
      ).toISOString(),
      jdeLastStatus: "220",
      jdeNextStatus: "230",
      trackingActions: [approveAction, ...(ot.trackingActions || [])],
    };
    onSave(updatedOT);
    setPreviewOrder(updatedOT);
    alert(
      "✅ ORDEN DE TRABAJO APROBADA CORRECTAMENTE.\nSe han registrado las firmas de formulación, compliance ERP, visto bueno de gasto y el hito en el historial de la transacción.\n\nSiguiente Hito Inter-Áreas: El Área de Compras / Adquisiciones debe emitir e imprimir la orden formal (R43500) para habilitar la recepción en Bodega.",
    );
  };

  const handlePrintAndEmitExistingOT = (ot: WorkOrder, asPdf = false) => {
    const now = new Date();
    
    // In ERP: Printing changes status from 230 to 280 (Print Purchase Order UBE R43500)
    const emitAction: WorkOrderAction = {
      id: crypto.randomUUID(),
      date: now.toISOString(),
      entryDate: now.toISOString().split("T")[0],
      type: "REALIZADA",
      user: currentUser,
      actionResponsible: "ADQUISICIONES & COMPRAS",
      trackingResponsible: "BODEGA, ALMACÉN & OPERACIONES",
      actionCategory: "EMISSION",
      sourceArea: `COMPRAS (${currentUser})`,
      targetArea: "BODEGA & ALMACÉN",
      description: `EMISIÓN FORMAL E IMPRESIÓN ERP (R43500 / EDO 230 -> 280) [${asPdf ? "DESCARGA PDF" : "IMPRESIÓN FÍSICA"}]. Orden transmitida formalmente al proveedor. DESBLOQUEO INTER-ÁREAS: Bodega (P4312) queda facultada para la recepción física conforme.`,
    };

    let updatedOT: WorkOrder = {
      ...ot,
      printedAt: ot.printedAt || now.toISOString(),
      printedBy: ot.printedBy || currentUser,
      printCount: (ot.printCount || 0) + 1,
      emissionChannel: 'ENVIO_DIGITAL',
      trackingActions: [emitAction, ...(ot.trackingActions || [])],
    };

    if (ot.status === 'APROBADA') {
      updatedOT = {
        ...updatedOT,
        status: 'EMITIDA_IMPRESA',
        jdeLastStatus: '280',
        jdeNextStatus: '400',
      };
      onSave(updatedOT);
      setPreviewOrder(updatedOT);
      alert(
        `🖨️ EMISIÓN FORMAL ERP (R43500) - ESTADO 280\n\nOrden ${ot.folio} emitida e impresa formalmente por Compras.\nAcción registrada en el historial de la transacción.\n\n✅ HITO INTER-ÁREAS DESBLOQUEADO:\nBodega (P4312) ahora cuenta con la autorización requerida por Reglas de Actividad F40203 para realizar la recepción técnica de la mercadería.`
      );
    } else {
      onSave(updatedOT);
      setPreviewOrder(updatedOT);
    }

    if (asPdf) {
      downloadElementAsPdf("printable-report", `Orden_de_Trabajo_${ot.folio}.pdf`);
    } else {
      printHtmlElement("printable-report", `Orden_de_Trabajo_${ot.folio}`);
    }
  };

  const handleRejectExistingOT = (ot: WorkOrder) => {
    const reason = prompt(
      "Ingrese el motivo / observación técnica del rechazo de la OT:",
      "No cumple con especificaciones técnicas requeridas / fuera de marco presupuestario",
    );
    if (reason === null) return;
    const now = new Date();
    const rejectAction: WorkOrderAction = {
      id: crypto.randomUUID(),
      date: now.toISOString(),
      entryDate: now.toISOString().split("T")[0],
      type: "REALIZADA",
      user: currentUser,
      actionResponsible: "JEFATURA / CONTROL INTERNO",
      trackingResponsible: "ÁREA SOLICITANTE",
      actionCategory: "STATUS_CHANGE",
      sourceArea: `JEFATURA (${currentUser})`,
      targetArea: "SOLICITANTE",
      description: `RECHAZO DE ORDEN DE TRABAJO: ${reason.trim().toUpperCase()}. Requiere subsanar observaciones o reasignación de partida presupuestaria.`,
    };

    const updatedOT: WorkOrder = {
      ...ot,
      status: "RECHAZADA",
      rejectedBy: currentUser,
      rejectedAt: now.toISOString(),
      rejectionReason: reason.trim() || "Rechazada en revisión técnica",
      evaluationNotes: reason.trim() || "Rechazada en revisión técnica",
      complianceApprovedBy: "ING. CLAUDIA VALENZUELA (COMPLIANCE ERP)",
      complianceApprovedAt: new Date(
        now.getTime() - 1000 * 60 * 30,
      ).toISOString(),
      trackingActions: [rejectAction, ...(ot.trackingActions || [])],
    };
    onSave(updatedOT);
    setPreviewOrder(updatedOT);
    alert(
      "❌ ORDEN DE TRABAJO RECHAZADA.\nSe ha registrado el dictamen de rechazo, motivo, evaluador, fecha, hora y el hito en el historial de la transacción.",
    );
  };

  const confirmAndEmit = () => {
    if (previewOrder) {
      const isManager =
        userAccount.role === "JEFE" || userAccount.role === "ADMINISTRADOR";
      const now = new Date();

      const creationAction: WorkOrderAction = {
        id: crypto.randomUUID(),
        date: now.toISOString(),
        entryDate: now.toISOString().split("T")[0],
        type: "REALIZADA",
        user: currentUser,
        actionResponsible: previewOrder.preparedBy || currentUser,
        trackingResponsible: isManager ? "ADQUISICIONES & COMPRAS" : "JEFATURA (VISTO BUENO)",
        actionCategory: isManager ? "APPROVAL" : "STATUS_CHANGE",
        sourceArea: `${currentUser} (${previewOrder.preparedByDept || "FORMULACIÓN"})`,
        targetArea: isManager ? "ADQUISICIONES & COMPRAS" : "JEFATURA",
        description: isManager
          ? `FORMULACIÓN Y APROBACIÓN DIRECTA DE ORDEN (ERP EDO 230). Monto: ${formatCLP(previewOrder.total)}. Requiere emisión por Compras (R43500) para habilitar recepción en Bodega.`
          : `SOLICITUD Y FORMULACIÓN DE ORDEN (ERP EDO 110/220). Monto: ${formatCLP(previewOrder.total)}. En espera de VoBo y Aprobación de Gasto por Jefatura.`,
      };

      const finalOT: WorkOrder = {
        ...previewOrder,
        status: isManager ? "APROBADA" : "PENDIENTE_VB",
        jdeLastStatus: isManager ? "220" : "110",
        jdeNextStatus: isManager ? "230" : "220",
        preparedBy: previewOrder.preparedBy || currentUser,
        preparedAt: previewOrder.preparedAt || now.toISOString(),
        complianceApprovedBy: "ING. CLAUDIA VALENZUELA (COMPLIANCE ERP)",
        complianceApprovedAt: new Date(
          now.getTime() - 1000 * 60 * 30,
        ).toISOString(),
        authorizedBy: isManager ? currentUser : undefined,
        authorizationDate: isManager
          ? now.toISOString().split("T")[0]
          : undefined,
        authorizedAt: isManager ? now.toISOString() : undefined,
        trackingActions: [creationAction, ...(previewOrder.trackingActions || [])],
      };

      onSave(finalOT);
      setIsPreviewOpen(false);
      setIsDraftPreview(false);
      setIsFormOpen(false);
      setPreviewOrder(null);
      setFormData({
        supplierId: "",
        propertyId: "",
        quoteNumber: "",
        deliveryDate: "Por confirmar",
        paymentTerms: CUSTOM_PAYMENT_TERMS[0],
        advancePercent: 30,
        deliveryAddress: "Catedral N°1337, Santiago",
        specialInstructions: "",
        accountCode: "",
        category: "MANTENCIÓN PREVENTIVA",
        specialty: "TECHUMBRES",
        associatedInvoice: "",
        items: [],
      });
    }
  };

  const handleOpenTracking = (ot: WorkOrder) => {
    setSelectedOTForTracking(ot);
    setTrackingResponsible(ot.trackingResponsible || "");
    setIsTrackingOpen(true);
  };

  const handleSaveTracking = () => {
    if (!selectedOTForTracking) return;

    const updatedOT: WorkOrder = {
      ...selectedOTForTracking,
      trackingResponsible: trackingResponsible,
    };

    onSave(updatedOT);
    setIsTrackingOpen(false);
    setSelectedOTForTracking(null);
  };

  const handleAddAction = () => {
    if (!selectedOTForTracking || !newAction.description.trim()) return;

    const action: WorkOrderAction = {
      id: crypto.randomUUID(),
      date: new Date(newAction.entryDate + "T12:00:00Z").toISOString(),
      entryDate: newAction.entryDate,
      deadline: newAction.deadline || undefined,
      description: newAction.description.trim().toUpperCase(),
      user: currentUser,
      actionResponsible: newAction.actionResponsible || undefined,
      trackingResponsible: newAction.trackingResponsible || undefined,
      type: newAction.type,
    };

    const updatedOT: WorkOrder = {
      ...selectedOTForTracking,
      trackingActions: [
        action,
        ...(selectedOTForTracking.trackingActions || []),
      ],
    };

    onSave(updatedOT);
    setSelectedOTForTracking(updatedOT);
    setNewAction({
      description: "",
      type: "REALIZADA",
      deadline: "",
      actionResponsible: "",
      trackingResponsible: "",
      entryDate: new Date().toISOString().split("T")[0],
    });
  };

  const filteredOrders = useMemo(() => {
    const result = workOrders.filter((o) => {
      const matchesSearch =
        !searchTerm ||
        o.folio.includes(searchTerm) ||
        o.supplierName.includes(searchTerm.toUpperCase());

      const property = properties.find((p) => p.id === o.propertyId);
      const propertyLabel = property
        ? `${property.name} (${property.address})`
        : "S/I";

      const matchesColFolio =
        !colSearchFolio ||
        (o.folio &&
          o.folio.toLowerCase().includes(colSearchFolio.toLowerCase()));
      const matchesColProveedor =
        !colSearchProveedor ||
        (o.supplierName &&
          o.supplierName
            .toLowerCase()
            .includes(colSearchProveedor.toLowerCase()));
      const matchesColUbicacion =
        !colSearchUbicacion ||
        propertyLabel.toLowerCase().includes(colSearchUbicacion.toLowerCase());

      const combinedResumen = `${o.specialInstructions || ""} ${o.items?.map((it) => it.description).join(" ") || ""}`;
      const matchesColResumen =
        !colSearchResumen ||
        combinedResumen.toLowerCase().includes(colSearchResumen.toLowerCase());

      const matchesColCategoria =
        !colSearchCategoria ||
        (o.category &&
          o.category.toLowerCase().includes(colSearchCategoria.toLowerCase()));

      const matchesColEspecialidad =
        !colSearchEspecialidad ||
        (o.specialty &&
          o.specialty.toLowerCase().includes(colSearchEspecialidad.toLowerCase()));

      const matchesColFactura =
        !colSearchFactura ||
        (o.associatedInvoice &&
          o.associatedInvoice.toLowerCase().includes(colSearchFactura.toLowerCase()));

      const totalStr = o.total ? o.total.toString() : (o.totalAmount ? o.totalAmount.toString() : "");
      const matchesColTotal =
        !colSearchTotal || totalStr.includes(colSearchTotal);

      const matchesColEstado =
        !colSearchEstado ||
        (o.status &&
          o.status.toLowerCase().includes(colSearchEstado.toLowerCase()));

      return (
        matchesSearch &&
        matchesColFolio &&
        matchesColProveedor &&
        matchesColUbicacion &&
        matchesColResumen &&
        matchesColCategoria &&
        matchesColEspecialidad &&
        matchesColFactura &&
        matchesColTotal &&
        matchesColEstado
      );
    });

    // Apply Sorting
    if (sortField) {
      result.sort((a, b) => {
        let valA: any = "";
        let valB: any = "";

        if (sortField === "folio") {
          const digitsA = (a.folio || "").replace(/\D/g, "");
          const digitsB = (b.folio || "").replace(/\D/g, "");
          const numA = parseInt(digitsA || "0", 10);
          const numB = parseInt(digitsB || "0", 10);
          if (digitsA && digitsB && !isNaN(numA) && !isNaN(numB)) {
            return sortOrder === "asc" ? numA - numB : numB - numA;
          }
          valA = (a.folio || "").toLowerCase();
          valB = (b.folio || "").toLowerCase();
        } else if (sortField === "proveedor") {
          valA = (a.supplierName || "").toLowerCase();
          valB = (b.supplierName || "").toLowerCase();
        } else if (sortField === "ubicacion") {
          const propA = properties.find((p) => p.id === a.propertyId);
          const labelA = propA ? `${propA.name} (${propA.address})` : "S/I";
          const propB = properties.find((p) => p.id === b.propertyId);
          const labelB = propB ? `${propB.name} (${propB.address})` : "S/I";
          valA = labelA.toLowerCase();
          valB = labelB.toLowerCase();
        } else if (sortField === "resumen") {
          const resA = `${a.specialInstructions || ""} ${a.items?.map((it) => it.description).join(" ") || ""}`;
          const resB = `${b.specialInstructions || ""} ${b.items?.map((it) => it.description).join(" ") || ""}`;
          valA = resA.toLowerCase();
          valB = resB.toLowerCase();
        } else if (sortField === "categoria") {
          valA = (a.category || "MANTENCIÓN PREVENTIVA").toLowerCase();
          valB = (b.category || "MANTENCIÓN PREVENTIVA").toLowerCase();
        } else if (sortField === "especialidad") {
          valA = (a.specialty || "TECHUMBRES").toLowerCase();
          valB = (b.specialty || "TECHUMBRES").toLowerCase();
        } else if (sortField === "factura") {
          valA = (a.associatedInvoice || "").toLowerCase();
          valB = (b.associatedInvoice || "").toLowerCase();
        } else if (sortField === "total") {
          const totA = a.total || 0;
          const totB = b.total || 0;
          return sortOrder === "asc" ? totA - totB : totB - totA;
        } else if (sortField === "estado") {
          valA = (a.status || "").toLowerCase();
          valB = (b.status || "").toLowerCase();
        }

        if (valA < valB) return sortOrder === "asc" ? -1 : 1;
        if (valA > valB) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [
    workOrders,
    searchTerm,
    suppliers,
    properties,
    colSearchFolio,
    colSearchProveedor,
    colSearchUbicacion,
    colSearchResumen,
    colSearchCategoria,
    colSearchEspecialidad,
    colSearchFactura,
    colSearchTotal,
    colSearchEstado,
    sortField,
    sortOrder,
  ]);

  // Reset page when filtering
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    colSearchFolio,
    colSearchProveedor,
    colSearchUbicacion,
    colSearchResumen,
    colSearchCategoria,
    colSearchEspecialidad,
    colSearchFactura,
    colSearchTotal,
    colSearchEstado
  ]);

  // Listen for global ERP Toolbar Events (Top Menu Bar)
  useEffect(() => {
    const handleJdeFind = () => {
      setCurrentPage(1);
    };
    const handleJdeNew = () => {
      setIsFormOpen(true);
    };
    const handleJdeExport = () => {
      exportWorkOrdersToExcel(
        filteredOrders,
        `Reporte_Ordenes_OTs_${new Date().toISOString().split("T")[0]}`
      );
    };
    const handleJdeClearQBE = () => {
      setColSearchFolio("");
      setColSearchProveedor("");
      setColSearchUbicacion("");
      setColSearchResumen("");
      setColSearchCategoria("");
      setColSearchEspecialidad("");
      setColSearchFactura("");
      setColSearchTotal("");
      setColSearchEstado("");
      setSearchTerm("");
    };
    const handleJdePrint = () => {
      if (filteredOrders.length > 0) {
        downloadJDEWorkOrderVoucher({
          workOrder: filteredOrders[0],
          currentUser
        });
      }
    };
    const handleJdeSelect = () => {
      if (filteredOrders.length > 0) {
        setPreviewOrder(filteredOrders[0]);
        setIsDraftPreview(false);
        setIsPreviewOpen(true);
      }
    };

    window.addEventListener('jde:find', handleJdeFind);
    window.addEventListener('jde:new', handleJdeNew);
    window.addEventListener('jde:export', handleJdeExport);
    window.addEventListener('jde:clear_qbe', handleJdeClearQBE);
    window.addEventListener('jde:print', handleJdePrint);
    window.addEventListener('jde:select', handleJdeSelect);

    return () => {
      window.removeEventListener('jde:find', handleJdeFind);
      window.removeEventListener('jde:new', handleJdeNew);
      window.removeEventListener('jde:export', handleJdeExport);
      window.removeEventListener('jde:clear_qbe', handleJdeClearQBE);
      window.removeEventListener('jde:print', handleJdePrint);
      window.removeEventListener('jde:select', handleJdeSelect);
    };
  }, [filteredOrders, currentUser]);

  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredOrders, currentPage]);

  if (isPreviewOpen && previewOrder) {
    return (
      <div className="fixed inset-0 z-[200] bg-slate-900 flex flex-col">
        <div className="h-20 bg-slate-800 border-b border-white/10 px-10 flex items-center justify-between shadow-2xl no-print">
          <button
            onClick={() => {
              setIsPreviewOpen(false);
              setIsDraftPreview(false);
            }}
            className="flex items-center gap-3 px-6 py-3 bg-white/5 text-slate-300 hover:bg-white/10 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
          >
            <ArrowLeft size={18} /> Volver a Editar
          </button>

          <div className="flex items-center gap-4">
            {isDraftPreview ? (
              <>
                <div className="text-right">
                  <p className="text-amber-400 font-black text-[10px] uppercase tracking-widest leading-none">
                    Modo Revisión Final
                  </p>
                  <p className="text-white/40 text-[8px] font-black uppercase mt-1 italic">
                    Ruta: {currentUser} (Preparador)
                  </p>
                </div>
                <button
                  onClick={confirmAndEmit}
                  className="bg-emerald-600 text-white px-10 py-4 rounded-xl font-black text-sm uppercase flex items-center gap-4 hover:bg-emerald-700 shadow-xl border border-white/10 active:scale-95 transition-all"
                >
                  <CheckCircle2 size={22} /> Confirmar e Inyectar
                </button>
              </>
            ) : (
              <>
                {previewOrder && previewOrder.status === "APROBADA" && (
                  <div className="bg-amber-500/20 border border-amber-400/40 px-4 py-2 rounded-xl text-amber-200 text-xs font-bold flex items-center gap-2">
                    <AlertCircle size={16} className="text-amber-400 shrink-0" />
                    <span>Hito Inter-Área ERP: Al imprimir o descargar esta OT, Compras registrará la emisión formal (R43500 / Estado 280), habilitando la recepción técnica en Bodega.</span>
                  </div>
                )}
                {previewOrder && previewOrder.status === "EMITIDA_IMPRESA" && (
                  <div className="bg-indigo-500/20 border border-indigo-400/40 px-4 py-2 rounded-xl text-indigo-200 text-xs font-bold flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-indigo-400 shrink-0" />
                    <span>Estado ERP 280: Emitida e Impresa formalmente por Compras ({previewOrder.printedBy || 'COMPRAS'}). Habilitada para Bodega.</span>
                  </div>
                )}
                <button
                  onClick={() => {
                    if (previewOrder) {
                      handlePrintAndEmitExistingOT(previewOrder, false);
                    } else {
                      printHtmlElement("printable-report", "Orden_de_Trabajo");
                    }
                  }}
                  className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-black text-sm uppercase flex items-center gap-3 hover:bg-indigo-700 shadow-xl border border-white/10 active:scale-95 transition-all cursor-pointer"
                  title="Imprimir Orden de Trabajo (Emisión Formal R43500)"
                >
                  <Printer size={20} /> Imprimir OT (R43500)
                </button>
                <button
                  onClick={() => {
                    if (previewOrder) {
                      handlePrintAndEmitExistingOT(previewOrder, true);
                    } else {
                      downloadElementAsPdf("printable-report", "Orden_de_Trabajo.pdf");
                    }
                  }}
                  className="bg-slate-700 text-white px-6 py-4 rounded-xl font-black text-sm uppercase flex items-center gap-3 hover:bg-slate-600 shadow-xl border border-white/10 active:scale-95 transition-all cursor-pointer"
                  title="Descargar OT como archivo PDF (Registra Emisión R43500)"
                >
                  <FileDown size={20} /> Descargar PDF
                </button>
                <button
                  onClick={() => {
                    handleOpenTracking(previewOrder);
                    setIsPreviewOpen(false);
                  }}
                  className="bg-[#0B3C5D] text-white px-10 py-4 rounded-xl font-black text-sm uppercase flex items-center gap-4 hover:bg-[#082d47] shadow-xl border border-white/10 active:scale-95 transition-all cursor-pointer"
                  title="Registrar Hitos / Seguimiento"
                >
                  <ClipboardList size={22} /> Registrar Hitos (Seguimiento)
                </button>
                {previewOrder && (
                  <button
                    onClick={() => setLineApprovalModalOrder(previewOrder)}
                    className="bg-amber-600 text-white px-7 py-4 rounded-xl font-black text-sm uppercase flex items-center gap-3 hover:bg-amber-700 shadow-xl border border-white/10 active:scale-95 transition-all cursor-pointer"
                    title="Mesa de Aprobación y Dictamen por Líneas (ERP P43081)"
                  >
                    <Layers size={20} /> Aprobación por Líneas (P43081)
                  </button>
                )}
                {previewOrder && previewOrder.status === "PENDIENTE_VB" && (
                  <>
                    <button
                      onClick={() => handleApproveExistingOT(previewOrder)}
                      className="bg-emerald-600 text-white px-8 py-4 rounded-xl font-black text-sm uppercase flex items-center gap-3 hover:bg-emerald-700 shadow-xl border border-white/10 active:scale-95 transition-all cursor-pointer"
                      title="Aprobar todas las líneas y dictaminar favorablemente la OT"
                    >
                      <CheckCircle2 size={20} /> Aprobar Todas las Líneas
                    </button>
                    <button
                      onClick={() => handleRejectExistingOT(previewOrder)}
                      className="bg-rose-600 text-white px-8 py-4 rounded-xl font-black text-sm uppercase flex items-center gap-3 hover:bg-rose-700 shadow-xl border border-white/10 active:scale-95 transition-all cursor-pointer"
                      title="Rechazar OT con observaciones técnicas"
                    >
                      <XCircle size={20} /> Rechazar OT
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-auto p-12 bg-[#0a0c14] flex flex-col items-center custom-audit-scroll gap-6">
          {previewOrder && !isDraftPreview && (
            <div className="max-w-4xl w-full">
              <InterAreaActionBanner
                order={previewOrder}
                currentUser={currentUser}
                onSaveOrder={(updated) => {
                  onSave(updated);
                  setPreviewOrder(updated);
                }}
                onQuickAction={() => {
                  if (previewOrder.status === "APROBADA") {
                    handlePrintAndEmitExistingOT(previewOrder, false);
                  } else if (previewOrder.status === "PENDIENTE_VB") {
                    handleApproveExistingOT(previewOrder);
                  }
                }}
              />
            </div>
          )}
          <WorkOrderDocument data={previewOrder} companyLogo={companyLogo} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 bg-[#f3f2f1] flex flex-col overflow-auto select-none">
      <div className="min-h-14 py-1.5 bg-white border-b border-slate-300 flex flex-wrap items-center px-4 justify-between gap-2 shadow-sm z-30 overflow-x-auto min-w-0">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-700 p-1.5 rounded text-white mr-2">
            <Hammer size={18} />
          </div>
          <h2 className="text-xs font-black text-slate-700 uppercase tracking-tighter">
            Archivo_Digital_OTs.xlsx
          </h2>
          <div className="h-6 w-[1px] bg-slate-200 mx-4"></div>
          <button
            onClick={() => setIsP4310ModalOpen(true)}
            className="flex flex-col items-center px-4 py-1 hover:bg-emerald-50 rounded transition-colors group cursor-pointer"
            title="P4310 - Emisión de Orden de Compra / Trabajo ERP con Catálogo Maestro F4101"
          >
            <Plus size={18} className="text-emerald-700" />
            <span className="text-[9px] font-black text-slate-700 uppercase mt-0.5">
              Nueva OT (P4310)
            </span>
          </button>
          {onSeed && (
            <button
              onClick={onSeed}
              className="flex flex-col items-center px-4 py-1 hover:bg-amber-50 rounded transition-colors group border-l border-slate-200"
              title="Generar los 12 registros de prueba con hitos de seguimiento para pruebas de descarga"
            >
              <Zap size={18} className="text-amber-600 animate-pulse" />
              <span className="text-[9px] font-bold text-amber-700 uppercase mt-0.5">
                Cargar 12 Demos con Hitos
              </span>
            </button>
          )}
          <button
            onClick={() => {
              exportWorkOrdersToExcel(
                filteredOrders,
                `Reporte_Ordenes_e_Hitos_OTs_${new Date().toISOString().split("T")[0]}`,
              );
            }}
            className="flex flex-col items-center justify-center px-6 py-1 bg-[#107c41] hover:bg-[#156d3a] text-white rounded-md shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-150 group border border-[#0b5c30] ring-2 ring-[#107c41]/30 ml-2 cursor-pointer"
            title="Exportar todas las órdenes e hitos en formato XLSX de Microsoft Excel"
          >
            <div className="flex items-center gap-1.5">
              <FileSpreadsheet size={16} className="text-white group-hover:scale-110 transition-transform duration-200" />
              <span className="text-[10px] font-black uppercase tracking-wider text-white">
                Exportar Excel
              </span>
            </div>
            <span className="text-[7px] font-bold text-[#e1f5fe]/80 uppercase tracking-widest leading-none mt-0.5">
              Formato Inmutable XLSX
            </span>
          </button>

          {onSync && (
            <button
              onClick={onSync}
              className="flex flex-col items-center px-4 py-1 hover:bg-indigo-50 rounded transition-colors group border-l border-slate-200"
              title="Sincronizar todo a la nube"
            >
              <Database size={18} className="text-indigo-600 animate-pulse" />
              <span className="text-[9px] font-bold text-indigo-600 uppercase mt-0.5">
                Guardar Permanente
              </span>
            </button>
          )}

          <button
            onClick={() => setShowInterconnectionModal(true)}
            className="flex flex-col items-center px-4 py-1 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors group border-l border-slate-200 cursor-pointer"
            title="Ver Matriz de Interconexión y Flujo de Estados ERP (F40203)"
          >
            <Network size={18} className="text-indigo-600 group-hover:scale-110 transition-transform" />
            <span className="text-[9px] font-black text-indigo-800 uppercase mt-0.5">
              Flujo Inter-Áreas ERP
            </span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <GridDimensionControls
            defaultRowHeight={defaultRowHeight}
            onSetRowHeight={setDefaultRowHeight}
            onResetColumns={resetWidths}
            onResetRows={resetHeights}
            onResetAll={resetAll}
          />

          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por Folio o Proveedor..."
              className="bg-slate-50 border border-slate-300 rounded px-8 py-1.5 text-[10px] font-bold uppercase w-64 outline-none focus:ring-1 focus:ring-emerald-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search
              size={14}
              className="absolute left-2.5 top-2 text-slate-400"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto excel-grid bg-white custom-audit-scroll">
        <table className="w-full text-left border-collapse table-fixed min-w-[1400px]">
          <thead className="sticky top-0 z-20">
            <tr className="bg-[#f3f2f1] border-b border-slate-300 h-8">
              <th
                style={{ width: widths.index }}
                className="relative excel-cell-header italic font-black text-[9px] border border-black select-none"
              >
                #
                <div
                  onMouseDown={(e) => onMouseDown(e, "index")}
                  onClick={(e) => e.stopPropagation()}
                  className="resizer"
                />
              </th>
              <th
                style={{ width: widths.folio }}
                className="relative excel-cell-header font-bold text-[9px] border border-black group/header cursor-pointer select-none hover:bg-slate-200/50 transition-colors"
                onClick={() => handleSort("folio")}
              >
                <div className="flex items-center justify-between px-2 w-full">
                  <span>A - FOLIO OT</span>
                  <span className="p-0.5 rounded text-slate-500 transition-colors">
                    {sortField === "folio" ? (
                      sortOrder === "asc" ? <ArrowUp size={10} className="text-[#0b3c5d] stroke-[3]" /> : <ArrowDown size={10} className="text-[#0b3c5d] stroke-[3]" />
                    ) : (
                      <ArrowUpDown size={10} className="opacity-30 group-hover/header:opacity-100 transition-opacity" />
                    )}
                  </span>
                </div>
                <div
                  onMouseDown={(e) => onMouseDown(e, "folio")}
                  onClick={(e) => e.stopPropagation()}
                  className="resizer"
                />
              </th>
              <th
                style={{ width: widths.proveedor }}
                className="relative excel-cell-header font-bold text-[9px] border border-black group/header cursor-pointer select-none hover:bg-slate-200/50 transition-colors"
                onClick={() => handleSort("proveedor")}
              >
                <div className="flex items-center justify-between px-2 w-full">
                  <span>B - PROVEEDOR</span>
                  <span className="p-0.5 rounded text-slate-500 transition-colors">
                    {sortField === "proveedor" ? (
                      sortOrder === "asc" ? <ArrowUp size={10} className="text-[#0b3c5d] stroke-[3]" /> : <ArrowDown size={10} className="text-[#0b3c5d] stroke-[3]" />
                    ) : (
                      <ArrowUpDown size={10} className="opacity-30 group-hover/header:opacity-100 transition-opacity" />
                    )}
                  </span>
                </div>
                <div
                  onMouseDown={(e) => onMouseDown(e, "proveedor")}
                  onClick={(e) => e.stopPropagation()}
                  className="resizer"
                />
              </th>
              <th
                style={{ width: widths.ubicacion }}
                className="relative excel-cell-header font-bold text-[9px] border border-black group/header cursor-pointer select-none hover:bg-slate-200/50 transition-colors"
                onClick={() => handleSort("ubicacion")}
              >
                <div className="flex items-center justify-between px-2 w-full">
                  <span>C - UBICACIÓN</span>
                  <span className="p-0.5 rounded text-slate-500 transition-colors">
                    {sortField === "ubicacion" ? (
                      sortOrder === "asc" ? <ArrowUp size={10} className="text-[#0b3c5d] stroke-[3]" /> : <ArrowDown size={10} className="text-[#0b3c5d] stroke-[3]" />
                    ) : (
                      <ArrowUpDown size={10} className="opacity-30 group-hover/header:opacity-100 transition-opacity" />
                    )}
                  </span>
                </div>
                <div
                  onMouseDown={(e) => onMouseDown(e, "ubicacion")}
                  onClick={(e) => e.stopPropagation()}
                  className="resizer"
                />
              </th>
              <th
                style={{ width: widths.resumen }}
                className="relative excel-cell-header font-bold text-[9px] border border-black group/header cursor-pointer select-none hover:bg-slate-200/50 transition-colors"
                onClick={() => handleSort("resumen")}
              >
                <div className="flex items-center justify-between px-3 w-full">
                  <span>D - RESUMEN</span>
                  <span className="p-0.5 rounded text-slate-500 transition-colors">
                    {sortField === "resumen" ? (
                      sortOrder === "asc" ? <ArrowUp size={10} className="text-[#0b3c5d] stroke-[3]" /> : <ArrowDown size={10} className="text-[#0b3c5d] stroke-[3]" />
                    ) : (
                      <ArrowUpDown size={10} className="opacity-30 group-hover/header:opacity-100 transition-opacity" />
                    )}
                  </span>
                </div>
                <div
                  onMouseDown={(e) => onMouseDown(e, "resumen")}
                  onClick={(e) => e.stopPropagation()}
                  className="resizer"
                />
              </th>
              <th
                style={{ width: widths.categoria }}
                className="relative excel-cell-header font-bold text-[9px] border border-black group/header cursor-pointer select-none hover:bg-slate-200/50 transition-colors"
                onClick={() => handleSort("categoria")}
              >
                <div className="flex items-center justify-between px-3 w-full">
                  <span>E - CATEGORÍA</span>
                  <span className="p-0.5 rounded text-slate-500 transition-colors">
                    {sortField === "categoria" ? (
                      sortOrder === "asc" ? <ArrowUp size={10} className="text-[#0b3c5d] stroke-[3]" /> : <ArrowDown size={10} className="text-[#0b3c5d] stroke-[3]" />
                    ) : (
                      <ArrowUpDown size={10} className="opacity-30 group-hover/header:opacity-100 transition-opacity" />
                    )}
                  </span>
                </div>
                <div
                  onMouseDown={(e) => onMouseDown(e, "categoria")}
                  onClick={(e) => e.stopPropagation()}
                  className="resizer"
                />
              </th>
              <th
                style={{ width: widths.especialidad }}
                className="relative excel-cell-header font-bold text-[9px] border border-black group/header cursor-pointer select-none hover:bg-slate-200/50 transition-colors"
                onClick={() => handleSort("especialidad")}
              >
                <div className="flex items-center justify-between px-3 w-full">
                  <span>F - ESPECIALIDAD / RUBRO</span>
                  <span className="p-0.5 rounded text-slate-500 transition-colors">
                    {sortField === "especialidad" ? (
                      sortOrder === "asc" ? <ArrowUp size={10} className="text-[#0b3c5d] stroke-[3]" /> : <ArrowDown size={10} className="text-[#0b3c5d] stroke-[3]" />
                    ) : (
                      <ArrowUpDown size={10} className="opacity-30 group-hover/header:opacity-100 transition-opacity" />
                    )}
                  </span>
                </div>
                <div
                  onMouseDown={(e) => onMouseDown(e, "especialidad")}
                  onClick={(e) => e.stopPropagation()}
                  className="resizer"
                />
              </th>
              <th
                style={{ width: widths.factura }}
                className="relative excel-cell-header font-bold text-[9px] border border-black group/header cursor-pointer select-none hover:bg-slate-200/50 transition-colors"
                onClick={() => handleSort("factura")}
              >
                <div className="flex items-center justify-between px-3 w-full">
                  <span>G - DCTO TRIBUTARIO / FACTURA</span>
                  <span className="p-0.5 rounded text-slate-500 transition-colors">
                    {sortField === "factura" ? (
                      sortOrder === "asc" ? <ArrowUp size={10} className="text-[#0b3c5d] stroke-[3]" /> : <ArrowDown size={10} className="text-[#0b3c5d] stroke-[3]" />
                    ) : (
                      <ArrowUpDown size={10} className="opacity-30 group-hover/header:opacity-100 transition-opacity" />
                    )}
                  </span>
                </div>
                <div
                  onMouseDown={(e) => onMouseDown(e, "factura")}
                  onClick={(e) => e.stopPropagation()}
                  className="resizer"
                />
              </th>
              <th
                style={{ width: widths.total }}
                className="relative excel-cell-header font-bold text-[9px] border border-black group/header cursor-pointer select-none hover:bg-slate-200/50 transition-colors"
                onClick={() => handleSort("total")}
              >
                <div className="flex items-center justify-between px-3 w-full">
                  <span>H - TOTAL</span>
                  <span className="p-0.5 rounded text-slate-500 transition-colors">
                    {sortField === "total" ? (
                      sortOrder === "asc" ? <ArrowUp size={10} className="text-[#0b3c5d] stroke-[3]" /> : <ArrowDown size={10} className="text-[#0b3c5d] stroke-[3]" />
                    ) : (
                      <ArrowUpDown size={10} className="opacity-30 group-hover/header:opacity-100 transition-opacity" />
                    )}
                  </span>
                </div>
                <div
                  onMouseDown={(e) => onMouseDown(e, "total")}
                  onClick={(e) => e.stopPropagation()}
                  className="resizer"
                />
              </th>
              <th
                style={{ width: widths.estado }}
                className="relative excel-cell-header font-bold text-[9px] border border-black group/header cursor-pointer select-none hover:bg-slate-200/50 transition-colors"
                onClick={() => handleSort("estado")}
              >
                <div className="flex items-center justify-between px-2 w-full">
                  <span>I - ESTADO</span>
                  <span className="p-0.5 rounded text-slate-500 transition-colors">
                    {sortField === "estado" ? (
                      sortOrder === "asc" ? <ArrowUp size={10} className="text-[#0b3c5d] stroke-[3]" /> : <ArrowDown size={10} className="text-[#0b3c5d] stroke-[3]" />
                    ) : (
                      <ArrowUpDown size={10} className="opacity-30 group-hover/header:opacity-100 transition-opacity" />
                    )}
                  </span>
                </div>
                <div
                  onMouseDown={(e) => onMouseDown(e, "estado")}
                  onClick={(e) => e.stopPropagation()}
                  className="resizer"
                />
              </th>
              <th
                style={{ width: widths.acciones }}
                className="relative excel-cell-header font-bold text-center text-[9px] border border-black select-none"
              >
                ACCIONES
                <div
                  onMouseDown={(e) => onMouseDown(e, "acciones")}
                  onClick={(e) => e.stopPropagation()}
                  className="resizer"
                />
              </th>
            </tr>
            {/* ERP QBE (Query By Example) Row */}
            <tr className="bg-slate-50 border-b border-black font-sans">
              <th className="px-1 py-0.5 border border-black bg-slate-100 text-center text-[7px] font-black text-slate-500 uppercase">
                QBE
              </th>
              <th className="px-1.5 py-0.5 border border-black">
                <div className="relative flex items-center pr-4">
                  <input
                    type="text"
                    value={colSearchFolio}
                    onChange={(e) => setColSearchFolio(e.target.value)}
                    placeholder="Filtro..."
                    className="w-full px-1.5 py-0.5 pr-4 text-[9px] font-medium text-slate-800 placeholder-slate-400 bg-white border border-slate-300 rounded font-sans uppercase outline-none focus:border-indigo-500 font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setIsFolioUDCOpen(true)}
                    className="absolute right-0 text-indigo-700 hover:text-indigo-900 focus:outline-none cursor-pointer p-0.5 bg-slate-100 rounded border border-slate-300 hover:bg-slate-200 transition-all flex items-center justify-center"
                    title="Visual Assist ERP - Maestro de Órdenes de Trabajo (F4801)"
                    style={{ width: "13px", height: "13px" }}
                  >
                    <Search size={8} className="stroke-[3.5]" />
                  </button>
                </div>
              </th>
              <th className="px-1.5 py-0.5 border border-black">
                <div className="relative flex items-center pr-4">
                  <input
                    type="text"
                    value={colSearchProveedor}
                    onChange={(e) => setColSearchProveedor(e.target.value)}
                    placeholder="Filtro..."
                    className="w-full px-1.5 py-0.5 pr-4 text-[9px] font-medium text-slate-800 placeholder-slate-400 bg-white border border-slate-300 rounded font-sans uppercase outline-none focus:border-indigo-500 font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setIsSupplierUDCOpen(true)}
                    className="absolute right-0 text-indigo-700 hover:text-indigo-900 focus:outline-none cursor-pointer p-0.5 bg-slate-100 rounded border border-slate-300 hover:bg-slate-200 transition-all flex items-center justify-center"
                    title="Visual Assist ERP - Maestro de Proveedores / Address Book (F0101)"
                    style={{ width: "13px", height: "13px" }}
                  >
                    <Search size={8} className="stroke-[3.5]" />
                  </button>
                </div>
              </th>
              <th className="px-1.5 py-0.5 border border-black">
                <div className="relative flex items-center pr-4">
                  <input
                    type="text"
                    value={colSearchUbicacion}
                    onChange={(e) => setColSearchUbicacion(e.target.value)}
                    placeholder="Filtro..."
                    className="w-full px-1.5 py-0.5 pr-4 text-[9px] font-medium text-slate-800 placeholder-slate-400 bg-white border border-slate-300 rounded font-sans uppercase outline-none focus:border-indigo-500 font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setIsLocationUDCOpen(true)}
                    className="absolute right-0 text-indigo-700 hover:text-indigo-900 focus:outline-none cursor-pointer p-0.5 bg-slate-100 rounded border border-slate-300 hover:bg-slate-200 transition-all flex items-center justify-center"
                    title="Visual Assist ERP - Maestro de Propiedades Inmuebles (F1201/F1501)"
                    style={{ width: "13px", height: "13px" }}
                  >
                    <Search size={8} className="stroke-[3.5]" />
                  </button>
                </div>
              </th>
              <th className="px-1.5 py-0.5 border border-black">
                <input
                  type="text"
                  value={colSearchResumen}
                  onChange={(e) => setColSearchResumen(e.target.value)}
                  placeholder="Filtro..."
                  className="w-full px-1.5 py-0.5 text-[9px] font-medium text-slate-800 placeholder-slate-400 bg-white border border-slate-300 rounded font-sans uppercase outline-none focus:border-indigo-500 font-bold"
                />
              </th>
              <th className="px-1.5 py-0.5 border border-black">
                <div className="relative flex items-center pr-4">
                  <input
                    type="text"
                    value={colSearchCategoria}
                    onChange={(e) => setColSearchCategoria(e.target.value)}
                    placeholder="Filtro..."
                    className="w-full px-1.5 py-0.5 pr-4 text-[9px] font-medium text-slate-800 placeholder-slate-400 bg-white border border-slate-300 rounded font-sans uppercase outline-none focus:border-indigo-500 font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setIsCategoryUDCOpen(true)}
                    className="absolute right-0 text-indigo-700 hover:text-indigo-900 focus:outline-none cursor-pointer p-0.5 bg-slate-100 rounded border border-slate-300 hover:bg-slate-200 transition-all flex items-center justify-center"
                    title="Visual Assist ERP - Tabla Maestra de Categorías (UDC 48/CAT)"
                    style={{ width: "13px", height: "13px" }}
                  >
                    <Search size={8} className="stroke-[3.5]" />
                  </button>
                </div>
              </th>
              <th className="px-1.5 py-0.5 border border-black">
                <div className="relative flex items-center pr-4">
                  <input
                    type="text"
                    value={colSearchEspecialidad}
                    onChange={(e) => setColSearchEspecialidad(e.target.value)}
                    placeholder="Filtro..."
                    className="w-full px-1.5 py-0.5 pr-4 text-[9px] font-medium text-slate-800 placeholder-slate-400 bg-white border border-slate-300 rounded font-sans uppercase outline-none focus:border-indigo-500 font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setIsSpecialtyUDCOpen(true)}
                    className="absolute right-0 text-indigo-700 hover:text-indigo-900 focus:outline-none cursor-pointer p-0.5 bg-slate-100 rounded border border-slate-300 hover:bg-slate-200 transition-all flex items-center justify-center"
                    title="Visual Assist ERP - Tabla Maestra de Especialidades (UDC 48/ESP)"
                    style={{ width: "13px", height: "13px" }}
                  >
                    <Search size={8} className="stroke-[3.5]" />
                  </button>
                </div>
              </th>
              <th className="px-1.5 py-0.5 border border-black">
                <div className="relative flex items-center pr-4">
                  <input
                    type="text"
                    value={colSearchFactura}
                    onChange={(e) => setColSearchFactura(e.target.value)}
                    placeholder="Filtro..."
                    className="w-full px-1.5 py-0.5 pr-4 text-[9px] font-medium text-slate-800 placeholder-slate-400 bg-white border border-slate-300 rounded font-sans uppercase outline-none focus:border-indigo-500 font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setIsFacturaUDCOpen(true)}
                    className="absolute right-0 text-indigo-700 hover:text-indigo-900 focus:outline-none cursor-pointer p-0.5 bg-slate-100 rounded border border-slate-300 hover:bg-slate-200 transition-all flex items-center justify-center"
                    title="Visual Assist ERP - Tabla Maestra de Facturas (UDC 48/FC)"
                    style={{ width: "13px", height: "13px" }}
                  >
                    <Search size={8} className="stroke-[3.5]" />
                  </button>
                </div>
              </th>
              <th className="px-1.5 py-0.5 border border-black">
                <input
                  type="text"
                  value={colSearchTotal}
                  onChange={(e) => setColSearchTotal(e.target.value)}
                  placeholder="Filtro..."
                  className="w-full px-1.5 py-0.5 text-[9px] font-medium text-slate-800 placeholder-slate-400 bg-white border border-slate-300 rounded font-sans uppercase outline-none focus:border-indigo-500 text-right font-bold"
                />
              </th>
              <th className="px-1.5 py-0.5 border border-black">
                <div className="relative flex items-center pr-4">
                  <input
                    type="text"
                    value={colSearchEstado}
                    onChange={(e) => setColSearchEstado(e.target.value)}
                    placeholder="Filtro..."
                    className="w-full px-1.5 py-0.5 pr-4 text-[9px] font-medium text-slate-800 placeholder-slate-400 bg-white border border-slate-300 rounded font-sans uppercase outline-none focus:border-indigo-500 font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setIsStatusUDCOpen(true)}
                    className="absolute right-0 text-indigo-700 hover:text-indigo-900 focus:outline-none cursor-pointer p-0.5 bg-slate-100 rounded border border-slate-300 hover:bg-slate-200 transition-all flex items-center justify-center"
                    title="Visual Assist ERP - Tabla Maestra de Estados (UDC 48/SN)"
                    style={{ width: "13px", height: "13px" }}
                  >
                    <Search size={8} className="stroke-[3.5]" />
                  </button>
                </div>
              </th>
              <th className="px-1.5 py-0.5 border border-black bg-slate-50"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredOrders.length === 0 ? (
              <tr>
                <td
                  colSpan={11}
                  className="py-20 text-center text-slate-300 font-black uppercase text-[10px] tracking-widest italic border border-black"
                >
                  Sin órdenes de trabajo emitidas
                </td>
              </tr>
            ) : (
              paginatedOrders.map((ot, idx) => (
                <tr
                  key={ot.id}
                  onClick={() => {
                    setPreviewOrder(ot);
                    setIsDraftPreview(false);
                    setIsPreviewOpen(true);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setGridContextMenu({
                      x: e.clientX,
                      y: e.clientY,
                      order: ot
                    });
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setInspectTarget(ot);
                  }}
                  style={{ height: `${getRowHeight(ot.id)}px` }}
                  className="even:bg-[#F4F8FB] odd:bg-white hover:bg-[#FFFFA6] transition-colors group cursor-context-menu"
                  title="Clic izquierdo para Drill Down. Clic derecho para Menú de Trazabilidad Cruzada ERP"
                >
                  <td 
                    className="relative excel-cell-header italic font-medium text-[10px] border border-black p-0 select-none cursor-pointer hover:bg-amber-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      const rect = e.currentTarget.getBoundingClientRect();
                      setGridContextMenu({
                        x: rect.right + 2,
                        y: rect.top,
                        order: ot
                      });
                    }}
                    title="Clic para Menú Contextual de Fila (ERP). Arrastre el borde inferior para cambiar alto."
                  >
                    <div className="flex items-center justify-between px-1 h-full">
                      <span>{(currentPage - 1) * itemsPerPage + idx + 1}</span>
                      <span className="text-[8px] text-slate-400 group-hover:text-[#002D62] font-mono">▶</span>
                    </div>
                    <div
                      onMouseDown={(e) => onRowMouseDown(e, ot.id)}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        onRowDoubleClick(ot.id);
                      }}
                      className="row-resizer"
                      title="Arrastrar para cambiar alto de fila (Shift para todas). Doble clic para restablecer."
                    />
                  </td>
                  <td className="px-3 text-[10px] font-mono font-black text-indigo-700 border border-black truncate">
                    <div className="flex items-center gap-2">
                      #{ot.folio}
                      {ot.confidenceScore !== undefined && (
                        <div
                          className={`px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase border ${ot.confidenceScore > 90 ? "bg-emerald-50 text-emerald-600 border-emerald-100" : ot.confidenceScore > 70 ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-rose-50 text-rose-600 border-rose-100"}`}
                        >
                          {ot.confidenceScore}% DATA
                        </div>
                      )}
                      {ot.isTest && (
                        <div className="px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase border bg-amber-100 text-amber-700 border-amber-200">
                          TEST DE PRUEBA
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-3 text-[10px] font-black text-slate-800 border border-black truncate uppercase">
                    {ot.supplierName}
                  </td>
                  <td className="px-3 text-[10px] font-bold text-slate-600 border border-black uppercase truncate">
                    {ot.propertyLabel}
                  </td>
                  <td className="px-4 text-[10px] font-medium text-slate-700 border border-black truncate uppercase italic">
                    {ot.items[0]?.description}{" "}
                    {ot.items.length > 1
                      ? `(+${ot.items.length - 1} items)`
                      : ""}
                  </td>
                  <td className="px-4 text-[10px] font-bold text-slate-700 border border-black truncate uppercase bg-slate-50/40">
                    {ot.category || "MANTENCIÓN PREVENTIVA"}
                  </td>
                  <td className="px-4 text-[10px] font-bold text-slate-700 border border-black truncate uppercase bg-slate-50/40">
                    {ot.specialty || "TECHUMBRES"}
                  </td>
                  <td className="px-4 text-[10px] font-mono font-bold text-slate-600 border border-black truncate uppercase">
                    {ot.associatedInvoice || "-"}
                  </td>
                  <td className="px-4 text-[11px] font-black text-right border border-black text-slate-900">
                    {formatCLP(ot.total)}
                  </td>
                  <td className="px-2 py-1.5 border border-black text-center overflow-hidden">
                    <div className="flex flex-col items-center justify-center gap-1.5 w-full overflow-hidden">
                      <span
                        className={`text-[8.5px] font-black px-2.5 py-0.5 rounded border uppercase truncate max-w-full leading-tight shadow-3xs ${
                          ot.status === "APROBADA"
                            ? "bg-amber-50 text-amber-800 border-amber-300"
                            : ot.status === "EMITIDA_IMPRESA"
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                              : ot.status === "RECEPCIONADA"
                                ? "bg-blue-600 text-white border-blue-700"
                                : ot.status === "PAGADA"
                                  ? "bg-purple-600 text-white border-purple-700"
                                  : "bg-slate-50 text-slate-500"
                        }`}
                      >
                        {ot.status === "EMITIDA_IMPRESA" ? "EMITIDA (R43500)" : (ot.status === "APROBADA" ? "APROBADA (ERP 230)" : ot.status.replace("_", " "))}
                      </span>
                      {ot.items && ot.items.length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setLineApprovalModalOrder(ot);
                          }}
                          className="text-[7.5px] font-bold px-1.5 py-0.5 rounded bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 border border-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
                          title="Abrir Mesa de Aprobación por Líneas ERP P43081"
                        >
                          <Layers size={9} className="text-amber-600" />
                          <span>
                            {ot.items.filter(i => i.status === 'APROBADA').length}/{ot.items.length} líns apr.
                          </span>
                        </button>
                      )}
                      <InterAreaActionBanner
                        order={ot}
                        currentUser={currentUser}
                        onSaveOrder={onSave}
                        compact={true}
                      />
                    </div>
                  </td>
                  <td className="px-2 py-1.5 border border-black text-center overflow-hidden">
                    <div className="flex items-center justify-center gap-1.5 w-full">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setLineApprovalModalOrder(ot);
                        }}
                        className="h-7 px-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-md border border-amber-300 font-bold text-[9px] uppercase shadow-xs transition-all flex items-center gap-0.5 shrink-0 cursor-pointer"
                        title="Mesa de Aprobación por Líneas (ERP P43081)"
                      >
                        <Layers size={11} className="text-amber-600" />
                        <span>P43081</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOTForJDE(ot);
                          setIsJDEMenuOpen(true);
                        }}
                        className="h-7 px-2.5 bg-[#0b3c5d] hover:bg-[#07253a] text-white rounded-md font-bold text-[9px] uppercase shadow-xs transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                        title="Abrir ERP One View - Trazabilidad"
                      >
                        <Layers size={11} />
                        <span>ERP</span>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenTracking(ot);
                        }}
                        className="h-7 w-7 text-emerald-700 hover:bg-emerald-100 bg-emerald-50 rounded-md border border-emerald-300 shadow-xs transition-all flex items-center justify-center shrink-0 cursor-pointer"
                        title="Registrar Hitos / Seguimiento"
                      >
                        <ClipboardList size={13} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewOrder(ot);
                          setIsDraftPreview(false);
                          setIsPreviewOpen(true);
                        }}
                        className={`h-7 w-7 rounded-md border shadow-xs transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                          ot.status === "APROBADA"
                            ? "bg-amber-500 text-white hover:bg-amber-600 border-amber-600 animate-pulse"
                            : "text-indigo-600 hover:bg-indigo-100 bg-indigo-50 border-indigo-200"
                        }`}
                        title={ot.status === "APROBADA" ? "R43500: Emitir e Imprimir Orden para habilitar Recepción en Bodega" : "Imprimir Orden de Trabajo"}
                      >
                        <Printer size={13} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectTarget(ot);
                        }}
                        className="h-7 w-7 text-slate-700 hover:bg-slate-200 bg-slate-100 rounded-md border border-slate-300 shadow-xs transition-all flex items-center justify-center shrink-0 cursor-pointer"
                        title="F980011D: Consultar Maestro de Atributos"
                      >
                        <Database size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {filteredOrders.length > itemsPerPage && (
        <div className="flex items-center justify-between px-6 py-4 bg-slate-50 border border-slate-200 border-t-0 rounded-b-xl no-print">
          <div className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
            Mostrando {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredOrders.length)} de {filteredOrders.length} Órdenes
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all ${currentPage === 1 ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 cursor-pointer'}`}
            >
              Anterior
            </button>
            <span className="px-3 py-1.5 text-[9px] font-black text-slate-700 bg-white border border-slate-200 rounded-lg flex items-center">
              Página {currentPage} de {Math.ceil(filteredOrders.length / itemsPerPage)}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(filteredOrders.length / itemsPerPage)))}
              disabled={currentPage === Math.ceil(filteredOrders.length / itemsPerPage)}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all ${currentPage === Math.ceil(filteredOrders.length / itemsPerPage) ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200 cursor-pointer'}`}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 z-[150] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[50px] w-full max-w-4xl shadow-2xl border-[10px] border-[#f3f2f1] overflow-hidden flex flex-col h-[90vh] animate-in zoom-in-95">
            <div className="bg-emerald-700 p-8 text-white flex justify-between items-center relative overflow-hidden">
              <div className="absolute right-0 top-0 opacity-10 -mr-10 -mt-10">
                <Hammer size={240} />
              </div>
              <div className="flex items-center gap-6 relative z-10">
                <div className="p-4 bg-white/10 rounded-3xl border border-white/20 shadow-xl">
                  <Hammer size={32} />
                </div>
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-tighter leading-none">
                    Confección de OT Maestro
                  </h2>
                  <p className="text-emerald-100 text-[10px] font-black uppercase tracking-widest mt-1 italic">
                    Vincule proveedor y activo inmobiliario
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 relative z-10">
                <button
                  type="button"
                  onClick={() => quoteFileInputRef.current?.click()}
                  disabled={isExtracting}
                  className="flex items-center gap-2 px-6 py-3 bg-white/20 hover:bg-white/30 rounded-2xl text-xs font-black uppercase transition-all shadow-lg border border-white/10 disabled:opacity-50"
                >
                  {isExtracting ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Sparkles size={18} />
                  )}
                  {isExtracting ? "Procesando..." : "Cargar Cotización (IA)"}
                </button>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-all"
                >
                  <X size={32} />
                </button>
              </div>
              <input
                type="file"
                ref={quoteFileInputRef}
                onChange={handleQuoteExtraction}
                className="hidden"
                accept="application/pdf,image/*"
              />
            </div>

            <div className="flex-1 overflow-auto p-10 custom-audit-scroll space-y-10 bg-slate-50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div
                  className={`p-8 rounded-[40px] border-2 transition-all shadow-sm space-y-6 ${formData.supplierId ? "bg-white border-slate-100" : "bg-rose-50 border-rose-200"}`}
                >
                  <h3 className="text-[10px] font-black text-emerald-800 uppercase tracking-widest flex items-center gap-2">
                    <Database size={14} /> Identificación{" "}
                    {!formData.supplierId && (
                      <span className="text-rose-600">(PENDIENTE)</span>
                    )}
                  </h3>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">
                        Proveedor Titular
                      </label>
                      <div className="relative">
                        <select
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-[10px] font-black uppercase outline-none focus:border-emerald-600 appearance-none cursor-pointer pr-10"
                          value={formData.supplierId}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              supplierId: e.target.value,
                            }))
                          }
                        >
                          <option value="">-- SELECCIONE PROVEEDOR --</option>
                          {activeSuppliers.length === 0 ? (
                            <option disabled value="">
                              SIN PROVEEDORES APROBADOS
                            </option>
                          ) : (
                            activeSuppliers.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name} ({s.taxId})
                              </option>
                            ))
                          )}
                        </select>
                        <ChevronDown
                          size={16}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        />
                      </div>
                      {activeSuppliers.length === 0 && (
                        <p className="text-[8px] font-black text-rose-500 uppercase mt-1 px-1">
                          Primero debe dar de ALTA y APROBAR un proveedor en el
                          Maestro.
                        </p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">
                        Ubicación Inmobiliaria
                      </label>
                      <div className="relative">
                        <select
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-[10px] font-black uppercase outline-none focus:border-emerald-600 appearance-none cursor-pointer pr-10"
                          value={formData.propertyId}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              propertyId: e.target.value,
                            }))
                          }
                        >
                          <option value="">-- SELECCIONE ACTIVO --</option>
                          {properties.length === 0 ? (
                            <option disabled value="">
                              SIN PROPIEDADES EN POOL
                            </option>
                          ) : (
                            properties.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.building} - PISO {p.floor} ({p.address})
                              </option>
                            ))
                          )}
                        </select>
                        <ChevronDown
                          size={16}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">
                        Cuenta Contable
                      </label>
                      <div className="relative">
                        <select
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-[10px] font-black uppercase outline-none focus:border-emerald-600 appearance-none cursor-pointer pr-10"
                          value={formData.accountCode}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              accountCode: e.target.value,
                            }))
                          }
                        >
                          <option value="">-- SELECCIONE CUENTA --</option>
                          {CHART_OF_ACCOUNTS.filter((a) => a.level >= 3).map(
                            (acc) => (
                              <option key={acc.code} value={acc.code}>
                                {acc.code} - {acc.name}
                              </option>
                            ),
                          )}
                        </select>
                        <ChevronDown
                          size={16}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">
                        Categoría del Trabajo
                      </label>
                      <div className="relative">
                        <select
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-[10px] font-black uppercase outline-none focus:border-emerald-600 appearance-none cursor-pointer pr-10"
                          value={formData.category}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              category: e.target.value,
                            }))
                          }
                        >
                          {WORK_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={16}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">
                        Especialidad / Rubro
                      </label>
                      <div className="relative">
                        <select
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-[10px] font-black uppercase outline-none focus:border-emerald-600 appearance-none cursor-pointer pr-10"
                          value={formData.specialty}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              specialty: e.target.value,
                            }))
                          }
                        >
                          {WORK_SPECIALTIES.map((spec) => (
                            <option key={spec} value={spec}>
                              {spec}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          size={16}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between px-1">
                        <label className="text-[9px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-1">
                          Factura / Docto Tributario Asociado
                        </label>
                        {formData.associatedInvoice && checkDuplicateInvoice(formData.associatedInvoice, workOrders).isDuplicate && (
                          <span className="text-[8px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-1 border border-amber-300 animate-pulse">
                            <AlertTriangle size={10} className="text-amber-600" /> Factura Duplicada
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="Ej: FACTURA N°14320"
                        className={`w-full bg-slate-50 border-2 rounded-2xl px-5 py-3.5 text-[10px] font-black uppercase outline-none focus:border-emerald-600 font-mono transition-all ${
                          formData.associatedInvoice && checkDuplicateInvoice(formData.associatedInvoice, workOrders).isDuplicate
                            ? "border-amber-400 bg-amber-50/40 text-amber-950"
                            : "border-slate-100"
                        }`}
                        value={formData.associatedInvoice}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            associatedInvoice: maskFolioOrInvoice(e.target.value),
                          }))
                        }
                      />
                      {formData.associatedInvoice && checkDuplicateInvoice(formData.associatedInvoice, workOrders).warningMessage && (
                        <p className="text-[9.5px] font-bold text-amber-700 bg-amber-50 p-2 rounded-xl border border-amber-200 flex items-center gap-1.5 mt-1">
                          <AlertTriangle size={13} className="shrink-0 text-amber-600" />
                          <span>{checkDuplicateInvoice(formData.associatedInvoice, workOrders).warningMessage}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[40px] border-2 border-slate-100 shadow-sm space-y-6">
                  <h3 className="text-[10px] font-black text-emerald-800 uppercase tracking-widest flex items-center gap-2">
                    <Zap size={14} /> Condiciones
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">
                        Cotización N°
                      </label>
                      <input
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 text-[10px] font-black uppercase outline-none focus:border-emerald-600 font-mono"
                        value={formData.quoteNumber}
                        onChange={(e) =>
                          setFormData((p) => ({
                            ...p,
                            quoteNumber: maskFolioOrInvoice(e.target.value),
                          }))
                        }
                        placeholder="EJ: 105..."
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">
                        Modalidad de Pago
                      </label>
                      <div className="flex flex-col gap-2">
                        <div className="relative">
                          <select
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 text-[10px] font-black uppercase outline-none focus:border-emerald-600 appearance-none cursor-pointer pr-10"
                            value={formData.paymentTerms}
                            onChange={(e) =>
                              setFormData((p) => ({
                                ...p,
                                paymentTerms: e.target.value,
                              }))
                            }
                          >
                            {CUSTOM_PAYMENT_TERMS.map((term) => (
                              <option key={term} value={term}>
                                {term}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            size={16}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                          />
                        </div>
                        {isCustomAdvance && (
                          <div className="flex items-center gap-3 bg-emerald-50 p-4 rounded-2xl border border-emerald-100 animate-in slide-in-from-top-2 shadow-inner">
                            <div className="flex-1">
                              <label className="text-[8px] font-black text-emerald-700 uppercase ml-1">
                                % Anticipo
                              </label>
                              <input
                                type="number"
                                className="w-full bg-white border border-emerald-200 rounded-lg px-3 py-1 text-xs font-black outline-none"
                                value={formData.advancePercent}
                                onChange={(e) =>
                                  setFormData((p) => ({
                                    ...p,
                                    advancePercent:
                                      parseInt(e.target.value) || 0,
                                  }))
                                }
                              />
                            </div>
                            <div className="bg-emerald-600 text-white rounded-xl px-4 py-2 text-center min-w-[70px] shadow-sm">
                              <span className="text-[7px] font-black uppercase block">
                                Saldo
                              </span>
                              <span className="text-sm font-black">
                                {100 - formData.advancePercent}%
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">
                      Punto de Despacho / Intervención
                    </label>
                    <input
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 text-[10px] font-black uppercase outline-none focus:border-emerald-600"
                      value={formData.deliveryAddress}
                      onChange={(e) =>
                        setFormData((p) => ({
                          ...p,
                          deliveryAddress: e.target.value.toUpperCase(),
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-[40px] border-2 border-emerald-100 shadow-xl overflow-hidden">
                <div className="bg-emerald-50 px-8 py-5 border-b border-emerald-100 flex justify-between items-center">
                  <h3 className="text-xs font-black text-emerald-900 uppercase tracking-widest flex items-center gap-3">
                    <ListPlus size={18} /> Detalle Técnico de la Orden
                  </h3>
                  <div className="bg-white px-4 py-1 rounded-full border border-emerald-200 shadow-sm">
                    <span
                      className={`text-[9px] font-black uppercase ${formData.items.length >= MAX_OT_ITEMS ? "text-rose-600 animate-pulse" : "text-emerald-600"}`}
                    >
                      {formData.items.length} / {MAX_OT_ITEMS} LÍNEAS UTILIZADAS
                    </span>
                  </div>
                </div>

                <div className="p-8 space-y-6">
                  <div className="grid grid-cols-12 gap-4 items-end bg-slate-50 p-6 rounded-3xl border-2 border-dashed border-slate-200">
                    <div className="col-span-6 space-y-1">
                      <label className="text-[8px] font-black text-slate-600 uppercase ml-1">
                        Descripción del Item / Servicio
                      </label>
                      <input
                        ref={descriptionInputRef}
                        className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-3 text-[10px] font-black text-slate-900 uppercase outline-none focus:border-emerald-600"
                        value={newItem.description}
                        onChange={(e) =>
                          setNewItem((p) => ({
                            ...p,
                            description: e.target.value,
                          }))
                        }
                        placeholder="EJ: CAMBIO DE TABLERO ELÉCTRICO..."
                      />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-[8px] font-black text-slate-600 uppercase ml-1">
                        Cantidad
                      </label>
                      <input
                        type="number"
                        className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-3 text-[10px] font-black text-slate-900 outline-none focus:border-emerald-600 text-center"
                        value={newItem.quantity}
                        onChange={(e) =>
                          setNewItem((p) => ({
                            ...p,
                            quantity: parseFloat(e.target.value) || 0,
                          }))
                        }
                      />
                    </div>
                    <div className="col-span-3 space-y-1">
                      <label className="text-[8px] font-black text-slate-600 uppercase ml-1">
                        Valor Unitario ($)
                      </label>
                      <input
                        type="text"
                        className="w-full bg-white border-2 border-slate-100 rounded-xl px-4 py-3 text-[10px] font-black text-slate-900 outline-none focus:border-emerald-600 text-right font-mono"
                        value={newItem.unitPrice === 0 ? "" : `$ ${newItem.unitPrice.toLocaleString('es-CL')}`}
                        onKeyDown={allowOnlyDigitsKey}
                        onChange={(e) => {
                          const { rawNumber } = maskMoneyCLP(e.target.value);
                          setNewItem((p) => ({
                            ...p,
                            unitPrice: rawNumber,
                          }));
                        }}
                        placeholder="$ 0"
                      />
                    </div>
                    <div className="col-span-1">
                      <button
                        type="button"
                        onClick={addItem}
                        className="w-full h-[46px] rounded-xl flex items-center justify-center shadow-lg transition-all active:scale-95 bg-emerald-600 text-white hover:bg-emerald-700"
                        title="Añadir línea"
                      >
                        <Plus size={24} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {formData.items.length === 0 && (
                      <div className="py-12 text-center text-slate-300 font-black uppercase text-[10px] tracking-widest italic border-2 border-dashed border-slate-100 rounded-3xl">
                        Presione "+" para iniciar la carga de trabajos
                      </div>
                    )}
                    {formData.items.map((item, i) => (
                      <div
                        key={item.id}
                        className="grid grid-cols-12 gap-4 items-center p-4 bg-white border border-slate-100 rounded-2xl hover:border-emerald-200 transition-all group"
                      >
                        <div className="col-span-1 text-[10px] font-black text-slate-300 text-center">
                          {i + 1}
                        </div>
                        <div className="col-span-5 text-[10px] font-black text-slate-800 uppercase truncate">
                          {item.description}
                        </div>
                        <div className="col-span-2 text-[10px] font-bold text-slate-500 text-center">
                          {item.quantity} UNID.
                        </div>
                        <div className="col-span-3 text-[10px] font-black text-slate-900 text-right">
                          ${item.total.toLocaleString()}
                        </div>
                        <div className="col-span-1 flex justify-center">
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="p-2 text-rose-300 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {formData.items.length > 0 && (
                    <div className="flex justify-end pt-6 border-t-2 border-slate-100">
                      <div className="w-64 space-y-2">
                        <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase">
                          <span>Subtotal Neto</span>
                          <span>
                            {formatCLP(
                              calculateTotals(
                                activeSuppliers.find(
                                  (s) => s.id === formData.supplierId,
                                )?.taxDocumentType === "FACTURA",
                              ).subtotal,
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-emerald-100 text-emerald-800">
                          <span className="text-[11px] font-black uppercase tracking-tighter">
                            TOTAL (IVA INCL.)
                          </span>
                          <span className="text-lg font-black">
                            {formatCLP(
                              calculateTotals(
                                activeSuppliers.find(
                                  (s) => s.id === formData.supplierId,
                                )?.taxDocumentType === "FACTURA",
                              ).total,
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-indigo-50 p-8 rounded-[40px] border-2 border-indigo-100 flex items-start gap-6 shadow-inner">
                <ShieldCheck
                  className="text-indigo-600 shrink-0 mt-1"
                  size={32}
                />
                <div className="space-y-2">
                  <h4 className="text-sm font-black text-indigo-900 uppercase">
                    Garantía de Auditoría
                  </h4>
                  <p className="text-[10px] font-medium text-indigo-800/70 leading-relaxed italic uppercase">
                    El proceso de emisión requiere una **Revisión Visual
                    Obligatoria** del documento antes de ser inyectado al
                    sistema. Una vez emitido, el folio se bloqueará para su uso
                    exclusivo.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-10 bg-white border-t border-slate-200">
              <button
                onClick={handleReviewDraft}
                disabled={
                  formData.items.length === 0 ||
                  !formData.supplierId ||
                  !formData.propertyId
                }
                className={`w-full py-6 rounded-[32px] font-black text-sm uppercase tracking-[0.4em] transition-all shadow-xl flex items-center justify-center gap-4 border-b-8 active:translate-y-1 active:border-b-0 ${
                  formData.items.length > 0 &&
                  formData.supplierId &&
                  formData.propertyId
                    ? "bg-emerald-600 text-white border-emerald-900 hover:bg-emerald-700 shadow-emerald-900/30"
                    : "bg-slate-200 text-slate-400 border-slate-300 cursor-help"
                }`}
              >
                <Eye size={24} />{" "}
                {!formData.supplierId || !formData.propertyId
                  ? "FALTA IDENTIFICACIÓN"
                  : formData.items.length === 0
                    ? "FALTA DETALLE TÉCNICO"
                    : "REVISAR Y EMITIR OT"}
              </button>
            </div>
          </div>
        </div>
      )}
      {isTrackingOpen && selectedOTForTracking && (
        <div className="fixed inset-0 z-[150] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] w-full max-w-6xl shadow-2xl border-4 border-[#f3f2f1] overflow-hidden flex flex-col h-[92vh] animate-in zoom-in-95 font-sans">
            <div className="bg-indigo-700 p-6 text-white flex justify-between items-center relative overflow-hidden">
              <div className="absolute right-0 top-0 opacity-10 -mr-12 -mt-12">
                <ClipboardList size={220} />
              </div>
              <div className="flex items-center gap-4 relative z-10">
                <div className="p-3.5 bg-white/10 rounded-2xl border border-white/20 shadow-xl">
                  <ClipboardList size={28} />
                </div>
                <div>
                  <h2 className="text-xl font-black uppercase tracking-tighter leading-none">
                    Seguimiento de OT: {selectedOTForTracking.folio}
                  </h2>
                  <p className="text-indigo-100 text-[9px] font-black uppercase tracking-widest mt-1 italic">
                    Control de acciones de seguimiento y responsables ERP
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsTrackingOpen(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-all relative z-10 cursor-pointer"
              >
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 grid grid-cols-12 overflow-hidden bg-slate-50 min-h-0">
              
              {/* PANEL IZQUIERDO: Registrar nueva acción y asignar lider */}
              <div className="col-span-12 lg:col-span-12 xl:col-span-5 bg-white border-b xl:border-b-0 xl:border-r border-slate-200 p-6 overflow-y-auto flex flex-col gap-6">
                
                {/* 1. Responsable Leader del Seguimiento */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3 shadow-3xs">
                  <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <User size={13} className="text-indigo-600" /> Responsable Líder de Seguimiento
                  </h3>
                  <p className="text-[9px] text-slate-500 leading-relaxed font-semibold">
                    Usuario corporativo responsable de consolidar reportes de avance para esta Orden de Trabajo.
                  </p>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <select
                        className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-2.5 text-[10.5px] font-black uppercase outline-none focus:border-indigo-650 appearance-none cursor-pointer pr-8 text-slate-800"
                        value={trackingResponsible}
                        onChange={(e) => setTrackingResponsible(e.target.value)}
                      >
                        <option value="">-- SELECCIONE UN LÍDER --</option>
                        {Object.keys(USER_CREDENTIALS).filter((user) => {
                          try {
                            const deleted: string[] = JSON.parse(localStorage.getItem('assetflow_deleted_users') || '[]');
                            return !deleted.includes(user);
                          } catch {
                            return true;
                          }
                        }).map((user) => (
                          <option key={user} value={user}>
                            {user} ({USER_CREDENTIALS[user].deptTitle})
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={14}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                      />
                    </div>
                    <button
                      onClick={handleSaveTracking}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 rounded-xl font-black text-[9.5px] uppercase shadow-sm flex items-center gap-1.5 transition-all active:scale-95 shrink-0"
                      title="Actualizar líder"
                    >
                      <Save size={13} /> ACTUALIZAR
                    </button>
                  </div>
                </div>

                {/* 2. Formulario de Acción de Seguimiento (TEXTAREA PRINCIPAL) */}
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 shadow-3xs shrink-0">
                  <div className="border-b border-indigo-100 pb-2.5">
                    <h3 className="text-[10.5px] font-black text-rose-700 uppercase tracking-widest flex items-center gap-2">
                      <Zap size={14} className="text-rose-600 fill-rose-100 placeholder-indigo-100" /> REGISTRAR BITÁCORAS & ACCIONES
                    </h3>
                    <p className="text-[9.2px] text-slate-500 mt-1 leading-relaxed font-semibold">
                      Ingrese un nuevo comentario o acción de seguimiento. Los datos se sincronizan y persisten inmediatamente en la base de datos.
                    </p>
                  </div>

                  <div className="space-y-4 pr-1">
                    {/* TEXTAREA ESPACIO DE ESCRITURA */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-700 uppercase ml-0.5 block">
                        Detalle de la Acción de Seguimiento *
                      </label>
                      <textarea
                        rows={4}
                        className="w-full bg-white border-2 border-slate-200 rounded-xl px-4 py-3 text-[11px] font-semibold text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-600 resize-none leading-relaxed transition-colors"
                        value={newAction.description}
                        onChange={(e) =>
                          setNewAction((p) => ({
                            ...p,
                            description: e.target.value,
                          }))
                        }
                        placeholder="ESCRIBA AQUÍ EL COMENTARIO DETALLADO DE AVANCE SEMANAL, SE COMPROMETE ENTREGA O PRÓXIMA ACCIÓN A EJECUTAR..."
                      />
                    </div>

                    {/* EJECUTOR Y ESTADO DE HITO */}
                    <div className="grid grid-cols-2 gap-3 font-sans">
                      <div className="space-y-1">
                        <label className="text-[8.5px] font-black text-slate-600 uppercase ml-0.5 block">
                          Responsable Ejecutor
                        </label>
                        <div className="relative">
                          <select
                            className="w-full bg-white border-2 border-slate-200 rounded-xl px-3 py-2 text-[10px] font-black text-slate-800 uppercase outline-none focus:border-indigo-600 appearance-none cursor-pointer pr-8"
                            value={newAction.actionResponsible}
                            onChange={(e) =>
                              setNewAction((p) => ({
                                ...p,
                                actionResponsible: e.target.value,
                              }))
                            }
                          >
                            <option value="">-- CUALQUIERA --</option>
                            {Object.keys(USER_CREDENTIALS).filter((user) => {
                              try {
                                const deleted: string[] = JSON.parse(localStorage.getItem('assetflow_deleted_users') || '[]');
                                return !deleted.includes(user);
                              } catch {
                                return true;
                              }
                            }).map((user) => (
                              <option key={user} value={user}>
                                {user}
                              </option>
                            ))}
                          </select>
                          <ChevronDown
                            size={14}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[8.5px] font-black text-slate-600 uppercase ml-0.5 block">
                          Estado del Hito
                        </label>
                        <div className="relative">
                          <select
                            className="w-full bg-white border-2 border-slate-200 rounded-xl px-3 py-2 text-[10px] font-black text-slate-800 uppercase outline-none focus:border-indigo-600 appearance-none cursor-pointer pr-8"
                            value={newAction.type}
                            onChange={(e) =>
                              setNewAction((p) => ({
                                ...p,
                                type: e.target.value as "REALIZADA" | "PENDIENTE",
                              }))
                            }
                          >
                            <option value="REALIZADA">REALIZADA</option>
                            <option value="PENDIENTE">PENDIENTE (TAREA)</option>
                          </select>
                          <ChevronDown
                            size={14}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* FECHAS */}
                    <div className="grid grid-cols-2 gap-3 font-sans">
                      <div className="space-y-1">
                        <label className="text-[8.5px] font-black text-slate-600 uppercase ml-0.5 block">
                          Fecha de Registro
                        </label>
                        <input
                          type="date"
                          onClick={(e) => { try { e.currentTarget.showPicker(); } catch (error) {} }}
                          className="w-full bg-white border-2 border-slate-200 rounded-xl px-3 py-2 text-[10px] font-black text-slate-800 uppercase outline-none focus:border-indigo-600 cursor-pointer"
                          value={newAction.entryDate}
                          onChange={(e) =>
                            setNewAction((p) => ({
                              ...p,
                              entryDate: e.target.value,
                            }))
                          }
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[8.5px] font-black text-slate-600 uppercase ml-0.5 block">
                          Fecha Plazo / Límite
                        </label>
                        <input
                          type="date"
                          onClick={(e) => { try { e.currentTarget.showPicker(); } catch (error) {} }}
                          className="w-full bg-white border-2 border-slate-200 rounded-xl px-3 py-2 text-[10px] font-black text-slate-800 uppercase outline-none focus:border-indigo-600 cursor-pointer"
                          value={newAction.deadline}
                          onChange={(e) =>
                            setNewAction((p) => ({
                              ...p,
                              deadline: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* BOTÓN GUARDAR ACCIÓN */}
                  <button
                    onClick={handleAddAction}
                    disabled={!newAction.description.trim()}
                    className={`w-full h-[46px] rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 font-black text-[11px] uppercase cursor-pointer shrink-0 ${
                      newAction.description.trim()
                        ? 'bg-rose-600 text-white hover:bg-rose-700 hover:shadow-rose-100'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    }`}
                  >
                    <Plus size={16} /> REGISTRAR ACCIÓN Y GUARDAR EN ERP
                  </button>
                </div>

              </div>

              {/* PANEL DERECHO: Historial timeline scrollable */}
              <div className="col-span-12 lg:col-span-12 xl:col-span-7 p-6 overflow-y-auto flex flex-col gap-4 bg-slate-100 custom-audit-scroll min-h-0">
                
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex-1 flex flex-col min-h-0">
                  <div className="flex justify-between items-center border-b border-slate-150 pb-3.5 shrink-0">
                    <div>
                      <h3 className="text-xs font-black text-indigo-950 uppercase tracking-tight flex items-center gap-2">
                        <ClipboardList size={16} className="text-indigo-600" /> Historial de Avances y Seguimiento
                      </h3>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                        BITÁCORAS DE SEGUIMIENTO EN BASE DE DATOS CORPORATIVA FIRESTORE
                      </p>
                    </div>
                    <span className="bg-indigo-50 border border-indigo-200 text-indigo-800 px-3 py-1 rounded-full text-[10px] font-black font-mono">
                      {(selectedOTForTracking.trackingActions || []).length} HITOS
                    </span>
                  </div>

                  {/* TIMELINE LIST */}
                  <div className="flex-1 overflow-y-auto pr-1 mt-4 custom-audit-scroll space-y-4">
                    {!selectedOTForTracking.trackingActions || selectedOTForTracking.trackingActions.length === 0 ? (
                      <div className="py-20 text-center text-slate-350 font-black uppercase text-[10px] tracking-widest italic border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 bg-slate-50">
                        <Activity size={24} className="text-slate-300 animate-pulse" />
                        No hay hitos registrados aún para esta OT
                      </div>
                    ) : (
                      <div className="space-y-4 relative pl-3.5 border-l-2 border-slate-200">
                        {selectedOTForTracking.trackingActions.map((action) => (
                          <div key={action.id} className="relative">
                            
                            {/* BULLET POINT */}
                            <div className={`absolute -left-[23px] top-1.5 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center shadow-3xs ${
                              action.type === "REALIZADA" ? "border-emerald-500 text-emerald-500" : "border-amber-500 text-amber-500"
                            }`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                            </div>

                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 transition-all hover:bg-slate-100/60 shadow-3xs space-y-3">
                              <div className="flex justify-between items-start gap-4">
                                <p className="text-[11px] font-bold text-slate-800 uppercase tracking-wide leading-relaxed select-text whitespace-pre-wrap break-words flex-1">
                                  {action.description}
                                </p>
                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase shrink-0 ${
                                  action.type === "REALIZADA" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                                }`}>
                                  {action.type}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-3 gap-y-2.5 gap-x-4 border-t border-slate-200/50 pt-2.5 text-[9px] font-sans">
                                <div className="space-y-0.5">
                                  <span className="block text-[7px] font-black text-slate-450 uppercase tracking-wider">EJECUTOR</span>
                                  <span className="block text-[9.5px] font-black text-slate-700 uppercase truncate">
                                    {action.actionResponsible || "Sin designar"}
                                  </span>
                                </div>
                                <div className="space-y-0.5">
                                  <span className="block text-[7px] font-black text-slate-450 uppercase tracking-wider">PLAZO LÍMITE</span>
                                  <span className={`block text-[9.5px] font-black uppercase font-mono ${action.deadline ? "text-rose-600 font-extrabold" : "text-slate-500"}`}>
                                    {action.deadline || "Indefectible"}
                                  </span>
                                </div>
                                <div className="space-y-0.5">
                                  <span className="block text-[7px] font-black text-slate-450 uppercase tracking-wider">REGISTRO POR</span>
                                  <span className="block text-[9.5px] font-black text-indigo-750 uppercase truncate">
                                    {action.user}
                                  </span>
                                </div>
                              </div>

                              <div className="flex justify-between items-center text-[7.5px] font-black text-slate-400 uppercase tracking-widest pt-2.5 border-t border-dashed border-slate-200 font-mono">
                                <span className="flex items-center gap-1">
                                  <Clock size={10} /> {new Date(action.date).toLocaleString("es-CL")}
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm("¿Está seguro de eliminar esta acción de seguimiento permanentemente?")) {
                                      const updatedActions = (selectedOTForTracking.trackingActions || []).filter(a => a.id !== action.id);
                                      const updatedOT = {
                                        ...selectedOTForTracking,
                                        trackingActions: updatedActions
                                      };
                                      onSave(updatedOT);
                                      setSelectedOTForTracking(updatedOT);
                                    }
                                  }}
                                  className="text-slate-400 hover:text-rose-600 transition-colors p-1 rounded hover:bg-rose-50"
                                  title="Eliminar esta acción"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>

                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>

              </div>

            </div>

            <div className="p-4 bg-white border-t border-slate-205 flex justify-end shrink-0">
              <button
                onClick={() => setIsTrackingOpen(false)}
                className="px-10 py-3 bg-slate-900 text-white rounded-xl font-black text-[10.5px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md cursor-pointer active:scale-95"
              >
                Cerrar Seguimiento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AssetFlow Enterprise Floating Grid Context Menu (Right Click & Row Selector Click) */}
      {gridContextMenu && (
        <JDEGridContextMenu
          isOpen={true}
          x={gridContextMenu.x}
          y={gridContextMenu.y}
          programCode="P48201"
          programTitle="Work With Work Orders (F4801)"
          collectionName="work_orders"
          recordKey={`OT #${gridContextMenu.order.folio || gridContextMenu.order.id}`}
          recordData={gridContextMenu.order}
          currentStatus={gridContextMenu.order.status}
          statusOptions={[
            { label: 'EN PROCESO', value: 'EN PROCESO' },
            { label: 'APROBADA', value: 'APROBADA' },
            { label: 'CONCLUIDA', value: 'CONCLUIDA' },
            { label: 'ANULADA', value: 'ANULADA' }
          ]}
          onUpdateStatus={async (newStatus) => {
            const now = new Date();
            const statusAction: WorkOrderAction = {
              id: crypto.randomUUID(),
              date: now.toISOString(),
              entryDate: now.toISOString().split("T")[0],
              type: "REALIZADA",
              user: currentUser,
              actionResponsible: currentUser,
              trackingResponsible: "JEFATURA & AUDITORÍA",
              actionCategory: "STATUS_CHANGE",
              description: `CAMBIO DE ESTADO DESDE MENÚ CONTEXTUAL ERP (P48201) A: ${newStatus}`,
            };
            onSave({
              ...gridContextMenu.order,
              status: newStatus as any,
              trackingActions: [statusAction, ...(gridContextMenu.order.trackingActions || [])],
            });
          }}
          rowExits={[
            {
              id: 'exit_line_approval',
              label: 'Mesa Aprobación por Líneas (P43081)',
              icon: <Layers size={12} className="text-amber-600" />,
              shortcut: 'F7',
              onClick: () => {
                setLineApprovalModalOrder(gridContextMenu.order);
              }
            },
            {
              id: 'exit_trace',
              label: 'Trazabilidad One View F0911/F4312 (P00901)',
              icon: <BookOpen size={12} className="text-indigo-700" />,
              shortcut: 'F8',
              onClick: () => {
                setSelectedOTForJDE(gridContextMenu.order);
                setIsJDEMenuOpen(true);
              }
            },
            {
              id: 'exit_reception',
              label: 'Recepción Técnica de Materiales y Acta (P4312)',
              icon: <CheckCircle2 size={12} className="text-emerald-700" />,
              onClick: () => {
                setSelectedOTForTracking(gridContextMenu.order);
                setIsTrackingOpen(true);
              }
            },
            {
              id: 'exit_preview',
              label: 'Vista Previa Comprobante OT (W48201C)',
              icon: <Eye size={12} className="text-[#002D62]" />,
              shortcut: 'F4',
              onClick: () => {
                setPreviewOrder(gridContextMenu.order);
                setIsDraftPreview(false);
                setIsPreviewOpen(true);
              }
            }
          ]}
          onClose={() => setGridContextMenu(null)}
          onViewDetails={() => {
            setPreviewOrder(gridContextMenu.order);
            setIsDraftPreview(false);
            setIsPreviewOpen(true);
            setGridContextMenu(null);
          }}
          onTraceability={() => {
            setSelectedOTForJDE(gridContextMenu.order);
            setIsJDEMenuOpen(true);
            setGridContextMenu(null);
          }}
          onEdit={() => {
            setFormData({
              supplierId: gridContextMenu.order.supplierId || "",
              propertyId: gridContextMenu.order.propertyId || "",
              category: (gridContextMenu.order.category || "MANTENCIÓN PREVENTIVA") as any,
              specialty: (gridContextMenu.order.specialty || "TECHUMBRES") as any,
              associatedInvoice: gridContextMenu.order.associatedInvoice || "",
              deliveryDate: gridContextMenu.order.deliveryDate || "",
              deliveryAddress: gridContextMenu.order.deliveryAddress || "",
              paymentTerms: gridContextMenu.order.paymentTerms || CUSTOM_PAYMENT_TERMS[0],
              advancePercent: gridContextMenu.order.advancePercent || 50,
              quoteNumber: gridContextMenu.order.quoteNumber || "",
              items: gridContextMenu.order.items || [],
              specialInstructions: gridContextMenu.order.specialInstructions || "",
              accountCode: gridContextMenu.order.accountCode || ""
            });
            setIsFormOpen(true);
            setGridContextMenu(null);
          }}
          onDelete={() => {
            if (window.confirm(`¿Confirma eliminar la Orden de Trabajo #${gridContextMenu.order.folio} de la base de datos en tiempo real?`)) {
              onDelete(gridContextMenu.order.id);
            }
            setGridContextMenu(null);
          }}
          onPrint={() => {
            downloadJDEWorkOrderVoucher({
              workOrder: gridContextMenu.order,
              currentUser
            });
            setGridContextMenu(null);
          }}
          onExportExcel={() => {
            exportWorkOrdersToExcel(
              filteredOrders,
              `Reporte_Ordenes_OTs_${new Date().toISOString().split("T")[0]}`
            );
            setGridContextMenu(null);
          }}
          onClearQBE={() => {
            setColSearchFolio("");
            setColSearchProveedor("");
            setColSearchUbicacion("");
            setColSearchResumen("");
            setColSearchCategoria("");
            setColSearchEspecialidad("");
            setColSearchFactura("");
            setColSearchTotal("");
            setColSearchEstado("");
            setGridContextMenu(null);
          }}
          onSetRowHeight={setDefaultRowHeight}
          onResetColumns={resetWidths}
          onResetRows={resetHeights}
          onResetGridDimensions={resetAll}
        />
      )}

      {isJDEMenuOpen && selectedOTForJDE && (
        <JDEContextualMenu
          isOpen={isJDEMenuOpen}
          onClose={() => {
            setIsJDEMenuOpen(false);
            setSelectedOTForJDE(null);
          }}
          contextType="WORK_ORDER"
          selectedWorkOrder={selectedOTForJDE}
          workOrders={workOrders}
          transactions={transactions}
          properties={properties}
          suppliers={suppliers}
          currentUser={currentUser}
          onUpdateWorkOrder={(id, updated) => {
            const currentOT = workOrders.find((o) => o.id === id);
            if (currentOT) {
              onSave({ ...currentOT, ...updated });
            }
          }}
          onAddTransaction={onAddTransaction}
        />
      )}

      {/* ERP Category UDC Visual Assist modal */}
      {isCategoryUDCOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#f0f4f9] rounded-xl w-full max-w-3xl shadow-2xl border-4 border-[#0b3c5d] overflow-hidden flex flex-col h-[75vh] animate-in zoom-in-95 font-mono">
            {/* ERP Classic Blue Header */}
            <div className="bg-[#0b3c5d] px-6 py-4 text-white flex justify-between items-center border-b-2 border-amber-500">
              <div className="flex items-center gap-3">
                <Database size={18} className="text-amber-400" />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tight">
                    P0004A - Visual Assist: Categorías de Órdenes (UDC 48/CAT)
                  </h3>
                  <p className="text-[9px] text-slate-300 uppercase font-bold tracking-wider">
                    Tablas Maestras AssetFlow Enterprise
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsCategoryUDCOpen(false);
                  setSelectedCategoryIndex(null);
                }}
                className="text-white/85 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Config metadata fields */}
            <div className="bg-white border-b border-slate-300 p-4 grid grid-cols-3 gap-4 text-[10px] text-slate-800">
              <div className="space-y-1 bg-slate-50 p-2 border border-slate-200 rounded">
                <span className="block text-[8px] text-slate-505 font-extrabold uppercase">
                  CÓDIGO DE PRODUCTO
                </span>
                <span className="font-black text-[#0b3c5d]">
                  48 - WORK ORDERS
                </span>
              </div>
              <div className="space-y-1 bg-slate-50 p-2 border border-slate-200 rounded">
                <span className="block text-[8px] text-slate-505 font-extrabold uppercase">
                  TABLA DE CÓDIGOS
                </span>
                <span className="font-black text-[#0b3c5d]">
                  CAT - WORK CATEGORY
                </span>
              </div>
              <div className="space-y-1 bg-slate-50 p-2 border border-slate-200 rounded">
                <span className="block text-[8px] text-slate-505 font-extrabold uppercase">
                  ESTRUCTURA DE DATOS
                </span>
                <span className="font-extrabold text-slate-600">
                  VARCHAR (30) - ALFANUMÉRICO
                </span>
              </div>
            </div>

            {/* Toolbar Buttons ERP style */}
            <div className="bg-slate-100 border-b border-slate-300 px-4 py-3 flex justify-between items-center">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const filtered = WORK_CATEGORIES.filter(
                      (cat) =>
                        !categorySearchTerm ||
                        cat.toLowerCase().includes(categorySearchTerm.toLowerCase())
                    );
                    if (selectedCategoryIndex !== null && filtered[selectedCategoryIndex]) {
                      setColSearchCategoria(filtered[selectedCategoryIndex]);
                      setIsCategoryUDCOpen(false);
                      setSelectedCategoryIndex(null);
                    } else {
                      alert(
                        "Por favor seleccione una categoría de la grilla antes de confirmar."
                      );
                    }
                  }}
                  className="bg-emerald-750 hover:bg-emerald-800 text-white px-4 py-2 border-b-2 border-emerald-950 text-[10px] font-black uppercase rounded flex items-center gap-1.5 cursor-pointer shadow-sm active:translate-y-px transition-all"
                >
                  <CheckCircle size={12} className="stroke-[3]" /> Seleccionar (Select)
                </button>
                <button
                  onClick={() => {
                    setColSearchCategoria("");
                    setIsCategoryUDCOpen(false);
                    setSelectedCategoryIndex(null);
                  }}
                  className="bg-rose-700 hover:bg-rose-800 text-white px-4 py-2 border-b-2 border-rose-955 text-[10px] font-black uppercase rounded flex items-center gap-1.5 cursor-pointer shadow-sm active:translate-y-px transition-all"
                >
                  <X size={12} /> Limpiar Filtro (Clear)
                </button>
                <button
                  onClick={() => {
                    setIsCategoryUDCOpen(false);
                    setSelectedCategoryIndex(null);
                  }}
                  className="bg-slate-605 hover:bg-slate-700 text-white px-4 py-2 border-b-2 border-slate-800 text-[10px] font-black uppercase rounded flex items-center gap-1.5 cursor-pointer shadow-sm active:translate-y-px transition-all"
                >
                  Cancelar
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={categorySearchTerm}
                  onChange={(e) => {
                    setCategorySearchTerm(e.target.value);
                    setSelectedCategoryIndex(null);
                  }}
                  placeholder="FILTRAR..."
                  className="bg-white border-2 border-slate-300 rounded px-3 py-1.5 text-[9px] font-bold text-slate-800 outline-none w-56 focus:border-[#0b3c5d] uppercase"
                />
                <Search size={12} className="absolute right-2.5 top-2.5 text-slate-400" />
              </div>
            </div>

            {/* ERP Table Grid */}
            <div className="flex-1 overflow-auto p-4 bg-white custom-audit-scroll">
              <table className="w-full text-left border-collapse border border-slate-300 text-[10px]">
                <thead>
                  <tr className="bg-[#e1e6f2] text-slate-800 border-b border-slate-400">
                    <th className="px-3 py-2 border border-slate-300 font-extrabold uppercase w-16 text-center">
                      #
                    </th>
                    <th className="px-3 py-2 border border-slate-300 font-extrabold uppercase">
                      Descripción de Categoría (Category Name)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {WORK_CATEGORIES.filter(
                    (cat) =>
                      !categorySearchTerm ||
                      cat.toLowerCase().includes(categorySearchTerm.toLowerCase())
                  ).map((cat, idx) => {
                    const isSelected = selectedCategoryIndex === idx;
                    return (
                      <tr
                        key={cat}
                        onClick={() => setSelectedCategoryIndex(idx)}
                        onDoubleClick={() => {
                          setColSearchCategoria(cat);
                          setIsCategoryUDCOpen(false);
                          setSelectedCategoryIndex(null);
                        }}
                        className={`cursor-pointer transition-colors border-b border-slate-200 ${
                          isSelected
                            ? "bg-blue-100 hover:bg-blue-200 font-extrabold text-[#0b3c5d]"
                            : "hover:bg-slate-50/80"
                        }`}
                      >
                        <td className="px-3 py-2 border border-slate-200 text-center font-bold">
                          {idx + 1}
                        </td>
                        <td className="px-3 py-2 border border-slate-200 font-black text-slate-850 uppercase">
                          {cat}
                        </td>
                      </tr>
                    );
                  })}
                  {WORK_CATEGORIES.filter(
                    (cat) =>
                      !categorySearchTerm ||
                      cat.toLowerCase().includes(categorySearchTerm.toLowerCase())
                  ).length === 0 && (
                    <tr>
                      <td colSpan={2} className="py-8 text-center text-slate-400 italic">
                        No se encontraron categorías
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="bg-[#e1e6f2] px-6 py-2 border-t border-slate-300 flex justify-between items-center text-[8px] text-slate-600 font-sans">
              <p className="font-extrabold uppercase">
                Tablas Maestras ERP • UDC 48/CAT
              </p>
              <p className="italic">
                Visual Assist v9.2.1 • [Doble click para confirmar]
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ERP Specialty UDC Visual Assist modal */}
      {isSpecialtyUDCOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#f0f4f9] rounded-xl w-full max-w-3xl shadow-2xl border-4 border-[#0b3c5d] overflow-hidden flex flex-col h-[75vh] animate-in zoom-in-95 font-mono">
            {/* ERP Classic Blue Header */}
            <div className="bg-[#0b3c5d] px-6 py-4 text-white flex justify-between items-center border-b-2 border-amber-500">
              <div className="flex items-center gap-3">
                <Database size={18} className="text-amber-400" />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tight">
                    P0004A - Visual Assist: Especialidades / Rubros (UDC 48/ESP)
                  </h3>
                  <p className="text-[9px] text-slate-300 uppercase font-bold tracking-wider">
                    Tablas Maestras AssetFlow Enterprise
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsSpecialtyUDCOpen(false);
                  setSelectedSpecialtyIndex(null);
                }}
                className="text-white/85 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Config metadata fields */}
            <div className="bg-white border-b border-slate-300 p-4 grid grid-cols-3 gap-4 text-[10px] text-slate-800">
              <div className="space-y-1 bg-slate-50 p-2 border border-slate-200 rounded">
                <span className="block text-[8px] text-slate-505 font-extrabold uppercase">
                  CÓDIGO DE PRODUCTO
                </span>
                <span className="font-black text-[#0b3c5d]">
                  48 - WORK ORDERS
                </span>
              </div>
              <div className="space-y-1 bg-slate-50 p-2 border border-slate-200 rounded">
                <span className="block text-[8px] text-slate-505 font-extrabold uppercase">
                  TABLA DE CÓDIGOS
                </span>
                <span className="font-black text-[#0b3c5d]">
                  ESP - SPECIALTIES / RUBROS
                </span>
              </div>
              <div className="space-y-1 bg-slate-50 p-2 border border-slate-200 rounded">
                <span className="block text-[8px] text-slate-505 font-extrabold uppercase">
                  ESTRUCTURA DE DATOS
                </span>
                <span className="font-extrabold text-slate-600">
                  VARCHAR (30) - ALFANUMÉRICO
                </span>
              </div>
            </div>

            {/* Toolbar Buttons ERP style */}
            <div className="bg-slate-100 border-b border-slate-300 px-4 py-3 flex justify-between items-center">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const filtered = WORK_SPECIALTIES.filter(
                      (esp) =>
                        !specialtySearchTerm ||
                        esp.toLowerCase().includes(specialtySearchTerm.toLowerCase())
                    );
                    if (selectedSpecialtyIndex !== null && filtered[selectedSpecialtyIndex]) {
                      setColSearchEspecialidad(filtered[selectedSpecialtyIndex]);
                      setIsSpecialtyUDCOpen(false);
                      setSelectedSpecialtyIndex(null);
                    } else {
                      alert(
                        "Por favor seleccione una especialidad de la grilla antes de confirmar."
                      );
                    }
                  }}
                  className="bg-emerald-750 hover:bg-emerald-800 text-white px-4 py-2 border-b-2 border-emerald-950 text-[10px] font-black uppercase rounded flex items-center gap-1.5 cursor-pointer shadow-sm active:translate-y-px transition-all"
                >
                  <CheckCircle size={12} className="stroke-[3]" /> Seleccionar (Select)
                </button>
                <button
                  onClick={() => {
                    setColSearchEspecialidad("");
                    setIsSpecialtyUDCOpen(false);
                    setSelectedSpecialtyIndex(null);
                  }}
                  className="bg-rose-700 hover:bg-rose-800 text-white px-4 py-2 border-b-2 border-rose-955 text-[10px] font-black uppercase rounded flex items-center gap-1.5 cursor-pointer shadow-sm active:translate-y-px transition-all"
                >
                  <X size={12} /> Limpiar Filtro (Clear)
                </button>
                <button
                  onClick={() => {
                    setIsSpecialtyUDCOpen(false);
                    setSelectedSpecialtyIndex(null);
                  }}
                  className="bg-slate-605 hover:bg-slate-700 text-white px-4 py-2 border-b-2 border-slate-800 text-[10px] font-black uppercase rounded flex items-center gap-1.5 cursor-pointer shadow-sm active:translate-y-px transition-all"
                >
                  Cancelar
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={specialtySearchTerm}
                  onChange={(e) => {
                    setSpecialtySearchTerm(e.target.value);
                    setSelectedSpecialtyIndex(null);
                  }}
                  placeholder="FILTRAR..."
                  className="bg-white border-2 border-slate-300 rounded px-3 py-1.5 text-[9px] font-bold text-slate-800 outline-none w-56 focus:border-[#0b3c5d] uppercase"
                />
                <Search size={12} className="absolute right-2.5 top-2.5 text-slate-400" />
              </div>
            </div>

            {/* ERP Table Grid */}
            <div className="flex-1 overflow-auto p-4 bg-white custom-audit-scroll">
              <table className="w-full text-left border-collapse border border-slate-300 text-[10px]">
                <thead>
                  <tr className="bg-[#e1e6f2] text-slate-800 border-b border-slate-400">
                    <th className="px-3 py-2 border border-slate-300 font-extrabold uppercase w-16 text-center">
                      #
                    </th>
                    <th className="px-3 py-2 border border-slate-300 font-extrabold uppercase">
                      Descripción de Especialidad (Specialty Name)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {WORK_SPECIALTIES.filter(
                    (esp) =>
                      !specialtySearchTerm ||
                      esp.toLowerCase().includes(specialtySearchTerm.toLowerCase())
                  ).map((esp, idx) => {
                    const isSelected = selectedSpecialtyIndex === idx;
                    return (
                      <tr
                        key={esp}
                        onClick={() => setSelectedSpecialtyIndex(idx)}
                        onDoubleClick={() => {
                          setColSearchEspecialidad(esp);
                          setIsSpecialtyUDCOpen(false);
                          setSelectedSpecialtyIndex(null);
                        }}
                        className={`cursor-pointer transition-colors border-b border-slate-200 ${
                          isSelected
                            ? "bg-blue-100 hover:bg-blue-200 font-extrabold text-[#0b3c5d]"
                            : "hover:bg-slate-50/80"
                        }`}
                      >
                        <td className="px-3 py-2 border border-slate-200 text-center font-bold">
                          {idx + 1}
                        </td>
                        <td className="px-3 py-2 border border-slate-200 font-black text-slate-850 uppercase">
                          {esp}
                        </td>
                      </tr>
                    );
                  })}
                  {WORK_SPECIALTIES.filter(
                    (esp) =>
                      !specialtySearchTerm ||
                      esp.toLowerCase().includes(specialtySearchTerm.toLowerCase())
                  ).length === 0 && (
                    <tr>
                      <td colSpan={2} className="py-8 text-center text-slate-400 italic">
                        No se encontraron especialidades
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="bg-[#e1e6f2] px-6 py-2 border-t border-slate-300 flex justify-between items-center text-[8px] text-slate-600 font-sans">
              <p className="font-extrabold uppercase">
                Tablas Maestras ERP • UDC 48/ESP
              </p>
              <p className="italic">
                Visual Assist v9.2.1 • [Doble click para confirmar]
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ERP Factura UDC Visual Assist modal */}
      {isFacturaUDCOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#f0f4f9] rounded-xl w-full max-w-3xl shadow-2xl border-4 border-[#0b3c5d] overflow-hidden flex flex-col h-[75vh] animate-in zoom-in-95 font-mono">
            {/* ERP Classic Blue Header */}
            <div className="bg-[#0b3c5d] px-6 py-4 text-white flex justify-between items-center border-b-2 border-amber-500">
              <div className="flex items-center gap-3">
                <Database size={18} className="text-amber-400" />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tight">
                    P0004A - Visual Assist: Libro Maestro de Facturas Asociadas (UDC 48/FC)
                  </h3>
                  <p className="text-[9px] text-slate-300 uppercase font-bold tracking-wider">
                    Tablas Maestras AssetFlow Enterprise
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsFacturaUDCOpen(false);
                  setSelectedFacturaIndex(null);
                }}
                className="text-white/85 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Config metadata fields */}
            <div className="bg-white border-b border-slate-300 p-4 grid grid-cols-3 gap-4 text-[10px] text-slate-800">
              <div className="space-y-1 bg-slate-50 p-2 border border-slate-200 rounded">
                <span className="block text-[8px] text-slate-505 font-extrabold uppercase">
                  CÓDIGO DE PRODUCTO
                </span>
                <span className="font-black text-[#0b3c5d]">
                  48 - WORK ORDERS
                </span>
              </div>
              <div className="space-y-1 bg-slate-50 p-2 border border-slate-200 rounded">
                <span className="block text-[8px] text-slate-505 font-extrabold uppercase">
                  TABLA DE COBRO
                </span>
                <span className="font-black text-[#0b3c5d]">
                  FC - ASSOCIATED INVOICE
                </span>
              </div>
              <div className="space-y-1 bg-slate-50 p-2 border border-slate-200 rounded">
                <span className="block text-[8px] text-slate-505 font-extrabold uppercase">
                  ESTRUCTURA DE DATOS
                </span>
                <span className="font-extrabold text-slate-600">
                  VARCHAR (20) - ALFANUMÉRICO
                </span>
              </div>
            </div>

            {/* Toolbar Buttons ERP style */}
            <div className="bg-slate-100 border-b border-slate-300 px-4 py-3 flex justify-between items-center">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const filtered = uniqueInvoices.filter(
                      (inv) =>
                        !facturaSearchTerm ||
                        inv.toLowerCase().includes(facturaSearchTerm.toLowerCase())
                    );
                    if (selectedFacturaIndex !== null && filtered[selectedFacturaIndex]) {
                      setColSearchFactura(filtered[selectedFacturaIndex]);
                      setIsFacturaUDCOpen(false);
                      setSelectedFacturaIndex(null);
                    } else {
                      alert(
                        "Por favor seleccione una factura de la grilla antes de confirmar."
                      );
                    }
                  }}
                  className="bg-emerald-750 hover:bg-emerald-800 text-white px-4 py-2 border-b-2 border-emerald-950 text-[10px] font-black uppercase rounded flex items-center gap-1.5 cursor-pointer shadow-sm active:translate-y-px transition-all"
                >
                  <CheckCircle size={12} className="stroke-[3]" /> Seleccionar (Select)
                </button>
                <button
                  onClick={() => {
                    setColSearchFactura("");
                    setIsFacturaUDCOpen(false);
                    setSelectedFacturaIndex(null);
                  }}
                  className="bg-rose-700 hover:bg-rose-800 text-white px-4 py-2 border-b-2 border-rose-955 text-[10px] font-black uppercase rounded flex items-center gap-1.5 cursor-pointer shadow-sm active:translate-y-px transition-all"
                >
                  <X size={12} /> Limpiar Filtro (Clear)
                </button>
                <button
                  onClick={() => {
                    setIsFacturaUDCOpen(false);
                    setSelectedFacturaIndex(null);
                  }}
                  className="bg-slate-605 hover:bg-slate-700 text-white px-4 py-2 border-b-2 border-slate-800 text-[10px] font-black uppercase rounded flex items-center gap-1.5 cursor-pointer shadow-sm active:translate-y-px transition-all"
                >
                  Cancelar
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={facturaSearchTerm}
                  onChange={(e) => {
                    setFacturaSearchTerm(e.target.value);
                    setSelectedFacturaIndex(null);
                  }}
                  placeholder="FILTRAR..."
                  className="bg-white border-2 border-slate-300 rounded px-3 py-1.5 text-[9px] font-bold text-slate-800 outline-none w-56 focus:border-[#0b3c5d] uppercase"
                />
                <Search size={12} className="absolute right-2.5 top-2.5 text-slate-400" />
              </div>
            </div>

            {/* ERP Table Grid */}
            <div className="flex-1 overflow-auto p-4 bg-white custom-audit-scroll">
              <table className="w-full text-left border-collapse border border-slate-300 text-[10px]">
                <thead>
                  <tr className="bg-[#e1e6f2] text-slate-800 border-b border-slate-400">
                    <th className="px-3 py-2 border border-slate-300 font-extrabold uppercase w-16 text-center">
                      #
                    </th>
                    <th className="px-3 py-2 border border-slate-300 font-extrabold uppercase">
                      Nº Factura / Documento Tributario (Invoice Number)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {uniqueInvoices.filter(
                    (inv) =>
                      !facturaSearchTerm ||
                      inv.toLowerCase().includes(facturaSearchTerm.toLowerCase())
                  ).map((inv, idx) => {
                    const isSelected = selectedFacturaIndex === idx;
                    return (
                      <tr
                        key={inv}
                        onClick={() => setSelectedFacturaIndex(idx)}
                        onDoubleClick={() => {
                          setColSearchFactura(inv);
                          setIsFacturaUDCOpen(false);
                          setSelectedFacturaIndex(null);
                        }}
                        className={`cursor-pointer transition-colors border-b border-slate-200 ${
                          isSelected
                            ? "bg-blue-100 hover:bg-blue-200 font-extrabold text-[#0b3c5d]"
                            : "hover:bg-slate-50/80"
                        }`}
                      >
                        <td className="px-3 py-2 border border-slate-200 text-center font-bold">
                          {idx + 1}
                        </td>
                        <td className="px-3 py-2 border border-slate-200 font-black text-slate-850 uppercase">
                          {inv}
                        </td>
                      </tr>
                    );
                  })}
                  {uniqueInvoices.filter(
                    (inv) =>
                      !facturaSearchTerm ||
                      inv.toLowerCase().includes(facturaSearchTerm.toLowerCase())
                  ).length === 0 && (
                    <tr>
                      <td colSpan={2} className="py-8 text-center text-slate-400 italic">
                        No se encontraron facturas
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="bg-[#e1e6f2] px-6 py-2 border-t border-slate-300 flex justify-between items-center text-[8px] text-slate-600 font-sans">
              <p className="font-extrabold uppercase">
                Tablas Maestras ERP • UDC 48/FC
              </p>
              <p className="italic">
                Visual Assist v9.2.1 • [Doble click para confirmar]
              </p>
            </div>
          </div>
        </div>
      )}

      {isStatusUDCOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#f0f4f9] rounded-xl w-full max-w-3xl shadow-2xl border-4 border-[#0b3c5d] overflow-hidden flex flex-col h-[75vh] animate-in zoom-in-95 font-mono">
            {/* ERP Classic Blue Header */}
            <div className="bg-[#0b3c5d] px-6 py-4 text-white flex justify-between items-center border-b-2 border-amber-500">
              <div className="flex items-center gap-3">
                <Database size={18} className="text-amber-400" />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tight">
                    P0004A - Visual Assist: Códigos Definidos por el Usuario
                    (UDC)
                  </h3>
                  <p className="text-[9px] text-slate-300 uppercase font-bold tracking-wider">
                    Tablas Maestras AssetFlow Enterprise
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsStatusUDCOpen(false);
                  setSelectedUdcIndex(null);
                }}
                className="text-white/85 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* ERP Key Field Selection Header Section */}
            <div className="bg-white border-b border-slate-300 p-4 grid grid-cols-3 gap-4 text-[10px] text-slate-800">
              <div className="space-y-1 bg-slate-50 p-2 border border-slate-200 rounded">
                <span className="block text-[8px] text-slate-505 font-extrabold uppercase">
                  CÓDIGO DE PRODUCTO (PRODUCT CODE)
                </span>
                <span className="font-black text-[#0b3c5d]">
                  48 - WORK ORDERS
                </span>
              </div>
              <div className="space-y-1 bg-slate-50 p-2 border border-slate-200 rounded">
                <span className="block text-[8px] text-slate-505 font-extrabold uppercase">
                  TABLA DE CÓDIGOS (USER CODES)
                </span>
                <span className="font-black text-[#0b3c5d]">
                  SN - STATE / ESTADO OT
                </span>
              </div>
              <div className="space-y-1 bg-slate-50 p-2 border border-slate-200 rounded">
                <span className="block text-[8px] text-slate-505 font-extrabold uppercase">
                  ESTRUCTURA DE DATOS (DATA STRUCTURE)
                </span>
                <span className="font-extrabold text-slate-600">
                  CHAR (12) - ALFANUMÉRICO
                </span>
              </div>
            </div>

            {/* Toolbar Buttons ERP style */}
            <div className="bg-slate-100 border-b border-slate-300 px-4 py-3 flex justify-between items-center">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const data = [
                      { code: "BORRADOR" },
                      { code: "PENDIENTE_VB" },
                      { code: "APROBADA" },
                      { code: "RECEPCIONADA" },
                    ];
                    if (selectedUdcIndex !== null) {
                      setColSearchEstado(data[selectedUdcIndex].code);
                      setIsStatusUDCOpen(false);
                      setSelectedUdcIndex(null);
                    } else {
                      alert(
                        "Por favor seleccione un registro de la grilla de estados antes de confirmar.",
                      );
                    }
                  }}
                  className="bg-emerald-750 hover:bg-emerald-800 text-white px-4 py-2 border-b-2 border-emerald-950 text-[10px] font-black uppercase rounded flex items-center gap-1.5 cursor-pointer shadow-sm active:translate-y-px transition-all"
                >
                  <CheckCircle size={12} className="stroke-[3]" /> Seleccionar
                  (Select)
                </button>
                <button
                  onClick={() => {
                    setColSearchEstado("");
                    setIsStatusUDCOpen(false);
                    setSelectedUdcIndex(null);
                  }}
                  className="bg-rose-700 hover:bg-rose-800 text-white px-4 py-2 border-b-2 border-rose-955 text-[10px] font-black uppercase rounded flex items-center gap-1.5 cursor-pointer shadow-sm active:translate-y-px transition-all"
                >
                  <X size={12} /> Limpiar Filtro (Clear)
                </button>
                <button
                  onClick={() => {
                    setIsStatusUDCOpen(false);
                    setSelectedUdcIndex(null);
                  }}
                  className="bg-slate-605 hover:bg-slate-700 text-white px-4 py-2 border-b-2 border-slate-800 text-[10px] font-black uppercase rounded flex items-center gap-1.5 cursor-pointer shadow-sm active:translate-y-px transition-all"
                >
                  Cancelar
                </button>
              </div>

              {/* Find/Filter inside ERP modal */}
              <div className="relative">
                <input
                  type="text"
                  value={udcSearchTerm}
                  onChange={(e) => {
                    setUdcSearchTerm(e.target.value);
                    setSelectedUdcIndex(null);
                  }}
                  placeholder="BUSCAR EN LA TABLA..."
                  className="bg-white border-2 border-slate-300 rounded px-3 py-1.5 text-[9px] font-bold text-slate-800 outline-none w-56 focus:border-[#0b3c5d] uppercase"
                />
                <Search
                  size={12}
                  className="absolute right-2.5 top-2.5 text-slate-400"
                />
              </div>
            </div>

            {/* ERP Table Grid */}
            <div className="flex-1 overflow-auto p-4 bg-white custom-audit-scroll">
              <table className="w-full text-left border-collapse border border-slate-300 text-[10px]">
                <thead>
                  <tr className="bg-[#e1e6f2] text-slate-800 border-b border-slate-400">
                    <th className="px-3 py-2 border border-slate-300 font-extrabold uppercase w-24">
                      Código (Code)
                    </th>
                    <th className="px-3 py-2 border border-slate-300 font-extrabold uppercase w-20 text-center">
                      ERP Status
                    </th>
                    <th className="px-3 py-2 border border-slate-300 font-extrabold uppercase">
                      Descripción (Description)
                    </th>
                    <th className="px-3 py-2 border border-[#cbd5e1] font-extrabold uppercase">
                      Regla de Auditoría / Flujo Financiero
                    </th>
                    <th className="px-3 py-2 border border-slate-300 font-extrabold uppercase w-16 text-center">
                      Sys (Y/N)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    {
                      code: "BORRADOR",
                      numeric: "10",
                      desc: "BORRADOR DE ORDEN",
                      audit:
                        "Edición libre por el creador. No compromete flujo ni posee firmas.",
                      sys: "Y",
                    },
                    {
                      code: "PENDIENTE_VB",
                      numeric: "20",
                      desc: "PENDIENTE V°B° GASTO",
                      audit:
                        "Mesa de validación de presupuesto. Bloqueado para firmas de emisor.",
                      sys: "Y",
                    },
                    {
                      code: "APROBADA",
                      numeric: "30",
                      desc: "ORDEN T. APROBADA",
                      audit:
                        "Firmada digitalmente por Emisión, Compliance y Control Financiero.",
                      sys: "Y",
                    },
                    {
                      code: "RECEPCIONADA",
                      numeric: "40",
                      desc: "SERVICIO RECEPCIONADO",
                      audit:
                        "Reconciliación completa física y digital. Voucher contable imputado.",
                      sys: "Y",
                    },
                  ]
                    .filter(
                      (item) =>
                        !udcSearchTerm ||
                        item.code
                          .toLowerCase()
                          .includes(udcSearchTerm.toLowerCase()) ||
                        item.desc
                          .toLowerCase()
                          .includes(udcSearchTerm.toLowerCase()) ||
                        item.audit
                          .toLowerCase()
                          .includes(udcSearchTerm.toLowerCase()),
                    )
                    .map((item) => {
                      const rawData = [
                        { code: "BORRADOR" },
                        { code: "PENDIENTE_VB" },
                        { code: "APROBADA" },
                        { code: "RECEPCIONADA" },
                      ];
                      const rawIdx = rawData.findIndex(
                        (r) => r.code === item.code,
                      );
                      const isSelected = selectedUdcIndex === rawIdx;

                      return (
                        <tr
                          key={item.code}
                          onClick={() => setSelectedUdcIndex(rawIdx)}
                          onDoubleClick={() => {
                            setColSearchEstado(item.code);
                            setIsStatusUDCOpen(false);
                            setSelectedUdcIndex(null);
                          }}
                          className={`cursor-pointer transition-colors border-b border-slate-200 ${
                            isSelected
                              ? "bg-blue-100 hover:bg-blue-200 font-extrabold text-[#0b3c5d]"
                              : "hover:bg-slate-50/80"
                          }`}
                          title="Doble click para seleccionar directamente"
                        >
                          <td className="px-3 py-2.5 border border-slate-200 font-mono font-black select-none">
                            {item.code}
                          </td>
                          <td className="px-3 py-2.5 border border-slate-200 font-mono text-center font-bold select-none">
                            {item.numeric}
                          </td>
                          <td className="px-3 py-2.5 border border-slate-200 select-none">
                            {item.desc}
                          </td>
                          <td className="px-3 py-2.5 border border-slate-250 italic text-slate-500 text-[9px] select-none">
                            {item.audit}
                          </td>
                          <td className="px-3 py-2.5 border border-slate-200 text-center select-none">
                            {item.sys}
                          </td>
                        </tr>
                      );
                    })}

                  {[
                    {
                      code: "BORRADOR",
                      numeric: "10",
                      desc: "BORRADOR DE ORDEN",
                      audit:
                        "Edición libre por el creador. No compromete flujo ni posee firmas.",
                      sys: "Y",
                    },
                    {
                      code: "PENDIENTE_VB",
                      numeric: "20",
                      desc: "PENDIENTE V°B° GASTO",
                      audit:
                        "Mesa de validación de presupuesto. Bloqueado para firmas de emisor.",
                      sys: "Y",
                    },
                    {
                      code: "APROBADA",
                      numeric: "30",
                      desc: "ORDEN T. APROBADA",
                      audit:
                        "Firmada digitalmente por Emisión, Compliance y Control Financiero.",
                      sys: "Y",
                    },
                    {
                      code: "RECEPCIONADA",
                      numeric: "40",
                      desc: "SERVICIO RECEPCIONADO",
                      audit:
                        "Reconciliación completa física y digital. Voucher contable imputado.",
                      sys: "Y",
                    },
                  ].filter(
                    (item) =>
                      !udcSearchTerm ||
                      item.code
                        .toLowerCase()
                        .includes(udcSearchTerm.toLowerCase()) ||
                      item.desc
                        .toLowerCase()
                        .includes(udcSearchTerm.toLowerCase()) ||
                      item.audit
                        .toLowerCase()
                        .includes(udcSearchTerm.toLowerCase()),
                  ).length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-8 text-center text-slate-400 font-bold italic"
                      >
                        No se encontraron códigos de estado para la búsqueda "
                        {udcSearchTerm}"
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer Audit Message ERP style */}
            <div className="bg-[#e1e6f2] px-6 py-2 border-t border-slate-300 flex justify-between items-center text-[8px] text-slate-600 font-sans">
              <p className="font-extrabold uppercase">
                Base de datos: MUTU_PRD_XE_MUTU • Copiloto de Integridad
              </p>
              <p className="italic">
                Visual Assist v9.2.1 • [Doble click para seleccionar]
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ERP Folio Visual Assist modal */}
      {isFolioUDCOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#f0f4f9] rounded-xl w-full max-w-4xl shadow-2xl border-4 border-[#0b3c5d] overflow-hidden flex flex-col h-[75vh] animate-in zoom-in-95 font-mono">
            {/* ERP Classic Blue Header */}
            <div className="bg-[#0b3c5d] px-6 py-4 text-white flex justify-between items-center border-b-2 border-amber-500">
              <div className="flex items-center gap-3">
                <Database size={18} className="text-amber-400" />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tight">
                    P48013 - Visual Assist: Libro Maestro de Órdenes de Trabajo
                    (F4801)
                  </h3>
                  <p className="text-[9px] text-slate-300 uppercase font-bold tracking-wider">
                    AssetFlow Enterprise Work Order Master
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsFolioUDCOpen(false);
                  setSelectedFolioIndex(null);
                }}
                className="text-white/85 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Config metadata fields */}
            <div className="bg-white border-b border-slate-300 p-4 grid grid-cols-3 gap-4 text-[10px] text-slate-800">
              <div className="space-y-1 bg-slate-50 p-2 border border-slate-200 rounded">
                <span className="block text-[8px] text-slate-505 font-extrabold uppercase">
                  TABLA DEL SISTEMA
                </span>
                <span className="font-black text-[#0b3c5d]">
                  F4801 - WORK ORDER MASTER
                </span>
              </div>
              <div className="space-y-1 bg-slate-50 p-2 border border-slate-200 rounded">
                <span className="block text-[8px] text-slate-505 font-extrabold uppercase">
                  SISTEMA INTEGRADO
                </span>
                <span className="font-black text-[#0b3c5d]">
                  48 - CONTROL DE CONTRATISTAS
                </span>
              </div>
              <div className="space-y-1 bg-slate-50 p-2 border border-slate-200 rounded">
                <span className="block text-[8px] text-slate-505 font-extrabold uppercase">
                  CAMPO CONSULTADO
                </span>
                <span className="font-extrabold text-slate-600">
                  VR01 - FOLIO / DOCUMENTO REFERENCIA
                </span>
              </div>
            </div>

            {/* Actions Toolbar */}
            <div className="bg-slate-100 border-b border-slate-300 px-4 py-3 flex justify-between items-center">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const filtered = workOrders.filter(
                      (ot) =>
                        !folioSearchTerm ||
                        String(ot.folio || "")
                          .toLowerCase()
                          .includes(folioSearchTerm.toLowerCase()) ||
                        (ot.supplierName &&
                          String(ot.supplierName)
                            .toLowerCase()
                            .includes(folioSearchTerm.toLowerCase())) ||
                        (ot.specialInstructions &&
                          String(ot.specialInstructions)
                            .toLowerCase()
                            .includes(folioSearchTerm.toLowerCase())),
                    );
                    if (
                      selectedFolioIndex !== null &&
                      filtered[selectedFolioIndex]
                    ) {
                      setColSearchFolio(filtered[selectedFolioIndex].folio);
                      setIsFolioUDCOpen(false);
                      setSelectedFolioIndex(null);
                    } else {
                      alert(
                        "Por favor seleccione un folio de orden de la grilla antes de confirmar.",
                      );
                    }
                  }}
                  className="bg-emerald-750 hover:bg-emerald-800 text-white px-4 py-2 border-b-2 border-emerald-950 text-[10px] font-black uppercase rounded flex items-center gap-1.5 cursor-pointer shadow-sm active:translate-y-px transition-all"
                >
                  <CheckCircle size={12} className="stroke-[3]" /> Seleccionar
                  (Select)
                </button>
                <button
                  onClick={() => {
                    setColSearchFolio("");
                    setIsFolioUDCOpen(false);
                    setSelectedFolioIndex(null);
                  }}
                  className="bg-rose-700 hover:bg-rose-800 text-white px-4 py-2 border-b-2 border-rose-955 text-[10px] font-black uppercase rounded flex items-center gap-1.5 cursor-pointer shadow-sm active:translate-y-px transition-all"
                >
                  <X size={12} /> Limpiar Filtro (Clear)
                </button>
                <button
                  onClick={() => {
                    setIsFolioUDCOpen(false);
                    setSelectedFolioIndex(null);
                  }}
                  className="bg-slate-605 hover:bg-slate-700 text-white px-4 py-2 border-b-2 border-slate-800 text-[10px] font-black uppercase rounded flex items-center gap-1.5 cursor-pointer shadow-sm active:translate-y-px transition-all"
                >
                  Cancelar
                </button>
              </div>

              {/* ERP Search Input */}
              <div className="relative">
                <input
                  type="text"
                  value={folioSearchTerm}
                  onChange={(e) => {
                    setFolioSearchTerm(e.target.value);
                    setSelectedFolioIndex(null);
                  }}
                  placeholder="FILTRO EXPANDIDO..."
                  className="bg-white border-2 border-slate-300 rounded px-3 py-1.5 text-[9px] font-bold text-slate-800 outline-none w-56 focus:border-[#0b3c5d] uppercase"
                />
                <Search
                  size={12}
                  className="absolute right-2.5 top-2.5 text-slate-400"
                />
              </div>
            </div>

            {/* Table Listing */}
            <div className="flex-1 overflow-auto p-4 bg-white custom-audit-scroll">
              <table className="w-full text-left border-collapse border border-slate-300 text-[10px]">
                <thead>
                  <tr className="bg-[#e1e6f2] text-slate-800 border-b border-slate-400">
                    <th className="px-3 py-2 border border-slate-300 font-extrabold uppercase w-32">
                      Nº Folio OT
                    </th>
                    <th className="px-3 py-2 border border-slate-300 font-extrabold uppercase w-56">
                      Proveedor Contratista
                    </th>
                    <th className="px-3 py-2 border border-slate-300 font-extrabold uppercase">
                      Detalle / Justificación
                    </th>
                    <th className="px-3 py-2 border border-slate-300 font-extrabold uppercase text-right w-28">
                      Total CLP
                    </th>
                    <th className="px-3 py-2 border border-slate-300 font-extrabold uppercase text-center w-24">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {workOrders
                    .filter(
                      (ot) =>
                        !folioSearchTerm ||
                        String(ot.folio || "")
                          .toLowerCase()
                          .includes(folioSearchTerm.toLowerCase()) ||
                        (ot.supplierName &&
                          String(ot.supplierName)
                            .toLowerCase()
                            .includes(folioSearchTerm.toLowerCase())) ||
                        (ot.specialInstructions &&
                          String(ot.specialInstructions)
                            .toLowerCase()
                            .includes(folioSearchTerm.toLowerCase())),
                    )
                    .map((item, idx) => {
                      const isSelected = selectedFolioIndex === idx;

                      return (
                        <tr
                          key={item.id}
                          onClick={() => setSelectedFolioIndex(idx)}
                          onDoubleClick={() => {
                            setColSearchFolio(item.folio);
                            setIsFolioUDCOpen(false);
                            setSelectedFolioIndex(null);
                          }}
                          className={`cursor-pointer transition-colors border-b border-slate-200 ${
                            isSelected
                              ? "bg-blue-100 hover:bg-blue-200 font-extrabold text-[#0b3c5d]"
                              : "hover:bg-slate-50/80"
                          }`}
                          title="Doble click para seleccionar"
                        >
                          <td className="px-3 py-2 border border-slate-250 font-mono font-black text-blue-800 select-none">
                            {item.folio}
                          </td>
                          <td className="px-3 py-2 border border-slate-250 font-bold select-none">
                            {item.supplierName}
                          </td>
                          <td
                            className="px-3 py-2 border border-slate-250 select-none truncate max-w-sm"
                            title={item.specialInstructions}
                          >
                            {item.specialInstructions || "S/I"}
                          </td>
                          <td className="px-3 py-2 border border-slate-250 text-right font-mono font-bold select-none">
                            {formatCLP(item.totalAmount)}
                          </td>
                          <td className="px-3 py-2 border border-slate-250 text-center select-none">
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase bg-slate-100 border border-slate-300">
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                  {workOrders.filter(
                    (ot) =>
                      !folioSearchTerm ||
                      String(ot.folio || "")
                        .toLowerCase()
                        .includes(folioSearchTerm.toLowerCase()) ||
                      (ot.supplierName &&
                        String(ot.supplierName)
                          .toLowerCase()
                          .includes(folioSearchTerm.toLowerCase())) ||
                      (ot.specialInstructions &&
                        String(ot.specialInstructions)
                          .toLowerCase()
                          .includes(folioSearchTerm.toLowerCase())),
                  ).length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-8 text-center text-slate-400 font-bold italic"
                      >
                        No se encontraron folios para la búsqueda "
                        {folioSearchTerm}"
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="bg-[#e1e6f2] px-6 py-2 border-t border-slate-300 flex justify-between items-center text-[8px] text-slate-600 font-sans">
              <p className="font-extrabold uppercase">
                Base de datos: MUTU_PRD_XE_MUTU • Maestro F4801
              </p>
              <p className="italic">
                Visual Assist v9.2.1 • [Doble click para confirmar]
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ERP Supplier Address Book Visual Assist modal */}
      {isSupplierUDCOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#f0f4f9] rounded-xl w-full max-w-4xl shadow-2xl border-4 border-[#0b3c5d] overflow-hidden flex flex-col h-[75vh] animate-in zoom-in-95 font-mono">
            {/* ERP Classic Blue Header */}
            <div className="bg-[#0b3c5d] px-6 py-4 text-white flex justify-between items-center border-b-2 border-amber-500">
              <div className="flex items-center gap-3">
                <Database size={18} className="text-amber-400" />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tight">
                    P01012 - Visual Assist: Libro Maestro de Proveedores (F0101
                    Address Book)
                  </h3>
                  <p className="text-[9px] text-slate-300 uppercase font-bold tracking-wider">
                    AssetFlow Enterprise Supplier Master Directory
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsSupplierUDCOpen(false);
                  setSelectedSupplierIndex(null);
                }}
                className="text-white/85 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>

            {/* Key Field Section Header Section */}
            <div className="bg-white border-b border-slate-300 p-4 grid grid-cols-3 gap-4 text-[10px] text-slate-800">
              <div className="space-y-1 bg-slate-50 p-2 border border-slate-200 rounded">
                <span className="block text-[8px] text-slate-505 font-extrabold uppercase">
                  TABLA PRINCIPAL
                </span>
                <span className="font-black text-[#0b3c5d]">
                  F0101 - ADDRESS BOOK MASTER
                </span>
              </div>
              <div className="space-y-1 bg-slate-50 p-2 border border-slate-200 rounded">
                <span className="block text-[8px] text-slate-505 font-extrabold uppercase">
                  SISTEMA INTEGRADO
                </span>
                <span className="font-black text-[#0b3c5d]">
                  04 - CUENTAS POR PAGAR (AP)
                </span>
              </div>
              <div className="space-y-1 bg-slate-50 p-2 border border-slate-200 rounded">
                <span className="block text-[8px] text-slate-505 font-extrabold uppercase">
                  CAMPO RETORNADO
                </span>
                <span className="font-extrabold text-slate-600">
                  ALPH - RÁZON SOCIAL DE COMBATE
                </span>
              </div>
            </div>

            {/* Toolbar Buttons ERP style */}
            <div className="bg-slate-100 border-b border-slate-300 px-4 py-3 flex justify-between items-center">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const filtered = suppliers.filter(
                      (sup) =>
                        !supplierSearchTerm ||
                        sup.name
                          .toLowerCase()
                          .includes(supplierSearchTerm.toLowerCase()) ||
                        sup.taxId
                          .toLowerCase()
                          .includes(supplierSearchTerm.toLowerCase()) ||
                        (sup.category &&
                          sup.category
                            .toLowerCase()
                            .includes(supplierSearchTerm.toLowerCase())),
                    );
                    if (
                      selectedSupplierIndex !== null &&
                      filtered[selectedSupplierIndex]
                    ) {
                      setColSearchProveedor(
                        filtered[selectedSupplierIndex].name,
                      );
                      setIsSupplierUDCOpen(false);
                      setSelectedSupplierIndex(null);
                    } else {
                      alert(
                        "Por favor seleccione un proveedor en la grilla antes de confirmar.",
                      );
                    }
                  }}
                  className="bg-emerald-750 hover:bg-emerald-800 text-white px-4 py-2 border-b-2 border-emerald-950 text-[10px] font-black uppercase rounded flex items-center gap-1.5 cursor-pointer shadow-sm active:translate-y-px transition-all"
                >
                  <CheckCircle size={12} className="stroke-[3]" /> Seleccionar
                  (Select)
                </button>
                <button
                  onClick={() => {
                    setColSearchProveedor("");
                    setIsSupplierUDCOpen(false);
                    setSelectedSupplierIndex(null);
                  }}
                  className="bg-rose-700 hover:bg-rose-800 text-white px-4 py-2 border-b-2 border-rose-955 text-[10px] font-black uppercase rounded flex items-center gap-1.5 cursor-pointer shadow-sm active:translate-y-px transition-all"
                >
                  <X size={12} /> Limpiar Filtro (Clear)
                </button>
                <button
                  onClick={() => {
                    setIsSupplierUDCOpen(false);
                    setSelectedSupplierIndex(null);
                  }}
                  className="bg-slate-605 hover:bg-slate-700 text-white px-4 py-2 border-b-2 border-slate-800 text-[10px] font-black uppercase rounded flex items-center gap-1.5 cursor-pointer shadow-sm active:translate-y-px transition-all"
                >
                  Cancelar
                </button>
              </div>

              {/* Find/Filter */}
              <div className="relative">
                <input
                  type="text"
                  value={supplierSearchTerm}
                  onChange={(e) => {
                    setSupplierSearchTerm(e.target.value);
                    setSelectedSupplierIndex(null);
                  }}
                  placeholder="FILTRAR POR RUT, NOMBRE..."
                  className="bg-white border-2 border-slate-300 rounded px-3 py-1.5 text-[9px] font-bold text-slate-800 outline-none w-56 focus:border-[#0b3c5d] uppercase"
                />
                <Search
                  size={12}
                  className="absolute right-2.5 top-2.5 text-slate-400"
                />
              </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-auto p-4 bg-white custom-audit-scroll">
              <table className="w-full text-left border-collapse border border-slate-300 text-[10px]">
                <thead>
                  <tr className="bg-[#e1e6f2] text-slate-800 border-b border-slate-400">
                    <th className="px-3 py-2 border border-slate-300 font-extrabold uppercase w-32">
                      RUT Proveedor
                    </th>
                    <th className="px-3 py-2 border border-slate-300 font-extrabold uppercase">
                      Razón Social / Comercial
                    </th>
                    <th className="px-3 py-2 border border-slate-300 font-extrabold uppercase w-40">
                      Giro / Categoría
                    </th>
                    <th className="px-3 py-2 border border-slate-300 font-extrabold uppercase w-48">
                      Contacto Directo
                    </th>
                    <th className="px-3 py-2 border border-slate-300 font-extrabold uppercase text-center w-24">
                      Riesgo UAF
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers
                    .filter(
                      (sup) =>
                        !supplierSearchTerm ||
                        sup.name
                          .toLowerCase()
                          .includes(supplierSearchTerm.toLowerCase()) ||
                        sup.taxId
                          .toLowerCase()
                          .includes(supplierSearchTerm.toLowerCase()) ||
                        (sup.category &&
                          sup.category
                            .toLowerCase()
                            .includes(supplierSearchTerm.toLowerCase())),
                    )
                    .map((item, idx) => {
                      const isSelected = selectedSupplierIndex === idx;

                      return (
                        <tr
                          key={item.id}
                          onClick={() => setSelectedSupplierIndex(idx)}
                          onDoubleClick={() => {
                            setColSearchProveedor(item.name);
                            setIsSupplierUDCOpen(false);
                            setSelectedSupplierIndex(null);
                          }}
                          className={`cursor-pointer transition-colors border-b border-slate-200 ${
                            isSelected
                              ? "bg-blue-100 hover:bg-blue-200 font-extrabold text-[#0b3c5d]"
                              : "hover:bg-slate-50/80"
                          }`}
                          title="Doble click para seleccionar directamente"
                        >
                          <td className="px-3 py-2.5 border border-slate-200 font-mono font-bold select-none">
                            {item.taxId}
                          </td>
                          <td className="px-3 py-2.5 border border-slate-200 font-black text-slate-800 select-none uppercase">
                            {item.name}
                          </td>
                          <td className="px-3 py-2.5 border border-slate-200 select-none text-slate-600 text-[9px] uppercase">
                            {item.category}
                          </td>
                          <td className="px-3 py-2.5 border border-slate-200 text-slate-505 text-[9px] select-none truncate max-w-[150px]">
                            {item.contactName || item.email || "S/I"}
                          </td>
                          <td className="px-3 py-2.5 border border-slate-200 text-center select-none font-bold">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[8px] border font-black uppercase text-center block ${
                                item.dueDiligenceRisk === "ALTO"
                                  ? "bg-red-50 border-red-200 text-red-700"
                                  : item.dueDiligenceRisk === "MEDIO"
                                    ? "bg-amber-50 border-amber-200 text-amber-700"
                                    : "bg-green-50 border-green-200 text-green-700"
                              }`}
                            >
                              {item.dueDiligenceRisk || "BAJO"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                  {suppliers.filter(
                    (sup) =>
                      !supplierSearchTerm ||
                      sup.name
                        .toLowerCase()
                        .includes(supplierSearchTerm.toLowerCase()) ||
                      sup.taxId
                        .toLowerCase()
                        .includes(supplierSearchTerm.toLowerCase()) ||
                      (sup.category &&
                        sup.category
                          .toLowerCase()
                          .includes(supplierSearchTerm.toLowerCase())),
                  ).length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-8 text-center text-slate-400 font-bold italic"
                      >
                        No se encontraron proveedores para la búsqueda "
                        {supplierSearchTerm}"
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="bg-[#e1e6f2] px-6 py-2 border-t border-slate-300 flex justify-between items-center text-[8px] text-slate-600 font-sans">
              <p className="font-extrabold uppercase">
                Base de datos: MUTU_PRD_XE_MUTU • Maestro F0101 Address Book
              </p>
              <p className="italic">
                Visual Assist v9.2.1 • [Doble click para seleccionar]
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ERP Location Visual Assist modal */}
      {isLocationUDCOpen && (
        <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#f0f4f9] rounded-xl w-full max-w-4xl shadow-2xl border-4 border-[#0b3c5d] overflow-hidden flex flex-col h-[75vh] animate-in zoom-in-95 font-mono">
            {/* ERP Classic Blue Header */}
            <div className="bg-[#0b3c5d] px-6 py-4 text-white flex justify-between items-center border-b-2 border-amber-500">
              <div className="flex items-center gap-3">
                <Database size={18} className="text-amber-400" />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-tight">
                    P1201 - Visual Assist: Libro Maestro de Propiedades F1201
                  </h3>
                  <p className="text-[9px] text-slate-300 uppercase font-bold tracking-wider">
                    AssetFlow Enterprise Real Estate Asset Master
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsLocationUDCOpen(false);
                  setSelectedLocationIndex(null);
                }}
                className="text-white/85 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-white border-b border-slate-300 p-4 grid grid-cols-3 gap-4 text-[10px] text-slate-800">
              <div className="space-y-1 bg-slate-50 p-2 border border-slate-200 rounded">
                <span className="block text-[8px] text-slate-505 font-extrabold uppercase">
                  TABLA PATRIMONIAL
                </span>
                <span className="font-black text-[#0b3c5d]">
                  F1201 / F1501 - REAL ESTATE MASTER
                </span>
              </div>
              <div className="space-y-1 bg-slate-50 p-2 border border-slate-200 rounded">
                <span className="block text-[8px] text-slate-505 font-extrabold uppercase">
                  SISTEMA INTEGRADO
                </span>
                <span className="font-black text-[#0b3c5d]">
                  15 - REAL ESTATE MANAGEMENT (RE)
                </span>
              </div>
              <div className="space-y-1 bg-slate-50 p-2 border border-slate-200 rounded">
                <span className="block text-[8px] text-slate-50.5 font-extrabold uppercase">
                  CAMPO CONSULTADO
                </span>
                <span className="font-extrabold text-slate-600">
                  LOC - PROPERTY / BUILDING ID
                </span>
              </div>
            </div>

            {/* Toolbar Buttons ERP style */}
            <div className="bg-slate-100 border-b border-slate-300 px-4 py-3 flex justify-between items-center">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const filtered = properties.filter((prop) => {
                      const pName = prop.name || prop.building || "";
                      const pAddr = prop.address || "";
                      const pComm = prop.commune || "";
                      return (
                        !locationSearchTerm ||
                        pName
                          .toLowerCase()
                          .includes(locationSearchTerm.toLowerCase()) ||
                        pAddr
                          .toLowerCase()
                          .includes(locationSearchTerm.toLowerCase()) ||
                        pComm
                          .toLowerCase()
                          .includes(locationSearchTerm.toLowerCase())
                      );
                    });
                    if (
                      selectedLocationIndex !== null &&
                      filtered[selectedLocationIndex]
                    ) {
                      const selProp = filtered[selectedLocationIndex];
                      const propLabel = `${selProp.name || selProp.building} (${selProp.address})`;
                      setColSearchUbicacion(propLabel);
                      setIsLocationUDCOpen(false);
                      setSelectedLocationIndex(null);
                    } else {
                      alert(
                        "Por favor seleccione un inmueble de la grilla patrimonial antes de confirmar.",
                      );
                    }
                  }}
                  className="bg-emerald-750 hover:bg-emerald-800 text-white px-4 py-2 border-b-2 border-emerald-950 text-[10px] font-black uppercase rounded flex items-center gap-1.5 cursor-pointer shadow-sm active:translate-y-px transition-all"
                >
                  <CheckCircle size={12} className="stroke-[3]" /> Seleccionar
                  (Select)
                </button>
                <button
                  onClick={() => {
                    setColSearchUbicacion("");
                    setIsLocationUDCOpen(false);
                    setSelectedLocationIndex(null);
                  }}
                  className="bg-rose-700 hover:bg-rose-800 text-white px-4 py-2 border-b-2 border-rose-955 text-[10px] font-black uppercase rounded flex items-center gap-1.5 cursor-pointer shadow-sm active:translate-y-px transition-all"
                >
                  <X size={12} /> Limpiar Filtro (Clear)
                </button>
                <button
                  onClick={() => {
                    setIsLocationUDCOpen(false);
                    setSelectedLocationIndex(null);
                  }}
                  className="bg-slate-605 hover:bg-slate-700 text-white px-4 py-2 border-b-2 border-slate-800 text-[10px] font-black uppercase rounded flex items-center gap-1.5 cursor-pointer shadow-sm active:translate-y-px transition-all"
                >
                  Cancelar
                </button>
              </div>

              {/* Find/Filter inside ERP modal */}
              <div className="relative">
                <input
                  type="text"
                  value={locationSearchTerm}
                  onChange={(e) => {
                    setLocationSearchTerm(e.target.value);
                    setSelectedLocationIndex(null);
                  }}
                  placeholder="FILTRAR POR EDIFICIO, COMUNA..."
                  className="bg-white border-2 border-slate-300 rounded px-3 py-1.5 text-[9px] font-bold text-slate-800 outline-none w-56 focus:border-[#0b3c5d] uppercase"
                />
                <Search
                  size={12}
                  className="absolute right-2.5 top-2.5 text-slate-400"
                />
              </div>
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-auto p-4 bg-white custom-audit-scroll">
              <table className="w-full text-left border-collapse border border-slate-300 text-[10px]">
                <thead>
                  <tr className="bg-[#e1e6f2] text-slate-800 border-b border-slate-400">
                    <th className="px-3 py-2 border border-slate-300 font-extrabold uppercase w-28">
                      Código Activo
                    </th>
                    <th className="px-3 py-2 border border-slate-300 font-extrabold uppercase">
                      Edificio / Nombre Corto
                    </th>
                    <th className="px-3 py-2 border border-slate-300 font-extrabold uppercase w-20 text-center">
                      Piso
                    </th>
                    <th className="px-3 py-2 border border-slate-300 font-extrabold uppercase">
                      Dirección Física Completa
                    </th>
                    <th className="px-3 py-2 border border-slate-300 font-extrabold uppercase w-32">
                      Comuna / Ciudad
                    </th>
                    <th className="px-3 py-2 border border-slate-300 font-extrabold uppercase w-28 text-center">
                      Tipo Activo
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {properties
                    .filter((prop) => {
                      const pName = prop.name || prop.building || "";
                      const pAddr = prop.address || "";
                      const pComm = prop.commune || "";
                      return (
                        !locationSearchTerm ||
                        pName
                          .toLowerCase()
                          .includes(locationSearchTerm.toLowerCase()) ||
                        pAddr
                          .toLowerCase()
                          .includes(locationSearchTerm.toLowerCase()) ||
                        pComm
                          .toLowerCase()
                          .includes(locationSearchTerm.toLowerCase())
                      );
                    })
                    .map((item, idx) => {
                      const isSelected = selectedLocationIndex === idx;

                      return (
                        <tr
                          key={item.id}
                          onClick={() => setSelectedLocationIndex(idx)}
                          onDoubleClick={() => {
                            const propLabel = `${item.name || item.building} (${item.address})`;
                            setColSearchUbicacion(propLabel);
                            setIsLocationUDCOpen(false);
                            setSelectedLocationIndex(null);
                          }}
                          className={`cursor-pointer transition-colors border-b border-slate-200 ${
                            isSelected
                              ? "bg-blue-100 hover:bg-blue-200 font-extrabold text-[#0b3c5d]"
                              : "hover:bg-slate-50/80"
                          }`}
                          title="Doble click para seleccionar directamente"
                        >
                          <td className="px-3 py-2.5 border border-slate-200 font-mono font-bold select-none text-blue-800">
                            {item.code || item.id.substring(0, 8).toUpperCase()}
                          </td>
                          <td className="px-3 py-2.5 border border-slate-200 font-black text-slate-800 select-none uppercase">
                            {item.name || item.building}
                          </td>
                          <td className="px-3 py-2.5 border border-slate-200 text-center font-bold select-none">
                            {item.floor || "N/A"}
                          </td>
                          <td className="px-3 py-2.5 border border-slate-200 select-none text-slate-505">
                            {item.address}
                          </td>
                          <td className="px-3 py-2.5 border border-slate-200 select-none uppercase font-bold text-slate-600 text-[9px]">
                            {item.commune}
                          </td>
                          <td className="px-3 py-2.5 border border-slate-200 text-center select-none font-bold">
                            <span className="px-1.5 py-0.5 rounded text-[8px] bg-indigo-50 border border-indigo-200 text-indigo-700 block uppercase font-extrabold">
                              {item.type}
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                  {properties.filter((prop) => {
                    const pName = prop.name || prop.building || "";
                    const pAddr = prop.address || "";
                    const pComm = prop.commune || "";
                    return (
                      !locationSearchTerm ||
                      pName
                        .toLowerCase()
                        .includes(locationSearchTerm.toLowerCase()) ||
                      pAddr
                        .toLowerCase()
                        .includes(locationSearchTerm.toLowerCase()) ||
                      pComm
                        .toLowerCase()
                        .includes(locationSearchTerm.toLowerCase())
                    );
                  }).length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-8 text-center text-slate-400 font-bold italic"
                      >
                        No se encontraron propiedades para la búsqueda "
                        {locationSearchTerm}"
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer Audit Message ERP style */}
            <div className="bg-[#e1e6f2] px-6 py-2 border-t border-slate-300 flex justify-between items-center text-[8px] text-slate-600 font-sans">
              <p className="font-extrabold uppercase">
                Base de datos: MUTU_PRD_XE_MUTU • Maestro F1201 Fixed Assets
              </p>
              <p className="italic">
                Visual Assist v9.2.1 • [Doble click para seleccionar]
              </p>
            </div>
          </div>
        </div>
      )}

      {inspectTarget && (
        <F980011DModal
          isOpen={!!inspectTarget}
          onClose={() => setInspectTarget(null)}
          registryId={inspectTarget.id || ''}
          entityType="WORK_ORDER"
          originalData={inspectTarget}
          currentUser={currentUser}
        />
      )}

      {/* ERP P4310 ORDER ENTRY WORKBENCH */}
      {isP4310ModalOpen && (
        <JDEP4310OrderEntryModal
          isOpen={isP4310ModalOpen}
          onClose={() => setIsP4310ModalOpen(false)}
          mode="WORK_ORDER"
          suppliers={suppliers}
          properties={properties}
          existingOrders={workOrders}
          currentUser={currentUser}
          onSaveWorkOrder={(newWo) => {
            onSave(newWo);
            setIsP4310ModalOpen(false);
          }}
        />
      )}

      {/* MATRIZ DE INTERCONEXIÓN Y REGLAS DE ACTIVIDAD ERP (F40203) */}
      <JDEInterconnectionMapModal
        isOpen={showInterconnectionModal}
        onClose={() => setShowInterconnectionModal(false)}
        workOrders={workOrders}
        currentUser={currentUser}
        onEmitOrder={(ot) => {
          handlePrintAndEmitExistingOT(ot, false);
          setShowInterconnectionModal(false);
        }}
        onSaveOrder={onSave}
      />

      {/* ERP MESA DE CONTROL DE APROBACIÓN POR LÍNEAS (P43081) */}
      {lineApprovalModalOrder && (
        <JDELineApprovalModal
          isOpen={!!lineApprovalModalOrder}
          onClose={() => setLineApprovalModalOrder(null)}
          order={lineApprovalModalOrder}
          currentUser={currentUser}
          onSaveOrder={(updated) => {
            onSave(updated);
            setLineApprovalModalOrder(updated);
            if (previewOrder && previewOrder.id === updated.id) {
              setPreviewOrder(updated);
            }
          }}
          isManager={userAccount.role === "JEFE" || userAccount.role === "ADMINISTRADOR"}
        />
      )}
    </div>
  );
};

export default WorkOrderCenter;
