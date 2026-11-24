import {
  WmsItemMaster,
  WmsLocation,
  WmsStockBalance,
  WmsWarehouseTask,
  WmsMovementLedger,
  WmsShipmentOrder,
  WmsWorkspaceState,
  WmsZoneType,
  WmsDocType,
  WmsTaskType
} from '../types';

export const WMS_CATEGORY_OPTIONS = [
  'Embalaje & Pallets',
  'EPP & Seguridad Industrial',
  'Equipamiento Logístico',
  'Repuestos & Mantenimiento',
  'Lubricantes & Insumos',
  'Electrónica & RF',
  'Mercadería General'
];

export const WMS_ZONE_LABELS: Record<WmsZoneType, string> = {
  RECEIVING: 'Muelle Recepción (REC)',
  PUTAWAY_STORAGE: 'Reserva / Racks (STK)',
  PICKING: 'Zona Picking (PK)',
  PACKING: 'Empaque / Packing (PKG)',
  DISPATCH_DOCK: 'Andén Despacho (DSP)',
  QUARANTINE: 'Cuarentena / Calidad (QRN)'
};

export const WMS_DOC_TYPE_LABELS: Record<WmsDocType, { code: string; label: string }> = {
  OV: { code: 'OV', label: 'Recepción Compra / ASN' },
  IA: { code: 'IA', label: 'Ajuste de Inventario' },
  IT: { code: 'IT', label: 'Transferencia / Putaway' },
  SO: { code: 'SO', label: 'Despacho / Salida F4915' },
  PI: { code: 'PI', label: 'Conteo Cíclico (F4124)' }
};

export const WMS_TASK_TYPE_LABELS: Record<WmsTaskType, string> = {
  PUTAWAY: 'Putaway (Almacenamiento)',
  PICKING: 'Picking (Preparación)',
  REPLENISHMENT: 'Reposición a Picking',
  CYCLE_COUNT: 'Conteo Cíclico',
  TRANSFER: 'Transferencia Interna'
};

export async function computeWmsSha256(payload: Record<string, any>): Promise<string> {
  const canonical = JSON.stringify(payload, Object.keys(payload).sort());
  try {
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      const encoded = new TextEncoder().encode(canonical);
      const digest = await window.crypto.subtle.digest('SHA-256', encoded);
      return Array.from(new Uint8Array(digest))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    // Fallback deterministic hash if subtle crypto unavailable
  }
  let h1 = 0xdeadbeef ^ canonical.length;
  let h2 = 0x41c6ce57 ^ canonical.length;
  for (let i = 0; i < canonical.length; i++) {
    const ch = canonical.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (
    (h2 >>> 0).toString(16).padStart(8, '0') +
    (h1 >>> 0).toString(16).padStart(8, '0')
  ).repeat(4).slice(0, 64);
}

export function createWmsSyncHash(seed: string): string {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `SHA256-${(h >>> 0).toString(16).padStart(8, '0').toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
}

export function suggestPutawayLocation(
  locations: WmsLocation[],
  balances: WmsStockBalance[],
  warehouseCode: string,
  preferredZone: WmsZoneType = 'PUTAWAY_STORAGE'
): WmsLocation | undefined {
  const candidates = locations.filter(
    l => l.warehouseCode === warehouseCode && l.status === 'ACTIVE' && l.zoneType === preferredZone
  );
  const pool = candidates.length > 0
    ? candidates
    : locations.filter(l => l.warehouseCode === warehouseCode && l.status === 'ACTIVE' && l.zoneType === 'PUTAWAY_STORAGE');

  if (pool.length === 0) return locations.find(l => l.warehouseCode === warehouseCode && l.status === 'ACTIVE');

  // Escoger ubicación con menor cantidad de LPNs ocupados (balanceo de carga en racks)
  return [...pool].sort((a, b) => {
    const countA = balances.filter(bal => bal.locationCode === a.locationCode && bal.qtyOnHand > 0).length;
    const countB = balances.filter(bal => bal.locationCode === b.locationCode && bal.qtyOnHand > 0).length;
    return countA - countB;
  })[0];
}

export function createInitialWmsWorkspace(currentUser: string = 'SISTEMA'): WmsWorkspaceState {
  const today = new Date().toISOString().split('T')[0];
  const now = Date.now();

  const items: WmsItemMaster[] = [
    {
      id: 'wms-item-1',
      sku: 'SKU-PAL-1210',
      description: 'Pallet Madera Certificado NIMF-15 (1200x1000mm)',
      category: 'Embalaje & Pallets',
      uom: 'UN',
      abcClass: 'A',
      stockStatus: 'AVAILABLE',
      minStock: 80,
      reorderPoint: 120,
      unitCost: 14500,
      weightKg: 22,
      volumeM3: 0.18,
      lotControl: true,
      defaultWarehouse: 'CD-SCL-01',
      preferredPutawayZone: 'PUTAWAY_STORAGE',
      barcode: '7804610012104',
      userCreator: currentUser,
      createdAt: today,
      updatedAt: today
    },
    {
      id: 'wms-item-2',
      sku: 'SKU-FLM-5023',
      description: 'Bobina Film Stretch Industrial 500mm x 23mic',
      category: 'Embalaje & Pallets',
      uom: 'CJ',
      abcClass: 'A',
      stockStatus: 'AVAILABLE',
      minStock: 40,
      reorderPoint: 70,
      unitCost: 38900,
      weightKg: 14.5,
      volumeM3: 0.06,
      lotControl: true,
      defaultWarehouse: 'CD-SCL-01',
      preferredPutawayZone: 'PICKING',
      barcode: '7804610050230',
      userCreator: currentUser,
      createdAt: today,
      updatedAt: today
    },
    {
      id: 'wms-item-3',
      sku: 'SKU-RFZ-3600',
      description: 'Terminal Captura RF / Scanner Barcode 2D Industrial',
      category: 'Electrónica & RF',
      uom: 'UN',
      abcClass: 'A',
      stockStatus: 'AVAILABLE',
      minStock: 10,
      reorderPoint: 15,
      unitCost: 485000,
      weightKg: 0.55,
      volumeM3: 0.008,
      lotControl: true,
      defaultWarehouse: 'CD-SCL-01',
      preferredPutawayZone: 'PICKING',
      barcode: '7804610036005',
      userCreator: currentUser,
      createdAt: today,
      updatedAt: today
    },
    {
      id: 'wms-item-4',
      sku: 'SKU-EPP-3970',
      description: 'Kit Seguridad Operario Bodega (Casco EN397 + Chaleco + Botín)',
      category: 'EPP & Seguridad Industrial',
      uom: 'KIT',
      abcClass: 'B',
      stockStatus: 'AVAILABLE',
      minStock: 25,
      reorderPoint: 45,
      unitCost: 62000,
      weightKg: 2.3,
      volumeM3: 0.035,
      lotControl: false,
      defaultWarehouse: 'CD-SCL-01',
      preferredPutawayZone: 'PICKING',
      barcode: '7804610039709',
      userCreator: currentUser,
      createdAt: today,
      updatedAt: today
    },
    {
      id: 'wms-item-5',
      sku: 'SKU-LUB-VG46',
      description: 'Tambor Aceite Hidráulico Montacargas ISO VG-46 (208L)',
      category: 'Lubricantes & Insumos',
      uom: 'UN',
      abcClass: 'B',
      stockStatus: 'AVAILABLE',
      minStock: 8,
      reorderPoint: 14,
      unitCost: 342000,
      weightKg: 188,
      volumeM3: 0.29,
      lotControl: true,
      defaultWarehouse: 'CD-SCL-01',
      preferredPutawayZone: 'PUTAWAY_STORAGE',
      barcode: '7804610046208',
      userCreator: currentUser,
      createdAt: today,
      updatedAt: today
    },
    {
      id: 'wms-item-6',
      sku: 'SKU-CAJ-6040',
      description: 'Caja Cartón Corrugado Doble Onda Export 60x40x40cm (Pack x25)',
      category: 'Embalaje & Pallets',
      uom: 'PLT',
      abcClass: 'A',
      stockStatus: 'AVAILABLE',
      minStock: 12,
      reorderPoint: 20,
      unitCost: 215000,
      weightKg: 140,
      volumeM3: 1.2,
      lotControl: true,
      defaultWarehouse: 'CD-NOR-02',
      preferredPutawayZone: 'PUTAWAY_STORAGE',
      barcode: '7804610060403',
      userCreator: currentUser,
      createdAt: today,
      updatedAt: today
    },
    {
      id: 'wms-item-7',
      sku: 'SKU-TRP-2500',
      description: 'Transpaleta Hidráulica Manual 2.500 kg Horquilla 1150mm',
      category: 'Equipamiento Logístico',
      uom: 'UN',
      abcClass: 'C',
      stockStatus: 'AVAILABLE',
      minStock: 4,
      reorderPoint: 6,
      unitCost: 389000,
      weightKg: 74,
      volumeM3: 0.65,
      lotControl: true,
      defaultWarehouse: 'CD-NOR-02',
      preferredPutawayZone: 'PUTAWAY_STORAGE',
      barcode: '7804610025009',
      userCreator: currentUser,
      createdAt: today,
      updatedAt: today
    }
  ];

  const locations: WmsLocation[] = [
    { id: 'loc-1', warehouseCode: 'CD-SCL-01', warehouseName: 'CD Santiago Central (Pudahuel)', locationCode: 'REC-DOCK1', aisle: 'REC', rack: '01', level: '0', zoneType: 'RECEIVING', maxWeightKg: 15000, maxPallets: 18, temperatureControl: 'AMBIENTE', status: 'ACTIVE' },
    { id: 'loc-2', warehouseCode: 'CD-SCL-01', warehouseName: 'CD Santiago Central (Pudahuel)', locationCode: 'A01-R01-N1', aisle: 'A01', rack: 'R01', level: 'N1', zoneType: 'PUTAWAY_STORAGE', maxWeightKg: 4000, maxPallets: 4, temperatureControl: 'AMBIENTE', status: 'ACTIVE' },
    { id: 'loc-3', warehouseCode: 'CD-SCL-01', warehouseName: 'CD Santiago Central (Pudahuel)', locationCode: 'A01-R01-N2', aisle: 'A01', rack: 'R01', level: 'N2', zoneType: 'PUTAWAY_STORAGE', maxWeightKg: 3500, maxPallets: 4, temperatureControl: 'AMBIENTE', status: 'ACTIVE' },
    { id: 'loc-4', warehouseCode: 'CD-SCL-01', warehouseName: 'CD Santiago Central (Pudahuel)', locationCode: 'A02-R02-N1', aisle: 'A02', rack: 'R02', level: 'N1', zoneType: 'PUTAWAY_STORAGE', maxWeightKg: 4000, maxPallets: 4, temperatureControl: 'CONTROLADO', status: 'ACTIVE' },
    { id: 'loc-5', warehouseCode: 'CD-SCL-01', warehouseName: 'CD Santiago Central (Pudahuel)', locationCode: 'PK-Z1-01', aisle: 'PK1', rack: 'F01', level: 'N1', zoneType: 'PICKING', maxWeightKg: 2000, maxPallets: 3, temperatureControl: 'AMBIENTE', status: 'ACTIVE' },
    { id: 'loc-6', warehouseCode: 'CD-SCL-01', warehouseName: 'CD Santiago Central (Pudahuel)', locationCode: 'PK-Z1-02', aisle: 'PK1', rack: 'F02', level: 'N1', zoneType: 'PICKING', maxWeightKg: 2000, maxPallets: 3, temperatureControl: 'CONTROLADO', status: 'ACTIVE' },
    { id: 'loc-7', warehouseCode: 'CD-SCL-01', warehouseName: 'CD Santiago Central (Pudahuel)', locationCode: 'PKG-STG-01', aisle: 'PKG', rack: 'M01', level: '0', zoneType: 'PACKING', maxWeightKg: 5000, maxPallets: 8, temperatureControl: 'AMBIENTE', status: 'ACTIVE' },
    { id: 'loc-8', warehouseCode: 'CD-SCL-01', warehouseName: 'CD Santiago Central (Pudahuel)', locationCode: 'DSP-DOCK1', aisle: 'DSP', rack: '01', level: '0', zoneType: 'DISPATCH_DOCK', maxWeightKg: 18000, maxPallets: 20, temperatureControl: 'AMBIENTE', status: 'ACTIVE' },
    { id: 'loc-9', warehouseCode: 'CD-SCL-01', warehouseName: 'CD Santiago Central (Pudahuel)', locationCode: 'QRN-BLK-01', aisle: 'QRN', rack: 'Q01', level: '0', zoneType: 'QUARANTINE', maxWeightKg: 3000, maxPallets: 4, temperatureControl: 'CONTROLADO', status: 'HOLD' },
    { id: 'loc-10', warehouseCode: 'CD-NOR-02', warehouseName: 'CD Macrozona Norte (Antofagasta)', locationCode: 'N01-R01-N1', aisle: 'N01', rack: 'R01', level: 'N1', zoneType: 'PUTAWAY_STORAGE', maxWeightKg: 5000, maxPallets: 6, temperatureControl: 'AMBIENTE', status: 'ACTIVE' },
    { id: 'loc-11', warehouseCode: 'CD-NOR-02', warehouseName: 'CD Macrozona Norte (Antofagasta)', locationCode: 'N-PK-01', aisle: 'NPK', rack: '01', level: 'N1', zoneType: 'PICKING', maxWeightKg: 2500, maxPallets: 4, temperatureControl: 'AMBIENTE', status: 'ACTIVE' },
    { id: 'loc-12', warehouseCode: 'CD-NOR-02', warehouseName: 'CD Macrozona Norte (Antofagasta)', locationCode: 'N-DSP-01', aisle: 'NDS', rack: '01', level: '0', zoneType: 'DISPATCH_DOCK', maxWeightKg: 12000, maxPallets: 14, temperatureControl: 'AMBIENTE', status: 'ACTIVE' }
  ];

  const balances: WmsStockBalance[] = [
    { id: 'bal-1', itemId: 'wms-item-1', sku: 'SKU-PAL-1210', itemDescription: 'Pallet Madera Certificado NIMF-15 (1200x1000mm)', warehouseCode: 'CD-SCL-01', locationCode: 'A01-R01-N1', lotNumber: 'LOT-2610-A', lpn: 'LPN-SCL-00101', qtyOnHand: 240, qtyCommitted: 40, qtyInTransit: 0, lotStatus: 'APPROVED', lastMovementDate: today },
    { id: 'bal-2', itemId: 'wms-item-2', sku: 'SKU-FLM-5023', itemDescription: 'Bobina Film Stretch Industrial 500mm x 23mic', warehouseCode: 'CD-SCL-01', locationCode: 'PK-Z1-01', lotNumber: 'LOT-2610-B', lpn: 'LPN-SCL-00102', qtyOnHand: 95, qtyCommitted: 15, qtyInTransit: 0, lotStatus: 'APPROVED', lastMovementDate: today },
    { id: 'bal-3', itemId: 'wms-item-3', sku: 'SKU-RFZ-3600', itemDescription: 'Terminal Captura RF / Scanner Barcode 2D Industrial', warehouseCode: 'CD-SCL-01', locationCode: 'PK-Z1-02', lotNumber: 'LOT-2609-Z', lpn: 'LPN-SCL-00103', qtyOnHand: 18, qtyCommitted: 4, qtyInTransit: 0, lotStatus: 'APPROVED', lastMovementDate: today },
    { id: 'bal-4', itemId: 'wms-item-4', sku: 'SKU-EPP-3970', itemDescription: 'Kit Seguridad Operario Bodega (Casco EN397 + Chaleco + Botín)', warehouseCode: 'CD-SCL-01', locationCode: 'PK-Z1-01', lotNumber: 'GEN-STD', lpn: 'LPN-SCL-00104', qtyOnHand: 36, qtyCommitted: 0, qtyInTransit: 0, lotStatus: 'APPROVED', lastMovementDate: today },
    { id: 'bal-5', itemId: 'wms-item-5', sku: 'SKU-LUB-VG46', itemDescription: 'Tambor Aceite Hidráulico Montacargas ISO VG-46 (208L)', warehouseCode: 'CD-SCL-01', locationCode: 'A02-R02-N1', lotNumber: 'LOT-VG46-09', lpn: 'LPN-SCL-00105', expirationDate: '2027-08-30', qtyOnHand: 11, qtyCommitted: 0, qtyInTransit: 0, lotStatus: 'APPROVED', lastMovementDate: today },
    { id: 'bal-6', itemId: 'wms-item-2', sku: 'SKU-FLM-5023', itemDescription: 'Bobina Film Stretch Industrial 500mm x 23mic', warehouseCode: 'CD-SCL-01', locationCode: 'REC-DOCK1', lotNumber: 'LOT-2611-N', lpn: 'LPN-SCL-00199', qtyOnHand: 30, qtyCommitted: 0, qtyInTransit: 0, lotStatus: 'APPROVED', lastMovementDate: today },
    { id: 'bal-7', itemId: 'wms-item-6', sku: 'SKU-CAJ-6040', itemDescription: 'Caja Cartón Corrugado Doble Onda Export 60x40x40cm (Pack x25)', warehouseCode: 'CD-NOR-02', locationCode: 'N01-R01-N1', lotNumber: 'LOT-CAJ-11', lpn: 'LPN-NOR-00201', qtyOnHand: 28, qtyCommitted: 0, qtyInTransit: 0, lotStatus: 'APPROVED', lastMovementDate: today },
    { id: 'bal-8', itemId: 'wms-item-7', sku: 'SKU-TRP-2500', itemDescription: 'Transpaleta Hidráulica Manual 2.500 kg Horquilla 1150mm', warehouseCode: 'CD-NOR-02', locationCode: 'N01-R01-N1', lotNumber: 'LOT-TRP-02', lpn: 'LPN-NOR-00202', qtyOnHand: 7, qtyCommitted: 0, qtyInTransit: 0, lotStatus: 'APPROVED', lastMovementDate: today }
  ];

  const tasks: WmsWarehouseTask[] = [
    {
      id: 'wt-1',
      taskNumber: 'WT-4611-0001',
      taskType: 'PUTAWAY',
      priority: '2-ALTA',
      referenceOrder: 'ASN-2026-884',
      itemId: 'wms-item-2',
      sku: 'SKU-FLM-5023',
      itemDescription: 'Bobina Film Stretch Industrial 500mm x 23mic',
      lotNumber: 'LOT-2611-N',
      lpn: 'LPN-SCL-00199',
      qtyRequested: 30,
      qtyConfirmed: 0,
      uom: 'CJ',
      fromWarehouse: 'CD-SCL-01',
      fromLocation: 'REC-DOCK1',
      toWarehouse: 'CD-SCL-01',
      toLocation: 'A01-R01-N2',
      assignedOperator: 'OPERARIO BODEGA 01',
      status: 'SUGGESTED',
      notes: 'Pallet recién descargado en Muelle 1 pendiente de ubicación en rack A01',
      createdAt: today,
      userCreator: currentUser,
      hashSignature: createWmsSyncHash('WT-4611-0001')
    },
    {
      id: 'wt-2',
      taskNumber: 'WT-4611-0002',
      taskType: 'PICKING',
      priority: '1-CRÍTICA',
      waveNumber: 'WAVE-2026-114',
      referenceOrder: 'EMB-4915-0001',
      itemId: 'wms-item-1',
      sku: 'SKU-PAL-1210',
      itemDescription: 'Pallet Madera Certificado NIMF-15 (1200x1000mm)',
      lotNumber: 'LOT-2610-A',
      lpn: 'LPN-SCL-00101',
      qtyRequested: 40,
      qtyConfirmed: 0,
      uom: 'UN',
      fromWarehouse: 'CD-SCL-01',
      fromLocation: 'A01-R01-N1',
      toWarehouse: 'CD-SCL-01',
      toLocation: 'PKG-STG-01',
      assignedOperator: 'OPERARIO PICKING 02',
      status: 'IN_PROGRESS',
      notes: 'Despacho urgente Ruta Zona Sur Industrial',
      createdAt: today,
      userCreator: currentUser,
      hashSignature: createWmsSyncHash('WT-4611-0002')
    },
    {
      id: 'wt-3',
      taskNumber: 'WT-4611-0003',
      taskType: 'PICKING',
      priority: '1-CRÍTICA',
      waveNumber: 'WAVE-2026-114',
      referenceOrder: 'EMB-4915-0001',
      itemId: 'wms-item-2',
      sku: 'SKU-FLM-5023',
      itemDescription: 'Bobina Film Stretch Industrial 500mm x 23mic',
      lotNumber: 'LOT-2610-B',
      lpn: 'LPN-SCL-00102',
      qtyRequested: 15,
      qtyConfirmed: 0,
      uom: 'CJ',
      fromWarehouse: 'CD-SCL-01',
      fromLocation: 'PK-Z1-01',
      toWarehouse: 'CD-SCL-01',
      toLocation: 'PKG-STG-01',
      assignedOperator: 'OPERARIO PICKING 02',
      status: 'SUGGESTED',
      createdAt: today,
      userCreator: currentUser,
      hashSignature: createWmsSyncHash('WT-4611-0003')
    },
    {
      id: 'wt-4',
      taskNumber: 'WT-4611-0004',
      taskType: 'CYCLE_COUNT',
      priority: '3-NORMAL',
      referenceOrder: 'PI-2026-Q4',
      itemId: 'wms-item-3',
      sku: 'SKU-RFZ-3600',
      itemDescription: 'Terminal Captura RF / Scanner Barcode 2D Industrial',
      lotNumber: 'LOT-2609-Z',
      lpn: 'LPN-SCL-00103',
      qtyRequested: 18,
      qtyConfirmed: 0,
      uom: 'UN',
      fromWarehouse: 'CD-SCL-01',
      fromLocation: 'PK-Z1-02',
      toWarehouse: 'CD-SCL-01',
      toLocation: 'PK-Z1-02',
      assignedOperator: 'AUDITOR INVENTARIO',
      status: 'SUGGESTED',
      notes: 'Conteo cíclico obligatorio artículos Clase A Electrónica',
      createdAt: today,
      userCreator: currentUser,
      hashSignature: createWmsSyncHash('WT-4611-0004')
    }
  ];

  const movements: WmsMovementLedger[] = [
    {
      id: 'kdx-1',
      movementNumber: 'KDX-4111-0001',
      docType: 'OV',
      referenceDoc: 'OC-89410 / ASN-884',
      itemId: 'wms-item-2',
      sku: 'SKU-FLM-5023',
      itemDescription: 'Bobina Film Stretch Industrial 500mm x 23mic',
      warehouseCode: 'CD-SCL-01',
      locationCode: 'REC-DOCK1',
      lotNumber: 'LOT-2611-N',
      lpn: 'LPN-SCL-00199',
      qtyDelta: 30,
      unitCost: 38900,
      totalCost: 1167000,
      previousStock: 0,
      newStock: 30,
      reasonCode: 'RECEP_PROVEEDOR',
      operator: currentUser,
      timestamp: now - 3600000 * 5,
      dateStr: today,
      hashSignature: createWmsSyncHash('KDX-4111-0001')
    },
    {
      id: 'kdx-2',
      movementNumber: 'KDX-4111-0002',
      docType: 'IT',
      referenceDoc: 'WT-4611-0000',
      itemId: 'wms-item-1',
      sku: 'SKU-PAL-1210',
      itemDescription: 'Pallet Madera Certificado NIMF-15 (1200x1000mm)',
      warehouseCode: 'CD-SCL-01',
      locationCode: 'A01-R01-N1',
      lotNumber: 'LOT-2610-A',
      lpn: 'LPN-SCL-00101',
      qtyDelta: 240,
      unitCost: 14500,
      totalCost: 3480000,
      previousStock: 0,
      newStock: 240,
      reasonCode: 'PUTAWAY_INICIAL',
      operator: currentUser,
      timestamp: now - 3600000 * 24,
      dateStr: today,
      hashSignature: createWmsSyncHash('KDX-4111-0002')
    },
    {
      id: 'kdx-3',
      movementNumber: 'KDX-4111-0003',
      docType: 'SO',
      referenceDoc: 'EMB-4915-0000 / DTE52-1042',
      itemId: 'wms-item-4',
      sku: 'SKU-EPP-3970',
      itemDescription: 'Kit Seguridad Operario Bodega (Casco EN397 + Chaleco + Botín)',
      warehouseCode: 'CD-SCL-01',
      locationCode: 'PK-Z1-01',
      lotNumber: 'GEN-STD',
      lpn: 'LPN-SCL-00104',
      qtyDelta: -14,
      unitCost: 62000,
      totalCost: -868000,
      previousStock: 50,
      newStock: 36,
      reasonCode: 'DESPACHO_CLIENTE',
      operator: currentUser,
      timestamp: now - 3600000 * 36,
      dateStr: today,
      hashSignature: createWmsSyncHash('KDX-4111-0003')
    }
  ];

  const shipments: WmsShipmentOrder[] = [
    {
      id: 'emb-1',
      shipmentNumber: 'EMB-4915-0001',
      orderType: 'OUTBOUND_DESPACHO',
      customerOrSupplier: 'OPERADORA PORTUARIA DEL PACÍFICO S.A.',
      destinationAddress: 'Av. España 1480, Sitio 4, Puerto San Antonio',
      city: 'San Antonio',
      carrierName: 'TRANSPORTES CORDILLERA LOGISTICS',
      vehiclePlate: 'RT-KP-48',
      driverName: 'RODRIGO MUÑOZ S.',
      driverRut: '15.482.310-4',
      warehouseCode: 'CD-SCL-01',
      waveNumber: 'WAVE-2026-114',
      lines: [
        { itemId: 'wms-item-1', sku: 'SKU-PAL-1210', description: 'Pallet Madera Certificado NIMF-15 (1200x1000mm)', qty: 40, pickedQty: 0, uom: 'UN', lotNumber: 'LOT-2610-A', fromLocation: 'A01-R01-N1' },
        { itemId: 'wms-item-2', sku: 'SKU-FLM-5023', description: 'Bobina Film Stretch Industrial 500mm x 23mic', qty: 15, pickedQty: 0, uom: 'CJ', lotNumber: 'LOT-2610-B', fromLocation: 'PK-Z1-01' }
      ],
      totalPackages: 55,
      totalWeightKg: 1097.5,
      guideNumber: 'GD-52-004819',
      scheduledDate: today,
      status: 'EN_PICKING',
      notes: 'Despacho coordinado ventana horaria 14:00 - 17:00 hrs',
      userCreator: currentUser,
      createdAt: today
    },
    {
      id: 'emb-2',
      shipmentNumber: 'EMB-4915-0000',
      orderType: 'OUTBOUND_DESPACHO',
      customerOrSupplier: 'MINERA ATACAMA NORTE LTDA.',
      destinationAddress: 'Ruta 5 Norte Km 1365, Barrio Industrial La Negra',
      city: 'Antofagasta',
      carrierName: 'FLOTA EXPRESS NORTE S.A.',
      vehiclePlate: 'PW-HT-92',
      driverName: 'MARCELO PIZARRO V.',
      driverRut: '13.991.204-K',
      warehouseCode: 'CD-SCL-01',
      waveNumber: 'WAVE-2026-110',
      lines: [
        { itemId: 'wms-item-4', sku: 'SKU-EPP-3970', description: 'Kit Seguridad Operario Bodega (Casco EN397 + Chaleco + Botín)', qty: 14, pickedQty: 14, uom: 'KIT', lotNumber: 'GEN-STD', fromLocation: 'PK-Z1-01' }
      ],
      totalPackages: 14,
      totalWeightKg: 32.2,
      guideNumber: 'GD-52-004795',
      scheduledDate: today,
      status: 'ENTREGADO',
      notes: 'POD firmado conforme por Jefe de Bodega Destino',
      userCreator: currentUser,
      createdAt: today,
      deliveredAt: today
    }
  ];

  return {
    items,
    locations,
    balances,
    tasks,
    movements,
    shipments,
    updatedAt: now
  };
}
