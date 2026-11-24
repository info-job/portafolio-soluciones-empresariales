import React, { useState, useMemo, useEffect } from 'react';
import {
  WmsItemMaster,
  WmsLocation,
  WmsStockBalance,
  WmsWarehouseTask,
  WmsMovementLedger,
  WmsShipmentOrder,
  WmsWorkspaceState,
  WmsUomType,
  WmsAbcClass,
  WmsZoneType,
  WmsTaskType,
  WmsShipmentLine
} from '../types';
import {
  WMS_CATEGORY_OPTIONS,
  WMS_ZONE_LABELS,
  WMS_DOC_TYPE_LABELS,
  WMS_TASK_TYPE_LABELS,
  createWmsSyncHash,
  suggestPutawayLocation
} from '../lib/wmsService';
import { formatCLP } from '../lib/chileanUtils';
import { useNotification } from './NotificationProvider';
import {
  Package,
  Truck,
  Warehouse,
  Boxes,
  ClipboardCheck,
  ArrowRightLeft,
  Plus,
  Search,
  Download,
  Printer,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Layers,
  MapPin,
  BarChart3,
  RefreshCw,
  X,
  Lock,
  Unlock,
  Play,
  SlidersHorizontal,
  FileSpreadsheet,
  ArrowDownToLine,
  ArrowUpFromLine,
  Eye,
  Trash2
} from 'lucide-react';

export type WmsTabId =
  | 'P4600_CONTROL'
  | 'P4101_INVENTORY'
  | 'P4611_TASKS'
  | 'P4114_CARDEX'
  | 'P4915_DISPATCH'
  | 'P4100_WAREHOUSES';

interface LogisticsWmsModuleProps {
  workspace: WmsWorkspaceState;
  onUpdateWorkspace: (next: WmsWorkspaceState) => void;
  currentUser: string;
  onAuditLog?: (action: string, entityId: string, details: string) => void;
}

const DEFAULT_TODAY = () => new Date().toISOString().split('T')[0];

export const LogisticsWmsModule: React.FC<LogisticsWmsModuleProps> = ({
  workspace,
  onUpdateWorkspace,
  currentUser,
  onAuditLog
}) => {
  const { notify } = useNotification();
  const [activeTab, setActiveTab] = useState<WmsTabId>('P4600_CONTROL');

  // Filter / QBE states
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState<string>('ALL');
  const [selectedLocationForInspect, setSelectedLocationForInspect] = useState<WmsLocation | null>(null);
  const [inventorySubView, setInventorySubView] = useState<'BALANCES' | 'CATALOG'>('BALANCES');

  // QBE columns for Inventory (P4101 / F41021)
  const [qbeSku, setQbeSku] = useState('');
  const [qbeDesc, setQbeDesc] = useState('');
  const [qbeLoc, setQbeLoc] = useState('');
  const [qbeLot, setQbeLot] = useState('');
  const [qbeAbc, setQbeAbc] = useState('ALL');
  const [qbeStatus, setQbeStatus] = useState('ALL');

  // QBE for Tasks (P4611)
  const [qbeTaskNum, setQbeTaskNum] = useState('');
  const [qbeTaskType, setQbeTaskType] = useState('ALL');
  const [qbeTaskStatus, setQbeTaskStatus] = useState('ALL');
  const [qbeTaskWave, setQbeTaskWave] = useState('');

  // QBE for Cardex (F4111)
  const [qbeKdxDocType, setQbeKdxDocType] = useState('ALL');
  const [qbeKdxSku, setQbeKdxSku] = useState('');
  const [qbeKdxRef, setQbeKdxRef] = useState('');

  // QBE for Shipments (P4915)
  const [qbeShipNum, setQbeShipNum] = useState('');
  const [qbeShipStatus, setQbeShipStatus] = useState('ALL');

  // Modals
  const [isNewItemModalOpen, setIsNewItemModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [confirmingTask, setConfirmingTask] = useState<WmsWarehouseTask | null>(null);
  const [confirmTaskQtyInput, setConfirmTaskQtyInput] = useState<number>(0);
  const [isNewShipmentModalOpen, setIsNewShipmentModalOpen] = useState(false);
  const [isNewLocationModalOpen, setIsNewLocationModalOpen] = useState(false);
  const [previewShipment, setPreviewShipment] = useState<WmsShipmentOrder | null>(null);

  // Forms state: New Item F4101
  const [itemForm, setItemForm] = useState({
    sku: '',
    description: '',
    category: WMS_CATEGORY_OPTIONS[0],
    uom: 'UN' as WmsUomType,
    abcClass: 'A' as WmsAbcClass,
    minStock: 20,
    reorderPoint: 40,
    unitCost: 15000,
    weightKg: 1.5,
    volumeM3: 0.05,
    lotControl: true,
    defaultWarehouse: 'CD-SCL-01',
    preferredPutawayZone: 'PUTAWAY_STORAGE' as WmsZoneType,
    barcode: ''
  });

  // Forms state: Inbound Receipt ASN / OV
  const [receiptForm, setReceiptForm] = useState({
    itemId: '',
    warehouseCode: 'CD-SCL-01',
    qty: 20,
    lotNumber: '',
    lpn: '',
    referenceDoc: '',
    createPutawayTask: true,
    targetLocationCode: ''
  });

  // Forms state: Inventory Adjustment IA
  const [adjustForm, setAdjustForm] = useState({
    balanceId: '',
    qtyDelta: 0,
    reasonCode: 'INVENTARIO_INICIAL'
  });

  // Forms state: Manual WMS Task (Transfer / Cycle Count / Replenishment)
  const [taskForm, setTaskForm] = useState({
    taskType: 'TRANSFER' as WmsTaskType,
    priority: '2-ALTA' as '1-CRÍTICA' | '2-ALTA' | '3-NORMAL',
    balanceId: '',
    qtyRequested: 10,
    toLocation: '',
    assignedOperator: 'OPERARIO BODEGA 01',
    notes: ''
  });

  // Forms state: New Shipment F4915
  const [shipmentForm, setShipmentForm] = useState({
    customerOrSupplier: '',
    destinationAddress: '',
    city: 'Santiago',
    carrierName: 'TRANSPORTES CORDILLERA LOGISTICS',
    vehiclePlate: '',
    driverName: '',
    driverRut: '',
    warehouseCode: 'CD-SCL-01',
    scheduledDate: DEFAULT_TODAY(),
    notes: '',
    lines: [] as WmsShipmentLine[]
  });
  const [draftLineBalanceId, setDraftLineBalanceId] = useState('');
  const [draftLineQty, setDraftLineQty] = useState<number>(1);

  // Forms state: New Warehouse Location F4100
  const [locationForm, setLocationForm] = useState({
    warehouseCode: 'CD-SCL-01',
    warehouseName: 'CD Santiago Central (Pudahuel)',
    locationCode: '',
    aisle: 'A03',
    rack: 'R01',
    level: 'N1',
    zoneType: 'PUTAWAY_STORAGE' as WmsZoneType,
    maxWeightKg: 4000,
    maxPallets: 4,
    temperatureControl: 'AMBIENTE' as 'AMBIENTE' | 'REFRIGERADO' | 'CONTROLADO'
  });

  // Listen to global JDEFormContainer toolbar Add/Find events
  useEffect(() => {
    const onJdeAdd = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.module !== 'LOGISTICA_WMS') return;
      if (activeTab === 'P4101_INVENTORY') setIsNewItemModalOpen(true);
      else if (activeTab === 'P4611_TASKS') setIsNewTaskModalOpen(true);
      else if (activeTab === 'P4114_CARDEX') setIsReceiptModalOpen(true);
      else if (activeTab === 'P4915_DISPATCH') setIsNewShipmentModalOpen(true);
      else if (activeTab === 'P4100_WAREHOUSES') setIsNewLocationModalOpen(true);
      else setIsReceiptModalOpen(true);
    };
    window.addEventListener('jde:add', onJdeAdd);
    return () => window.removeEventListener('jde:add', onJdeAdd);
  }, [activeTab]);

  // Derived warehouse options
  const warehouses = useMemo(() => {
    const map = new Map<string, string>();
    workspace.locations.forEach(l => map.set(l.warehouseCode, l.warehouseName));
    return Array.from(map.entries()).map(([code, name]) => ({ code, name }));
  }, [workspace.locations]);

  // Item stock aggregation per SKU
  const stockByItemMap = useMemo(() => {
    const map = new Map<string, { onHand: number; committed: number; available: number }>();
    workspace.balances.forEach(b => {
      if (selectedWarehouseFilter !== 'ALL' && b.warehouseCode !== selectedWarehouseFilter) return;
      const prev = map.get(b.itemId) || { onHand: 0, committed: 0, available: 0 };
      const avail = Math.max(0, b.qtyOnHand - b.qtyCommitted);
      map.set(b.itemId, {
        onHand: prev.onHand + b.qtyOnHand,
        committed: prev.committed + b.qtyCommitted,
        available: prev.available + avail
      });
    });
    return map;
  }, [workspace.balances, selectedWarehouseFilter]);

  // Global KPIs
  const kpis = useMemo(() => {
    const itemCostMap = new Map<string, number>();
    workspace.items.forEach(i => itemCostMap.set(i.id, i.unitCost || 0));

    let totalUnits = 0;
    let totalCommitted = 0;
    let totalValueCLP = 0;
    workspace.balances.forEach(b => {
      if (selectedWarehouseFilter !== 'ALL' && b.warehouseCode !== selectedWarehouseFilter) return;
      totalUnits += b.qtyOnHand;
      totalCommitted += b.qtyCommitted;
      totalValueCLP += b.qtyOnHand * (itemCostMap.get(b.itemId) || 0);
    });

    const pendingTasks = workspace.tasks.filter(
      t => t.status === 'SUGGESTED' || t.status === 'IN_PROGRESS'
    ).length;

    const activeShipments = workspace.shipments.filter(
      s => s.status !== 'ENTREGADO' && s.status !== 'INCIDENCIA'
    ).length;

    const deliveredShipments = workspace.shipments.filter(s => s.status === 'ENTREGADO').length;
    const totalShipments = workspace.shipments.length || 1;
    const otifRate = Math.round((deliveredShipments / totalShipments) * 100);

    const lowStockItems = workspace.items.filter(item => {
      const agg = stockByItemMap.get(item.id) || { onHand: 0, committed: 0, available: 0 };
      return agg.available <= item.reorderPoint;
    });

    const activeBins = workspace.locations.filter(
      l => selectedWarehouseFilter === 'ALL' || l.warehouseCode === selectedWarehouseFilter
    );
    const occupiedBinsCount = activeBins.filter(loc =>
      workspace.balances.some(b => b.locationCode === loc.locationCode && b.qtyOnHand > 0)
    ).length;
    const occupancyRate = activeBins.length > 0 ? Math.round((occupiedBinsCount / activeBins.length) * 100) : 0;

    return {
      totalUnits,
      totalCommitted,
      totalAvailable: Math.max(0, totalUnits - totalCommitted),
      totalValueCLP,
      pendingTasks,
      activeShipments,
      otifRate,
      lowStockItems,
      occupancyRate,
      occupiedBinsCount,
      totalBinsCount: activeBins.length
    };
  }, [workspace, selectedWarehouseFilter, stockByItemMap]);

  // Filtered Balances (F41021)
  const filteredBalances = useMemo(() => {
    const itemMap = new Map<string, WmsItemMaster>(workspace.items.map(i => [i.id, i]));
    return workspace.balances.filter(b => {
      if (selectedWarehouseFilter !== 'ALL' && b.warehouseCode !== selectedWarehouseFilter) return false;
      const item = itemMap.get(b.itemId);
      if (qbeSku && !b.sku.toLowerCase().includes(qbeSku.toLowerCase())) return false;
      if (qbeDesc && !b.itemDescription.toLowerCase().includes(qbeDesc.toLowerCase())) return false;
      if (qbeLoc && !b.locationCode.toLowerCase().includes(qbeLoc.toLowerCase())) return false;
      if (qbeLot && !(b.lotNumber.toLowerCase().includes(qbeLot.toLowerCase()) || b.lpn.toLowerCase().includes(qbeLot.toLowerCase()))) return false;
      if (qbeAbc !== 'ALL' && item?.abcClass !== qbeAbc) return false;
      if (qbeStatus !== 'ALL' && b.lotStatus !== qbeStatus) return false;
      return true;
    });
  }, [workspace.balances, workspace.items, selectedWarehouseFilter, qbeSku, qbeDesc, qbeLoc, qbeLot, qbeAbc, qbeStatus]);

  // Filtered Catalog Items (F4101)
  const filteredItems = useMemo(() => {
    return workspace.items.filter(item => {
      if (selectedWarehouseFilter !== 'ALL' && item.defaultWarehouse !== selectedWarehouseFilter) return false;
      if (qbeSku && !item.sku.toLowerCase().includes(qbeSku.toLowerCase())) return false;
      if (qbeDesc && !item.description.toLowerCase().includes(qbeDesc.toLowerCase())) return false;
      if (qbeAbc !== 'ALL' && item.abcClass !== qbeAbc) return false;
      return true;
    });
  }, [workspace.items, selectedWarehouseFilter, qbeSku, qbeDesc, qbeAbc]);

  // Filtered Tasks (F4611)
  const filteredTasks = useMemo(() => {
    return workspace.tasks.filter(t => {
      if (selectedWarehouseFilter !== 'ALL' && t.fromWarehouse !== selectedWarehouseFilter && t.toWarehouse !== selectedWarehouseFilter) return false;
      if (qbeTaskNum && !t.taskNumber.toLowerCase().includes(qbeTaskNum.toLowerCase()) && !t.sku.toLowerCase().includes(qbeTaskNum.toLowerCase())) return false;
      if (qbeTaskType !== 'ALL' && t.taskType !== qbeTaskType) return false;
      if (qbeTaskStatus !== 'ALL' && t.status !== qbeTaskStatus) return false;
      if (qbeTaskWave && !(t.waveNumber || '').toLowerCase().includes(qbeTaskWave.toLowerCase())) return false;
      return true;
    });
  }, [workspace.tasks, selectedWarehouseFilter, qbeTaskNum, qbeTaskType, qbeTaskStatus, qbeTaskWave]);

  // Filtered Cardex (F4111)
  const filteredMovements = useMemo(() => {
    return workspace.movements.filter(m => {
      if (selectedWarehouseFilter !== 'ALL' && m.warehouseCode !== selectedWarehouseFilter) return false;
      if (qbeKdxDocType !== 'ALL' && m.docType !== qbeKdxDocType) return false;
      if (qbeKdxSku && !m.sku.toLowerCase().includes(qbeKdxSku.toLowerCase()) && !m.itemDescription.toLowerCase().includes(qbeKdxSku.toLowerCase())) return false;
      if (qbeKdxRef && !m.referenceDoc.toLowerCase().includes(qbeKdxRef.toLowerCase()) && !m.movementNumber.toLowerCase().includes(qbeKdxRef.toLowerCase())) return false;
      return true;
    });
  }, [workspace.movements, selectedWarehouseFilter, qbeKdxDocType, qbeKdxSku, qbeKdxRef]);

  // Filtered Shipments (F4915)
  const filteredShipments = useMemo(() => {
    return workspace.shipments.filter(s => {
      if (selectedWarehouseFilter !== 'ALL' && s.warehouseCode !== selectedWarehouseFilter) return false;
      if (qbeShipNum && !s.shipmentNumber.toLowerCase().includes(qbeShipNum.toLowerCase()) && !s.customerOrSupplier.toLowerCase().includes(qbeShipNum.toLowerCase())) return false;
      if (qbeShipStatus !== 'ALL' && s.status !== qbeShipStatus) return false;
      return true;
    });
  }, [workspace.shipments, selectedWarehouseFilter, qbeShipNum, qbeShipStatus]);

  // Filtered Locations (F4100)
  const filteredLocations = useMemo(() => {
    return workspace.locations.filter(
      l => selectedWarehouseFilter === 'ALL' || l.warehouseCode === selectedWarehouseFilter
    );
  }, [workspace.locations, selectedWarehouseFilter]);

  const persistNextWorkspace = (next: WmsWorkspaceState, auditSummary?: { action: string; id: string; detail: string }) => {
    onUpdateWorkspace({ ...next, updatedAt: Date.now() });
    if (auditSummary && onAuditLog) {
      onAuditLog(auditSummary.action, auditSummary.id, auditSummary.detail);
    }
  };

  // =========================================================================
  // 1. CREATE NEW ITEM (F4101)
  // =========================================================================
  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanSku = itemForm.sku.trim().toUpperCase();
    if (!cleanSku || !itemForm.description.trim()) {
      notify({ title: 'Campos Obligatorios', message: 'Debe ingresar Código SKU y Descripción del Artículo.', type: 'warning' });
      return;
    }
    if (workspace.items.some(i => i.sku.toUpperCase() === cleanSku)) {
      notify({ title: 'SKU Duplicado (F4101)', message: `El código SKU ${cleanSku} ya existe en el Maestro de Artículos.`, type: 'error' });
      return;
    }
    const today = DEFAULT_TODAY();
    const newItem: WmsItemMaster = {
      id: `wms-item-${Date.now()}`,
      sku: cleanSku,
      description: itemForm.description.trim(),
      category: itemForm.category,
      uom: itemForm.uom,
      abcClass: itemForm.abcClass,
      stockStatus: 'AVAILABLE',
      minStock: Number(itemForm.minStock) || 0,
      reorderPoint: Number(itemForm.reorderPoint) || 0,
      unitCost: Number(itemForm.unitCost) || 0,
      weightKg: Number(itemForm.weightKg) || 1,
      volumeM3: Number(itemForm.volumeM3) || 0.01,
      lotControl: itemForm.lotControl,
      defaultWarehouse: itemForm.defaultWarehouse,
      preferredPutawayZone: itemForm.preferredPutawayZone,
      barcode: itemForm.barcode.trim() || `780${Math.floor(1000000000 + Math.random() * 8999999999)}`,
      userCreator: currentUser,
      createdAt: today,
      updatedAt: today
    };
    persistNextWorkspace(
      { ...workspace, items: [newItem, ...workspace.items] },
      { action: 'CREATE', id: newItem.id, detail: `WMS F4101: Alta de Artículo ${newItem.sku} (${newItem.description})` }
    );
    notify({ title: 'Artículo Creado (P4101)', message: `${newItem.sku} incorporado al Maestro Logístico.`, type: 'success' });
    setIsNewItemModalOpen(false);
    setItemForm({
      sku: '', description: '', category: WMS_CATEGORY_OPTIONS[0], uom: 'UN', abcClass: 'A',
      minStock: 20, reorderPoint: 40, unitCost: 15000, weightKg: 1.5, volumeM3: 0.05,
      lotControl: true, defaultWarehouse: 'CD-SCL-01', preferredPutawayZone: 'PUTAWAY_STORAGE', barcode: ''
    });
  };

  // =========================================================================
  // 2. INBOUND RECEIPT (ASN / OV) -> F41021 + F4111 + OPTIONAL PUTAWAY F4611
  // =========================================================================
  const handleInboundReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    const item = workspace.items.find(i => i.id === receiptForm.itemId);
    if (!item) {
      notify({ title: 'Artículo Requerido', message: 'Seleccione el artículo SKU a recepcionar.', type: 'warning' });
      return;
    }
    const qty = Number(receiptForm.qty);
    if (!qty || qty <= 0) {
      notify({ title: 'Cantidad Inválida', message: 'La cantidad recepcionada debe ser mayor a 0.', type: 'warning' });
      return;
    }

    const today = DEFAULT_TODAY();
    const wh = receiptForm.warehouseCode || item.defaultWarehouse;
    const dockLoc =
      workspace.locations.find(l => l.warehouseCode === wh && l.zoneType === 'RECEIVING')?.locationCode ||
      workspace.locations.find(l => l.warehouseCode === wh)?.locationCode ||
      'REC-DOCK1';

    const lot = receiptForm.lotNumber.trim().toUpperCase() || `LOT-${today.replace(/-/g, '').slice(2)}-${Math.floor(10 + Math.random() * 89)}`;
    const lpn = receiptForm.lpn.trim().toUpperCase() || `LPN-${wh.split('-')[1] || 'WMS'}-${String(Math.floor(10000 + Math.random() * 89999))}`;
    const refDoc = receiptForm.referenceDoc.trim().toUpperCase() || `ASN-${Date.now().toString().slice(-6)}`;

    const putawayTarget =
      receiptForm.targetLocationCode ||
      suggestPutawayLocation(workspace.locations, workspace.balances, wh, item.preferredPutawayZone)?.locationCode ||
      dockLoc;

    const entryLoc = receiptForm.createPutawayTask ? dockLoc : putawayTarget;

    // Update or insert F41021 balance
    const existingBalIdx = workspace.balances.findIndex(
      b => b.itemId === item.id && b.warehouseCode === wh && b.locationCode === entryLoc && b.lotNumber === lot && b.lpn === lpn
    );
    const nextBalances = [...workspace.balances];
    let prevStock = 0;
    if (existingBalIdx >= 0) {
      prevStock = nextBalances[existingBalIdx].qtyOnHand;
      nextBalances[existingBalIdx] = {
        ...nextBalances[existingBalIdx],
        qtyOnHand: prevStock + qty,
        lastMovementDate: today
      };
    } else {
      nextBalances.unshift({
        id: `bal-${Date.now()}`,
        itemId: item.id,
        sku: item.sku,
        itemDescription: item.description,
        warehouseCode: wh,
        locationCode: entryLoc,
        lotNumber: lot,
        lpn,
        qtyOnHand: qty,
        qtyCommitted: 0,
        qtyInTransit: 0,
        lotStatus: 'APPROVED',
        lastMovementDate: today
      });
    }

    // Create Cardex F4111 record
    const movementNumber = `KDX-4111-${String(workspace.movements.length + 1).padStart(4, '0')}`;
    const newMovement: WmsMovementLedger = {
      id: `kdx-${Date.now()}`,
      movementNumber,
      docType: 'OV',
      referenceDoc: refDoc,
      itemId: item.id,
      sku: item.sku,
      itemDescription: item.description,
      warehouseCode: wh,
      locationCode: entryLoc,
      lotNumber: lot,
      lpn,
      qtyDelta: qty,
      unitCost: item.unitCost,
      totalCost: qty * item.unitCost,
      previousStock: prevStock,
      newStock: prevStock + qty,
      reasonCode: 'RECEP_ASN_OV',
      operator: currentUser,
      timestamp: Date.now(),
      dateStr: today,
      hashSignature: createWmsSyncHash(`${movementNumber}|${item.sku}|${qty}|${lpn}`)
    };

    const nextTasks = [...workspace.tasks];
    let taskNote = '';
    if (receiptForm.createPutawayTask && entryLoc !== putawayTarget) {
      const taskNum = `WT-4611-${String(workspace.tasks.length + 1).padStart(4, '0')}`;
      nextTasks.unshift({
        id: `wt-${Date.now()}`,
        taskNumber: taskNum,
        taskType: 'PUTAWAY',
        priority: '2-ALTA',
        referenceOrder: refDoc,
        itemId: item.id,
        sku: item.sku,
        itemDescription: item.description,
        lotNumber: lot,
        lpn,
        qtyRequested: qty,
        qtyConfirmed: 0,
        uom: item.uom,
        fromWarehouse: wh,
        fromLocation: entryLoc,
        toWarehouse: wh,
        toLocation: putawayTarget,
        assignedOperator: 'OPERARIO BODEGA 01',
        status: 'SUGGESTED',
        notes: `Putaway sugerido automáticamente hacia zona ${item.preferredPutawayZone}`,
        createdAt: today,
        userCreator: currentUser,
        hashSignature: createWmsSyncHash(`${taskNum}|${lpn}|${putawayTarget}`)
      });
      taskNote = ` + Tarea Putaway ${taskNum} hacia ${putawayTarget}`;
    }

    persistNextWorkspace(
      {
        ...workspace,
        balances: nextBalances,
        movements: [newMovement, ...workspace.movements],
        tasks: nextTasks
      },
      { action: 'CREATE', id: newMovement.id, detail: `WMS F4111 Recepción ${item.sku} +${qty} ${item.uom} en ${entryLoc} (${lpn})${taskNote}` }
    );

    notify({
      title: 'Recepción Registrada (P4114 / F4111)',
      message: `Ingresados ${qty} ${item.uom} de ${item.sku} [${lpn}] en ${entryLoc}${taskNote}.`,
      type: 'success'
    });
    setIsReceiptModalOpen(false);
  };

  // =========================================================================
  // 3. INVENTORY ADJUSTMENT (IA - P4114) & LOT HOLD TOGGLE (P4108)
  // =========================================================================
  const handleInventoryAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    const bal = workspace.balances.find(b => b.id === adjustForm.balanceId);
    if (!bal) return;
    const delta = Number(adjustForm.qtyDelta);
    if (!delta || isNaN(delta)) {
      notify({ title: 'Delta Requerido', message: 'Ingrese una variación positiva o negativa distinta de 0.', type: 'warning' });
      return;
    }
    const newStock = bal.qtyOnHand + delta;
    if (newStock < bal.qtyCommitted) {
      notify({
        title: 'Bloqueo de Integridad F41021',
        message: `El stock resultante (${newStock}) no puede ser inferior al comprometido en Picking (${bal.qtyCommitted}).`,
        type: 'error'
      });
      return;
    }
    const item = workspace.items.find(i => i.id === bal.itemId);
    const today = DEFAULT_TODAY();
    const nextBalances = workspace.balances.map(b =>
      b.id === bal.id ? { ...b, qtyOnHand: newStock, lastMovementDate: today } : b
    );

    const movementNumber = `KDX-4111-${String(workspace.movements.length + 1).padStart(4, '0')}`;
    const newMovement: WmsMovementLedger = {
      id: `kdx-${Date.now()}`,
      movementNumber,
      docType: 'IA',
      referenceDoc: `ADJ-${Date.now().toString().slice(-6)}`,
      itemId: bal.itemId,
      sku: bal.sku,
      itemDescription: bal.itemDescription,
      warehouseCode: bal.warehouseCode,
      locationCode: bal.locationCode,
      lotNumber: bal.lotNumber,
      lpn: bal.lpn,
      qtyDelta: delta,
      unitCost: item?.unitCost || 0,
      totalCost: delta * (item?.unitCost || 0),
      previousStock: bal.qtyOnHand,
      newStock,
      reasonCode: adjustForm.reasonCode,
      operator: currentUser,
      timestamp: Date.now(),
      dateStr: today,
      hashSignature: createWmsSyncHash(`${movementNumber}|${bal.sku}|${delta}|${adjustForm.reasonCode}`)
    };

    persistNextWorkspace(
      { ...workspace, balances: nextBalances, movements: [newMovement, ...workspace.movements] },
      { action: 'UPDATE', id: bal.id, detail: `WMS Ajuste IA ${bal.sku} (${delta > 0 ? `+${delta}` : delta}) en ${bal.locationCode}` }
    );
    notify({ title: 'Ajuste Cardex F4111 Aplicado', message: `Nuevo stock de ${bal.sku} en ${bal.locationCode}: ${newStock}.`, type: 'success' });
    setIsAdjustModalOpen(false);
  };

  const handleToggleLotHold = (bal: WmsStockBalance) => {
    const nextStatus = bal.lotStatus === 'APPROVED' ? 'HOLD' : 'APPROVED';
    const nextBalances = workspace.balances.map(b =>
      b.id === bal.id ? { ...b, lotStatus: nextStatus as 'APPROVED' | 'HOLD' } : b
    );
    persistNextWorkspace(
      { ...workspace, balances: nextBalances },
      { action: 'UPDATE', id: bal.id, detail: `WMS P4108 Lote ${bal.lotNumber} (${bal.lpn}) cambiado a estado ${nextStatus}` }
    );
    notify({
      title: `Estado de Lote ${nextStatus} (P4108)`,
      message: `${bal.sku} [${bal.lotNumber}] quedó en estado ${nextStatus}.`,
      type: nextStatus === 'HOLD' ? 'warning' : 'success'
    });
  };

  // =========================================================================
  // 4. WAREHOUSE TASKS ENGINE (P4611: PUTAWAY, PICKING, TRANSFER, CYCLE COUNT)
  // =========================================================================
  const handleCreateManualTask = (e: React.FormEvent) => {
    e.preventDefault();
    const bal = workspace.balances.find(b => b.id === taskForm.balanceId);
    if (!bal) {
      notify({ title: 'Origen Requerido', message: 'Seleccione un saldo/LPN de origen.', type: 'warning' });
      return;
    }
    const item = workspace.items.find(i => i.id === bal.itemId);
    const qty = Number(taskForm.qtyRequested);
    const available = Math.max(0, bal.qtyOnHand - bal.qtyCommitted);
    if (taskForm.taskType !== 'CYCLE_COUNT' && (qty <= 0 || qty > available)) {
      notify({ title: 'Stock Insuficiente', message: `Cantidad solicitada (${qty}) excede disponible (${available}).`, type: 'error' });
      return;
    }
    const targetLoc =
      taskForm.taskType === 'CYCLE_COUNT'
        ? bal.locationCode
        : taskForm.toLocation ||
          suggestPutawayLocation(workspace.locations, workspace.balances, bal.warehouseCode)?.locationCode ||
          bal.locationCode;

    if (taskForm.taskType !== 'CYCLE_COUNT' && targetLoc === bal.locationCode) {
      notify({ title: 'Ubicación Destino Igual', message: 'Seleccione una ubicación destino distinta al origen.', type: 'warning' });
      return;
    }

    const today = DEFAULT_TODAY();
    const taskNumber = `WT-4611-${String(workspace.tasks.length + 1).padStart(4, '0')}`;
    const newTask: WmsWarehouseTask = {
      id: `wt-${Date.now()}`,
      taskNumber,
      taskType: taskForm.taskType,
      priority: taskForm.priority,
      referenceOrder: `MAN-${Date.now().toString().slice(-5)}`,
      itemId: bal.itemId,
      sku: bal.sku,
      itemDescription: bal.itemDescription,
      lotNumber: bal.lotNumber,
      lpn: bal.lpn,
      qtyRequested: taskForm.taskType === 'CYCLE_COUNT' ? bal.qtyOnHand : qty,
      qtyConfirmed: 0,
      uom: item?.uom || 'UN',
      fromWarehouse: bal.warehouseCode,
      fromLocation: bal.locationCode,
      toWarehouse: bal.warehouseCode,
      toLocation: targetLoc,
      assignedOperator: taskForm.assignedOperator,
      status: 'SUGGESTED',
      notes: taskForm.notes,
      createdAt: today,
      userCreator: currentUser,
      hashSignature: createWmsSyncHash(`${taskNumber}|${bal.sku}|${bal.locationCode}|${targetLoc}`)
    };

    persistNextWorkspace(
      { ...workspace, tasks: [newTask, ...workspace.tasks] },
      { action: 'CREATE', id: newTask.id, detail: `WMS P4611: Tarea ${taskNumber} (${taskForm.taskType}) ${bal.sku}` }
    );
    notify({ title: 'Tarea WMS Generada', message: `${taskNumber} asignada a ${taskForm.assignedOperator}.`, type: 'success' });
    setIsNewTaskModalOpen(false);
  };

  const handleConfirmTaskExecution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmingTask) return;
    const confirmedQty = Number(confirmTaskQtyInput);
    if (isNaN(confirmedQty) || confirmedQty < 0) {
      notify({ title: 'Cantidad Inválida', message: 'Ingrese una cantidad confirmada válida.', type: 'warning' });
      return;
    }

    const today = DEFAULT_TODAY();
    const item = workspace.items.find(i => i.id === confirmingTask.itemId);
    let nextBalances = [...workspace.balances];
    const nextMovements = [...workspace.movements];
    let nextShipments = [...workspace.shipments];

    if (confirmingTask.taskType === 'CYCLE_COUNT') {
      // Adjust physical stock to match counted quantity
      const idx = nextBalances.findIndex(
        b =>
          b.itemId === confirmingTask.itemId &&
          b.warehouseCode === confirmingTask.fromWarehouse &&
          b.locationCode === confirmingTask.fromLocation &&
          b.lpn === confirmingTask.lpn
      );
      if (idx >= 0) {
        const prev = nextBalances[idx].qtyOnHand;
        const delta = confirmedQty - prev;
        nextBalances[idx] = { ...nextBalances[idx], qtyOnHand: confirmedQty, lastMovementDate: today };
        const movNum = `KDX-4111-${String(nextMovements.length + 1).padStart(4, '0')}`;
        nextMovements.unshift({
          id: `kdx-${Date.now()}`,
          movementNumber: movNum,
          docType: 'PI',
          referenceDoc: confirmingTask.taskNumber,
          itemId: confirmingTask.itemId,
          sku: confirmingTask.sku,
          itemDescription: confirmingTask.itemDescription,
          warehouseCode: confirmingTask.fromWarehouse,
          locationCode: confirmingTask.fromLocation,
          lotNumber: confirmingTask.lotNumber,
          lpn: confirmingTask.lpn,
          qtyDelta: delta,
          unitCost: item?.unitCost || 0,
          totalCost: delta * (item?.unitCost || 0),
          previousStock: prev,
          newStock: confirmedQty,
          reasonCode: delta === 0 ? 'CONTEO_CONFORME' : 'AJUSTE_CONTEO_CICLICO',
          operator: currentUser,
          timestamp: Date.now(),
          dateStr: today,
          hashSignature: createWmsSyncHash(`${movNum}|PI|${confirmingTask.sku}|${delta}`)
        });
      }
    } else {
      // PUTAWAY / PICKING / REPLENISHMENT / TRANSFER -> Move qty from source bin to destination bin
      if (confirmedQty === 0) {
        notify({ title: 'Cantidad Cero', message: 'Confirme una cantidad mayor a 0 para trasladar stock.', type: 'warning' });
        return;
      }

      const srcIdx = nextBalances.findIndex(
        b =>
          b.itemId === confirmingTask.itemId &&
          b.warehouseCode === confirmingTask.fromWarehouse &&
          b.locationCode === confirmingTask.fromLocation &&
          b.lotNumber === confirmingTask.lotNumber
      );

      if (srcIdx < 0 || nextBalances[srcIdx].qtyOnHand < confirmedQty) {
        notify({
          title: 'Stock Origen Insuficiente',
          message: `No hay saldo suficiente en ${confirmingTask.fromLocation} para confirmar ${confirmedQty}.`,
          type: 'error'
        });
        return;
      }

      const srcBal = nextBalances[srcIdx];
      const nextSrcOnHand = srcBal.qtyOnHand - confirmedQty;
      const nextSrcCommitted =
        confirmingTask.taskType === 'PICKING'
          ? Math.max(0, srcBal.qtyCommitted - confirmedQty)
          : srcBal.qtyCommitted;

      nextBalances[srcIdx] = {
        ...srcBal,
        qtyOnHand: nextSrcOnHand,
        qtyCommitted: nextSrcCommitted,
        lastMovementDate: today
      };

      // Destination balance
      const dstIdx = nextBalances.findIndex(
        b =>
          b.itemId === confirmingTask.itemId &&
          b.warehouseCode === confirmingTask.toWarehouse &&
          b.locationCode === confirmingTask.toLocation &&
          b.lotNumber === confirmingTask.lotNumber &&
          b.lpn === confirmingTask.lpn
      );

      const dstCommittedAdd = confirmingTask.taskType === 'PICKING' ? confirmedQty : 0;

      if (dstIdx >= 0) {
        nextBalances[dstIdx] = {
          ...nextBalances[dstIdx],
          qtyOnHand: nextBalances[dstIdx].qtyOnHand + confirmedQty,
          qtyCommitted: nextBalances[dstIdx].qtyCommitted + dstCommittedAdd,
          lastMovementDate: today
        };
      } else {
        nextBalances.unshift({
          id: `bal-${Date.now()}-${Math.floor(Math.random() * 999)}`,
          itemId: confirmingTask.itemId,
          sku: confirmingTask.sku,
          itemDescription: confirmingTask.itemDescription,
          warehouseCode: confirmingTask.toWarehouse,
          locationCode: confirmingTask.toLocation,
          lotNumber: confirmingTask.lotNumber,
          lpn: confirmingTask.lpn,
          qtyOnHand: confirmedQty,
          qtyCommitted: dstCommittedAdd,
          qtyInTransit: 0,
          lotStatus: srcBal.lotStatus,
          lastMovementDate: today
        });
      }

      // Clean empty zero-on-hand rows except keep if committed > 0
      nextBalances = nextBalances.filter(b => b.qtyOnHand > 0 || b.qtyCommitted > 0);

      // Add Cardex IT movement
      const movNum = `KDX-4111-${String(nextMovements.length + 1).padStart(4, '0')}`;
      nextMovements.unshift({
        id: `kdx-${Date.now()}`,
        movementNumber: movNum,
        docType: 'IT',
        referenceDoc: `${confirmingTask.taskNumber} (${confirmingTask.fromLocation} -> ${confirmingTask.toLocation})`,
        itemId: confirmingTask.itemId,
        sku: confirmingTask.sku,
        itemDescription: confirmingTask.itemDescription,
        warehouseCode: confirmingTask.toWarehouse,
        locationCode: confirmingTask.toLocation,
        lotNumber: confirmingTask.lotNumber,
        lpn: confirmingTask.lpn,
        qtyDelta: confirmedQty,
        unitCost: item?.unitCost || 0,
        totalCost: confirmedQty * (item?.unitCost || 0),
        previousStock: srcBal.qtyOnHand,
        newStock: confirmedQty,
        reasonCode: `${confirmingTask.taskType}_CONFIRMADO`,
        operator: currentUser,
        timestamp: Date.now(),
        dateStr: today,
        hashSignature: createWmsSyncHash(`${movNum}|IT|${confirmingTask.sku}|${confirmingTask.fromLocation}|${confirmingTask.toLocation}|${confirmedQty}`)
      });

      // Update shipment pickedQty if task linked to shipment
      if (confirmingTask.taskType === 'PICKING' && confirmingTask.referenceOrder) {
        nextShipments = nextShipments.map(s => {
          if (s.shipmentNumber !== confirmingTask.referenceOrder) return s;
          return {
            ...s,
            lines: s.lines.map(ln =>
              ln.itemId === confirmingTask.itemId && ln.lotNumber === confirmingTask.lotNumber
                ? { ...ln, pickedQty: Math.min(ln.qty, ln.pickedQty + confirmedQty), fromLocation: confirmingTask.toLocation }
                : ln
            )
          };
        });
      }
    }

    const nextTasks = workspace.tasks.map(t =>
      t.id === confirmingTask.id
        ? { ...t, qtyConfirmed: confirmedQty, status: 'CONFIRMED' as const, confirmedAt: new Date().toISOString() }
        : t
    );

    persistNextWorkspace(
      {
        ...workspace,
        balances: nextBalances,
        movements: nextMovements,
        tasks: nextTasks,
        shipments: nextShipments
      },
      { action: 'UPDATE', id: confirmingTask.id, detail: `WMS F4611 Confirmada: ${confirmingTask.taskNumber} (${confirmingTask.taskType}) ${confirmedQty} ${confirmingTask.uom}` }
    );
    notify({
      title: 'Tarea Confirmada en WMS (P4611)',
      message: `${confirmingTask.taskNumber} completada (${confirmedQty} ${confirmingTask.uom}). Cardex F4111 actualizado.`,
      type: 'success'
    });
    setConfirmingTask(null);
  };

  const handleCancelTask = (task: WmsWarehouseTask) => {
    let nextBalances = [...workspace.balances];
    if (task.taskType === 'PICKING' && (task.status === 'SUGGESTED' || task.status === 'IN_PROGRESS')) {
      nextBalances = nextBalances.map(b =>
        b.itemId === task.itemId && b.locationCode === task.fromLocation && b.lotNumber === task.lotNumber
          ? { ...b, qtyCommitted: Math.max(0, b.qtyCommitted - task.qtyRequested) }
          : b
      );
    }
    const nextTasks = workspace.tasks.map(t => (t.id === task.id ? { ...t, status: 'CANCELLED' as const } : t));
    persistNextWorkspace(
      { ...workspace, balances: nextBalances, tasks: nextTasks },
      { action: 'UPDATE', id: task.id, detail: `WMS P4611 Cancelada: ${task.taskNumber}` }
    );
    notify({ title: 'Tarea Cancelada', message: `${task.taskNumber} anulada y compromiso liberado.`, type: 'info' });
  };

  // =========================================================================
  // 5. SHIPMENT / DISPATCH MANAGEMENT (F4201 / F4915)
  // =========================================================================
  const handleAddShipmentLine = () => {
    const bal = workspace.balances.find(b => b.id === draftLineBalanceId);
    if (!bal) return;
    const item = workspace.items.find(i => i.id === bal.itemId);
    const available = Math.max(0, bal.qtyOnHand - bal.qtyCommitted);
    const qty = Number(draftLineQty);
    if (qty <= 0 || qty > available) {
      notify({ title: 'Stock Insuficiente', message: `Disponible en ${bal.locationCode}: ${available} ${item?.uom || 'UN'}.`, type: 'warning' });
      return;
    }
    const line: WmsShipmentLine = {
      itemId: bal.itemId,
      sku: bal.sku,
      description: bal.itemDescription,
      qty,
      pickedQty: 0,
      uom: item?.uom || 'UN',
      lotNumber: bal.lotNumber,
      fromLocation: bal.locationCode
    };
    setShipmentForm(prev => ({ ...prev, lines: [...prev.lines, line] }));
    setDraftLineQty(1);
  };

  const handleCreateShipment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shipmentForm.customerOrSupplier.trim() || shipmentForm.lines.length === 0) {
      notify({ title: 'Datos Incompletos', message: 'Indique Cliente/Destinatario y al menos 1 línea de SKU.', type: 'warning' });
      return;
    }

    const today = DEFAULT_TODAY();
    const shipmentNumber = `EMB-4915-${String(workspace.shipments.length + 1).padStart(4, '0')}`;
    const waveNumber = `WAVE-${today.slice(0, 4)}-${String(Math.floor(100 + Math.random() * 899))}`;
    const itemMap = new Map<string, WmsItemMaster>(workspace.items.map(i => [i.id, i]));

    let totalWeightKg = 0;
    let totalPackages = 0;
    const nextBalances = [...workspace.balances];
    const nextTasks = [...workspace.tasks];

    const stagingLoc =
      workspace.locations.find(l => l.warehouseCode === shipmentForm.warehouseCode && l.zoneType === 'PACKING')?.locationCode ||
      workspace.locations.find(l => l.warehouseCode === shipmentForm.warehouseCode && l.zoneType === 'DISPATCH_DOCK')?.locationCode ||
      'PKG-STG-01';

    shipmentForm.lines.forEach((line, idx) => {
      const item = itemMap.get(line.itemId);
      totalPackages += line.qty;
      totalWeightKg += line.qty * (item?.weightKg || 1);

      const balIdx = nextBalances.findIndex(
        b => b.itemId === line.itemId && b.warehouseCode === shipmentForm.warehouseCode && b.locationCode === line.fromLocation && b.lotNumber === line.lotNumber
      );
      if (balIdx >= 0) {
        nextBalances[balIdx] = {
          ...nextBalances[balIdx],
          qtyCommitted: nextBalances[balIdx].qtyCommitted + line.qty
        };
      }

      const taskNumber = `WT-4611-${String(nextTasks.length + 1).padStart(4, '0')}`;
      nextTasks.unshift({
        id: `wt-${Date.now()}-${idx}`,
        taskNumber,
        taskType: 'PICKING',
        priority: '1-CRÍTICA',
        waveNumber,
        referenceOrder: shipmentNumber,
        itemId: line.itemId,
        sku: line.sku,
        itemDescription: line.description,
        lotNumber: line.lotNumber,
        lpn: balIdx >= 0 ? nextBalances[balIdx].lpn : `LPN-${shipmentNumber}`,
        qtyRequested: line.qty,
        qtyConfirmed: 0,
        uom: line.uom,
        fromWarehouse: shipmentForm.warehouseCode,
        fromLocation: line.fromLocation,
        toWarehouse: shipmentForm.warehouseCode,
        toLocation: stagingLoc,
        assignedOperator: 'OPERARIO PICKING 02',
        status: 'SUGGESTED',
        notes: `Ola Picking para embarque ${shipmentNumber} (${shipmentForm.customerOrSupplier})`,
        createdAt: today,
        userCreator: currentUser,
        hashSignature: createWmsSyncHash(`${taskNumber}|${shipmentNumber}|${line.sku}`)
      });
    });

    const newShipment: WmsShipmentOrder = {
      id: `emb-${Date.now()}`,
      shipmentNumber,
      orderType: 'OUTBOUND_DESPACHO',
      customerOrSupplier: shipmentForm.customerOrSupplier.trim().toUpperCase(),
      destinationAddress: shipmentForm.destinationAddress.trim() || 'Por Confirmar',
      city: shipmentForm.city.trim() || 'Santiago',
      carrierName: shipmentForm.carrierName.trim() || 'FLOTA PROPIA',
      vehiclePlate: shipmentForm.vehiclePlate.trim().toUpperCase() || 'SIN-PAT',
      driverName: shipmentForm.driverName.trim().toUpperCase() || 'CHOFER ASIGNADO',
      driverRut: shipmentForm.driverRut.trim() || 'S/R',
      warehouseCode: shipmentForm.warehouseCode,
      waveNumber,
      lines: shipmentForm.lines,
      totalPackages,
      totalWeightKg: Number(totalWeightKg.toFixed(2)),
      guideNumber: `GD-52-${String(Math.floor(100000 + Math.random() * 899999))}`,
      scheduledDate: shipmentForm.scheduledDate,
      status: 'EN_PICKING',
      notes: shipmentForm.notes,
      userCreator: currentUser,
      createdAt: today
    };

    persistNextWorkspace(
      {
        ...workspace,
        balances: nextBalances,
        tasks: nextTasks,
        shipments: [newShipment, ...workspace.shipments]
      },
      { action: 'CREATE', id: newShipment.id, detail: `WMS F4915 Embarque ${shipmentNumber} · ${waveNumber} (${shipmentForm.lines.length} líneas)` }
    );
    notify({
      title: 'Orden de Despacho & Ola Generada (P4915)',
      message: `${shipmentNumber} lanzada con ${waveNumber}. Stock comprometido y tareas de Picking creadas.`,
      type: 'success'
    });
    setIsNewShipmentModalOpen(false);
    setShipmentForm({
      customerOrSupplier: '', destinationAddress: '', city: 'Santiago',
      carrierName: 'TRANSPORTES CORDILLERA LOGISTICS', vehiclePlate: '', driverName: '', driverRut: '',
      warehouseCode: 'CD-SCL-01', scheduledDate: DEFAULT_TODAY(), notes: '', lines: []
    });
  };

  const handleAdvanceShipmentStage = (shipment: WmsShipmentOrder) => {
    const today = DEFAULT_TODAY();
    const itemMap = new Map<string, WmsItemMaster>(workspace.items.map(i => [i.id, i]));
    let nextStatus = shipment.status;
    let nextBalances = [...workspace.balances];
    const nextMovements = [...workspace.movements];
    let nextTasks = [...workspace.tasks];

    if (shipment.status === 'PLANIFICADO') {
      nextStatus = 'EN_PICKING';
    } else if (shipment.status === 'EN_PICKING') {
      nextStatus = 'EMPACADO';
    } else if (shipment.status === 'EMPACADO') {
      nextStatus = 'EN_RUTA';
      // Deduct physical inventory (SO) & release commitments for all shipment lines
      shipment.lines.forEach((line, idx) => {
        // Locate balance matching lot & item (check current line location or staging)
        const balIdx = nextBalances.findIndex(
          b => b.itemId === line.itemId && b.warehouseCode === shipment.warehouseCode && b.lotNumber === line.lotNumber && b.qtyOnHand >= line.qty
        );
        const item = itemMap.get(line.itemId);
        let prevStock = 0;
        let lpn = `LPN-${shipment.shipmentNumber}`;
        let locUsed = line.fromLocation;

        if (balIdx >= 0) {
          prevStock = nextBalances[balIdx].qtyOnHand;
          lpn = nextBalances[balIdx].lpn;
          locUsed = nextBalances[balIdx].locationCode;
          nextBalances[balIdx] = {
            ...nextBalances[balIdx],
            qtyOnHand: Math.max(0, prevStock - line.qty),
            qtyCommitted: Math.max(0, nextBalances[balIdx].qtyCommitted - line.qty),
            lastMovementDate: today
          };
        }

        const movNum = `KDX-4111-${String(nextMovements.length + 1).padStart(4, '0')}`;
        nextMovements.unshift({
          id: `kdx-${Date.now()}-${idx}`,
          movementNumber: movNum,
          docType: 'SO',
          referenceDoc: `${shipment.shipmentNumber} / ${shipment.guideNumber || 'GD-52'}`,
          itemId: line.itemId,
          sku: line.sku,
          itemDescription: line.description,
          warehouseCode: shipment.warehouseCode,
          locationCode: locUsed,
          lotNumber: line.lotNumber,
          lpn,
          qtyDelta: -line.qty,
          unitCost: item?.unitCost || 0,
          totalCost: -(line.qty * (item?.unitCost || 0)),
          previousStock: prevStock,
          newStock: Math.max(0, prevStock - line.qty),
          reasonCode: 'DESPACHO_EN_RUTA_F4915',
          operator: currentUser,
          timestamp: Date.now(),
          dateStr: today,
          hashSignature: createWmsSyncHash(`${movNum}|SO|${shipment.shipmentNumber}|${line.sku}|-${line.qty}`)
        });
      });

      // Mark open picking tasks for this shipment as confirmed
      nextTasks = nextTasks.map(t =>
        t.referenceOrder === shipment.shipmentNumber && t.taskType === 'PICKING' && t.status !== 'CONFIRMED'
          ? { ...t, status: 'CONFIRMED' as const, qtyConfirmed: t.qtyRequested, confirmedAt: new Date().toISOString() }
          : t
      );
      nextBalances = nextBalances.filter(b => b.qtyOnHand > 0 || b.qtyCommitted > 0);
    } else if (shipment.status === 'EN_RUTA') {
      nextStatus = 'ENTREGADO';
    }

    const nextShipments = workspace.shipments.map(s =>
      s.id === shipment.id
        ? {
            ...s,
            status: nextStatus,
            deliveredAt: nextStatus === 'ENTREGADO' ? today : s.deliveredAt,
            lines: nextStatus === 'EN_RUTA' ? s.lines.map(l => ({ ...l, pickedQty: l.qty })) : s.lines
          }
        : s
    );

    persistNextWorkspace(
      {
        ...workspace,
        balances: nextBalances,
        movements: nextMovements,
        tasks: nextTasks,
        shipments: nextShipments
      },
      { action: 'UPDATE', id: shipment.id, detail: `WMS F4915 ${shipment.shipmentNumber} avanzado a ${nextStatus}` }
    );
    notify({
      title: `Embarque Actualizado: ${nextStatus}`,
      message:
        nextStatus === 'EN_RUTA'
          ? `${shipment.shipmentNumber} despachado a ruta. Stock descontado y Cardex F4111 emitido.`
          : `${shipment.shipmentNumber} movido a etapa ${nextStatus}.`,
      type: 'success'
    });
  };

  // =========================================================================
  // 6. LOCATION MASTER (F4100 / F4602)
  // =========================================================================
  const handleCreateLocation = (e: React.FormEvent) => {
    e.preventDefault();
    const locCode = locationForm.locationCode.trim().toUpperCase();
    if (!locCode) return;
    if (workspace.locations.some(l => l.warehouseCode === locationForm.warehouseCode && l.locationCode === locCode)) {
      notify({ title: 'Ubicación Existente', message: `El bin ${locCode} ya existe en ${locationForm.warehouseCode}.`, type: 'error' });
      return;
    }
    const newLoc: WmsLocation = {
      id: `loc-${Date.now()}`,
      warehouseCode: locationForm.warehouseCode.trim().toUpperCase(),
      warehouseName: locationForm.warehouseName.trim() || locationForm.warehouseCode,
      locationCode: locCode,
      aisle: locationForm.aisle.trim().toUpperCase(),
      rack: locationForm.rack.trim().toUpperCase(),
      level: locationForm.level.trim().toUpperCase(),
      zoneType: locationForm.zoneType,
      maxWeightKg: Number(locationForm.maxWeightKg) || 4000,
      maxPallets: Number(locationForm.maxPallets) || 4,
      temperatureControl: locationForm.temperatureControl,
      status: 'ACTIVE'
    };
    persistNextWorkspace(
      { ...workspace, locations: [...workspace.locations, newLoc] },
      { action: 'CREATE', id: newLoc.id, detail: `WMS F4100 Ubicación ${newLoc.locationCode} creada en ${newLoc.warehouseCode}` }
    );
    notify({ title: 'Ubicación F4100 Creada', message: `${newLoc.locationCode} habilitada para Putaway / Picking.`, type: 'success' });
    setIsNewLocationModalOpen(false);
    setLocationForm({ ...locationForm, locationCode: '' });
  };

  const handleToggleLocationStatus = (loc: WmsLocation) => {
    const nextStatus = loc.status === 'ACTIVE' ? 'HOLD' : 'ACTIVE';
    persistNextWorkspace(
      {
        ...workspace,
        locations: workspace.locations.map(l => (l.id === loc.id ? { ...l, status: nextStatus } : l))
      },
      { action: 'UPDATE', id: loc.id, detail: `WMS F4100 Ubicación ${loc.locationCode} -> ${nextStatus}` }
    );
  };

  // Export WMS Excel
  const handleExportWmsExcel = async () => {
    const { exportToExcel } = await import('../lib/excelExport');
    if (activeTab === 'P4114_CARDEX') {
      await exportToExcel(
        filteredMovements.map(m => ({
          Movimiento: m.movementNumber,
          Tipo: m.docType,
          Referencia: m.referenceDoc,
          Fecha: m.dateStr,
          SKU: m.sku,
          Articulo: m.itemDescription,
          Bodega: m.warehouseCode,
          Ubicacion: m.locationCode,
          Lote: m.lotNumber,
          LPN: m.lpn,
          Delta: m.qtyDelta,
          StockAnterior: m.previousStock,
          StockNuevo: m.newStock,
          CostoTotalCLP: m.totalCost,
          Motivo: m.reasonCode,
          Operador: m.operator,
          HashSHA256: m.hashSignature
        })),
        `WMS_Cardex_F4111_${DEFAULT_TODAY()}`,
        'Cardex F4111 WMS'
      );
    } else if (activeTab === 'P4915_DISPATCH') {
      await exportToExcel(
        filteredShipments.map(s => ({
          Embarque: s.shipmentNumber,
          OlaPicking: s.waveNumber,
          Cliente: s.customerOrSupplier,
          Destino: s.destinationAddress,
          Ciudad: s.city,
          Bodega: s.warehouseCode,
          Transportista: s.carrierName,
          Patente: s.vehiclePlate,
          Chofer: s.driverName,
          GuiaDTE52: s.guideNumber || '',
          Bultos: s.totalPackages,
          PesoKg: s.totalWeightKg,
          FechaProgramada: s.scheduledDate,
          Estado: s.status
        })),
        `WMS_Despachos_F4915_${DEFAULT_TODAY()}`,
        'Despachos F4915'
      );
    } else {
      await exportToExcel(
        filteredBalances.map(b => ({
          Bodega: b.warehouseCode,
          Ubicacion: b.locationCode,
          SKU: b.sku,
          Descripcion: b.itemDescription,
          Lote: b.lotNumber,
          LPN: b.lpn,
          StockFisico: b.qtyOnHand,
          Comprometido: b.qtyCommitted,
          Disponible: Math.max(0, b.qtyOnHand - b.qtyCommitted),
          EstadoLote: b.lotStatus,
          UltimoMovimiento: b.lastMovementDate
        })),
        `WMS_Saldos_F41021_${DEFAULT_TODAY()}`,
        'Inventario WMS F41021'
      );
    }
    notify({ title: 'Excel WMS Exportado', message: 'La grilla logística se descargó en formato .xlsx.', type: 'success' });
  };

  const handlePrintShipmentDocument = async () => {
    const { printHtmlElement } = await import('../lib/printDocument');
    await printHtmlElement('printable-wms-shipment', `Guia_Picking_${previewShipment?.shipmentNumber || 'WMS'}`);
  };

  const getShipmentStatusBadge = (status: WmsShipmentOrder['status']) => {
    switch (status) {
      case 'ENTREGADO':
        return 'bg-emerald-100 text-emerald-900 border-emerald-400';
      case 'EN_RUTA':
        return 'bg-sky-100 text-sky-900 border-sky-400';
      case 'EMPACADO':
        return 'bg-indigo-100 text-indigo-900 border-indigo-400';
      case 'EN_PICKING':
        return 'bg-amber-100 text-amber-900 border-amber-400';
      case 'INCIDENCIA':
        return 'bg-rose-100 text-rose-900 border-rose-400';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <div className="space-y-3 font-sans text-slate-800">
      {/* EXTRA ITEM SEPARATION BANNER + GLOBAL WAREHOUSE SELECTOR */}
      <div className="bg-gradient-to-r from-[#002D62] via-[#0B3C5D] to-[#124E78] text-white px-4 py-2.5 border border-[#001B3B] flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-400 text-[#002D62] rounded-xs shadow-xs">
            <Warehouse size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="bg-[#FFCC00] text-[#002D62] px-1.5 py-0.5 text-[9px] font-mono font-black uppercase tracking-wider rounded-xs">
                EXTRA ITEM APARTE · NO INMOBILIARIO
              </span>
              <h2 className="text-sm font-black tracking-tight text-white">
                Supply Chain Logistics &amp; Warehouse Management System (WMS G41 / G46 / G49)
              </h2>
            </div>
            <p className="text-[10.5px] text-slate-200 font-mono">
              Maestro F4101 · Saldos Lote/LPN F41021 · Putaway &amp; Wave Picking F4611 · Cardex Inmutable F4111 · Transporte F4915
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-[10px] font-mono uppercase text-amber-300 font-bold">Planta / Bodega (MCU):</label>
          <select
            value={selectedWarehouseFilter}
            onChange={e => setSelectedWarehouseFilter(e.target.value)}
            className="!bg-white !text-[#002D62] text-[11px] font-mono font-bold px-2 py-1 border border-[#9DB2C3] rounded-xs"
          >
            <option value="ALL">TODAS LAS BODEGAS ({warehouses.length})</option>
            {warehouses.map(w => (
              <option key={w.code} value={w.code}>
                {w.code} — {w.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* JDE ACTION COMMAND BAR */}
      <div className="jde-action-bar flex-wrap">
        <button type="button" onClick={() => setIsReceiptModalOpen(true)} className="jde-btn jde-btn-primary">
          <ArrowDownToLine size={12} /> Recepción ASN / Compra (OV)
        </button>
        <button type="button" onClick={() => setIsNewShipmentModalOpen(true)} className="jde-btn">
          <Truck size={12} className="text-[#005B94]" /> Nuevo Despacho / Ola Picking (F4915)
        </button>
        <button type="button" onClick={() => setIsNewItemModalOpen(true)} className="jde-btn">
          <Plus size={12} className="text-emerald-700" /> Nuevo Artículo SKU (F4101)
        </button>
        <button type="button" onClick={() => setIsNewTaskModalOpen(true)} className="jde-btn">
          <ArrowRightLeft size={12} className="text-indigo-700" /> Nueva Tarea Bodega (F4611)
        </button>
        <button
          type="button"
          onClick={() => {
            if (workspace.balances.length > 0) {
              setAdjustForm({ balanceId: workspace.balances[0].id, qtyDelta: 0, reasonCode: 'AJUSTE_AUDITORIA' });
              setIsAdjustModalOpen(true);
            }
          }}
          className="jde-btn"
        >
          <SlidersHorizontal size={12} className="text-amber-700" /> Ajuste Stock (IA)
        </button>
        <button type="button" onClick={handleExportWmsExcel} className="jde-btn ml-auto">
          <FileSpreadsheet size={12} className="text-emerald-700" /> Exportar Grilla .XLSX
        </button>
      </div>

      {/* AUTHENTIC JDE TAB BAR */}
      <div className="jde-tab-bar overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('P4600_CONTROL')}
          className={`jde-tab-item ${activeTab === 'P4600_CONTROL' ? 'jde-tab-item-active' : ''}`}
        >
          [P4600] Torre Control &amp; Mapa Racks
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('P4101_INVENTORY')}
          className={`jde-tab-item ${activeTab === 'P4101_INVENTORY' ? 'jde-tab-item-active' : ''}`}
        >
          [P4101] Artículos &amp; Saldos ({workspace.balances.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('P4611_TASKS')}
          className={`jde-tab-item ${activeTab === 'P4611_TASKS' ? 'jde-tab-item-active' : ''}`}
        >
          [P4611] Tareas WMS / Picking ({kpis.pendingTasks})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('P4114_CARDEX')}
          className={`jde-tab-item ${activeTab === 'P4114_CARDEX' ? 'jde-tab-item-active' : ''}`}
        >
          [P4114] Recepción &amp; Cardex F4111 ({workspace.movements.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('P4915_DISPATCH')}
          className={`jde-tab-item ${activeTab === 'P4915_DISPATCH' ? 'jde-tab-item-active' : ''}`}
        >
          [P4915] Despacho &amp; Transporte ({workspace.shipments.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('P4100_WAREHOUSES')}
          className={`jde-tab-item ${activeTab === 'P4100_WAREHOUSES' ? 'jde-tab-item-active' : ''}`}
        >
          [P4100] Bodegas &amp; Ubicaciones ({filteredLocations.length})
        </button>
      </div>

      {/* =================================================================== */}
      {/* TAB 1: P4600 - TORRE DE CONTROL & MAPA VISUAL DE BODEGAS (F4602)    */}
      {/* =================================================================== */}
      {activeTab === 'P4600_CONTROL' && (
        <div className="space-y-3 bg-white border border-[#9DB2C5] p-3">
          {/* KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            <div className="bg-[#F4F8FB] border border-[#9DB2C3] p-3">
              <p className="text-[9.5px] font-mono font-bold text-[#002D62] uppercase">Inventario Valorizado (F41021)</p>
              <p className="text-lg font-black font-mono text-[#002D62] mt-1">{formatCLP(kpis.totalValueCLP)}</p>
              <p className="text-[10px] text-slate-600 font-semibold mt-0.5">{workspace.items.length} SKUs en Maestro F4101</p>
            </div>
            <div className="bg-[#F4F8FB] border border-[#9DB2C3] p-3">
              <p className="text-[9.5px] font-mono font-bold text-[#002D62] uppercase">Stock Físico / Disponible</p>
              <p className="text-lg font-black font-mono text-emerald-700 mt-1">
                {kpis.totalUnits.toLocaleString('es-CL')} <span className="text-xs text-slate-500">({kpis.totalAvailable} disp.)</span>
              </p>
              <p className="text-[10px] text-amber-700 font-bold mt-0.5">{kpis.totalCommitted} unidades comprometidas</p>
            </div>
            <div className="bg-[#F4F8FB] border border-[#9DB2C3] p-3">
              <p className="text-[9.5px] font-mono font-bold text-[#002D62] uppercase">Cola de Tareas WMS (F4611)</p>
              <p className="text-lg font-black font-mono text-indigo-700 mt-1">{kpis.pendingTasks} pendientes</p>
              <p className="text-[10px] text-slate-600 font-semibold mt-0.5">Putaway, Picking y Conteos</p>
            </div>
            <div className="bg-[#F4F8FB] border border-[#9DB2C3] p-3">
              <p className="text-[9.5px] font-mono font-bold text-[#002D62] uppercase">Ocupación de Racks (F4602)</p>
              <p className="text-lg font-black font-mono text-[#005B94] mt-1">{kpis.occupancyRate}%</p>
              <p className="text-[10px] text-slate-600 font-semibold mt-0.5">{kpis.occupiedBinsCount} de {kpis.totalBinsCount} ubicaciones</p>
            </div>
            <div className="bg-[#F4F8FB] border border-[#9DB2C3] p-3">
              <p className="text-[9.5px] font-mono font-bold text-[#002D62] uppercase">Despachos Activos / OTIF</p>
              <p className="text-lg font-black font-mono text-emerald-700 mt-1">
                {kpis.activeShipments} en curso <span className="text-xs text-slate-500">· {kpis.otifRate}% OTIF</span>
              </p>
              <p className="text-[10px] text-slate-600 font-semibold mt-0.5">{kpis.lowStockItems.length} alertas bajo punto reorden</p>
            </div>
          </div>

          {/* Low Stock Reorder Alerts */}
          {kpis.lowStockItems.length > 0 && (
            <div className="bg-amber-50 border border-amber-300 p-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-black text-amber-900 uppercase flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-amber-700" />
                  Alertas de Punto de Reorden (F4102 — Stock Disponible ≤ Reorder Point)
                </span>
                <span className="font-mono text-[10px] text-amber-900 font-bold">{kpis.lowStockItems.length} artículo(s)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {kpis.lowStockItems.map(item => {
                  const agg = stockByItemMap.get(item.id) || { onHand: 0, committed: 0, available: 0 };
                  return (
                    <div key={item.id} className="bg-white border border-amber-300 p-2 flex items-center justify-between gap-2 text-[10.5px]">
                      <div className="min-w-0">
                        <p className="font-mono font-black text-[#002D62]">{item.sku}</p>
                        <p className="truncate font-semibold text-slate-700">{item.description}</p>
                        <p className="text-[9.5px] font-mono text-rose-700 font-bold">
                          Disp: {agg.available} {item.uom} / Reorden: {item.reorderPoint} {item.uom}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setReceiptForm({
                            itemId: item.id,
                            warehouseCode: item.defaultWarehouse,
                            qty: Math.max(10, item.reorderPoint * 2 - agg.available),
                            lotNumber: '',
                            lpn: '',
                            referenceDoc: `REP-${item.sku}`,
                            createPutawayTask: true,
                            targetLocationCode: ''
                          });
                          setIsReceiptModalOpen(true);
                        }}
                        className="jde-btn shrink-0"
                      >
                        <Plus size={11} /> Reponer
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Interactive Warehouse Location Bin Map */}
          <div>
            <div className="jde-grid-banner">
              <span className="flex items-center gap-1.5 uppercase font-mono">
                <MapPin size={13} className="text-[#002D62]" /> Mapa Visual de Ubicaciones / Racks &amp; Muelles (F4100 / F4602) — Clic en celda para inspeccionar LPNs
              </span>
              <span className="text-[9.5px] font-mono text-slate-600">
                Verde: Disponible · Azul: Ocupada · Rojo/Ámbar: Bloqueada / Cuarentena
              </span>
            </div>
            <div className="border border-[#9DB2C5] p-3 bg-[#F8FAFD] grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {filteredLocations.map(loc => {
                const locBalances = workspace.balances.filter(
                  b => b.warehouseCode === loc.warehouseCode && b.locationCode === loc.locationCode && b.qtyOnHand > 0
                );
                const unitsInside = locBalances.reduce((sum, b) => sum + b.qtyOnHand, 0);
                const lpnsCount = locBalances.length;
                const occupancyPct = Math.min(100, Math.round((lpnsCount / (loc.maxPallets || 1)) * 100));
                const isSelected = selectedLocationForInspect?.id === loc.id;

                let borderTone = 'border-[#9DB2C3] bg-white';
                if (loc.status === 'HOLD' || loc.zoneType === 'QUARANTINE') borderTone = 'border-rose-400 bg-rose-50/70';
                else if (lpnsCount > 0) borderTone = 'border-[#005B94] bg-[#F0F7FC]';

                return (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => setSelectedLocationForInspect(loc)}
                    className={`text-left p-2.5 border transition-all cursor-pointer hover:bg-[#FFFCDD] ${borderTone} ${isSelected ? 'ring-2 ring-[#002D62]' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-xs font-black text-[#002D62]">{loc.locationCode}</span>
                      <span
                        className={`text-[8.5px] font-mono font-bold px-1.5 py-0.5 border ${
                          loc.status === 'HOLD'
                            ? 'bg-rose-100 text-rose-900 border-rose-300'
                            : lpnsCount > 0
                            ? 'bg-sky-100 text-sky-900 border-sky-300'
                            : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        }`}
                      >
                        {loc.status === 'HOLD' ? 'HOLD' : `${lpnsCount}/${loc.maxPallets} LPN`}
                      </span>
                    </div>
                    <p className="text-[9.5px] font-bold text-slate-600 mt-0.5">
                      {loc.warehouseCode} · {WMS_ZONE_LABELS[loc.zoneType]}
                    </p>
                    <div className="w-full h-1.5 bg-slate-200 mt-2 overflow-hidden">
                      <div
                        className={`h-full ${occupancyPct >= 90 ? 'bg-amber-500' : 'bg-[#005B94]'}`}
                        style={{ width: `${occupancyPct}%` }}
                      />
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[9.5px] font-mono text-slate-700">
                      <span>{unitsInside} u. alojadas</span>
                      <span>{loc.temperatureControl}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Location Detail Strip */}
          {selectedLocationForInspect && (
            <div className="jde-query-panel">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-black text-[#002D62]">
                  Inspección de Bin: {selectedLocationForInspect.warehouseCode} / {selectedLocationForInspect.locationCode} ({WMS_ZONE_LABELS[selectedLocationForInspect.zoneType]})
                </span>
                <button type="button" onClick={() => setSelectedLocationForInspect(null)} className="jde-btn">
                  <X size={11} /> Cerrar Detalle
                </button>
              </div>
              {(() => {
                const inside = workspace.balances.filter(
                  b =>
                    b.warehouseCode === selectedLocationForInspect.warehouseCode &&
                    b.locationCode === selectedLocationForInspect.locationCode &&
                    b.qtyOnHand > 0
                );
                if (inside.length === 0) {
                  return <p className="text-xs text-slate-600 font-mono">Ubicación libre y disponible para Putaway dirigido.</p>;
                }
                return (
                  <table className="jde-grid">
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>Artículo</th>
                        <th>LPN Pallet</th>
                        <th>Lote</th>
                        <th>Stock Físico</th>
                        <th>Comprometido</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inside.map((b, i) => (
                        <tr key={b.id} className={i % 2 === 0 ? 'jde-row-even' : 'jde-row-odd'}>
                          <td className="font-mono font-bold text-[#002D62]">{b.sku}</td>
                          <td>{b.itemDescription}</td>
                          <td className="font-mono">{b.lpn}</td>
                          <td className="font-mono">{b.lotNumber}</td>
                          <td className="font-mono font-bold">{b.qtyOnHand}</td>
                          <td className="font-mono text-amber-700 font-bold">{b.qtyCommitted}</td>
                          <td className="font-mono">{b.lotStatus}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 2: P4101 - MAESTRO DE ARTÍCULOS & SALDOS POR UBICACIÓN/LPN      */}
      {/* =================================================================== */}
      {activeTab === 'P4101_INVENTORY' && (
        <div className="space-y-2 bg-white border border-[#9DB2C5] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#D2DFEC]">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setInventorySubView('BALANCES')}
                className={`jde-btn ${inventorySubView === 'BALANCES' ? 'jde-btn-primary' : ''}`}
              >
                <Boxes size={12} /> Saldos por Ubicación / Lote / LPN (F41021)
              </button>
              <button
                type="button"
                onClick={() => setInventorySubView('CATALOG')}
                className={`jde-btn ${inventorySubView === 'CATALOG' ? 'jde-btn-primary' : ''}`}
              >
                <Package size={12} /> Catálogo Maestro de Artículos (F4101)
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setQbeSku('');
                setQbeDesc('');
                setQbeLoc('');
                setQbeLot('');
                setQbeAbc('ALL');
                setQbeStatus('ALL');
              }}
              className="jde-btn"
            >
              <RefreshCw size={11} /> Limpiar Filtros QBE
            </button>
          </div>

          {inventorySubView === 'BALANCES' ? (
            <div className="overflow-x-auto jde-grid-scroll">
              <div className="jde-grid-banner">
                <span>F41021 / F4108 — Saldos Detallados por Ubicación, Lote y Pallet (LPN)</span>
                <span className="font-mono">{filteredBalances.length} registros</span>
              </div>
              <table className="jde-grid">
                <thead>
                  <tr>
                    <th>Bodega (MCU)</th>
                    <th>Ubicación (LOCN)</th>
                    <th>SKU (LITM)</th>
                    <th>Descripción Artículo</th>
                    <th>LPN Pallet</th>
                    <th>Lote (LOTN)</th>
                    <th>Físico (PQOH)</th>
                    <th>Comprom.</th>
                    <th>Disponible</th>
                    <th>Estado</th>
                    <th>Acciones WMS</th>
                  </tr>
                  <tr className="jde-qbe-row">
                    <th><span className="text-[9px] font-mono text-slate-500">QBE</span></th>
                    <th><input value={qbeLoc} onChange={e => setQbeLoc(e.target.value)} placeholder="Ubic..." className="jde-qbe-input" /></th>
                    <th><input value={qbeSku} onChange={e => setQbeSku(e.target.value)} placeholder="SKU..." className="jde-qbe-input" /></th>
                    <th><input value={qbeDesc} onChange={e => setQbeDesc(e.target.value)} placeholder="Descripción..." className="jde-qbe-input" /></th>
                    <th colSpan={2}><input value={qbeLot} onChange={e => setQbeLot(e.target.value)} placeholder="Buscar Lote o LPN..." className="jde-qbe-input" /></th>
                    <th colSpan={3}></th>
                    <th>
                      <select value={qbeStatus} onChange={e => setQbeStatus(e.target.value)} className="jde-qbe-input">
                        <option value="ALL">TODOS</option>
                        <option value="APPROVED">APPROVED</option>
                        <option value="HOLD">HOLD</option>
                      </select>
                    </th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBalances.map((b, idx) => {
                    const available = Math.max(0, b.qtyOnHand - b.qtyCommitted);
                    return (
                      <tr key={b.id} className={`jde-tr ${idx % 2 === 0 ? 'jde-row-even' : 'jde-row-odd'}`}>
                        <td className="font-mono font-bold text-[#002D62]">{b.warehouseCode}</td>
                        <td className="font-mono font-bold">{b.locationCode}</td>
                        <td className="font-mono font-black text-[#005B94]">{b.sku}</td>
                        <td className="font-semibold">{b.itemDescription}</td>
                        <td className="font-mono text-[10px]">{b.lpn}</td>
                        <td className="font-mono text-[10px]">{b.lotNumber}</td>
                        <td className="font-mono font-bold text-right">{b.qtyOnHand}</td>
                        <td className="font-mono font-bold text-amber-700 text-right">{b.qtyCommitted}</td>
                        <td className="font-mono font-black text-emerald-700 text-right">{available}</td>
                        <td>
                          <span
                            className={`px-1.5 py-0.5 text-[9.5px] font-mono font-bold border ${
                              b.lotStatus === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                : 'bg-rose-100 text-rose-900 border-rose-300'
                            }`}
                          >
                            {b.lotStatus}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setTaskForm({
                                  taskType: 'TRANSFER',
                                  priority: '2-ALTA',
                                  balanceId: b.id,
                                  qtyRequested: Math.min(available, 10) || 1,
                                  toLocation: '',
                                  assignedOperator: 'OPERARIO BODEGA 01',
                                  notes: `Traslado desde ${b.locationCode}`
                                });
                                setIsNewTaskModalOpen(true);
                              }}
                              className="jde-btn"
                              title="Crear tarea de traslado entre ubicaciones"
                            >
                              <ArrowRightLeft size={10} /> Mover
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAdjustForm({ balanceId: b.id, qtyDelta: 0, reasonCode: 'AJUSTE_CONTEO' });
                                setIsAdjustModalOpen(true);
                              }}
                              className="jde-btn"
                              title="Ajustar saldo F4111"
                            >
                              ±
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleLotHold(b)}
                              className="jde-btn"
                              title={b.lotStatus === 'APPROVED' ? 'Bloquear Lote (HOLD P4108)' : 'Liberar Lote (APPROVED)'}
                            >
                              {b.lotStatus === 'APPROVED' ? <Lock size={10} className="text-rose-700" /> : <Unlock size={10} className="text-emerald-700" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredBalances.length === 0 && (
                    <tr>
                      <td colSpan={11} className="text-center py-6 font-mono text-slate-500">
                        Sin saldos coincidentes con el filtro QBE.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto jde-grid-scroll">
              <div className="jde-grid-banner">
                <span>F4101 / F4102 — Maestro de Artículos Logísticos</span>
                <span className="font-mono">{filteredItems.length} SKUs</span>
              </div>
              <table className="jde-grid">
                <thead>
                  <tr>
                    <th>SKU (LITM)</th>
                    <th>Descripción (DSC1)</th>
                    <th>Categoría</th>
                    <th>UOM</th>
                    <th>ABC</th>
                    <th>Stock Disp.</th>
                    <th>Pto. Reorden</th>
                    <th>Costo Unit. CLP</th>
                    <th>Peso (kg)</th>
                    <th>Bodega Base</th>
                    <th>Acción</th>
                  </tr>
                  <tr className="jde-qbe-row">
                    <th><input value={qbeSku} onChange={e => setQbeSku(e.target.value)} placeholder="SKU..." className="jde-qbe-input" /></th>
                    <th><input value={qbeDesc} onChange={e => setQbeDesc(e.target.value)} placeholder="Descripción..." className="jde-qbe-input" /></th>
                    <th colSpan={2}></th>
                    <th>
                      <select value={qbeAbc} onChange={e => setQbeAbc(e.target.value)} className="jde-qbe-input">
                        <option value="ALL">*</option>
                        <option value="A">A</option>
                        <option value="B">B</option>
                        <option value="C">C</option>
                      </select>
                    </th>
                    <th colSpan={6}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item, idx) => {
                    const agg = stockByItemMap.get(item.id) || { onHand: 0, committed: 0, available: 0 };
                    const isLow = agg.available <= item.reorderPoint;
                    return (
                      <tr key={item.id} className={`jde-tr ${idx % 2 === 0 ? 'jde-row-even' : 'jde-row-odd'}`}>
                        <td className="font-mono font-black text-[#002D62]">{item.sku}</td>
                        <td className="font-semibold">{item.description}</td>
                        <td>{item.category}</td>
                        <td className="font-mono">{item.uom}</td>
                        <td className="font-mono font-bold text-center">{item.abcClass}</td>
                        <td className={`font-mono font-black text-right ${isLow ? 'text-rose-700' : 'text-emerald-700'}`}>
                          {agg.available} {isLow && '⚠'}
                        </td>
                        <td className="font-mono text-right">{item.reorderPoint}</td>
                        <td className="font-mono text-right">{formatCLP(item.unitCost)}</td>
                        <td className="font-mono text-right">{item.weightKg}</td>
                        <td className="font-mono">{item.defaultWarehouse}</td>
                        <td>
                          <button
                            type="button"
                            onClick={() => {
                              setReceiptForm({
                                itemId: item.id,
                                warehouseCode: item.defaultWarehouse,
                                qty: 20,
                                lotNumber: '',
                                lpn: '',
                                referenceDoc: `ASN-${item.sku}`,
                                createPutawayTask: true,
                                targetLocationCode: ''
                              });
                              setIsReceiptModalOpen(true);
                            }}
                            className="jde-btn"
                          >
                            <ArrowDownToLine size={10} /> Recepcionar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 3: P4611 - CENTRO DE TAREAS WMS (PUTAWAY, PICKING, CONTEO)      */}
      {/* =================================================================== */}
      {activeTab === 'P4611_TASKS' && (
        <div className="space-y-2 bg-white border border-[#9DB2C5] p-3">
          <div className="jde-grid-banner">
            <span>F4600 / F4611 — Cola de Tareas Dirigidas (Putaway, Picking por Olas, Transferencias y Conteo Cíclico)</span>
            <span className="font-mono">{filteredTasks.length} tareas</span>
          </div>
          <div className="overflow-x-auto jde-grid-scroll">
            <table className="jde-grid">
              <thead>
                <tr>
                  <th>Nº Tarea (TSKID)</th>
                  <th>Tipo Operación</th>
                  <th>Prioridad</th>
                  <th>Ola / Ref.</th>
                  <th>SKU &amp; LPN</th>
                  <th>Origen</th>
                  <th>Destino</th>
                  <th>Cant. Sol / Conf</th>
                  <th>Operario</th>
                  <th>Estado</th>
                  <th>Ejecución WMS</th>
                </tr>
                <tr className="jde-qbe-row">
                  <th><input value={qbeTaskNum} onChange={e => setQbeTaskNum(e.target.value)} placeholder="Tarea / SKU..." className="jde-qbe-input" /></th>
                  <th>
                    <select value={qbeTaskType} onChange={e => setQbeTaskType(e.target.value)} className="jde-qbe-input">
                      <option value="ALL">TODOS</option>
                      <option value="PUTAWAY">PUTAWAY</option>
                      <option value="PICKING">PICKING</option>
                      <option value="REPLENISHMENT">REPLENISHMENT</option>
                      <option value="TRANSFER">TRANSFER</option>
                      <option value="CYCLE_COUNT">CYCLE_COUNT</option>
                    </select>
                  </th>
                  <th></th>
                  <th><input value={qbeTaskWave} onChange={e => setQbeTaskWave(e.target.value)} placeholder="Ola..." className="jde-qbe-input" /></th>
                  <th colSpan={5}></th>
                  <th>
                    <select value={qbeTaskStatus} onChange={e => setQbeTaskStatus(e.target.value)} className="jde-qbe-input">
                      <option value="ALL">TODOS</option>
                      <option value="SUGGESTED">SUGGESTED</option>
                      <option value="IN_PROGRESS">IN_PROGRESS</option>
                      <option value="CONFIRMED">CONFIRMED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((t, idx) => (
                  <tr key={t.id} className={`jde-tr ${idx % 2 === 0 ? 'jde-row-even' : 'jde-row-odd'}`}>
                    <td className="font-mono font-black text-[#002D62]">{t.taskNumber}</td>
                    <td className="font-bold">{WMS_TASK_TYPE_LABELS[t.taskType]}</td>
                    <td className="font-mono text-[10px]">{t.priority}</td>
                    <td className="font-mono text-[10px]">
                      {t.waveNumber ? <span className="text-indigo-700 font-bold">{t.waveNumber}</span> : t.referenceOrder || '-'}
                    </td>
                    <td>
                      <div className="font-mono font-bold text-[#005B94]">{t.sku}</div>
                      <div className="text-[9.5px] font-mono text-slate-600">{t.lpn} · {t.lotNumber}</div>
                    </td>
                    <td className="font-mono font-bold">{t.fromLocation}</td>
                    <td className="font-mono font-bold text-emerald-700">{t.toLocation}</td>
                    <td className="font-mono font-bold text-right">
                      {t.qtyRequested} / <span className="text-indigo-700">{t.qtyConfirmed}</span> {t.uom}
                    </td>
                    <td className="text-[10px]">{t.assignedOperator}</td>
                    <td>
                      <span
                        className={`px-1.5 py-0.5 text-[9.5px] font-mono font-bold border ${
                          t.status === 'CONFIRMED'
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : t.status === 'IN_PROGRESS'
                            ? 'bg-sky-100 text-sky-900 border-sky-300'
                            : t.status === 'CANCELLED'
                            ? 'bg-rose-100 text-rose-900 border-rose-300'
                            : 'bg-amber-100 text-amber-900 border-amber-300'
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td>
                      {t.status === 'SUGGESTED' || t.status === 'IN_PROGRESS' ? (
                        <div className="flex items-center gap-1">
                          {t.status === 'SUGGESTED' && (
                            <button
                              type="button"
                              onClick={() => {
                                persistNextWorkspace({
                                  ...workspace,
                                  tasks: workspace.tasks.map(x => (x.id === t.id ? { ...x, status: 'IN_PROGRESS' } : x))
                                });
                              }}
                              className="jde-btn"
                              title="Marcar En Proceso"
                            >
                              <Play size={10} /> Iniciar
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmingTask(t);
                              setConfirmTaskQtyInput(t.qtyRequested);
                            }}
                            className="jde-btn jde-btn-primary"
                          >
                            <CheckCircle2 size={10} /> Confirmar
                          </button>
                          <button type="button" onClick={() => handleCancelTask(t)} className="jde-btn" title="Cancelar">
                            <X size={10} className="text-rose-700" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[9.5px] font-mono text-slate-500">Cerrada</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 4: P4114 - RECEPCIÓN ASN & CARDEX INMUTABLE (F4111)             */}
      {/* =================================================================== */}
      {activeTab === 'P4114_CARDEX' && (
        <div className="space-y-2 bg-white border border-[#9DB2C5] p-3">
          <div className="jde-grid-banner">
            <span>F4111 — Libro Mayor de Inventarios (Cardex Inmutable con Firma Criptográfica SHA-256)</span>
            <span className="font-mono">{filteredMovements.length} asientos</span>
          </div>
          <div className="overflow-x-auto jde-grid-scroll">
            <table className="jde-grid">
              <thead>
                <tr>
                  <th>Nº Cardex</th>
                  <th>Tipo</th>
                  <th>Referencia</th>
                  <th>Fecha</th>
                  <th>SKU</th>
                  <th>Bodega / Ubic.</th>
                  <th>LPN / Lote</th>
                  <th>Delta</th>
                  <th>Ant. → Nuevo</th>
                  <th>Valor CLP</th>
                  <th>Motivo / Operador</th>
                  <th>Sello SHA-256</th>
                </tr>
                <tr className="jde-qbe-row">
                  <th></th>
                  <th>
                    <select value={qbeKdxDocType} onChange={e => setQbeKdxDocType(e.target.value)} className="jde-qbe-input">
                      <option value="ALL">*</option>
                      <option value="OV">OV</option>
                      <option value="IT">IT</option>
                      <option value="SO">SO</option>
                      <option value="IA">IA</option>
                      <option value="PI">PI</option>
                    </select>
                  </th>
                  <th><input value={qbeKdxRef} onChange={e => setQbeKdxRef(e.target.value)} placeholder="Doc/Ref..." className="jde-qbe-input" /></th>
                  <th></th>
                  <th><input value={qbeKdxSku} onChange={e => setQbeKdxSku(e.target.value)} placeholder="SKU..." className="jde-qbe-input" /></th>
                  <th colSpan={7}></th>
                </tr>
              </thead>
              <tbody>
                {filteredMovements.map((m, idx) => (
                  <tr key={m.id} className={`jde-tr ${idx % 2 === 0 ? 'jde-row-even' : 'jde-row-odd'}`}>
                    <td className="font-mono font-black text-[#002D62]">{m.movementNumber}</td>
                    <td>
                      <span className="font-mono font-bold px-1.5 py-0.5 bg-[#E1EDF7] text-[#002D62] border border-[#9DB2C3]">
                        {m.docType}
                      </span>
                    </td>
                    <td className="font-mono text-[10px]">{m.referenceDoc}</td>
                    <td className="font-mono text-[10px]">{m.dateStr}</td>
                    <td>
                      <div className="font-mono font-bold text-[#005B94]">{m.sku}</div>
                      <div className="text-[9.5px] text-slate-600 truncate max-w-[180px]">{m.itemDescription}</div>
                    </td>
                    <td className="font-mono text-[10px]">{m.warehouseCode} / {m.locationCode}</td>
                    <td className="font-mono text-[10px]">{m.lpn} / {m.lotNumber}</td>
                    <td className={`font-mono font-black text-right ${m.qtyDelta >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {m.qtyDelta > 0 ? `+${m.qtyDelta}` : m.qtyDelta}
                    </td>
                    <td className="font-mono text-right">{m.previousStock} → <strong>{m.newStock}</strong></td>
                    <td className="font-mono text-right">{formatCLP(m.totalCost)}</td>
                    <td className="text-[10px]">
                      <div className="font-mono font-bold">{m.reasonCode}</div>
                      <div className="text-slate-500">{m.operator}</div>
                    </td>
                    <td className="font-mono text-[9px] text-emerald-800">{m.hashSignature.slice(0, 18)}…</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 5: P4915 - LOGÍSTICA DE DESPACHO, PACKING & TRANSPORTE          */}
      {/* =================================================================== */}
      {activeTab === 'P4915_DISPATCH' && (
        <div className="space-y-2 bg-white border border-[#9DB2C5] p-3">
          <div className="jde-grid-banner">
            <span>F4201 / F4915 — Despachos, Wave Picking, Packing &amp; Gestión de Flota Transporte</span>
            <span className="font-mono">{filteredShipments.length} embarques</span>
          </div>
          <div className="overflow-x-auto jde-grid-scroll">
            <table className="jde-grid">
              <thead>
                <tr>
                  <th>Nº Embarque</th>
                  <th>Ola (Wave)</th>
                  <th>Cliente / Destino</th>
                  <th>Transportista / Patente</th>
                  <th>Guía DTE 52</th>
                  <th>Líneas / Bultos / Kg</th>
                  <th>Fecha Prog.</th>
                  <th>Estado</th>
                  <th>Flujo Operativo</th>
                </tr>
                <tr className="jde-qbe-row">
                  <th colSpan={3}><input value={qbeShipNum} onChange={e => setQbeShipNum(e.target.value)} placeholder="Buscar Embarque o Cliente..." className="jde-qbe-input" /></th>
                  <th colSpan={4}></th>
                  <th>
                    <select value={qbeShipStatus} onChange={e => setQbeShipStatus(e.target.value)} className="jde-qbe-input">
                      <option value="ALL">TODOS</option>
                      <option value="PLANIFICADO">PLANIFICADO</option>
                      <option value="EN_PICKING">EN_PICKING</option>
                      <option value="EMPACADO">EMPACADO</option>
                      <option value="EN_RUTA">EN_RUTA</option>
                      <option value="ENTREGADO">ENTREGADO</option>
                    </select>
                  </th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredShipments.map((s, idx) => (
                  <tr key={s.id} className={`jde-tr ${idx % 2 === 0 ? 'jde-row-even' : 'jde-row-odd'}`}>
                    <td className="font-mono font-black text-[#002D62]">{s.shipmentNumber}</td>
                    <td className="font-mono text-indigo-700 font-bold">{s.waveNumber}</td>
                    <td>
                      <div className="font-bold text-slate-800">{s.customerOrSupplier}</div>
                      <div className="text-[10px] text-slate-600">{s.destinationAddress} ({s.city})</div>
                    </td>
                    <td>
                      <div className="font-semibold">{s.carrierName}</div>
                      <div className="text-[10px] font-mono text-slate-600">Patente: {s.vehiclePlate} · {s.driverName}</div>
                    </td>
                    <td className="font-mono font-bold text-[#005B94]">{s.guideNumber || 'PEND.'}</td>
                    <td className="font-mono text-[10px]">
                      {s.lines.length} SKU · {s.totalPackages} bultos · {s.totalWeightKg} kg
                    </td>
                    <td className="font-mono text-[10px]">{s.scheduledDate}</td>
                    <td>
                      <span className={`px-1.5 py-0.5 text-[9.5px] font-mono font-bold border ${getShipmentStatusBadge(s.status)}`}>
                        {s.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        {s.status !== 'ENTREGADO' && s.status !== 'INCIDENCIA' && (
                          <button
                            type="button"
                            onClick={() => handleAdvanceShipmentStage(s)}
                            className="jde-btn jde-btn-primary"
                          >
                            <ArrowUpFromLine size={10} />
                            {s.status === 'PLANIFICADO' && 'A Picking'}
                            {s.status === 'EN_PICKING' && 'Empacar'}
                            {s.status === 'EMPACADO' && 'Despachar Ruta'}
                            {s.status === 'EN_RUTA' && 'Confirmar POD'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setPreviewShipment(s)}
                          className="jde-btn"
                          title="Ver / Imprimir Picking List & Guía de Despacho"
                        >
                          <Printer size={10} /> Doc.
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB 6: P4100 - MAESTRO DE BODEGAS & UBICACIONES / RACKS (F4100)     */}
      {/* =================================================================== */}
      {activeTab === 'P4100_WAREHOUSES' && (
        <div className="space-y-2 bg-white border border-[#9DB2C5] p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-[#002D62]">Maestro de Centros de Distribución &amp; Ubicaciones F4100 / F4602</span>
            <button type="button" onClick={() => setIsNewLocationModalOpen(true)} className="jde-btn jde-btn-primary">
              <Plus size={12} /> Nueva Ubicación / Rack
            </button>
          </div>
          <div className="overflow-x-auto jde-grid-scroll">
            <table className="jde-grid">
              <thead>
                <tr>
                  <th>Bodega (MCU)</th>
                  <th>Nombre Centro Distribución</th>
                  <th>Ubicación (LOCN)</th>
                  <th>Pasillo / Rack / Nivel</th>
                  <th>Zona Logística</th>
                  <th>Control Temp.</th>
                  <th>Capacidad Máx.</th>
                  <th>LPNs Actuales</th>
                  <th>Estado</th>
                  <th>Control</th>
                </tr>
              </thead>
              <tbody>
                {filteredLocations.map((loc, idx) => {
                  const lpnsHere = workspace.balances.filter(
                    b => b.warehouseCode === loc.warehouseCode && b.locationCode === loc.locationCode && b.qtyOnHand > 0
                  ).length;
                  return (
                    <tr key={loc.id} className={`jde-tr ${idx % 2 === 0 ? 'jde-row-even' : 'jde-row-odd'}`}>
                      <td className="font-mono font-black text-[#002D62]">{loc.warehouseCode}</td>
                      <td>{loc.warehouseName}</td>
                      <td className="font-mono font-bold text-[#005B94]">{loc.locationCode}</td>
                      <td className="font-mono">{loc.aisle} / {loc.rack} / {loc.level}</td>
                      <td>{WMS_ZONE_LABELS[loc.zoneType]}</td>
                      <td className="font-mono">{loc.temperatureControl}</td>
                      <td className="font-mono">{loc.maxPallets} plts · {loc.maxWeightKg} kg</td>
                      <td className="font-mono font-bold text-center">{lpnsHere}</td>
                      <td>
                        <span
                          className={`px-1.5 py-0.5 text-[9.5px] font-mono font-bold border ${
                            loc.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : 'bg-rose-100 text-rose-900 border-rose-300'
                          }`}
                        >
                          {loc.status}
                        </span>
                      </td>
                      <td>
                        <button type="button" onClick={() => handleToggleLocationStatus(loc)} className="jde-btn">
                          {loc.status === 'ACTIVE' ? 'Bloquear (HOLD)' : 'Activar'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODALS (ALL USING JDE ENTERPRISE DIALOGS)                           */}
      {/* =================================================================== */}

      {/* MODAL: NEW ITEM F4101 */}
      {isNewItemModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[200] flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#002D62] shadow-2xl w-full max-w-2xl">
            <div className="bg-[#002D62] text-white px-4 py-2 flex items-center justify-between">
              <span className="font-mono text-xs font-bold">P4101_W4101A — Alta de Artículo Maestro Logístico (F4101)</span>
              <button type="button" onClick={() => setIsNewItemModalOpen(false)} className="text-white hover:text-amber-300"><X size={15} /></button>
            </div>
            <form onSubmit={handleCreateItem} className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-[#002D62] mb-1">Código SKU (LITM) *</label>
                  <input value={itemForm.sku} onChange={e => setItemForm({ ...itemForm, sku: e.target.value })} placeholder="Ej: SKU-CNV-900" className="w-full jde-input uppercase font-mono" required />
                </div>
                <div className="md:col-span-2">
                  <label className="block font-bold text-[#002D62] mb-1">Descripción del Artículo (DSC1) *</label>
                  <input value={itemForm.description} onChange={e => setItemForm({ ...itemForm, description: e.target.value })} placeholder="Ej: Cinta Empaque Industrial..." className="w-full jde-input" required />
                </div>
                <div>
                  <label className="block font-bold text-[#002D62] mb-1">Categoría Logística</label>
                  <select value={itemForm.category} onChange={e => setItemForm({ ...itemForm, category: e.target.value })} className="w-full jde-input">
                    {WMS_CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#002D62] mb-1">Unidad Medida (UOM)</label>
                  <select value={itemForm.uom} onChange={e => setItemForm({ ...itemForm, uom: e.target.value as WmsUomType })} className="w-full jde-input font-mono">
                    {(['UN', 'CJ', 'PLT', 'KG', 'LT', 'MT', 'KIT'] as WmsUomType[]).map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#002D62] mb-1">Clasificación ABC</label>
                  <select value={itemForm.abcClass} onChange={e => setItemForm({ ...itemForm, abcClass: e.target.value as WmsAbcClass })} className="w-full jde-input font-mono">
                    <option value="A">Clase A (Alta Rotación)</option>
                    <option value="B">Clase B (Media Rotación)</option>
                    <option value="C">Clase C (Baja Rotación)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#002D62] mb-1">Costo Unitario (CLP)</label>
                  <input type="number" min={0} value={itemForm.unitCost} onChange={e => setItemForm({ ...itemForm, unitCost: Number(e.target.value) })} className="w-full jde-input font-mono" />
                </div>
                <div>
                  <label className="block font-bold text-[#002D62] mb-1">Punto de Reorden</label>
                  <input type="number" min={0} value={itemForm.reorderPoint} onChange={e => setItemForm({ ...itemForm, reorderPoint: Number(e.target.value) })} className="w-full jde-input font-mono" />
                </div>
                <div>
                  <label className="block font-bold text-[#002D62] mb-1">Peso Unitario (kg)</label>
                  <input type="number" min={0} step="0.1" value={itemForm.weightKg} onChange={e => setItemForm({ ...itemForm, weightKg: Number(e.target.value) })} className="w-full jde-input font-mono" />
                </div>
                <div>
                  <label className="block font-bold text-[#002D62] mb-1">Bodega Base (MCU)</label>
                  <select value={itemForm.defaultWarehouse} onChange={e => setItemForm({ ...itemForm, defaultWarehouse: e.target.value })} className="w-full jde-input font-mono">
                    {warehouses.map(w => <option key={w.code} value={w.code}>{w.code}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#002D62] mb-1">Zona Putaway Preferida</label>
                  <select value={itemForm.preferredPutawayZone} onChange={e => setItemForm({ ...itemForm, preferredPutawayZone: e.target.value as WmsZoneType })} className="w-full jde-input">
                    <option value="PUTAWAY_STORAGE">Reserva / Racks (STK)</option>
                    <option value="PICKING">Zona Picking Directo (PK)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#002D62] mb-1">Código Barras EAN-13</label>
                  <input value={itemForm.barcode} onChange={e => setItemForm({ ...itemForm, barcode: e.target.value })} placeholder="Auto si se deja vacío" className="w-full jde-input font-mono" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button type="button" onClick={() => setIsNewItemModalOpen(false)} className="jde-btn">Cancelar</button>
                <button type="submit" className="jde-btn jde-btn-primary">Guardar Artículo F4101</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: INBOUND RECEIPT ASN / OV */}
      {isReceiptModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[200] flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#002D62] shadow-2xl w-full max-w-xl">
            <div className="bg-[#002D62] text-white px-4 py-2 flex items-center justify-between">
              <span className="font-mono text-xs font-bold">P4114_OV — Recepción Entrante de Mercadería (ASN / Compra)</span>
              <button type="button" onClick={() => setIsReceiptModalOpen(false)} className="text-white hover:text-amber-300"><X size={15} /></button>
            </div>
            <form onSubmit={handleInboundReceipt} className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="block font-bold text-[#002D62] mb-1">Artículo SKU (F4101) *</label>
                  <select value={receiptForm.itemId} onChange={e => setReceiptForm({ ...receiptForm, itemId: e.target.value })} className="w-full jde-input" required>
                    <option value="">-- Seleccione SKU --</option>
                    {workspace.items.map(i => (
                      <option key={i.id} value={i.id}>{i.sku} — {i.description} ({i.uom})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#002D62] mb-1">Bodega Destino (MCU)</label>
                  <select value={receiptForm.warehouseCode} onChange={e => setReceiptForm({ ...receiptForm, warehouseCode: e.target.value })} className="w-full jde-input font-mono">
                    {warehouses.map(w => <option key={w.code} value={w.code}>{w.code} — {w.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#002D62] mb-1">Cantidad Recibida *</label>
                  <input type="number" min={1} value={receiptForm.qty} onChange={e => setReceiptForm({ ...receiptForm, qty: Number(e.target.value) })} className="w-full jde-input font-mono" required />
                </div>
                <div>
                  <label className="block font-bold text-[#002D62] mb-1">Nº Lote (Auto si vacío)</label>
                  <input value={receiptForm.lotNumber} onChange={e => setReceiptForm({ ...receiptForm, lotNumber: e.target.value })} placeholder="Ej: LOT-2611-A" className="w-full jde-input font-mono uppercase" />
                </div>
                <div>
                  <label className="block font-bold text-[#002D62] mb-1">LPN / Pallet ID (Auto si vacío)</label>
                  <input value={receiptForm.lpn} onChange={e => setReceiptForm({ ...receiptForm, lpn: e.target.value })} placeholder="Ej: LPN-SCL-00999" className="w-full jde-input font-mono uppercase" />
                </div>
                <div>
                  <label className="block font-bold text-[#002D62] mb-1">Documento ASN / OC Referencia</label>
                  <input value={receiptForm.referenceDoc} onChange={e => setReceiptForm({ ...receiptForm, referenceDoc: e.target.value })} placeholder="Ej: ASN-2026-901" className="w-full jde-input font-mono uppercase" />
                </div>
                <div>
                  <label className="block font-bold text-[#002D62] mb-1">Ubicación Rack Destino</label>
                  <select value={receiptForm.targetLocationCode} onChange={e => setReceiptForm({ ...receiptForm, targetLocationCode: e.target.value })} className="w-full jde-input font-mono">
                    <option value="">Sugerencia Automática WMS (F4602)</option>
                    {workspace.locations
                      .filter(l => l.warehouseCode === receiptForm.warehouseCode && l.status === 'ACTIVE')
                      .map(l => <option key={l.id} value={l.locationCode}>{l.locationCode} ({l.zoneType})</option>)}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 pt-1 font-semibold text-[#002D62] cursor-pointer">
                <input
                  type="checkbox"
                  checked={receiptForm.createPutawayTask}
                  onChange={e => setReceiptForm({ ...receiptForm, createPutawayTask: e.target.checked })}
                />
                Ingresar en Muelle Recepción (REC) y generar Tarea Putaway automática en P4611
              </label>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button type="button" onClick={() => setIsReceiptModalOpen(false)} className="jde-btn">Cancelar</button>
                <button type="submit" className="jde-btn jde-btn-primary">Confirmar Recepción F4111</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: INVENTORY ADJUSTMENT IA */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[200] flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#002D62] shadow-2xl w-full max-w-lg">
            <div className="bg-[#002D62] text-white px-4 py-2 flex items-center justify-between">
              <span className="font-mono text-xs font-bold">P4114_IA — Ajuste de Inventario Cardex (F4111)</span>
              <button type="button" onClick={() => setIsAdjustModalOpen(false)} className="text-white hover:text-amber-300"><X size={15} /></button>
            </div>
            <form onSubmit={handleInventoryAdjust} className="p-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-[#002D62] mb-1">Registro de Saldo / LPN *</label>
                <select value={adjustForm.balanceId} onChange={e => setAdjustForm({ ...adjustForm, balanceId: e.target.value })} className="w-full jde-input" required>
                  {workspace.balances.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.warehouseCode} · {b.locationCode} · {b.sku} [{b.lpn}] (Stock: {b.qtyOnHand})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#002D62] mb-1">Variación (+ o -) *</label>
                  <input type="number" value={adjustForm.qtyDelta} onChange={e => setAdjustForm({ ...adjustForm, qtyDelta: Number(e.target.value) })} className="w-full jde-input font-mono" required />
                </div>
                <div>
                  <label className="block font-bold text-[#002D62] mb-1">Código Motivo JDE</label>
                  <select value={adjustForm.reasonCode} onChange={e => setAdjustForm({ ...adjustForm, reasonCode: e.target.value })} className="w-full jde-input font-mono">
                    <option value="AJUSTE_AUDITORIA">AJUSTE_AUDITORIA</option>
                    <option value="MERMA_OPERATIVA">MERMA_OPERATIVA</option>
                    <option value="ROTURA_MANIPULACION">ROTURA_MANIPULACION</option>
                    <option value="SOBRANTE_CONTEO">SOBRANTE_CONTEO</option>
                    <option value="INVENTARIO_INICIAL">INVENTARIO_INICIAL</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button type="button" onClick={() => setIsAdjustModalOpen(false)} className="jde-btn">Cancelar</button>
                <button type="submit" className="jde-btn jde-btn-primary">Asentar Ajuste IA</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NEW MANUAL WMS TASK P4611 */}
      {isNewTaskModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[200] flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#002D62] shadow-2xl w-full max-w-xl">
            <div className="bg-[#002D62] text-white px-4 py-2 flex items-center justify-between">
              <span className="font-mono text-xs font-bold">P4611_W4611A — Nueva Tarea Dirigida WMS</span>
              <button type="button" onClick={() => setIsNewTaskModalOpen(false)} className="text-white hover:text-amber-300"><X size={15} /></button>
            </div>
            <form onSubmit={handleCreateManualTask} className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#002D62] mb-1">Tipo de Tarea</label>
                  <select value={taskForm.taskType} onChange={e => setTaskForm({ ...taskForm, taskType: e.target.value as WmsTaskType })} className="w-full jde-input">
                    <option value="TRANSFER">Transferencia entre Ubicaciones</option>
                    <option value="REPLENISHMENT">Reposición Reserva → Picking</option>
                    <option value="PUTAWAY">Putaway Manual</option>
                    <option value="CYCLE_COUNT">Conteo Cíclico (F4124)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#002D62] mb-1">Prioridad</label>
                  <select value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value as any })} className="w-full jde-input font-mono">
                    <option value="1-CRÍTICA">1-CRÍTICA</option>
                    <option value="2-ALTA">2-ALTA</option>
                    <option value="3-NORMAL">3-NORMAL</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block font-bold text-[#002D62] mb-1">Saldo Origen / LPN *</label>
                  <select value={taskForm.balanceId} onChange={e => setTaskForm({ ...taskForm, balanceId: e.target.value })} className="w-full jde-input" required>
                    <option value="">-- Seleccione SKU / Ubicación / LPN --</option>
                    {workspace.balances
                      .filter(b => b.qtyOnHand > 0)
                      .map(b => (
                        <option key={b.id} value={b.id}>
                          {b.warehouseCode} · {b.locationCode} · {b.sku} [{b.lpn}] (Disp: {Math.max(0, b.qtyOnHand - b.qtyCommitted)})
                        </option>
                      ))}
                  </select>
                </div>
                {taskForm.taskType !== 'CYCLE_COUNT' && (
                  <>
                    <div>
                      <label className="block font-bold text-[#002D62] mb-1">Cantidad a Mover</label>
                      <input type="number" min={1} value={taskForm.qtyRequested} onChange={e => setTaskForm({ ...taskForm, qtyRequested: Number(e.target.value) })} className="w-full jde-input font-mono" required />
                    </div>
                    <div>
                      <label className="block font-bold text-[#002D62] mb-1">Ubicación Destino</label>
                      <select value={taskForm.toLocation} onChange={e => setTaskForm({ ...taskForm, toLocation: e.target.value })} className="w-full jde-input font-mono">
                        <option value="">Sugerencia Automática WMS</option>
                        {workspace.locations
                          .filter(l => l.status === 'ACTIVE')
                          .map(l => <option key={l.id} value={l.locationCode}>{l.warehouseCode} · {l.locationCode} ({l.zoneType})</option>)}
                      </select>
                    </div>
                  </>
                )}
                <div className="md:col-span-2">
                  <label className="block font-bold text-[#002D62] mb-1">Operario Asignado</label>
                  <input value={taskForm.assignedOperator} onChange={e => setTaskForm({ ...taskForm, assignedOperator: e.target.value })} className="w-full jde-input" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button type="button" onClick={() => setIsNewTaskModalOpen(false)} className="jde-btn">Cancelar</button>
                <button type="submit" className="jde-btn jde-btn-primary">Emitir Tarea P4611</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM TASK EXECUTION */}
      {confirmingTask && (
        <div className="fixed inset-0 bg-slate-900/60 z-[200] flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#002D62] shadow-2xl w-full max-w-md">
            <div className="bg-[#002D62] text-white px-4 py-2 flex items-center justify-between">
              <span className="font-mono text-xs font-bold">Confirmar Ejecución: {confirmingTask.taskNumber}</span>
              <button type="button" onClick={() => setConfirmingTask(null)} className="text-white hover:text-amber-300"><X size={15} /></button>
            </div>
            <form onSubmit={handleConfirmTaskExecution} className="p-4 space-y-3 text-xs">
              <div className="bg-[#F4F8FB] border border-[#9DB2C3] p-2.5 font-mono text-[11px] space-y-1">
                <div><strong>Tipo:</strong> {WMS_TASK_TYPE_LABELS[confirmingTask.taskType]}</div>
                <div><strong>SKU:</strong> {confirmingTask.sku} ({confirmingTask.lpn})</div>
                <div><strong>Ruta:</strong> {confirmingTask.fromLocation} → {confirmingTask.toLocation}</div>
                <div><strong>Solicitado:</strong> {confirmingTask.qtyRequested} {confirmingTask.uom}</div>
              </div>
              <div>
                <label className="block font-bold text-[#002D62] mb-1">
                  {confirmingTask.taskType === 'CYCLE_COUNT' ? 'Cantidad Física Contada:' : 'Cantidad Confirmada:'}
                </label>
                <input
                  type="number"
                  min={0}
                  value={confirmTaskQtyInput}
                  onChange={e => setConfirmTaskQtyInput(Number(e.target.value))}
                  className="w-full jde-input font-mono font-bold text-sm"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button type="button" onClick={() => setConfirmingTask(null)} className="jde-btn">Cancelar</button>
                <button type="submit" className="jde-btn jde-btn-primary">Confirmar &amp; Actualizar F4111</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NEW SHIPMENT F4915 */}
      {isNewShipmentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[200] flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#002D62] shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="bg-[#002D62] text-white px-4 py-2 flex items-center justify-between shrink-0">
              <span className="font-mono text-xs font-bold">P4915_W4915A — Nueva Orden de Despacho &amp; Wave Picking</span>
              <button type="button" onClick={() => setIsNewShipmentModalOpen(false)} className="text-white hover:text-amber-300"><X size={15} /></button>
            </div>
            <form onSubmit={handleCreateShipment} className="p-4 space-y-3 text-xs overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block font-bold text-[#002D62] mb-1">Cliente / Destinatario *</label>
                  <input value={shipmentForm.customerOrSupplier} onChange={e => setShipmentForm({ ...shipmentForm, customerOrSupplier: e.target.value })} placeholder="Ej: DISTRIBUIDORA PACÍFICO S.A." className="w-full jde-input" required />
                </div>
                <div>
                  <label className="block font-bold text-[#002D62] mb-1">Bodega Despacho (MCU)</label>
                  <select value={shipmentForm.warehouseCode} onChange={e => setShipmentForm({ ...shipmentForm, warehouseCode: e.target.value, lines: [] })} className="w-full jde-input font-mono">
                    {warehouses.map(w => <option key={w.code} value={w.code}>{w.code}</option>)}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block font-bold text-[#002D62] mb-1">Dirección de Entrega</label>
                  <input value={shipmentForm.destinationAddress} onChange={e => setShipmentForm({ ...shipmentForm, destinationAddress: e.target.value })} placeholder="Av. Industrial 4500, Bodega 12" className="w-full jde-input" />
                </div>
                <div>
                  <label className="block font-bold text-[#002D62] mb-1">Ciudad / Destino</label>
                  <input value={shipmentForm.city} onChange={e => setShipmentForm({ ...shipmentForm, city: e.target.value })} className="w-full jde-input" />
                </div>
                <div>
                  <label className="block font-bold text-[#002D62] mb-1">Empresa Transporte</label>
                  <input value={shipmentForm.carrierName} onChange={e => setShipmentForm({ ...shipmentForm, carrierName: e.target.value })} className="w-full jde-input" />
                </div>
                <div>
                  <label className="block font-bold text-[#002D62] mb-1">Patente Camión</label>
                  <input value={shipmentForm.vehiclePlate} onChange={e => setShipmentForm({ ...shipmentForm, vehiclePlate: e.target.value })} placeholder="XX-YY-11" className="w-full jde-input font-mono uppercase" />
                </div>
                <div>
                  <label className="block font-bold text-[#002D62] mb-1">Nombre Chofer</label>
                  <input value={shipmentForm.driverName} onChange={e => setShipmentForm({ ...shipmentForm, driverName: e.target.value })} placeholder="Nombre Completo" className="w-full jde-input" />
                </div>
              </div>

              {/* Add SKU Line Selector */}
              <div className="bg-[#F4F8FB] border border-[#9DB2C3] p-3 space-y-2">
                <div className="font-bold text-[#002D62] uppercase font-mono text-[10px]">Agregar Líneas con Stock Disponible ({shipmentForm.warehouseCode})</div>
                <div className="flex flex-wrap gap-2 items-center">
                  <select value={draftLineBalanceId} onChange={e => setDraftLineBalanceId(e.target.value)} className="flex-1 min-w-[220px] jde-input">
                    <option value="">-- Seleccione SKU / Ubicación / Lote --</option>
                    {workspace.balances
                      .filter(b => b.warehouseCode === shipmentForm.warehouseCode && b.lotStatus === 'APPROVED' && b.qtyOnHand - b.qtyCommitted > 0)
                      .map(b => (
                        <option key={b.id} value={b.id}>
                          {b.sku} · {b.locationCode} [{b.lotNumber}] — Disp: {b.qtyOnHand - b.qtyCommitted}
                        </option>
                      ))}
                  </select>
                  <input type="number" min={1} value={draftLineQty} onChange={e => setDraftLineQty(Number(e.target.value))} className="w-24 jde-input font-mono" />
                  <button type="button" onClick={handleAddShipmentLine} className="jde-btn jde-btn-primary">
                    <Plus size={11} /> Agregar Línea
                  </button>
                </div>

                {shipmentForm.lines.length > 0 && (
                  <table className="jde-grid mt-2">
                    <thead>
                      <tr>
                        <th>SKU</th>
                        <th>Descripción</th>
                        <th>Ubicación</th>
                        <th>Lote</th>
                        <th>Cantidad</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {shipmentForm.lines.map((ln, idx) => (
                        <tr key={idx}>
                          <td className="font-mono font-bold">{ln.sku}</td>
                          <td>{ln.description}</td>
                          <td className="font-mono">{ln.fromLocation}</td>
                          <td className="font-mono">{ln.lotNumber}</td>
                          <td className="font-mono font-bold">{ln.qty} {ln.uom}</td>
                          <td>
                            <button
                              type="button"
                              onClick={() => setShipmentForm(prev => ({ ...prev, lines: prev.lines.filter((_, i) => i !== idx) }))}
                              className="text-rose-700 font-bold"
                            >
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button type="button" onClick={() => setIsNewShipmentModalOpen(false)} className="jde-btn">Cancelar</button>
                <button type="submit" className="jde-btn jde-btn-primary">Emitir Embarque &amp; Lanzar Picking</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NEW WAREHOUSE LOCATION F4100 */}
      {isNewLocationModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-[200] flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#002D62] shadow-2xl w-full max-w-lg">
            <div className="bg-[#002D62] text-white px-4 py-2 flex items-center justify-between">
              <span className="font-mono text-xs font-bold">P4100_W4100A — Nueva Ubicación / Rack (F4100)</span>
              <button type="button" onClick={() => setIsNewLocationModalOpen(false)} className="text-white hover:text-amber-300"><X size={15} /></button>
            </div>
            <form onSubmit={handleCreateLocation} className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#002D62] mb-1">Código Bodega (MCU) *</label>
                  <input value={locationForm.warehouseCode} onChange={e => setLocationForm({ ...locationForm, warehouseCode: e.target.value })} className="w-full jde-input font-mono uppercase" required />
                </div>
                <div>
                  <label className="block font-bold text-[#002D62] mb-1">Código Ubicación (LOCN) *</label>
                  <input value={locationForm.locationCode} onChange={e => setLocationForm({ ...locationForm, locationCode: e.target.value })} placeholder="Ej: A03-R01-N1" className="w-full jde-input font-mono uppercase" required />
                </div>
                <div className="col-span-2">
                  <label className="block font-bold text-[#002D62] mb-1">Nombre Bodega / Centro</label>
                  <input value={locationForm.warehouseName} onChange={e => setLocationForm({ ...locationForm, warehouseName: e.target.value })} className="w-full jde-input" />
                </div>
                <div>
                  <label className="block font-bold text-[#002D62] mb-1">Zona Logística</label>
                  <select value={locationForm.zoneType} onChange={e => setLocationForm({ ...locationForm, zoneType: e.target.value as WmsZoneType })} className="w-full jde-input">
                    {Object.entries(WMS_ZONE_LABELS).map(([k, lbl]) => <option key={k} value={k}>{lbl}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-[#002D62] mb-1">Capacidad Pallets</label>
                  <input type="number" min={1} value={locationForm.maxPallets} onChange={e => setLocationForm({ ...locationForm, maxPallets: Number(e.target.value) })} className="w-full jde-input font-mono" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button type="button" onClick={() => setIsNewLocationModalOpen(false)} className="jde-btn">Cancelar</button>
                <button type="submit" className="jde-btn jde-btn-primary">Crear Ubicación F4100</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PRINTABLE PICKING LIST / PACKING SLIP / GUÍA F4915 */}
      {previewShipment && (
        <div className="fixed inset-0 bg-slate-900/65 z-[220] flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#002D62] shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="bg-[#002D62] text-white px-4 py-2 flex items-center justify-between no-print">
              <span className="font-mono text-xs font-bold">Documento Logístico — {previewShipment.shipmentNumber}</span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={handlePrintShipmentDocument} className="jde-btn">
                  <Printer size={12} /> Imprimir / PDF
                </button>
                <button type="button" onClick={() => setPreviewShipment(null)} className="text-white hover:text-amber-300"><X size={15} /></button>
              </div>
            </div>
            <div id="printable-wms-shipment" className="p-6 bg-white text-slate-900 overflow-y-auto text-xs space-y-4">
              <div className="flex justify-between items-start border-b-2 border-[#002D62] pb-3">
                <div>
                  <h2 className="text-base font-black text-[#002D62] uppercase">HOJA DE PICKING &amp; GUÍA DE DESPACHO WMS (F4915)</h2>
                  <p className="font-mono text-[11px] text-slate-600">AssetFlow Enterprise Supply Chain · División Logística Independiente</p>
                </div>
                <div className="text-right font-mono">
                  <div className="font-black text-sm text-[#002D62]">{previewShipment.shipmentNumber}</div>
                  <div className="text-[11px]">Ola: {previewShipment.waveNumber}</div>
                  <div className="text-[11px] font-bold text-indigo-800">Guía DTE 52: {previewShipment.guideNumber}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 bg-slate-50 border border-slate-300 p-3">
                <div>
                  <p className="font-bold uppercase text-[10px] text-slate-500">Destinatario / Cliente</p>
                  <p className="font-black">{previewShipment.customerOrSupplier}</p>
                  <p>{previewShipment.destinationAddress} — {previewShipment.city}</p>
                </div>
                <div>
                  <p className="font-bold uppercase text-[10px] text-slate-500">Transporte &amp; Planta Origen</p>
                  <p><strong>Bodega:</strong> {previewShipment.warehouseCode} | <strong>Flota:</strong> {previewShipment.carrierName}</p>
                  <p><strong>Patente:</strong> {previewShipment.vehiclePlate} | <strong>Chofer:</strong> {previewShipment.driverName}</p>
                </div>
              </div>
              <table className="jde-grid">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Descripción Artículo</th>
                    <th>Ubicación Origen</th>
                    <th>Lote</th>
                    <th>Solicitado</th>
                    <th>Pickeado</th>
                    <th>UOM</th>
                  </tr>
                </thead>
                <tbody>
                  {previewShipment.lines.map((l, i) => (
                    <tr key={i}>
                      <td className="font-mono font-bold">{l.sku}</td>
                      <td>{l.description}</td>
                      <td className="font-mono">{l.fromLocation}</td>
                      <td className="font-mono">{l.lotNumber}</td>
                      <td className="font-mono font-bold text-right">{l.qty}</td>
                      <td className="font-mono font-bold text-right">{l.pickedQty}</td>
                      <td className="font-mono">{l.uom}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-between font-mono text-[11px] pt-2 border-t border-slate-300">
                <span>Total Bultos: <strong>{previewShipment.totalPackages}</strong></span>
                <span>Peso Bruto Estimado: <strong>{previewShipment.totalWeightKg} kg</strong></span>
                <span>Estado Actual: <strong>{previewShipment.status}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogisticsWmsModule;
