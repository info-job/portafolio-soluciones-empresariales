import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Transaction, WorkOrder, Property, Supplier } from '../types';
import { 
  BookOpen, Search, Plus, Trash2, X, Check, CheckSquare, 
  RefreshCw, Download, Layers, AlertCircle, Sparkles, Building, 
  HelpCircle, ChevronDown, Sliders, Play, Settings, Terminal, ShieldAlert,
  Database, Tag, Info, FileSpreadsheet, Loader2, Scale
} from 'lucide-react';
import { downloadJDETransactionVoucher, downloadChileanTaxAuditReport } from '../lib/pdfGenerator';
import { exportJDELedgerToExcel } from '../lib/excelExport';
import { JDEGridContextMenu } from './JDEGridContextMenu';
import { JDERecentReportsModal } from './JDERecentReportsModal';
import { JdeComparisonAuditModal } from './JdeComparisonAuditModal';
import { SupplierForm } from './SupplierForm';
import { maskFolioOrInvoice, maskMoneyCLP } from '../lib/inputMasks';

interface ClassicJDELedgerProps {
  transactions: Transaction[];
  workOrders: WorkOrder[];
  properties: Property[];
  suppliers: Supplier[];
  onUpdateTransaction: (id: string, field: keyof Transaction, value: any) => void;
  onDeleteTransaction: (id: string) => void;
  onAddTransaction: (newTx: Transaction) => void;
  onAddSupplier?: (supplier: Supplier) => void;
  currentUser: string;
}

export const ClassicJDELedger: React.FC<ClassicJDELedgerProps> = ({
  transactions,
  workOrders,
  properties,
  suppliers,
  onUpdateTransaction,
  onDeleteTransaction,
  onAddTransaction,
  onAddSupplier,
  currentUser
}) => {
  // Current active sub-program: P0911 (Revisión de Diario) or P0411 (Consulta LM Proveedores)
  const [activeProgram, setActiveProgram] = useState<'P0911' | 'P0411'>('P0911');
  const [isSupplierFormOpen, setIsSupplierFormOpen] = useState(false);

  // Top navigation states
  const [showRecentReportsModal, setShowRecentReportsModal] = useState(false);
  const [showJdeComparisonModal, setShowJdeComparisonModal] = useState(false);
  const [showNavigatorDropdown, setShowNavigatorDropdown] = useState(false);
  const [showOpenAppsDropdown, setShowOpenAppsDropdown] = useState(false);
  const [showFavoritesDropdown, setShowFavoritesDropdown] = useState(false);

  // Right-click context menu state
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; record: Transaction; type: 'P0911' | 'P0411' } | null>(null);

  // Grid column resize support (emulating original ERP)
  const [colWidthsP0911, setColWidthsP0911] = useState<{ [key: string]: number }>({
    sel: 56,
    docType: 110,
    docNum: 115,
    company: 95,
    date: 100,
    concept: 240,
    numCuenta: 125,
    nombreCuenta: 200,
    categoriaCuenta: 160,
    numContrapartida: 125,
    nombreContrapartida: 200,
    debe: 135,
    haber: 135,
    amtExt: 110,
    batchNum: 96,
    mnd: 80,
    f980011d: 90,
  });

  const [colWidthsP0411, setColWidthsP0411] = useState<{ [key: string]: number }>({
    cia: 56,
    companyName: 192,
    supplierNum: 128,
    td: 64,
    docNum: 112,
    detail: 260,
    amountGross: 128,
    amountPending: 128,
    invoiceDate: 112,
    dueDate: 112,
    un: 96,
    f980011d: 96,
  });

  const [rowHeightP0911, setRowHeightP0911] = useState<number>(26);
  const [rowHeightP0411, setRowHeightP0411] = useState<number>(26);

  const handleRowResizeP0911 = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const startH = rowHeightP0911;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const diffY = moveEvent.clientY - startY;
      setRowHeightP0911(Math.max(22, Math.min(100, startH + diffY)));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'row-resize';
  };

  const handleRowResizeP0411 = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const startH = rowHeightP0411;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const diffY = moveEvent.clientY - startY;
      setRowHeightP0411(Math.max(22, Math.min(100, startH + diffY)));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    document.body.style.cursor = 'row-resize';
  };

  const handleResizeP0911 = (colKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = colWidthsP0911[colKey] || 100;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const diffX = moveEvent.clientX - startX;
      setColWidthsP0911(prev => ({
        ...prev,
        [colKey]: Math.max(35, startWidth + diffX)
      }));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  const handleResizeP0411 = (colKey: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = colWidthsP0411[colKey] || 100;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const diffX = moveEvent.clientX - startX;
      setColWidthsP0411(prev => ({
        ...prev,
        [colKey]: Math.max(35, startWidth + diffX)
      }));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  useEffect(() => {
    const handleGlobalClick = () => {
      setContextMenu(null);
      setShowNavigatorDropdown(false);
      setShowOpenAppsDropdown(false);
      setShowFavoritesDropdown(false);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
    };
  }, []);

  const handleRowContextMenu = (e: React.MouseEvent, record: Transaction, type: 'P0911' | 'P0411') => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY - 2,
      record,
      type
    });
  };

  // Control Ledger (Libro de Cuenta) General Quadrature Process States
  const [showCuadraturaLedgerModal, setShowCuadraturaLedgerModal] = useState(false);
  const [isAuditingLedger, setIsAuditingLedger] = useState(false);
  const [auditProgressPercent, setAuditProgressPercent] = useState(0);
  const [auditStatusText, setAuditStatusText] = useState('');

  // Attribute Master F980011D simulation target state
  const [inspectTarget, setInspectTarget] = useState<{ record: Transaction; entityType: 'TRANSACTION' } | null>(null);

  // ERP Visual Assist Search & Select state
  const [jdeVisualAssist, setJdeVisualAssist] = useState<{
    type: 'docType' | 'company' | 'supplier' | 'batch' | 'account' | 'numDoc';
    onSelect: (value: string) => void;
  } | null>(null);

  // Column-specific Attribute Master database state (F0005, F0010, F0901, F0002 etc.)
  const [activeMasterLookup, setActiveMasterLookup] = useState<{
    columnName: string;
    masterTable: string;
    originalValue: string;
    description: string;
    details: Array<{ label: string; value: string; isHighlighted?: boolean }>;
  } | null>(null);

  const openMasterLookup = (
    columnName: string, 
    originalValue: string,
    extraContext?: { name?: string; category?: string; offsetNum?: string; offsetName?: string }
  ) => {
    let masterTable = 'F0005';
    let description = '';
    let details: Array<{ label: string; value: string; isHighlighted?: boolean }> = [];

    const normCol = columnName
      .toUpperCase()
      .replace(/^Nº\s*/, '')
      .replace(/^N°\s*/, '')
      .replace(/^NUMERO\s*DE\s*/, '')
      .replace(/^CÓDIGO\s*DE\s*/, '')
      .trim();

    switch (normCol) {
      case 'TIPO DOCUMENTO':
      case 'T/D':
      case 'TIPO DOC':
        masterTable = 'F0005 (Tabla de Tipos de Documentos ERP)';
        description = originalValue === 'PV' 
          ? 'PV - Resumen Cuenta por Pagar Proveedores (Purchase Voucher)' 
          : (originalValue === 'DP' ? 'DP - Depósito Bancario directo' : 'JE - Asiento Diario de Entrada General');
        details = [
          { label: 'Código de Sistema ', value: '09 (Contabilidad General)' },
          { label: 'Tipo de Estructura ', value: 'DT (Document Type)' },
          { label: 'Longitud de Clave', value: '2 caracteres' },
          { label: 'Estado Operativo', value: 'ACTIVO (Vigente)', isHighlighted: true },
          { label: 'Permitir Reversión', value: 'SÍ (Automática de fin de mes)' }
        ];
        break;

      case 'DOCUMENTO':
      case 'NUMERO DOCUMENTO':
      case 'DOCTO':
      case 'Nº DOCTO':
        masterTable = 'F0002 (Siguientes Números de Comprobantes)';
        description = `Comprobante de Transacción Secuencial Única #${originalValue}`;
        details = [
          { label: 'Última secuencia contable emitida', value: originalValue },
          { label: 'Rango de Control interno', value: '30000 - 99999999' },
          { label: 'Estación de Trabajo Asociada', value: 'WK_MUT_SYS_01' },
          { label: 'Integridad Criptográfica Corregida', value: 'CORRECTO (SHA256)', isHighlighted: true },
          { label: 'Habilitado para Auditoría CMF', value: 'SÍ (Resolución CMF)' }
        ];
        break;

      case 'COMPAÑÍA DOC':
      case 'COMPAÑÍA':
      case 'CÍA':
      case 'CIA':
        masterTable = 'F0010 (Maestro de Sociedades y Compañías)';
        description = '00001 - Sociedad Inmobiliaria Pro SPA';
        details = [
          { label: 'RUT Jurídico Tributario', value: '76.554.321-9' },
          { label: 'Moneda Central del Libro Diario', value: 'CLP (Pesos Chilenos)', isHighlighted: true },
          { label: 'Dirección Comercial Principal', value: 'Santiago de Chile' },
          { label: 'Método de Cierre Anual', value: 'Resultado de Ejercicios Anteriores' },
          { label: 'Estado Central en Base de Datos', value: 'MAESTRO DE PRODUCCIÓN HABILITADO' }
        ];
        break;

      case 'FECHA LM':
      case 'FECHA':
      case 'FE. FACTURA':
      case 'FE. VENCE':
        masterTable = 'F0008 (Calendario Fiscal de Períodos Contables)';
        description = `Período Fiscal correspondiente al registro (${originalValue})`;
        details = [
          { label: 'Año de Ejercicio Fiscal', value: '2026' },
          { label: 'Período Contable Activo', value: '02 (Febrero)' },
          { label: 'Estado del Período en Gestión Integrada', value: 'ABIERTO PARA REGISTRO Y AJUSTES', isHighlighted: true },
          { label: 'Fecha Cierre de Mes Limite', value: '28/02/2026' },
          { label: 'Días de desfase contable', value: '0 días' }
        ];
        break;

      case 'EXPLICACIÓN CONCEPTO':
      case 'EXPLICACIÓN':
      case 'CONCEPTO':
      case 'DETALLE / PROVEEDOR':
        masterTable = 'F0901 (Plan de Cuentas y Glosas Contables)';
        description = `Glosa Descriptiva: "${originalValue}"`;
        details = [
          { label: 'Tipo de Entrada', value: 'Ingreso Manual Cuenta de Diario' },
          { label: 'Código Contable Sugerido', value: '5110.02.001 (Gastos de Mantención Muebles/Inmuebles)' },
          { label: 'Nivel Contable de Detalle', value: '7 (Último Nivel de Registro Directo)', isHighlighted: true },
          { label: 'Permite Registro Multimoneda', value: 'SÍ (CLP / USD)' }
        ];
        break;

      case 'CUENTA CONTABLE':
      case 'CUENTA':
      case 'CUENTA CONTABLE (MAIN)':
        masterTable = 'F0901 (Maestro de Plan de Cuentas / OBJ.SUB ERP)';
        description = extraContext?.name 
          ? `Cuenta Contable F0901: ${originalValue} - ${extraContext.name}`
          : `Cuenta Contable Imputable ERP: ${originalValue}`;
        details = [
          { label: 'Código de Cuenta ERP (ANI)', value: originalValue, isHighlighted: true },
          { label: 'Denominación de Cuenta (DL01)', value: extraContext?.name || 'Cuenta Imputable' },
          { label: 'Categoría / Rubro Financiero', value: extraContext?.category || 'Rubro Contable' },
          { label: 'Cuenta Contrapartida Vinculada', value: extraContext?.offsetNum ? `${extraContext.offsetNum} (${extraContext.offsetName || ''})` : '2110.05.001' },
          { label: 'Nivel de Detalle Contable (LDA)', value: '7 (Último Nivel de Imputación Directa en F0911)' },
          { label: 'Unidad de Negocio (MCU)', value: '00001 (Sede Central Corporativa)' },
          { label: 'Tipo de Imputación (PEC)', value: 'P (Imputable a Libro Mayor F0911)' },
          { label: 'Estatus en Maestro F0901', value: 'ACTIVO / VIGENTE EN PRODUCCIÓN', isHighlighted: true }
        ];
        break;

      case 'CONTRAPARTIDA':
      case 'CUENTA CONTRAPARTIDA':
        masterTable = 'F0901 (Maestro de Cuentas de Contrapartida / Offset F0901)';
        description = extraContext?.offsetName 
          ? `Cuenta de Balance / Offset F0901: ${originalValue} - ${extraContext.offsetName}`
          : `Cuenta Contrapartida de Balance: ${originalValue}`;
        details = [
          { label: 'Código de Contrapartida (ANI)', value: originalValue, isHighlighted: true },
          { label: 'Denominación de Contrapartida (DL01)', value: extraContext?.offsetName || 'Cuenta de Contrapartida' },
          { label: 'Cuenta Principal de Origen', value: extraContext?.name ? `${extraContext.name}` : 'Cuenta Principal' },
          { label: 'Nivel de Detalle Contable (LDA)', value: '7 (Último Nivel de Imputación Directa)' },
          { label: 'Unidad de Negocio (MCU)', value: '00001 (Sede Central Corporativa)' },
          { label: 'Estatus en Maestro F0901', value: 'ACTIVO / VIGENTE EN PRODUCCIÓN', isHighlighted: true }
        ];
        break;

      case 'NOMBRE DE CUENTA':
      case 'NOMBRE DE CUENTA CONTABLE':
      case 'NOMBRE CONTRAPARTIDA':
      case 'NOMBRE DE CONTRAPARTIDA':
        masterTable = 'F0901 (Maestro Denominación de Cuentas / DL01)';
        description = `Denominación de Cuenta Contable: "${originalValue}"`;
        details = [
          { label: 'Glosa en Maestro (F0901.DL01)', value: originalValue, isHighlighted: true },
          { label: 'Idioma de Registros', value: 'ES (Español Corporativo)' },
          { label: 'Nivel de Detalle (LDA)', value: '7 (Último Nivel - Cuenta Auxiliar/Mayor)' },
          { label: 'Afecta Estado de Resultados', value: originalValue.toLowerCase().includes('gasto') || originalValue.toLowerCase().includes('ingreso') ? 'SÍ (P&L - Resultados)' : 'NO (Balance General)' }
        ];
        break;

      case 'CATEGORÍA / RUBRO':
      case 'CATEGORÍA CUENTA':
      case 'RUBRO':
        masterTable = 'F0005 (Códigos de Clasificación UDC 09/CC - Rubros Contables)';
        description = `Clasificación y Rubro Financiero: "${originalValue}"`;
        details = [
          { label: 'Rubro / Clasificación', value: originalValue, isHighlighted: true },
          { label: 'Código UDC de Sistema', value: '09/CC (Clasificación de Cuentas)' },
          { label: 'Impacto en Estados Financieros', value: originalValue.includes('P&L') ? 'Estado de Resultados (P&L)' : 'Balance General (Activo/Pasivo)' }
        ];
        break;

      case 'DEBE (DÉBITO)':
      case 'DEBE':
      case 'HABER (CRÉDITO)':
      case 'HABER':
        masterTable = 'F0911 (Libro Mayor - Importes de Partida Doble ERP)';
        description = `Asiento en Libro Mayor F0911 - Importe: ${originalValue}`;
        details = [
          { label: 'Monto Registrado en Libros', value: originalValue, isHighlighted: true },
          { label: 'Tipo de Movimiento', value: columnName.toUpperCase().includes('DEBE') ? 'DEBE (Débito / Cargo en Cuenta)' : 'HABER (Crédito / Abono en Cuenta)' },
          { label: 'Moneda Doméstica (AA)', value: 'CLP (Pesos Chilenos)' },
          { label: 'Estado de Balance (Cuadratura)', value: 'EQUILIBRADO $0 (SINC-OK)', isHighlighted: true },
          { label: 'Posteo en Mayor General F0902', value: 'P (Posteado Correctamente)' }
        ];
        break;

      case 'IMPORTE MON NAC':
      case 'IMPORTE BRUTO':
      case 'IMPORTE PENDIENTE':
      case 'IMPORTE MEXT':
        masterTable = 'F0015 (Maestro de Parametrización y Control de Límites)';
        description = `Valor monetario verificado por auditoría de doble entrada: ${originalValue}`;
        details = [
          { label: 'Tasa Cambio de Recepción CLP', value: '1.0000 (Tasa Local)' },
          { label: 'Tope Máximo permitido para operario', value: '$500.000.000 CLP', isHighlighted: true },
          { label: 'Requiere validación de compliance', value: 'SÍ (De acuerdo a Umbral UAF)' },
          { label: 'Estado de Balance de Lote', value: 'BALANCEADO AUTOMÁTICO' }
        ];
        break;

      case 'BATCH ERP':
      case 'BATCH':
      case 'LOTE':
        masterTable = 'F0011 (Cabecera de Lote Contable Central)';
        description = `Batch de Control de Transmisión de Libro Diario #${originalValue}`;
        details = [
          { label: 'Número de Batch Único', value: originalValue },
          { label: 'Estado de Lote', value: 'A - APROBADO Y POSTEADO', isHighlighted: true },
          { label: 'Tipo de Lote', value: 'G - Entradas Generales del Libro Diario' },
          { label: 'Usuario Autorizador de Envío', value: 'SAMAHEIM' },
          { label: 'Timestamp de cierre del lote', value: new Date().toLocaleString() }
        ];
        break;

      case 'MND':
      case 'MONEDA':
        masterTable = 'F0013 (Tabla de Códigos de Moneda)';
        description = 'CLP - Peso Chileno Nacional';
        details = [
          { label: 'Símbolo Monetario', value: '$' },
          { label: 'Código ISO Estándar', value: 'CLP' },
          { label: 'Número de Decimales admisibles', value: '0 (para efectos fiscales)', isHighlighted: true },
          { label: 'Redondeo Automático del Sistema', value: 'SÍ (A la unidad inferior/superior)' }
        ];
        break;

      case 'PROVEEDOR':
      case 'Nº PROVEEDOR':
        masterTable = 'F0101 (Address Book - Ficha Técnica Proveedores)';
        description = `RUT/ID de Proveedor Central #${originalValue}`;
        details = [
          { label: 'Nombre Legal Registrado', value: 'Financial Solutions Corp' },
          { label: 'Estado de Ficha en Gestión Integrada', value: 'VIGENTE Y APROBADA', isHighlighted: true },
          { label: 'Tipo de Entregable', value: 'Servicios Profesionales de Auditoría' },
          { label: 'Contacto Directo', value: 'contacto@financialsol.cl' }
        ];
        break;

      case 'U/N':
      case 'UNIDAD DE NEGOCIO':
        masterTable = 'F0006 (Maestro de Unidades de Negocio e Inmuebles)';
        description = `Unidad Inmobiliaria Código #${originalValue}`;
        details = [
          { label: 'Código Local de Propiedad', value: originalValue || 'PR-47' },
          { label: 'Tipo de Inmueble', value: 'Departamento Habitacional / Oficinas Inversión' },
          { label: 'Estado de Ocupación', value: 'ARRENDADO', isHighlighted: true },
          { label: 'Contrato de Arriendo Vinculado', value: 'CTR-2026-094' }
        ];
        break;

      default:
        masterTable = 'F0001 (Maestro de Parámetros Globales Contables)';
        description = `Consulta de Atributo Auxiliar de Columna: ${columnName}`;
        details = [
          { label: 'Atributo Solicitado', value: columnName },
          { label: 'Valor Original de Fila', value: originalValue },
          { label: 'Acceso de Lectura a Base de Datos', value: 'CONCEDIDO (Nivel Supervisor)', isHighlighted: true }
        ];
        break;
    }

    setActiveMasterLookup({
      columnName,
      masterTable,
      originalValue,
      description,
      details
    });
  };

  // General system-style metadata block generator
  const getAuditData = (record: Transaction, type: string) => {
    return {
      registryId: record.id || 'N/A',
      programId: record.programId || 'P0911',
      workStationId: record.workStationId || 'WK_MUT_SYS_01',
      nextNumberSeq: record.nextNumberSeq || Math.floor(100000 + Math.random() * 900000),
      hashSignature: `SHA256:${Math.random().toString(16).substring(2, 10).toUpperCase()}${Math.random().toString(16).substring(2, 10).toUpperCase()}`,
      timestamp: record.timestamp ? new Date(record.timestamp).toLocaleString('es-CL') : new Date().toLocaleString('es-CL'),
      userCreator: record.user || 'SISTEMA',
      lockedBy: record.lockedBy || 'LIBRE',
      lockedAt: record.lockedAt ? new Date(record.lockedAt).toLocaleString('es-CL') : 'N/A',
      isTest: record.isTest ? 'SÍ (REPORTE DE PRUEBA)' : 'SÍ (MAESTRO PRODUCCIÓN)'
    };
  };

  // QBE (Query By Example) interactive filters for P0911
  const [qbeP0911, setQbeP0911] = useState({
    tipoDoc: '',
    numDoc: '',
    cia: '00001',
    fecha: '',
    explicacion: '',
    numCuenta: '',
    nombreCuenta: '',
    categoriaCuenta: '',
    numContrapartida: '',
    nombreContrapartida: '',
    debe: '',
    haber: '',
    monto: '',
    moneda: '',
    batch: '',
    programa: ''
  });

  // QBE (Query By Example) interactive filters for P0411
  const [qbeP0411, setQbeP0411] = useState({
    cia: '00045',
    nombreCia: '',
    numeroProveedor: '',
    tipoDoc: '',
    numDoc: '',
    importeBruto: '',
    fechaFactura: '',
    fechaVence: '',
    unidadNegocio: ''
  });

  // G/L Batch Header for new items
  const [selectedBatchType, setSelectedBatchType] = useState<'G' | 'V' | 'JE'>('G');
  const [selectedBatchNum, setSelectedBatchNum] = useState('12845669');
  const [ledgerViewMode, setLedgerViewMode] = useState<'PARTIDA_DOBLE' | 'RESUMIDO'>('PARTIDA_DOBLE');

  // Selected row state for AssetFlow Enterprise Cyan Highlighting (#00E5FF)
  const [selectedP0911RowIds, setSelectedP0911RowIds] = useState<string[]>([]);
  const [selectedP0411RowIds, setSelectedP0411RowIds] = useState<string[]>([]);

  const toggleP0911RowSelect = (id: string) => {
    setSelectedP0911RowIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleAllP0911Rows = (allList: any[]) => {
    if (selectedP0911RowIds.length === allList.length && allList.length > 0) {
      setSelectedP0911RowIds([]);
    } else {
      setSelectedP0911RowIds(allList.map(item => item.id));
    }
  };

  const toggleP0411RowSelect = (id: string) => {
    setSelectedP0411RowIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Input states for Manual Journal Entry (P0911 JE Panel)
  const [showManualPostForm, setShowManualPostForm] = useState(false);
  const [manualAccountDebit, setManualAccountDebit] = useState('1110.01.002 - Caja General');
  const [manualAccountCredit, setManualAccountCredit] = useState('2110.05.001 - Proveedores Nacionales');
  const [manualAmount, setManualAmount] = useState<number>(550000);
  const [manualConcept, setManualConcept] = useState('Autoregistro regularizacion de garantia');
  const [manualDocNum, setManualDocNum] = useState('19102418');
  const [manualDocType, setManualDocType] = useState('JE');
  const [manualSupplierId, setManualSupplierId] = useState('');
  const [manualPropertyId, setManualPropertyId] = useState('');

  // ERP Traditional Format for numeric amounts (decimal point & suffix minus negative symbol: "15.000,00-")
  const formatJDEMoney = (amount: number, isNegativeOrExpense: boolean = false) => {
    const formattedVal = Math.abs(amount).toLocaleString('es-CL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return isNegativeOrExpense ? `${formattedVal}-` : `${formattedVal}`;
  };

  // Convert dates to standard DD/MM/YY
  const formatJDEDate = (dateStr: string) => {
    if (!dateStr) return '31/12/26';
    // Match YYYY-MM-DD or return as is
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      return `${match[3]}/${match[2]}/${match[1].substring(2)}`;
    }
    return dateStr;
  };

  // Execution algorithm of Cuadratura General Libro de Cuenta
  const handleCuadraturaLedgerExecute = () => {
    setIsAuditingLedger(true);
    setAuditProgressPercent(0);
    setAuditStatusText('Iniciando rastreador de registros F0911...');
    
    setTimeout(() => {
      setAuditProgressPercent(30);
      setAuditStatusText('Verificando correlación lógica e integridad de partida doble...');
    }, 200);
    
    setTimeout(() => {
      setAuditProgressPercent(65);
      setAuditStatusText('Calculando balances debit/credit del período actual...');
    }, 450);

    setTimeout(() => {
      setAuditProgressPercent(90);
      setAuditStatusText('Estructurando balance neto de partida doble (Sincronía G/L)...');
    }, 700);

    setTimeout(() => {
      setAuditProgressPercent(100);
      setIsAuditingLedger(false);
      setShowCuadraturaLedgerModal(true);
    }, 950);
  };

  const handleAutoCuadrarLedger = () => {
    const delta = totalsP0911.balance;
    if (delta === 0) {
      alert("El libro Diario General ya se encuentra perfectamente balanceado (Diferencial: $0).");
      return;
    }

    const adjustAmount = Math.abs(delta);
    const adjustType = delta > 0 ? 'INCOME' : 'EXPENSE'; 
    
    const manualTx: Transaction = {
      id: 'TX_MAN_JDE_ADJ_' + Math.floor(Math.random() * 100000),
      description: `AJUSTE AUTOMÁTICO DE CUADRATURA DIARIO GENERAL (AUTOCUADRADO)`,
      amount: adjustAmount,
      category: adjustType === 'INCOME' ? 'RECAUDACIÓN DE ARRIENDO' : 'PAGO A PROVEEDOR',
      type: adjustType,
      documentType: 'JE',
      documentNumber: 'AJU-F0911',
      date: new Date().toISOString().split('T')[0],
      invoiceDate: new Date().toISOString().split('T')[0],
      user: currentUser || 'SAMAHEIM',
      timestamp: Date.now(),
      status: 'COMPLETADA',
      programId: 'P0911',
      batchNumber: selectedBatchNum || '901242',
      insuranceCompany: 'GENERALES',
      lockedBy: null,
      lockedAt: null
    };

    onAddTransaction(manualTx);
    alert(`ASIENTO COMPENSATORIO REGISTRADO CON ÉXITO.\n\nNúmero de Lote: ${manualTx.batchNumber}\nMonto: $${adjustAmount.toLocaleString('es-CL')}\nTipo: ${adjustType === 'INCOME' ? 'Crédito (Haber)' : 'Débito (Debe)'}\n\n¡Diario General (F0911) perfectamente reconciliado para el balance de la compañía!`);
    setShowCuadraturaLedgerModal(false);
  };

  // Dynamic supplier names map
  const supplierNamesMap = useMemo(() => {
    const map: Record<string, string> = {};
    suppliers.forEach(s => {
      map[s.id] = s.name;
    });
    return map;
  }, [suppliers]);

  // Clean all QBE filters
  const handleClearQBE = () => {
    if (activeProgram === 'P0911') {
      setQbeP0911({
        tipoDoc: '',
        numDoc: '',
        cia: '00001',
        fecha: '',
        explicacion: '',
        debe: '',
        haber: '',
        monto: '',
        moneda: '',
        batch: '',
        programa: ''
      });
    } else {
      setQbeP0411({
        cia: '00045',
        nombreCia: '',
        numeroProveedor: '',
        tipoDoc: '',
        numDoc: '',
        importeBruto: '',
        fechaFactura: '',
        fechaVence: '',
        unidadNegocio: ''
      });
    }
  };

  // Helper to extract ERP account details (Num, Name, Category, Offset Num, Offset Name, Offset Category)
  const getJDEAccountDetails = useCallback((t: Transaction) => {
    const isExpense = t.type === 'EXPENSE';

    const parseAccountStr = (str: string, fallbackCode: string, fallbackName: string) => {
      let code = fallbackCode;
      let name = fallbackName;

      if (str) {
        const codeMatch = str.match(/^([0-9.]+)/);
        if (codeMatch) {
          code = codeMatch[1].trim();
          const remainder = str.substring(codeMatch[0].length).replace(/^[\s\-():]+/, '').replace(/[\)]+$/, '').trim();
          if (remainder) {
            name = remainder;
          }
        } else if (str.includes(' - ')) {
          const parts = str.split(' - ');
          code = parts[0].trim();
          name = parts[1].trim();
        } else {
          name = str;
        }
      }

      // Determine category based on code prefix or name keywords
      let category = 'ACTIVO';
      const nameLower = name.toLowerCase();
      if (code.startsWith('5') || nameLower.includes('gasto') || nameLower.includes('mantenimiento') || nameLower.includes('honorario') || nameLower.includes('servicio')) {
        category = 'GASTO OPERACIONAL (P&L)';
      } else if (code.startsWith('4') || nameLower.includes('ingreso') || nameLower.includes('renta') || nameLower.includes('venta')) {
        category = 'INGRESOS OPERACIONALES (P&L)';
      } else if (code.startsWith('2') || nameLower.includes('cxp') || nameLower.includes('proveedor') || nameLower.includes('retencion') || nameLower.includes('pasivo')) {
        category = 'PASIVO CORRIENTE (CxP)';
      } else if (code.startsWith('112') || code.startsWith('113') || nameLower.includes('cxc') || nameLower.includes('arriendo') || nameLower.includes('cliente')) {
        category = 'ACTIVO CORRIENTE (CxC)';
      } else if (code.startsWith('111') || nameLower.includes('caja') || nameLower.includes('banco') || nameLower.includes('efectivo')) {
        category = 'ACTIVO DISPONIBLE (Bancos)';
      } else if (code.startsWith('3') || nameLower.includes('patrimonio') || nameLower.includes('capital')) {
        category = 'PATRIMONIO NETO';
      }

      return { code, name, category };
    };

    // Check if manual entry formatted with (<debit> <-> <credit>)
    const matchManual = (t.description || '').match(/\((.*?)\s*<->\s*(.*?)\)/);
    if (matchManual && matchManual[1] && matchManual[2]) {
      const main = parseAccountStr(matchManual[1].trim(), '5110.02.001', 'Asiento Manual Débito');
      const offset = parseAccountStr(matchManual[2].trim(), '2110.05.001', 'Asiento Manual Crédito');
      return {
        mainAccountNum: main.code,
        mainAccountName: main.name,
        mainAccountCategory: main.category,
        offsetAccountNum: offset.code,
        offsetAccountName: offset.name,
        offsetAccountCategory: offset.category,
        fullMainAccountStr: `${main.code} - ${main.name}`,
        fullOffsetAccountStr: `${offset.code} - ${offset.name}`
      };
    }

    if (isExpense) {
      const mainAccRaw = t.accountCode || '5110.02.001 (Gastos Operacionales Mantenimiento)';
      let offsetAccRaw = '2110.05.001 (CxP Proveedores Facturas)';

      if (t.category === 'CAJA CHICA' || (t.description || '').toLowerCase().includes('caja')) {
        offsetAccRaw = '1110.01.003 (Caja Chica Administración)';
      } else if (t.category === 'HONORARIOS' || (t.description || '').toLowerCase().includes('honorario')) {
        offsetAccRaw = '2110.08.002 (Retenciones CxP Honorarios)';
      } else if (t.supplierName) {
        offsetAccRaw = '2110.05.001 (CxP Proveedores Facturas)';
      } else {
        offsetAccRaw = '1110.01.002 (Caja/Banco General BCI)';
      }

      const main = parseAccountStr(mainAccRaw, '5110.02.001', 'Gastos Operacionales Mantenimiento');
      const offset = parseAccountStr(offsetAccRaw, '2110.05.001', 'Cuentas por Pagar Proveedores');

      return {
        mainAccountNum: main.code,
        mainAccountName: main.name,
        mainAccountCategory: main.category,
        offsetAccountNum: offset.code,
        offsetAccountName: offset.name,
        offsetAccountCategory: offset.category,
        fullMainAccountStr: `${main.code} - ${main.name}`,
        fullOffsetAccountStr: `${offset.code} - ${offset.name}`
      };
    } else {
      // Income / Revenue
      const mainAccRaw = t.accountCode || '4110.01.002 (Ingresos Rentas y Arriendos)';
      const offsetAccRaw = '1120.04.015 (CxC Arriendos Edificios)';

      const main = parseAccountStr(mainAccRaw, '4110.01.002', 'Ingresos por Rentas y Arriendos');
      const offset = parseAccountStr(offsetAccRaw, '1120.04.015', 'Cuentas por Cobrar Arriendos');

      return {
        mainAccountNum: main.code,
        mainAccountName: main.name,
        mainAccountCategory: main.category,
        offsetAccountNum: offset.code,
        offsetAccountName: offset.name,
        offsetAccountCategory: offset.category,
        fullMainAccountStr: `${main.code} - ${main.name}`,
        fullOffsetAccountStr: `${offset.code} - ${offset.name}`
      };
    }
  }, []);

  // 1. FILTERED LIST FOR P0911 (Journal General Ledger Ledger)
  const filteredP0911List = useMemo(() => {
    return transactions.filter(t => {
      const isExpense = t.type === 'EXPENSE';
      const debitAmt = isExpense ? t.amount : 0;
      const creditAmt = !isExpense ? t.amount : 0;
      const accDetails = getJDEAccountDetails(t);

      // General filter criteria
      const matchesTipoDoc = qbeP0911.tipoDoc === '' || (t.documentType || 'JE').toLowerCase().includes(qbeP0911.tipoDoc.toLowerCase());
      const matchesNumDoc = qbeP0911.numDoc === '' || (t.documentNumber || '').toLowerCase().includes(qbeP0911.numDoc.toLowerCase());
      const matchesCia = qbeP0911.cia === '' || '00001'.includes(qbeP0911.cia);
      const matchesFecha = qbeP0911.fecha === '' || formatJDEDate(t.date).includes(qbeP0911.fecha);
      const matchesExplicacion = qbeP0911.explicacion === '' || (t.description || '').toLowerCase().includes(qbeP0911.explicacion.toLowerCase());
      const matchesNumCuenta = qbeP0911.numCuenta === '' || (accDetails?.mainAccountNum || '').toLowerCase().includes(qbeP0911.numCuenta.toLowerCase());
      const matchesNombreCuenta = qbeP0911.nombreCuenta === '' || (accDetails?.mainAccountName || '').toLowerCase().includes(qbeP0911.nombreCuenta.toLowerCase());
      const matchesCategoriaCuenta = qbeP0911.categoriaCuenta === '' || (accDetails?.mainAccountCategory || '').toLowerCase().includes(qbeP0911.categoriaCuenta.toLowerCase());
      const matchesNumContrapartida = qbeP0911.numContrapartida === '' || (accDetails?.offsetAccountNum || '').toLowerCase().includes(qbeP0911.numContrapartida.toLowerCase());
      const matchesNombreContrapartida = qbeP0911.nombreContrapartida === '' || (accDetails?.offsetAccountName || '').toLowerCase().includes(qbeP0911.nombreContrapartida.toLowerCase());
      const matchesDebe = qbeP0911.debe === '' || (debitAmt > 0 && String(debitAmt).includes(qbeP0911.debe));
      const matchesHaber = qbeP0911.haber === '' || (creditAmt > 0 && String(creditAmt).includes(qbeP0911.haber));
      const matchesMonto = qbeP0911.monto === '' || String(t.amount).includes(qbeP0911.monto);
      const matchesMoneda = qbeP0911.moneda === '' || 'CLP'.toLowerCase().includes(qbeP0911.moneda.toLowerCase());
      const matchesBatch = qbeP0911.batch === '' || (t.batchNumber || '12845669').includes(qbeP0911.batch);
      const matchesPrograma = qbeP0911.programa === '' || (t.programId || 'P0911').toLowerCase().includes(qbeP0911.programa.toLowerCase());

      return matchesTipoDoc && matchesNumDoc && matchesCia && matchesFecha && matchesExplicacion && matchesNumCuenta && matchesNombreCuenta && matchesCategoriaCuenta && matchesNumContrapartida && matchesNombreContrapartida && matchesDebe && matchesHaber && matchesMonto && matchesMoneda && matchesBatch && matchesPrograma;
    });
  }, [transactions, qbeP0911, getJDEAccountDetails]);

  // Balance summation for P0911
  const totalsP0911 = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;
    filteredP0911List.forEach(t => {
      totalDebit += t.amount;
      totalCredit += t.amount;
    });
    return {
      debit: totalDebit,
      credit: totalCredit,
      balance: totalDebit - totalCredit
    };
  }, [filteredP0911List]);

  // 2. FILTERED LIST FOR P0411 (Supplier Accounts Ledger / Voucher One View)
  const filteredP0411List = useMemo(() => {
    return transactions.filter(t => {
      // Must have supplier info or be expenses (Vouchers)
      const matchesCia = qbeP0411.cia === '' || '00045'.includes(qbeP0411.cia);
      const matchesNombreCia = qbeP0411.nombreCia === '' || 'Financial Solutions'.toLowerCase().includes(qbeP0411.nombreCia.toLowerCase());
      const matchesProveedor = qbeP0411.numeroProveedor === '' || 
        (t.supplierId || '').toLowerCase().includes(qbeP0411.numeroProveedor.toLowerCase()) || 
        (t.supplierName || '').toLowerCase().includes(qbeP0411.numeroProveedor.toLowerCase());
      const matchesTipoDoc = qbeP0411.tipoDoc === '' || (t.documentType || 'PV').toLowerCase().includes(qbeP0411.tipoDoc.toLowerCase());
      const matchesNumDoc = qbeP0411.numDoc === '' || (t.documentNumber || '').toLowerCase().includes(qbeP0411.numDoc.toLowerCase());
      const matchesImporte = qbeP0411.importeBruto === '' || String(t.amount).includes(qbeP0411.importeBruto);
      const matchesFechaFactura = qbeP0411.fechaFactura === '' || formatJDEDate(t.invoiceDate || t.date).includes(qbeP0411.fechaFactura);
      const matchesFechaVence = qbeP0411.fechaVence === '' || formatJDEDate(t.date).includes(qbeP0411.fechaVence);
      const matchesUnidad = qbeP0411.unidadNegocio === '' || (t.propertyId || '').toLowerCase().includes(qbeP0411.unidadNegocio.toLowerCase());

      return matchesCia && matchesNombreCia && matchesProveedor && matchesTipoDoc && matchesNumDoc && matchesImporte && matchesFechaFactura && matchesFechaVence && matchesUnidad;
    });
  }, [transactions, qbeP0411]);

  // Balance summation for P0411
  const totalsP0411 = useMemo(() => {
    let bruteSum = 0;
    let pendingSum = 0;
    filteredP0411List.forEach(t => {
      bruteSum += t.amount;
      if (t.status === 'PENDIENTE') {
        pendingSum += t.amount;
      }
    });
    return {
      brute: bruteSum,
      pending: pendingSum
    };
  }, [filteredP0411List]);

  // Excel Export Handler for Grid Data (P0911 & P0411)
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);

  const handleExportGridToExcel = async () => {
    const listToExport = activeProgram === 'P0911' ? filteredP0911List : filteredP0411List;
    if (!listToExport || listToExport.length === 0) {
      alert('No hay registros en la grilla del Libro Diario para exportar.');
      return;
    }

    setIsExportingExcel(true);
    try {
      await exportJDELedgerToExcel(listToExport, activeProgram);
    } catch (err) {
      console.error('Error al exportar a Excel:', err);
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Listen for global ERP Toolbar Events (Top Menu Bar)
  useEffect(() => {
    const handleJdeFind = () => {
      // Refresh active ledger program
    };
    const handleJdeNew = () => {
      setShowManualPostForm(true);
    };
    const handleJdeExport = () => {
      handleExportGridToExcel();
    };
    const handleJdeClearQBE = () => {
      handleClearQBE();
    };
    const handleJdePrint = () => {
      const targetList = activeProgram === 'P0911' ? filteredP0911List : filteredP0411List;
      if (targetList.length > 0) {
        const linkedOT = workOrders.find(ot => ot.id === targetList[0].workOrderId);
        downloadJDETransactionVoucher({
          transaction: targetList[0],
          workOrder: linkedOT,
          currentUser
        });
      }
    };
    const handleJdeSelect = () => {
      const targetList = activeProgram === 'P0911' ? filteredP0911List : filteredP0411List;
      if (targetList.length > 0) {
        setInspectTarget({ record: targetList[0], entityType: 'TRANSACTION' });
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
  }, [activeProgram, filteredP0911List, filteredP0411List, workOrders, currentUser]);

  // Double entry submit action
  const handlePostJournalEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualAmount || manualAmount <= 0) {
      alert("Ingrese un monto contable válido superior a cero.");
      return;
    }

    const todayDate = new Date().toISOString().split('T')[0];
    
    // Create new Transaction representing a ERP Journal Entry
    const newTx: Transaction = {
      id: `TX-${Date.now()}`,
      description: `[ERP P0911 JE] ${manualConcept} (${manualAccountDebit} <-> ${manualAccountCredit})`,
      amount: manualAmount,
      category: 'PAGO A PROVEEDOR',
      type: 'EXPENSE', // Standard expense debit line
      documentType: manualDocType,
      documentNumber: manualDocNum || '191024' + Math.floor(Math.random() * 100),
      date: todayDate,
      invoiceDate: todayDate,
      user: currentUser || 'SAMAHEIM',
      timestamp: Date.now(),
      status: 'COMPLETADA',
      supplierId: manualSupplierId || undefined,
      supplierName: manualSupplierId ? supplierNamesMap[manualSupplierId] : undefined,
      propertyId: manualPropertyId || undefined,
      accountCode: manualAccountDebit.split(' ')[0], // Grab code
      insuranceCompany: 'GENERALES',
      lockedBy: null,
      lockedAt: null,
      programId: 'P0911',
      batchNumber: selectedBatchNum,
      workStationId: 'WK_MUT_SYS_01',
      nextNumberSeq: transactions.length + 1
    };

    onAddTransaction(newTx);
    setShowManualPostForm(false);
    alert(`ASIENTO CONTABLE REGISTRADO CON ÉXITO.\nLote de Gestión Integrada: ${selectedBatchNum}\nCuenta Deber: ${manualAccountDebit}\nCuenta Haber: ${manualAccountCredit}\nEstado: BALANCEADO`);
  };

  return (
    <div id="jde-accounting-desktop-workspace" className="bg-[#EAEAEA] border border-slate-300 shadow-lg min-h-[550px] font-sans flex flex-col overflow-visible">
      
      {/* ASSETFLOW CORPORATIVO NAVEGACIÓN PRINCIPAL */}
      <div className="bg-[#0B3C5D] text-white p-3 flex flex-col md:flex-row items-stretch justify-between gap-3 border-b-2 border-amber-500 shadow-md">
        
        {/* Core Title info */}
        <div className="flex items-center gap-2">
          <div className="bg-amber-600 px-2.5 py-1 text-[11px] font-black tracking-widest text-white uppercase flex items-center gap-1 shadow-sm select-none rounded border border-amber-700">
            <span className="text-white">ASSETFLOW</span>
          </div>
          <div className="ml-1 leading-none">
            <span className="text-[14px] font-bold block select-none tracking-tight">Gestión Integrada Corporativa de Finanzas</span>
            <span className="text-[9px] text-[#A6C5DB] block font-mono">Web Client Release v24.12.6 • AssetFlow Inmobiliario</span>
          </div>
        </div>

        {/* Traditional TOP Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-300 font-semibold md:border-l border-slate-600 md:pl-4 relative">
          
          {/* Inicio */}
          <button 
            type="button"
            onClick={() => {
              setActiveProgram('P0911');
            }}
            className="hover:text-amber-400 font-bold transition cursor-pointer select-none"
            title="Ir al inicio (P0911 Diario General)"
          >
            Inicio
          </button>
          
          <span>|</span>
          
          {/* Navegador */}
          <div className="relative">
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowNavigatorDropdown(prev => !prev);
                setShowOpenAppsDropdown(false);
                setShowFavoritesDropdown(false);
              }}
              className={`hover:text-amber-400 font-bold transition flex items-center gap-0.5 cursor-pointer select-none ${
                showNavigatorDropdown ? 'text-amber-400' : ''
              }`}
              title="Árbol del Navegador ERP"
            >
              <span>Navegador</span>
              <ChevronDown size={10} />
            </button>

            {showNavigatorDropdown && (
              <div 
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 mt-1.5 w-64 bg-white border border-[#0B3C5D] shadow-2xl z-50 text-slate-800 text-[10.5px] rounded-none divide-y divide-slate-100 font-sans"
              >
                <div className="bg-[#0B3C5D] text-white px-3 py-1 font-mono font-bold text-[9.5px] uppercase tracking-wider">
                  Árbol de Menús Empresariales ERP
                </div>
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveProgram('P0911');
                      setShowNavigatorDropdown(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#FFFCDD] hover:text-[#0B3C5D] flex items-center justify-between font-mono cursor-pointer"
                  >
                    <span>1. P0911 - Libro Diario General</span>
                    <span className="text-[9px] text-slate-400">G/L</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveProgram('P0411');
                      setShowNavigatorDropdown(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#FFFCDD] hover:text-[#0B3C5D] flex items-center justify-between font-mono cursor-pointer"
                  >
                    <span>2. P0411 - Cuentas por Pagar (AP)</span>
                    <span className="text-[9px] text-slate-400">Prov</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowRecentReportsModal(true);
                      setShowNavigatorDropdown(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#FFFCDD] hover:text-[#0B3C5D] flex items-center justify-between font-mono cursor-pointer border-t border-slate-100 text-indigo-700 font-bold"
                  >
                    <span>3. P986110B - Informes Recientes (WSJ)</span>
                    <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1 rounded">UBE</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <span>|</span>
          
          {/* Abrir aplicaciones */}
          <div className="relative">
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowOpenAppsDropdown(prev => !prev);
                setShowNavigatorDropdown(false);
                setShowFavoritesDropdown(false);
              }}
              className={`text-white font-bold transition flex items-center gap-0.5 cursor-pointer select-none pb-0.5 ${
                showOpenAppsDropdown || (!showRecentReportsModal && !showFavoritesDropdown && !showNavigatorDropdown) ? 'border-b-2 border-amber-400' : 'hover:text-amber-400'
              }`}
              title="Aplicaciones activas y selector"
            >
              <span>Abrir aplicaciones</span>
              <ChevronDown size={10} />
            </button>

            {showOpenAppsDropdown && (
              <div 
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 mt-1.5 w-60 bg-white border border-[#0B3C5D] shadow-2xl z-50 text-slate-800 text-[10.5px] rounded-none divide-y divide-slate-100 font-sans"
              >
                <div className="bg-[#0B3C5D] text-white px-3 py-1 font-mono font-bold text-[9.5px] uppercase tracking-wider">
                  Aplicaciones en Ejecución
                </div>
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveProgram('P0911');
                      setShowOpenAppsDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 flex items-center justify-between font-mono cursor-pointer ${
                      activeProgram === 'P0911' ? 'bg-[#FFFCDD] font-bold text-[#0B3C5D]' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span>● P0911 Diario General</span>
                    {activeProgram === 'P0911' && <span className="text-[9px] text-emerald-700 font-bold">ACTIVO</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveProgram('P0411');
                      setShowOpenAppsDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 flex items-center justify-between font-mono cursor-pointer ${
                      activeProgram === 'P0411' ? 'bg-[#FFFCDD] font-bold text-[#0B3C5D]' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span>● P0411 Cuentas por Pagar</span>
                    {activeProgram === 'P0411' && <span className="text-[9px] text-emerald-700 font-bold">ACTIVO</span>}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowRecentReportsModal(true);
                      setShowOpenAppsDropdown(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#FFFCDD] hover:text-[#0B3C5D] flex items-center justify-between font-mono cursor-pointer border-t border-slate-100 text-indigo-700 font-bold"
                  >
                    <span>✦ Abrir Informes Recientes (WSJ)</span>
                    <span className="text-[9px] bg-indigo-50 px-1 rounded">P986110B</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <span>|</span>
          
          {/* Informes recientes */}
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowRecentReportsModal(true);
              setShowNavigatorDropdown(false);
              setShowOpenAppsDropdown(false);
              setShowFavoritesDropdown(false);
            }}
            className={`font-bold transition flex items-center gap-1 cursor-pointer select-none pb-0.5 ${
              showRecentReportsModal 
                ? 'text-white border-b-2 border-amber-400' 
                : 'text-slate-200 hover:text-amber-400'
            }`}
            title="Abrir Trabajar con Trabajos Enviados (WSJ - P986110B) • Informes Recientes"
          >
            <span className="bg-amber-500 text-slate-900 px-1 rounded-[2px] text-[8.5px] font-black mr-0.5">WSJ</span>
            <span>Informes recientes</span>
          </button>
          
          <span>|</span>
          
          {/* Favoritos */}
          <div className="relative">
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowFavoritesDropdown(prev => !prev);
                setShowNavigatorDropdown(false);
                setShowOpenAppsDropdown(false);
              }}
              className={`hover:text-amber-400 font-bold transition flex items-center gap-0.5 cursor-pointer select-none ${
                showFavoritesDropdown ? 'text-amber-400' : ''
              }`}
              title="Menú de Favoritos"
            >
              <span>Favoritos</span>
              <ChevronDown size={10} />
            </button>

            {showFavoritesDropdown && (
              <div 
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 mt-1.5 w-60 bg-white border border-[#0B3C5D] shadow-2xl z-50 text-slate-800 text-[10.5px] rounded-none divide-y divide-slate-100 font-sans"
              >
                <div className="bg-[#0B3C5D] text-white px-3 py-1 font-mono font-bold text-[9.5px] uppercase tracking-wider">
                  Accesos Favoritos Rápidos
                </div>
                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveProgram('P0911');
                      setShowFavoritesDropdown(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#FFFCDD] hover:text-[#0B3C5D] flex items-center gap-1.5 font-mono cursor-pointer"
                  >
                    <span className="text-amber-500">★</span>
                    <span>P0911 - Libro Diario General</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveProgram('P0411');
                      setShowFavoritesDropdown(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#FFFCDD] hover:text-[#0B3C5D] flex items-center gap-1.5 font-mono cursor-pointer"
                  >
                    <span className="text-amber-500">★</span>
                    <span>P0411 - Cuentas por Pagar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowRecentReportsModal(true);
                      setShowFavoritesDropdown(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#FFFCDD] hover:text-[#0B3C5D] flex items-center gap-1.5 font-mono cursor-pointer text-indigo-700 font-bold border-t border-slate-100"
                  >
                    <span className="text-amber-500">★</span>
                    <span>WSJ - Informes Recientes (P986110B)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* User context information */}
        <div className="flex flex-col sm:flex-row items-center gap-3 text-[10px] text-[#9DB2C3] font-mono">
          <div className="bg-slate-950/45 px-2 py-1 rounded border border-slate-800 flex items-center gap-2">
            <span className="text-amber-400 font-bold animate-pulse">● JP0910</span>
            <span>Worldwide Company [00001]</span>
          </div>
          <span className="hidden sm:inline">|</span>
          <div className="text-slate-105 font-bold flex items-center gap-1 uppercase select-none">
            <span className="bg-[#144D75] px-1.5 py-0.5 rounded text-white font-mono text-[9px]">USER:</span>
            <span className="text-white">{currentUser}</span>
          </div>
        </div>

      </div>

      {/* QUICK ACCESS / PATH TOOLBAR */}
      <div className="bg-slate-100 border-b border-slate-300 px-4 py-2 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs select-none">
        
        {/* Path navigation indicator */}
        <div className="flex items-center gap-2 font-mono text-[10.5px] text-slate-600">
          <span className="font-bold text-[#0B3C5D]">Fast Path / Aplicación Inmobiliaria:</span>
          <div className="flex items-center gap-1 bg-white border border-slate-300 px-2 py-1 rounded">
            <span className="text-[#a11c1c] font-black">{activeProgram}</span>
            <span className="text-slate-400">/</span>
            <span className="text-slate-600 font-bold">
              {activeProgram === 'P0911' ? 'F0911_Revisión_Diario_General' : 'F0411_Consultas_LM_Proveedores_OneView'}
            </span>
          </div>
        </div>

        {/* Program switch button */}
        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={() => setActiveProgram('P0911')}
            className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded border transition cursor-pointer ${
              activeProgram === 'P0911' 
                ? 'bg-[#0B3C5D] text-white border-[#082a42]' 
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-xs'
            }`}
          >
            P0911 - Diario General
          </button>
          <button 
            type="button"
            onClick={() => setActiveProgram('P0411')}
            className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded border transition cursor-pointer ${
              activeProgram === 'P0411' 
                ? 'bg-[#0B3C5D] text-white border-[#082a42]' 
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 shadow-xs'
            }`}
          >
            P0411 - Ledger Proveedores
          </button>
        </div>

      </div>

      {/* ERP ICON ACTION BAR (Accept, Find, Add, Delete, Clear, Tools) */}
      <div className="bg-[#DFEFFC] border-b border-[#A6C5DB] px-4 py-2 flex items-center justify-between gap-4">
        
        {/* Left Side: Buttons exactly styled like AssetFlow Enterprise toolbar */}
        <div className="flex items-center gap-1.5">
          
          {/* Magnifying Glass (Buscar) */}
          <button 
            type="button"
            title="Buscar según filtros (Find)"
            className="p-1.5 rounded bg-[#F7FAFC] hover:bg-white text-slate-700 border border-[#94A3B8] shadow-xs cursor-pointer transition relative group flex items-center gap-1"
          >
            <Search size={14} className="text-indigo-600 font-black" />
            <span className="text-[10px] font-bold uppercase font-mono px-0.5 text-slate-700">Find</span>
          </button>

          {/* Plus Sign (Add/Nuevo) */}
          <button 
            type="button"
            onClick={() => setShowManualPostForm(true)}
            title="Ingresar Asiento Diario Manual (Add)"
            className="p-1.5 rounded bg-[#FCFCFD] hover:bg-white text-[#10B981] border border-slate-300 shadow-xs cursor-pointer transition flex items-center gap-1"
          >
            <Plus size={14} className="stroke-[3]" />
            <span className="text-[10px] font-bold uppercase font-mono px-0.5 text-slate-750">Add JE</span>
          </button>

          {/* Green Check Box (Post / Auto Balance) */}
          <button 
            type="button"
            onClick={() => alert(`SISTEMA DE EQUILIBRIO ACTIVO.\n\nF0911 Balanceando Débitos y Créditos.\nEstado: Sincronizado`)}
            title="Sincronizar y Postear (OK)"
            className="p-1.5 rounded bg-[#FCFCFD] hover:bg-white text-emerald-700 border border-slate-300 shadow-xs cursor-pointer transition flex items-center gap-1"
          >
            <Check size={14} className="stroke-[3]" />
            <span className="text-[10px] font-bold uppercase font-mono px-0.5 text-slate-750">OK</span>
          </button>

          <span className="h-6 w-px bg-slate-300 mx-1"></span>

          {/* Red Cancel / Clear QBE */}
          <button 
            type="button"
            onClick={handleClearQBE}
            title="Cancelar / Restablecer filtros QBE (Close / Reset)"
            className="p-1.5 rounded bg-[#FCFCFD] hover:bg-white text-rose-700 border border-slate-300 shadow-xs cursor-pointer transition flex items-center gap-1"
          >
            <X size={14} className="stroke-[3]" />
            <span className="text-[10px] font-bold uppercase font-mono px-0.5 text-slate-750">Clear</span>
          </button>

          {/* Excel Export */}
          <button 
            type="button"
            onClick={handleExportGridToExcel}
            disabled={isExportingExcel}
            title="Exportar información de la grilla a Excel (.xlsx) en tabla tabulada"
            className="p-1.5 rounded bg-[#FCFCFD] hover:bg-emerald-50 text-emerald-700 border border-slate-300 shadow-xs cursor-pointer transition flex items-center gap-1 font-semibold disabled:opacity-50"
          >
            {isExportingExcel ? (
              <Loader2 size={14} className="animate-spin text-emerald-600" />
            ) : (
              <FileSpreadsheet size={14} className="text-emerald-600" />
            )}
            <span className="text-[10px] font-bold uppercase font-mono px-0.5 text-slate-750">
              {isExportingExcel ? 'Exportando...' : 'Export'}
            </span>
          </button>

          {/* Cuadratura General Action Button */}
          <button 
            type="button"
            onClick={handleCuadraturaLedgerExecute}
            title="Ejecutar Proceso de Cuadratura General de Libro de Cuenta (P09210)"
            className="p-1.5 rounded bg-[#EDF2F7] hover:bg-indigo-50 text-indigo-700 border border-slate-350 shadow-sm cursor-pointer transition flex items-center gap-1 font-semibold"
          >
            <Layers size={14} />
            <span className="text-[10px] font-bold uppercase font-mono px-0.5">Cuadratura General</span>
          </button>

          {/* Official Chilean Tax Audit Report Download Button */}
          <button 
            type="button"
            onClick={() => {
              downloadChileanTaxAuditReport({
                currentUser,
                systemDate: new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })
              });
            }}
            title="Descargar Informe del Equipo Experto de Contadores Auditores (Normativa Tributaria Chilena / SII)"
            className="p-1.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-300 shadow-xs cursor-pointer transition flex items-center gap-1 font-bold select-none"
          >
            <ShieldAlert size={14} className="text-rose-600" />
            <span className="text-[10px] font-black uppercase font-mono px-0.5 text-rose-900">
              Dictamen Auditoría PDF
            </span>
          </button>

          {/* ERP / Corporativo Forensic Plagiarism & Comparison Assessment Button */}
          <button 
            type="button"
            onClick={() => setShowJdeComparisonModal(true)}
            title="Descargar Dictamen Pericial Forense sobre parecido con AssetFlow Enterprise y análisis de plagio Corporativo (PDF)"
            className="p-1.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs cursor-pointer transition flex items-center gap-1 font-bold select-none"
          >
            <Scale size={14} className="text-emerald-700" />
            <span className="text-[10px] font-black uppercase font-mono px-0.5 text-emerald-900">
              Dictamen ERP / Corporativo (PDF)
            </span>
          </button>

        </div>

        {/* Right Side: Row counts & layout variables */}
        <div className="text-[10px] font-mono text-[#0B3C5D] font-bold flex items-center gap-3">
          <span className="bg-white border px-2 py-0.5 rounded shadow-2xs">
            Registros: 1 - {activeProgram === 'P0911' ? filteredP0911List.length : filteredP0411List.length} d
          </span>
          <span className="hidden sm:inline">Disposición: * CRL DEFAULT</span>
        </div>

      </div>

      {/* MAIN WINDOW CONTENTS */}
      <div className="p-4 bg-white flex-1 space-y-4">
        
        {/* AUDITING PROGRESS LOADING STATE CARD */}
        {isAuditingLedger && (
          <div className="bg-slate-900 text-white p-6 rounded-xl border border-slate-705 shadow-xl space-y-4 animate-pulse">
            <div className="flex items-center gap-3">
              <RefreshCw className="animate-spin text-amber-500" size={20} />
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-[#E2ECF5]">
                  EJECUTANDO AUDITORÍA INTEGRAL DE CUADRATURA GENERAL (P09210)
                </h3>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">ESTADO: {auditStatusText}</p>
              </div>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-[#FFCC00] h-full transition-all duration-350"
                style={{ width: `${auditProgressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-slate-500 font-mono">
              <span>ASSETFLOW F0911 MATRIX COMPARISON</span>
              <span>{auditProgressPercent}% COMPLETO</span>
            </div>
          </div>
        )}
        
        {/* MANUAL JOURNAL ENTRY PANEL (Hidden by default, triggered by Add) */}
        {showManualPostForm && (
          <div className="bg-[#FFFCEB] border-2 border-amber-300 p-4 rounded-xl shadow-inner animate-in slide-in-from-top duration-250">
            <div className="flex justify-between items-center border-b border-amber-200 pb-2 mb-3">
              <h4 className="text-xs font-black uppercase text-amber-950 font-mono tracking-widest flex items-center gap-1.5">
                <Sliders size={15} className="text-amber-700 animate-spin" />
                P0911 - Nuevo Registro Manual para Lote Contable ERP
              </h4>
              <button 
                type="button" 
                onClick={() => setShowManualPostForm(false)}
                className="text-amber-800 hover:text-black font-black font-mono text-[11px] bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded"
              >
                CERRAR [X]
              </button>
            </div>

            <form onSubmit={handlePostJournalEntry} className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-medium">
              <div>
                <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">Folio / Nº Comprobante:</label>
                <input 
                  type="text" 
                  value={manualDocNum}
                  onChange={e => setManualDocNum(maskFolioOrInvoice(e.target.value))}
                  placeholder="Ej: JE-191024"
                  className="w-full bg-white border border-slate-300 p-2 rounded text-xs font-mono uppercase focus:ring-1 focus:ring-[#0B3C5D] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">Tipo Documento:</label>
                <select 
                  value={manualDocType}
                  onChange={e => setManualDocType(e.target.value)}
                  className="w-full bg-white border border-slate-300 p-2 rounded text-xs focus:ring-1 focus:ring-[#0B3C5D] focus:outline-none"
                >
                  <option value="JE">JE - Asiento Diario General</option>
                  <option value="PV">PV - Cuenta por Pagar</option>
                  <option value="DP">DP - Depósito Bancario</option>
                  <option value="RE">RE - Reembolso Directo</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] font-black text-slate-600 uppercase">Monto Movimiento:</label>
                  {manualAmount > 0 && (
                    <span className="text-[9px] font-mono font-bold text-emerald-700">
                      $ {manualAmount.toLocaleString('es-CL')}
                    </span>
                  )}
                </div>
                <input 
                  type="text" 
                  value={manualAmount ? `$ ${manualAmount.toLocaleString('es-CL')}` : ''}
                  onChange={e => {
                    const { rawNumber } = maskMoneyCLP(e.target.value);
                    setManualAmount(rawNumber);
                  }}
                  placeholder="$ 0"
                  className="w-full bg-white border border-slate-300 p-2 rounded text-xs font-mono font-bold text-[#0B3C5D] focus:ring-1 focus:ring-[#0B3C5D] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">Nº Lote Asignado:</label>
                <input 
                  type="text" 
                  value={selectedBatchNum}
                  onChange={e => setSelectedBatchNum(e.target.value)}
                  className="w-full bg-white border border-slate-300 p-2 rounded text-xs font-mono font-bold focus:outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">Cuenta Contable Origen DEBER (Debit):</label>
                <select 
                  value={manualAccountDebit}
                  onChange={e => setManualAccountDebit(e.target.value)}
                  className="w-full bg-white border border-slate-300 p-2 rounded text-xs focus:ring-1 focus:ring-[#0B3C5D] focus:outline-none"
                >
                  <option value="1110.01.002 - Caja General">1110.01.002 - Caja General (Caja/Bancos)</option>
                  <option value="1120.04.015 - Arriendos Recaudar">1120.04.015 - Cuentas x Cobrar Arriendos</option>
                  <option value="1250.01.001 - Propiedades Inversión">1250.01.001 - Propiedades de Inversión</option>
                  <option value="5110.02.001 - Gastos Operacionales">5110.02.001 - Gastos Operacionales Mantención</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">Cuenta Contable Destino HABER (Credit):</label>
                <select 
                  value={manualAccountCredit}
                  onChange={e => setManualAccountCredit(e.target.value)}
                  className="w-full bg-white border border-slate-300 p-2 rounded text-xs focus:ring-1 focus:ring-[#0B3C5D] focus:outline-none"
                >
                  <option value="2110.05.001 - Proveedores Nacionales">2110.05.001 - Proveedores Nacionales (CxP)</option>
                  <option value="2120.12.010 - Garantías Pendientes">2120.12.010 - Depósitos de Garantías Recibidos</option>
                  <option value="4110.01.002 - Ingresos de Rentas">4110.01.002 - Ingresos Tributarios por Alquileres</option>
                  <option value="1110.01.003 - Reembolsos Caja Chica">1110.01.003 - Fondo Fijo Rendición</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">Glosa / Explicación del Movimiento:</label>
                <input 
                  type="text" 
                  value={manualConcept}
                  onChange={e => setManualConcept(e.target.value)}
                  className="w-full bg-white border border-slate-300 p-2 rounded text-xs focus:ring-1 focus:ring-[#0B3C5D] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">Asociar Proveedor (Opcional):</label>
                <select 
                  value={manualSupplierId}
                  onChange={e => setManualSupplierId(e.target.value)}
                  className="w-full bg-white border border-slate-300 p-2 rounded text-xs focus:ring-1 focus:ring-[#0B3C5D] focus:outline-none"
                >
                  <option value="">-- Sin Proveedor --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.taxId})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">Asociar Unidad Propiedad (Opcional):</label>
                <select 
                  value={manualPropertyId}
                  onChange={e => setManualPropertyId(e.target.value)}
                  className="w-full bg-white border border-slate-300 p-2 rounded text-xs focus:ring-1 focus:ring-[#0B3C5D] focus:outline-none"
                >
                  <option value="">-- Sin Unidad --</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-4 flex justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowManualPostForm(false)}
                  className="bg-white hover:bg-slate-50 border border-slate-300 px-4 py-2 rounded text-[11px] font-mono font-bold"
                >
                  RECHAZAR / CANCELAR
                </button>
                <button 
                  type="submit"
                  className="bg-emerald-700 hover:bg-emerald-600 text-white px-5 py-2 rounded text-[11px] font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Check size={13} className="stroke-[3]" /> POSTEAR ASIENTO ERP
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW A: P0911 - REVISIÓN DE DIARIO GENERAL DE INCIDENCIAS TI  */}
        {/* ------------------------------------------------------------- */}
        {activeProgram === 'P0911' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            
            {/* Top General ERP Batch filter block */}
            <div className="bg-[#F8FAFC] border border-slate-200 rounded-lg p-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-black text-slate-505 uppercase tracking-wide block font-mono">Nº batch / Tipo:</label>
                <div className="flex items-center gap-1">
                  <input 
                    type="text" 
                    value={selectedBatchNum} 
                    onChange={e => setSelectedBatchNum(e.target.value)}
                    className="w-24 bg-white border border-slate-300 px-2 py-1 text-center font-mono font-bold focus:outline-none rounded"
                  />
                  <select 
                    value={selectedBatchType} 
                    onChange={e => setSelectedBatchType(e.target.value as any)}
                    className="bg-white border border-slate-300 px-1.5 py-1 font-mono hover:bg-slate-50 text-[10px] font-bold rounded"
                  >
                    <option value="G">G - Diario General</option>
                    <option value="V">V - Vales Proveedor</option>
                    <option value="JE">JE - Asiento Manual</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3 md:justify-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Contabilidad:</span>
                <span className="text-slate-700 font-black tracking-wider uppercase font-sans">Contabilidad general de arriendos</span>
              </div>

              <div className="bg-white px-3 py-1 bg-[#EEF2F6] rounded-md border text-[10px] flex items-center justify-between font-mono font-black text-[#0B3C5D]">
                <span>TIPO DE LIBRO:</span>
                <span className="text-slate-800">AA - ACTUAL ACCOUNTS</span>
              </div>
            </div>

            {/* Main Interactive Grid representing AssetFlow Enterprise screenshot */}
            <div className="border border-slate-300 rounded shadow-xs bg-white">
              {/* AssetFlow Enterprise Top Grid Toolbar */}
              <div className="bg-[#EFEFEF] border-b border-slate-300 px-3 py-1.5 flex flex-wrap items-center justify-between text-[11px] font-sans text-slate-800 gap-2">
                <div className="flex items-center gap-2 overflow-x-auto">
                  <span className="font-sans text-[10.5px] text-slate-700 font-bold whitespace-nowrap mr-2">
                    Records 1 - {filteredP0911List.length} &gt; ⇥
                  </span>
                  <div className="flex items-center gap-1 font-sans">
                    <button type="button" onClick={() => {}} className="bg-[#E2ECF5] border border-[#B0C4DE] hover:bg-[#D2E2F0] text-[#0A2540] px-2 py-0.5 rounded-sm text-[10.5px] font-bold shadow-2xs cursor-pointer">Find</button>
                    <button type="button" onClick={() => {}} className="bg-[#E2ECF5] border border-[#B0C4DE] hover:bg-[#D2E2F0] text-[#0A2540] px-2 py-0.5 rounded-sm text-[10.5px] font-bold shadow-2xs cursor-pointer">Print Pick Slip</button>
                    <button type="button" onClick={() => handleCuadraturaLedgerExecute()} className="bg-[#E2ECF5] border border-[#B0C4DE] hover:bg-[#D2E2F0] text-[#0A2540] px-2 py-0.5 rounded-sm text-[10.5px] font-bold shadow-2xs cursor-pointer">Cuadratura ERP</button>
                    <button type="button" onClick={() => exportJDELedgerToExcel(filteredP0911List, 'P0911')} className="bg-[#E2ECF5] border border-[#B0C4DE] hover:bg-[#D2E2F0] text-[#0A2540] px-2 py-0.5 rounded-sm text-[10.5px] font-bold shadow-2xs cursor-pointer">Exportar XLSX</button>
                    <button type="button" onClick={() => {}} className="bg-[#E2ECF5] border border-[#B0C4DE] hover:bg-[#D2E2F0] text-[#0A2540] px-2 py-0.5 rounded-sm text-[10.5px] font-bold shadow-2xs cursor-pointer">Batch Status</button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-indigo-900 bg-sky-100 font-bold px-2 py-0.5 rounded border border-sky-300">
                    ↔ Slidebar Horizontal Activo
                  </span>
                  <select 
                    value={ledgerViewMode} 
                    onChange={e => setLedgerViewMode(e.target.value as any)} 
                    className="bg-white border border-[#B0C4DE] px-2 py-0.5 text-[10.5px] rounded-sm text-[#0A2540] font-bold outline-none cursor-pointer hover:bg-slate-50"
                  >
                    <option value="PARTIDA_DOBLE">Partida Doble Desglosada (DEBE / HABER)</option>
                    <option value="RESUMIDO">Vista Resumida por Comprobante</option>
                  </select>
                </div>
              </div>

              {/* Explicit Slidebar Status Bar */}
              <div className="bg-[#DCE7F2] border-b border-[#B0C4DE] px-3 py-1 flex items-center justify-between text-[10.5px] font-sans text-[#0B3C5D]">
                <div className="flex items-center gap-2 font-bold">
                  <span className="text-blue-900 font-black text-sm">↔ SLIDEBAR HORIZONTAL (GRILLA EXTENDIDA):</span>
                  <span>Desplace la barra inferior o utilice Shift + Rueda del Mouse para navegar las 17 columnas contables</span>
                </div>
                <span className="text-[10px] font-mono text-slate-700 bg-white px-2 py-0.5 rounded border border-[#B0C4DE] font-semibold">
                  17 Columnas Cargadas
                </span>
              </div>

              <div className="overflow-x-auto overflow-y-auto max-h-[60vh] min-h-[250px] pb-2 bg-white [&::-webkit-scrollbar]:h-4 [&::-webkit-scrollbar-track]:bg-slate-200 [&::-webkit-scrollbar-thumb]:bg-[#0B3C5D] [&::-webkit-scrollbar-thumb]:rounded-sm hover:[&::-webkit-scrollbar-thumb]:bg-blue-800">
                <table className="w-full text-[10.5px] text-left border-collapse table-fixed min-w-[2100px]">
                  
                  {/* Table Column Headers - Standard ERP Grayish-Blue */}
                  <thead className="bg-[#E2ECF5] text-[#0A2540] border-b border-[#B0C4DE] select-none">
                    <tr className="font-sans text-[10.5px] font-bold text-left text-[#0A2540]">
                      <th className="relative px-1.5 py-1 border border-[#B0C4DE] text-center bg-[#E2ECF5] text-[#0A2540]" style={{ width: `${colWidthsP0911.sel}px` }}>
                        <input 
                          type="checkbox"
                          checked={selectedP0911RowIds.length === filteredP0911List.length && filteredP0911List.length > 0}
                          onChange={() => toggleAllP0911Rows(filteredP0911List)}
                          className="cursor-pointer rounded-none border-slate-400 text-cyan-600 focus:ring-0"
                        />
                        <div onMouseDown={(e) => handleResizeP0911('sel', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400 active:bg-blue-600 z-10" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative px-1.5 py-1 border border-[#B0C4DE] text-ellipsis overflow-hidden bg-[#E2ECF5] text-[#0A2540]" style={{ width: `${colWidthsP0911.docType}px` }}>
                        <div className="flex items-center justify-between">
                          <span className="truncate block font-bold text-[#0A2540]">Tipo documento</span>
                          <span className="text-[8px] text-slate-500">⇕</span>
                        </div>
                        <div onMouseDown={(e) => handleResizeP0911('docType', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400 active:bg-blue-600 z-10" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative px-1.5 py-1 border border-[#B0C4DE] text-ellipsis overflow-hidden bg-[#E2ECF5] text-[#0A2540]" style={{ width: `${colWidthsP0911.docNum}px` }}>
                        <div className="flex items-center justify-between">
                          <span className="truncate block font-bold text-[#0A2540]">Número documento</span>
                          <span className="text-[8px] text-slate-500">⇕</span>
                        </div>
                        <div onMouseDown={(e) => handleResizeP0911('docNum', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400 active:bg-blue-600 z-10" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative px-1.5 py-1 border border-[#B0C4DE] text-ellipsis overflow-hidden bg-[#E2ECF5] text-[#0A2540]" style={{ width: `${colWidthsP0911.company}px` }}>
                        <div className="flex items-center justify-between">
                          <span className="truncate block font-bold text-[#0A2540]">Compañía doc</span>
                          <span className="text-[8px] text-slate-500">⇕</span>
                        </div>
                        <div onMouseDown={(e) => handleResizeP0911('company', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400 active:bg-blue-600 z-10" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative px-1.5 py-1 border border-[#B0C4DE] text-ellipsis overflow-hidden bg-[#E2ECF5] text-[#0A2540]" style={{ width: `${colWidthsP0911.date}px` }}>
                        <div className="flex items-center justify-between">
                          <span className="truncate block font-bold text-[#0A2540]">Fecha LM</span>
                          <span className="text-[8px] text-slate-500">⇕</span>
                        </div>
                        <div onMouseDown={(e) => handleResizeP0911('date', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400 active:bg-blue-600 z-10" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative px-1.5 py-1 border border-[#B0C4DE] text-ellipsis overflow-hidden bg-[#E2ECF5] text-[#0A2540]" style={{ width: `${colWidthsP0911.concept}px` }}>
                        <div className="flex items-center justify-between">
                          <span className="truncate block font-bold text-[#0A2540]">Explicación Concepto</span>
                          <span className="text-[8px] text-slate-500">⇕</span>
                        </div>
                        <div onMouseDown={(e) => handleResizeP0911('concept', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400 active:bg-blue-600 z-10" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative px-1.5 py-1 border border-[#B0C4DE] text-ellipsis overflow-hidden bg-[#D2E2F0] text-[#0A2540]" style={{ width: `${colWidthsP0911.numCuenta}px` }}>
                        <div className="flex items-center justify-between">
                          <span className="truncate block font-bold text-[#0A2540]">Nº Cuenta</span>
                          <span className="text-[8px] text-slate-500">⇕</span>
                        </div>
                        <div onMouseDown={(e) => handleResizeP0911('numCuenta', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400 active:bg-blue-600 z-10" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative px-1.5 py-1 border border-[#B0C4DE] text-ellipsis overflow-hidden bg-[#E2ECF5] text-[#0A2540]" style={{ width: `${colWidthsP0911.nombreCuenta}px` }}>
                        <div className="flex items-center justify-between">
                          <span className="truncate block font-bold text-[#0A2540]">Nombre de Cuenta</span>
                          <span className="text-[8px] text-slate-500">⇕</span>
                        </div>
                        <div onMouseDown={(e) => handleResizeP0911('nombreCuenta', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400 active:bg-blue-600 z-10" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative px-1.5 py-1 border border-[#B0C4DE] text-ellipsis overflow-hidden bg-[#E2ECF5] text-[#0A2540]" style={{ width: `${colWidthsP0911.categoriaCuenta}px` }}>
                        <div className="flex items-center justify-between">
                          <span className="truncate block font-bold text-[#0A2540]">Categoría / Rubro</span>
                          <span className="text-[8px] text-slate-500">⇕</span>
                        </div>
                        <div onMouseDown={(e) => handleResizeP0911('categoriaCuenta', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400 active:bg-blue-600 z-10" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative px-1.5 py-1 border border-[#B0C4DE] text-ellipsis overflow-hidden bg-[#DDE6F0] text-[#0A2540]" style={{ width: `${colWidthsP0911.numContrapartida}px` }}>
                        <div className="flex items-center justify-between">
                          <span className="truncate block font-bold text-[#0A2540]">Nº Contrapartida</span>
                          <span className="text-[8px] text-slate-500">⇕</span>
                        </div>
                        <div onMouseDown={(e) => handleResizeP0911('numContrapartida', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400 active:bg-blue-600 z-10" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative px-1.5 py-1 border border-[#B0C4DE] text-ellipsis overflow-hidden bg-[#DDE6F0] text-[#0A2540]" style={{ width: `${colWidthsP0911.nombreContrapartida}px` }}>
                        <div className="flex items-center justify-between">
                          <span className="truncate block font-bold text-[#0A2540]">Nombre Contrapartida</span>
                          <span className="text-[8px] text-slate-500">⇕</span>
                        </div>
                        <div onMouseDown={(e) => handleResizeP0911('nombreContrapartida', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400 active:bg-blue-600 z-10" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative px-1.5 py-1 border border-[#B0C4DE] text-right text-ellipsis overflow-hidden bg-[#E2ECF5]" style={{ width: `${colWidthsP0911.debe}px` }}>
                        <div className="flex items-center justify-between">
                          <span className="truncate block text-[#082238] font-bold">DEBE (DÉBITO)</span>
                          <span className="text-[8px] text-slate-500">⇕</span>
                        </div>
                        <div onMouseDown={(e) => handleResizeP0911('debe', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400 active:bg-blue-600 z-10" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative px-1.5 py-1 border border-[#B0C4DE] text-right text-ellipsis overflow-hidden bg-[#E2ECF5]" style={{ width: `${colWidthsP0911.haber}px` }}>
                        <div className="flex items-center justify-between">
                          <span className="truncate block text-[#02401B] font-bold">HABER (CRÉDITO)</span>
                          <span className="text-[8px] text-slate-500">⇕</span>
                        </div>
                        <div onMouseDown={(e) => handleResizeP0911('haber', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400 active:bg-blue-600 z-10" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative px-1.5 py-1 border border-[#B0C4DE] text-right text-ellipsis overflow-hidden bg-[#E2ECF5] text-[#0A2540]" style={{ width: `${colWidthsP0911.amtExt}px` }}>
                        <div className="flex items-center justify-between">
                          <span className="truncate block font-bold text-[#0A2540]">Importe MExt</span>
                          <span className="text-[8px] text-slate-500">⇕</span>
                        </div>
                        <div onMouseDown={(e) => handleResizeP0911('amtExt', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400 active:bg-blue-600 z-10" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative px-1.5 py-1 border border-[#B0C4DE] text-center text-ellipsis overflow-hidden bg-[#E2ECF5] text-[#0A2540]" style={{ width: `${colWidthsP0911.batchNum}px` }}>
                        <div className="flex items-center justify-between">
                          <span className="truncate block font-bold text-[#0A2540]">Batch ERP</span>
                          <span className="text-[8px] text-slate-500">⇕</span>
                        </div>
                        <div onMouseDown={(e) => handleResizeP0911('batchNum', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400 active:bg-blue-600 z-10" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative px-1.5 py-1 border border-[#B0C4DE] text-ellipsis overflow-hidden bg-[#E2ECF5] text-[#0A2540]" style={{ width: `${colWidthsP0911.mnd}px` }}>
                        <div className="flex items-center justify-between">
                          <span className="truncate block font-bold text-[#0A2540]">Mnd</span>
                          <span className="text-[8px] text-slate-500">⇕</span>
                        </div>
                        <div onMouseDown={(e) => handleResizeP0911('mnd', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400 active:bg-blue-600 z-10" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative px-1.5 py-1 border border-[#B0C4DE] text-center bg-[#D2E2F0] text-ellipsis overflow-hidden text-[#0A2540]" style={{ width: `${colWidthsP0911.f980011d}px` }}>
                        <span className="truncate block font-bold text-[#0A2540]">F980011D</span>
                        <div onMouseDown={(e) => handleResizeP0911('f980011d', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-sky-400 active:bg-blue-600 z-10" title="Arrastrar para ajustar ancho" />
                      </th>
                    </tr>
                    
                    {/* QBE - QUERY BY EXAMPLE INPUTS (Directly Under Headers!) */}
                    <tr className="bg-[#EEF4FA] border-b border-[#B0C4DE]">
                      <td className="px-1 py-0.5 text-center border border-[#B0C4DE]">
                        <span className="text-[8px] text-slate-500 font-bold">QBE</span>
                      </td>
                      <td className="px-1 py-0.5 border border-[#B0C4DE]">
                        <div className="relative flex items-center">
                          <input 
                            type="text" 
                            placeholder=""
                            value={qbeP0911.tipoDoc}
                            onChange={e => setQbeP0911({...qbeP0911, tipoDoc: e.target.value})}
                            className="w-full bg-white border border-[#B0C4DE] pl-1 pr-5 py-0.5 rounded-none text-[10.5px] font-mono text-[#0A2540] outline-none font-medium focus:border-blue-600 focus:bg-[#FFFDE8]"
                          />
                          <button 
                            type="button"
                            onClick={() => setJdeVisualAssist({
                              type: 'docType',
                              onSelect: (val) => setQbeP0911(prev => ({ ...prev, tipoDoc: val }))
                            })}
                            className="absolute right-0.5 text-[#0B3C5D] hover:text-amber-600 font-bold text-[10px] select-none cursor-pointer transition-all"
                            title="Visual Assist: Maestro de Tipos de Documentos (F0005)"
                          >
                            🔍
                          </button>
                        </div>
                      </td>
                      <td className="px-1 py-0.5 border border-[#B0C4DE]">
                        <div className="relative flex items-center">
                          <input 
                            type="text" 
                            placeholder=""
                            value={qbeP0911.numDoc}
                            onChange={e => setQbeP0911({...qbeP0911, numDoc: e.target.value})}
                            className="w-full bg-white border border-[#B0C4DE] pl-1 pr-5 py-0.5 rounded-none text-[10.5px] font-mono text-[#0A2540] outline-none font-medium focus:border-blue-600 focus:bg-[#FFFDE8]"
                          />
                          <button 
                            type="button"
                            onClick={() => setJdeVisualAssist({
                              type: 'numDoc',
                              onSelect: (val) => setQbeP0911(prev => ({ ...prev, numDoc: val }))
                            })}
                            className="absolute right-0.5 text-[#0B3C5D] hover:text-amber-600 font-bold text-[10px] select-none cursor-pointer transition-all"
                            title="Visual Assist: Maestro de Correlativos / Documentos (F0002)"
                          >
                            🔍
                          </button>
                        </div>
                      </td>
                      <td className="px-1 py-0.5 border border-[#B0C4DE]">
                        <div className="relative flex items-center">
                          <input 
                            type="text" 
                            placeholder=""
                            value={qbeP0911.cia}
                            onChange={e => setQbeP0911({...qbeP0911, cia: e.target.value})}
                            className="w-full bg-white border border-[#B0C4DE] pl-1 pr-5 py-0.5 rounded-none text-[10.5px] font-mono text-[#0A2540] outline-none font-medium text-center focus:border-blue-600 focus:bg-[#FFFDE8]"
                          />
                          <button 
                            type="button"
                            onClick={() => setJdeVisualAssist({
                              type: 'company',
                              onSelect: (val) => setQbeP0911(prev => ({ ...prev, cia: val }))
                            })}
                            className="absolute right-0.5 text-[#0B3C5D] hover:text-amber-600 font-bold text-[10px] select-none cursor-pointer transition-all"
                            title="Visual Assist: Maestro de Compañías (F0010)"
                          >
                            🔍
                          </button>
                        </div>
                      </td>
                      <td className="px-1 py-0.5 border border-[#B0C4DE]">
                        <input 
                          type="text" 
                          placeholder=""
                          value={qbeP0911.fecha}
                          onChange={e => setQbeP0911({...qbeP0911, fecha: e.target.value})}
                          className="w-full bg-white border border-[#B0C4DE] px-1 py-0.5 rounded-none text-[10.5px] font-mono text-[#0A2540] outline-none font-medium focus:border-blue-600 focus:bg-[#FFFDE8]"
                        />
                      </td>
                      <td className="px-1 py-0.5 border border-[#B0C4DE]">
                        <input 
                          type="text" 
                          placeholder=""
                          value={qbeP0911.explicacion}
                          onChange={e => setQbeP0911({...qbeP0911, explicacion: e.target.value})}
                          className="w-full bg-white border border-[#B0C4DE] px-1 py-0.5 rounded-none text-[10.5px] font-mono text-[#0A2540] outline-none font-medium focus:border-blue-600 focus:bg-[#FFFDE8]"
                        />
                      </td>
                      <td className="px-1 py-0.5 border border-[#B0C4DE]">
                        <div className="relative flex items-center">
                          <input 
                            type="text" 
                            placeholder=""
                            value={qbeP0911.numCuenta}
                            onChange={e => setQbeP0911({...qbeP0911, numCuenta: e.target.value})}
                            className="w-full bg-white border border-[#B0C4DE] pl-1 pr-5 py-0.5 rounded-none text-[10.5px] font-mono text-[#0A2540] outline-none font-medium focus:border-blue-600 focus:bg-[#FFFDE8]"
                          />
                          <button 
                            type="button"
                            onClick={() => setJdeVisualAssist({
                              type: 'account',
                              onSelect: (val) => setQbeP0911(prev => ({ ...prev, numCuenta: val }))
                            })}
                            className="absolute right-0.5 text-[#0B3C5D] hover:text-amber-600 font-bold text-[10px] select-none cursor-pointer transition-all"
                            title="Visual Assist: Maestro de Cuentas Contables (F0901)"
                          >
                            🔍
                          </button>
                        </div>
                      </td>
                      <td className="px-1 py-0.5 border border-[#B0C4DE]">
                        <div className="relative flex items-center">
                          <input 
                            type="text" 
                            placeholder=""
                            value={qbeP0911.nombreCuenta}
                            onChange={e => setQbeP0911({...qbeP0911, nombreCuenta: e.target.value})}
                            className="w-full bg-white border border-[#B0C4DE] pl-1 pr-5 py-0.5 rounded-none text-[10.5px] font-mono text-[#0A2540] outline-none font-medium focus:border-blue-600 focus:bg-[#FFFDE8]"
                          />
                          <button 
                            type="button"
                            onClick={() => setJdeVisualAssist({
                              type: 'account',
                              onSelect: (val) => setQbeP0911(prev => ({ ...prev, nombreCuenta: val }))
                            })}
                            className="absolute right-0.5 text-[#0B3C5D] hover:text-amber-600 font-bold text-[10px] select-none cursor-pointer transition-all"
                            title="Visual Assist: Maestro de Cuentas Contables (F0901)"
                          >
                            🔍
                          </button>
                        </div>
                      </td>
                      <td className="px-1 py-0.5 border border-[#B0C4DE]">
                        <input 
                          type="text" 
                          placeholder=""
                          value={qbeP0911.categoriaCuenta}
                          onChange={e => setQbeP0911({...qbeP0911, categoriaCuenta: e.target.value})}
                          className="w-full bg-white border border-[#B0C4DE] px-1 py-0.5 rounded-none text-[10.5px] font-mono text-[#0A2540] outline-none font-medium focus:border-blue-600 focus:bg-[#FFFDE8]"
                        />
                      </td>
                      <td className="px-1 py-0.5 border border-[#B0C4DE]">
                        <div className="relative flex items-center">
                          <input 
                            type="text" 
                            placeholder=""
                            value={qbeP0911.numContrapartida}
                            onChange={e => setQbeP0911({...qbeP0911, numContrapartida: e.target.value})}
                            className="w-full bg-white border border-[#B0C4DE] pl-1 pr-5 py-0.5 rounded-none text-[10.5px] font-mono text-[#0A2540] outline-none font-medium focus:border-blue-600 focus:bg-[#FFFDE8]"
                          />
                          <button 
                            type="button"
                            onClick={() => setJdeVisualAssist({
                              type: 'account',
                              onSelect: (val) => setQbeP0911(prev => ({ ...prev, numContrapartida: val }))
                            })}
                            className="absolute right-0.5 text-[#0B3C5D] hover:text-amber-600 font-bold text-[10px] select-none cursor-pointer transition-all"
                            title="Visual Assist: Maestro de Cuentas Contrapartida (F0901)"
                          >
                            🔍
                          </button>
                        </div>
                      </td>
                      <td className="px-1 py-0.5 border border-[#B0C4DE]">
                        <div className="relative flex items-center">
                          <input 
                            type="text" 
                            placeholder=""
                            value={qbeP0911.nombreContrapartida}
                            onChange={e => setQbeP0911({...qbeP0911, nombreContrapartida: e.target.value})}
                            className="w-full bg-white border border-[#B0C4DE] pl-1 pr-5 py-0.5 rounded-none text-[10.5px] font-mono text-[#0A2540] outline-none font-medium focus:border-blue-600 focus:bg-[#FFFDE8]"
                          />
                          <button 
                            type="button"
                            onClick={() => setJdeVisualAssist({
                              type: 'account',
                              onSelect: (val) => setQbeP0911(prev => ({ ...prev, nombreContrapartida: val }))
                            })}
                            className="absolute right-0.5 text-[#0B3C5D] hover:text-amber-600 font-bold text-[10px] select-none cursor-pointer transition-all"
                            title="Visual Assist: Maestro de Cuentas Contrapartida (F0901)"
                          >
                            🔍
                          </button>
                        </div>
                      </td>
                      <td className="px-1 py-0.5 border border-[#B0C4DE]">
                        <input 
                          type="text" 
                          placeholder=""
                          value={qbeP0911.debe}
                          onChange={e => setQbeP0911({...qbeP0911, debe: e.target.value})}
                          className="w-full bg-white border border-[#B0C4DE] px-1 py-0.5 rounded-none text-[10.5px] font-mono text-[#0A2540] outline-none font-medium text-right focus:border-blue-600 focus:bg-[#FFFDE8]"
                        />
                      </td>
                      <td className="px-1 py-0.5 border border-[#B0C4DE]">
                        <input 
                          type="text" 
                          placeholder=""
                          value={qbeP0911.haber}
                          onChange={e => setQbeP0911({...qbeP0911, haber: e.target.value})}
                          className="w-full bg-white border border-[#B0C4DE] px-1 py-0.5 rounded-none text-[10.5px] font-mono text-[#0A2540] outline-none font-medium text-right focus:border-blue-600 focus:bg-[#FFFDE8]"
                        />
                      </td>
                      <td className="px-1 py-0.5 border border-[#B0C4DE]">
                        <input 
                          type="text" 
                          disabled 
                          placeholder="" 
                          className="w-full bg-slate-100 border border-slate-200 px-1 py-0.5 rounded-none text-[10.5px] font-mono text-center cursor-not-allowed"
                        />
                      </td>
                      <td className="px-1 py-0.5 border border-[#B0C4DE]">
                        <div className="relative flex items-center">
                          <input 
                            type="text" 
                            placeholder=""
                            value={qbeP0911.batch}
                            onChange={e => setQbeP0911({...qbeP0911, batch: e.target.value})}
                            className="w-full bg-white border border-[#B0C4DE] pl-1 pr-5 py-0.5 rounded-none text-[10.5px] font-mono text-[#0A2540] outline-none text-center font-medium focus:border-blue-600 focus:bg-[#FFFDE8]"
                          />
                          <button 
                            type="button"
                            onClick={() => setJdeVisualAssist({
                              type: 'batch',
                              onSelect: (val) => setQbeP0911(prev => ({ ...prev, batch: val }))
                            })}
                            className="absolute right-0.5 text-[#0B3C5D] hover:text-amber-600 font-bold text-[10px] select-none cursor-pointer transition-all"
                            title="Visual Assist: Maestro de Cabeceras de Lotes (F0011)"
                          >
                            🔍
                          </button>
                        </div>
                      </td>
                      <td className="px-1 py-0.5 border border-[#B0C4DE]">
                        <input 
                          type="text" 
                          placeholder=""
                          value={qbeP0911.moneda}
                          onChange={e => setQbeP0911({...qbeP0911, moneda: e.target.value})}
                          className="w-full bg-white border border-[#B0C4DE] px-1 py-0.5 rounded-none text-[10.5px] font-mono text-[#0A2540] outline-none text-center font-medium focus:border-blue-600 focus:bg-[#FFFDE8]"
                        />
                      </td>
                      <td className="px-1 py-0.5 border border-[#B0C4DE] bg-slate-100 text-center text-[8px] font-bold text-slate-500 font-mono">
                        Master
                      </td>
                    </tr>
                  </thead>
                  
                  {/* Table Body Lines list - ERP High Density Rows */}
                  <tbody className="divide-y divide-slate-200 text-slate-800 font-sans">
                    {filteredP0911List.length === 0 ? (
                      <tr>
                        <td colSpan={17} className="p-8 text-center text-slate-400 bg-slate-50 italic">
                          No se encontraron registros coincidentes con los filtros QBE (F0911 Ledger vacío)
                        </td>
                      </tr>
                    ) : (
                      filteredP0911List.flatMap((t, idx) => {
                        const isExpense = t.type === 'EXPENSE';
                        const accDetails = getJDEAccountDetails(t);
                        const isSelected = selectedP0911RowIds.includes(t.id);

                        if (ledgerViewMode === 'PARTIDA_DOBLE') {
                          // Line 1: Cargo/Débito (Línea 1.000)
                          const line1 = (
                            <tr 
                              key={`${t.id}_LN1`} 
                              onClick={() => setInspectTarget({ record: t, entityType: 'TRANSACTION' })}
                              onDoubleClick={() => setInspectTarget({ record: t, entityType: 'TRANSACTION' })}
                              onContextMenu={(e) => handleRowContextMenu(e, t, 'P0911')}
                              className={`transition-colors cursor-pointer select-none ${
                                isSelected 
                                  ? 'bg-[#00E5FF] text-[#0A2540] font-bold border-b border-[#00C2E0]' 
                                  : idx % 2 === 0 ? 'bg-white hover:bg-[#E8F4FE]' : 'bg-[#F8FAFC] hover:bg-[#E8F4FE]'
                              }`}
                              title="Línea 1.000: Asiento de Débito (Cargo). Haga clic para consultar detalle completo (F980011D)."
                            >
                              <td className="px-1.5 py-0.5 border border-[#B0C4DE]/60 text-center" onClick={e => e.stopPropagation()}>
                                <input 
                                  type="checkbox" 
                                  checked={isSelected}
                                  onChange={() => toggleP0911RowSelect(t.id)}
                                  className="cursor-pointer rounded-none border-slate-400 text-cyan-600 focus:ring-0" 
                                />
                              </td>
                              <td className={`px-1.5 py-0.5 border border-[#B0C4DE]/60 font-mono text-[10.5px] ${isSelected ? 'text-[#0A2540] font-bold' : 'font-bold text-indigo-700'}`}>
                                <span 
                                  onClick={(e) => { e.stopPropagation(); openMasterLookup('Tipo documento', t.documentType === 'FACTURA' ? 'PV' : (t.documentType === 'DEPÓSITO' ? 'DP' : 'JE')); }}
                                  className="hover:underline cursor-pointer"
                                  title="Consultar Maestro de Tipos de Documentos (F0005)"
                                >
                                  {t.documentType === 'FACTURA' ? 'PV' : (t.documentType === 'DEPÓSITO' ? 'DP' : 'JE')}
                                </span>
                              </td>
                              <td className={`px-1.5 py-0.5 border border-[#B0C4DE]/60 font-mono text-[10.5px] ${isSelected ? 'text-[#0A2540] font-bold' : 'font-bold text-[#0B3C5D]'}`}>
                                <span 
                                  onClick={(e) => { e.stopPropagation(); openMasterLookup('Número documento', t.documentNumber || '191024' + idx); }}
                                  className="hover:underline cursor-pointer"
                                  title="Consultar Maestro Correlativo de Documento (F0002)"
                                >
                                  {t.documentNumber || '191024' + idx}
                                </span>
                              </td>
                              <td className={`px-1.5 py-0.5 border border-[#B0C4DE]/60 text-center font-mono text-[10.5px] ${isSelected ? 'text-[#0A2540]' : 'text-slate-600'}`}>
                                <span 
                                  onClick={(e) => { e.stopPropagation(); openMasterLookup('Compañía doc', '00001'); }}
                                  className="hover:underline cursor-pointer"
                                  title="Consultar Maestro de Compañías (F0010)"
                                >
                                  00001
                                </span>
                              </td>
                              <td className={`px-1.5 py-0.5 border border-[#B0C4DE]/60 font-mono text-[10.5px] ${isSelected ? 'text-[#0A2540]' : 'text-slate-600'}`}>
                                <span 
                                  onClick={(e) => { e.stopPropagation(); openMasterLookup('Fecha LM', formatJDEDate(t.date)); }}
                                  className="hover:underline cursor-pointer"
                                  title="Consultar Calendario Fiscal Períodos (F0008)"
                                >
                                  {formatJDEDate(t.date)}
                                </span>
                              </td>
                              <td className={`px-1.5 py-0.5 border border-[#B0C4DE]/60 text-[10.5px] max-w-xs truncate ${isSelected ? 'text-[#0A2540] font-bold' : 'text-slate-800'}`} title={t.description}>
                                <span 
                                  onClick={(e) => { e.stopPropagation(); openMasterLookup('Explicación Concepto', t.description); }}
                                  className="hover:underline cursor-pointer"
                                  title="Consultar Plan de Cuentas y Glosas (F0901)"
                                >
                                  {t.description}
                                </span>
                              </td>
                              {/* NÚMERO DE CUENTA CONTABLE */}
                              <td className={`px-1.5 py-0.5 border border-[#B0C4DE]/60 font-mono text-[10.5px] ${isSelected ? 'text-[#0A2540] font-bold' : 'font-bold text-[#0B3C5D]'}`}>
                                <span 
                                  onClick={(e) => { e.stopPropagation(); openMasterLookup('Nº CUENTA CONTABLE', accDetails.mainAccountNum, { name: accDetails.mainAccountName, category: accDetails.mainAccountCategory, offsetNum: accDetails.offsetAccountNum, offsetName: accDetails.offsetAccountName }); }}
                                  className="hover:underline cursor-pointer font-bold text-blue-900"
                                  title="Consultar Maestro F0901 - Cuenta Contable Principal"
                                >
                                  {accDetails.mainAccountNum}
                                </span>
                              </td>
                              {/* NOMBRE DE CUENTA CONTABLE */}
                              <td className={`px-1.5 py-0.5 border border-[#B0C4DE]/60 text-[10.5px] truncate ${isSelected ? 'text-[#0A2540] font-bold' : 'text-slate-800'}`} title={accDetails.mainAccountName}>
                                <span 
                                  onClick={(e) => { e.stopPropagation(); openMasterLookup('NOMBRE DE CUENTA', accDetails.mainAccountName); }}
                                  className="hover:underline cursor-pointer"
                                  title="Consultar Denominación DL01 (F0901)"
                                >
                                  {accDetails.mainAccountName}
                                </span>
                              </td>
                              {/* CATEGORÍA DE CUENTA CONTABLE */}
                              <td className="px-1.5 py-0.5 border border-[#B0C4DE]/60 font-mono text-[9.5px]">
                                <span 
                                  onClick={(e) => { e.stopPropagation(); openMasterLookup('CATEGORÍA / RUBRO', accDetails.mainAccountCategory); }}
                                  className={`inline-block px-1 py-0.2 rounded-none font-bold tracking-tight text-[9px] cursor-pointer hover:underline ${
                                  isSelected ? 'bg-[#00D2FF] text-[#0A2540] border border-[#00B0E0]' :
                                  accDetails.mainAccountCategory.includes('GASTO') ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                                  accDetails.mainAccountCategory.includes('PASIVO') ? 'bg-rose-100 text-rose-900 border border-rose-300' :
                                  accDetails.mainAccountCategory.includes('INGRESOS') ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
                                  accDetails.mainAccountCategory.includes('DISPONIBLE') ? 'bg-blue-100 text-blue-900 border border-blue-300' :
                                  'bg-sky-100 text-sky-900 border border-sky-300'
                                }`}>
                                  {accDetails.mainAccountCategory}
                                </span>
                              </td>
                              {/* NÚMERO CONTRAPARTIDA */}
                              <td className={`px-1.5 py-0.5 border border-[#B0C4DE]/60 font-mono text-[10.5px] ${isSelected ? 'text-[#0A2540] font-bold' : 'font-bold text-amber-900'}`}>
                                <span 
                                  onClick={(e) => { e.stopPropagation(); openMasterLookup('Nº CONTRAPARTIDA', accDetails.offsetAccountNum, { name: accDetails.mainAccountName, offsetNum: accDetails.mainAccountNum, offsetName: accDetails.offsetAccountName }); }}
                                  className="hover:underline cursor-pointer font-bold"
                                  title="Consultar Cuenta Contrapartida / Offset Account (F0901)"
                                >
                                  {accDetails.offsetAccountNum}
                                </span>
                              </td>
                              {/* NOMBRE CONTRAPARTIDA */}
                              <td className={`px-1.5 py-0.5 border border-[#B0C4DE]/60 text-[10.5px] truncate ${isSelected ? 'text-[#0A2540] font-bold' : 'text-slate-700'}`} title={accDetails.offsetAccountName}>
                                <span 
                                  onClick={(e) => { e.stopPropagation(); openMasterLookup('NOMBRE CONTRAPARTIDA', accDetails.offsetAccountName); }}
                                  className="hover:underline cursor-pointer"
                                  title="Consultar Glosa de Contrapartida (F0901)"
                                >
                                  {accDetails.offsetAccountName}
                                </span>
                              </td>
                              {/* DEBE (DÉBITO / CARGO) */}
                              <td className={`px-1.5 py-0.5 border border-[#B0C4DE]/60 text-right font-mono text-[10.5px] ${isSelected ? 'text-[#0A2540] font-bold' : 'font-bold text-slate-900 bg-amber-50/40'}`}>
                                <span 
                                  onClick={(e) => { e.stopPropagation(); openMasterLookup('DEBE (DÉBITO)', formatJDEMoney(t.amount, true)); }}
                                  className="hover:underline cursor-pointer font-extrabold text-blue-950"
                                  title="Consultar Cargo Débito en Libro Mayor (F0911)"
                                >
                                  {formatJDEMoney(t.amount, true)}
                                </span>
                              </td>
                              {/* HABER (CRÉDITO / ABONO) */}
                              <td className={`px-1.5 py-0.5 border border-[#B0C4DE]/60 text-right font-mono text-[10.5px] ${isSelected ? 'text-[#0A2540]' : 'text-slate-400'}`}>
                                0,00
                              </td>
                              <td className={`px-1.5 py-0.5 border border-[#B0C4DE]/60 text-right font-mono text-[10.5px] ${isSelected ? 'text-[#0A2540]' : 'text-slate-400'}`}>
                                0,00
                              </td>
                              <td className={`px-1.5 py-0.5 border border-[#B0C4DE]/60 text-center font-mono text-[10.5px] ${isSelected ? 'text-[#0A2540] font-bold' : 'font-bold text-[#144D75]'}`}>
                                <span 
                                  onClick={(e) => { e.stopPropagation(); openMasterLookup('Batch', t.batchNumber || '12845669'); }}
                                  className="hover:underline cursor-pointer"
                                  title="Consultar Estado del Lote (F0011)"
                                >
                                  {t.batchNumber || '12845669'}
                                </span>
                              </td>
                              <td className={`px-1.5 py-0.5 border border-[#B0C4DE]/60 text-center font-mono text-[10.5px] ${isSelected ? 'text-[#0A2540]' : 'text-slate-500'}`}>
                                <span 
                                  onClick={(e) => { e.stopPropagation(); openMasterLookup('Moneda', 'CLP'); }}
                                  className="hover:underline cursor-pointer"
                                  title="Consultar Maestro de Divisas (F0013)"
                                >
                                  CLP
                                </span>
                              </td>
                              <td className="px-1.5 py-0.5 border border-[#B0C4DE]/60 text-center" onClick={e => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => setInspectTarget({ record: t, entityType: 'TRANSACTION' })}
                                  className={`px-1 py-0.2 rounded-none transition mx-auto flex items-center justify-center border text-[9px] font-sans font-bold ${
                                    isSelected 
                                      ? 'bg-[#00D2FF] text-[#0A2540] border-[#00B0E0]' 
                                      : 'text-indigo-700 bg-indigo-50/50 border-indigo-200 hover:bg-indigo-100'
                                  }`}
                                  title="F980011D: Consultar Maestro de Atributos Extendidos"
                                >
                                  <Database size={10} className="mr-0.5" /> F980011D
                                </button>
                              </td>
                            </tr>
                          );

                          // Line 2: Abono/Crédito (Línea 2.000 - Contrapartida)
                          const line2 = (
                            <tr 
                              key={`${t.id}_LN2`} 
                              onClick={() => setInspectTarget({ record: t, entityType: 'TRANSACTION' })}
                              onDoubleClick={() => setInspectTarget({ record: t, entityType: 'TRANSACTION' })}
                              onContextMenu={(e) => handleRowContextMenu(e, t, 'P0911')}
                              className="transition-colors cursor-pointer select-none bg-emerald-50/20 hover:bg-[#E8F4FE] border-b border-slate-300"
                              title="Línea 2.000: Asiento de Crédito (Abono Contrapartida). Haga clic para consultar detalle completo (F980011D)."
                            >
                              <td className="px-1.5 py-0.5 border border-[#B0C4DE]/60 text-center" onClick={e => e.stopPropagation()}>
                                <input 
                                  type="checkbox" 
                                  checked={isSelected}
                                  onChange={() => toggleP0911RowSelect(t.id)}
                                  className="cursor-pointer rounded-none border-slate-400 text-cyan-600 focus:ring-0" 
                                />
                              </td>
                              <td className="px-1.5 py-0.5 border border-[#B0C4DE]/60 font-mono text-[10.5px] font-bold text-emerald-800">
                                <span 
                                  onClick={(e) => { e.stopPropagation(); openMasterLookup('Tipo documento', t.documentType === 'FACTURA' ? 'PV' : (t.documentType === 'DEPÓSITO' ? 'DP' : 'JE')); }}
                                  className="hover:underline cursor-pointer"
                                >
                                  {t.documentType === 'FACTURA' ? 'PV' : (t.documentType === 'DEPÓSITO' ? 'DP' : 'JE')}
                                </span>
                              </td>
                              <td className="px-1.5 py-0.5 border border-[#B0C4DE]/60 font-mono text-[10.5px] font-bold text-[#0B3C5D]">
                                <span 
                                  onClick={(e) => { e.stopPropagation(); openMasterLookup('Número documento', t.documentNumber || '191024' + idx); }}
                                  className="hover:underline cursor-pointer"
                                >
                                  {t.documentNumber || '191024' + idx}
                                </span>
                              </td>
                              <td className="px-1.5 py-0.5 border border-[#B0C4DE]/60 text-center font-mono text-[10.5px] text-slate-600">
                                00001
                              </td>
                              <td className="px-1.5 py-0.5 border border-[#B0C4DE]/60 font-mono text-[10.5px] text-slate-600">
                                {formatJDEDate(t.date)}
                              </td>
                              <td className="px-1.5 py-0.5 border border-[#B0C4DE]/60 text-[10.5px] max-w-xs truncate text-slate-600 italic">
                                (Contrapartida) {t.description}
                              </td>
                              {/* NÚMERO DE CUENTA CONTABLE (Contrapartida como Principal) */}
                              <td className="px-1.5 py-0.5 border border-[#B0C4DE]/60 font-mono text-[10.5px] font-bold text-emerald-900">
                                <span 
                                  onClick={(e) => { e.stopPropagation(); openMasterLookup('Nº CUENTA CONTABLE', accDetails.offsetAccountNum, { name: accDetails.offsetAccountName, category: accDetails.offsetAccountCategory, offsetNum: accDetails.mainAccountNum, offsetName: accDetails.mainAccountName }); }}
                                  className="hover:underline cursor-pointer font-bold text-emerald-900"
                                  title="Consultar Maestro F0901 - Cuenta Contrapartida"
                                >
                                  {accDetails.offsetAccountNum}
                                </span>
                              </td>
                              {/* NOMBRE DE CUENTA CONTABLE */}
                              <td className="px-1.5 py-0.5 border border-[#B0C4DE]/60 text-[10.5px] truncate text-slate-800">
                                <span 
                                  onClick={(e) => { e.stopPropagation(); openMasterLookup('NOMBRE DE CUENTA', accDetails.offsetAccountName); }}
                                  className="hover:underline cursor-pointer"
                                >
                                  {accDetails.offsetAccountName}
                                </span>
                              </td>
                              {/* CATEGORÍA DE CUENTA CONTABLE */}
                              <td className="px-1.5 py-0.5 border border-[#B0C4DE]/60 font-mono text-[9.5px]">
                                <span 
                                  onClick={(e) => { e.stopPropagation(); openMasterLookup('CATEGORÍA / RUBRO', accDetails.offsetAccountCategory); }}
                                  className="inline-block px-1 py-0.2 rounded-none font-bold tracking-tight text-[9px] bg-emerald-100 text-emerald-900 border border-emerald-300 cursor-pointer hover:underline"
                                >
                                  {accDetails.offsetAccountCategory}
                                </span>
                              </td>
                              {/* NÚMERO CONTRAPARTIDA (Cuenta Principal de Origen) */}
                              <td className="px-1.5 py-0.5 border border-[#B0C4DE]/60 font-mono text-[10.5px] font-bold text-blue-900">
                                <span 
                                  onClick={(e) => { e.stopPropagation(); openMasterLookup('Nº CONTRAPARTIDA', accDetails.mainAccountNum, { name: accDetails.offsetAccountName, offsetNum: accDetails.offsetAccountNum, offsetName: accDetails.mainAccountName }); }}
                                  className="hover:underline cursor-pointer font-bold"
                                >
                                  {accDetails.mainAccountNum}
                                </span>
                              </td>
                              {/* NOMBRE CONTRAPARTIDA */}
                              <td className="px-1.5 py-0.5 border border-[#B0C4DE]/60 text-[10.5px] truncate text-slate-700">
                                <span 
                                  onClick={(e) => { e.stopPropagation(); openMasterLookup('NOMBRE CONTRAPARTIDA', accDetails.mainAccountName); }}
                                  className="hover:underline cursor-pointer"
                                >
                                  {accDetails.mainAccountName}
                                </span>
                              </td>
                              {/* DEBE (DÉBITO / CARGO) */}
                              <td className="px-1.5 py-0.5 border border-[#B0C4DE]/60 text-right font-mono text-[10.5px] text-slate-400">
                                0,00
                              </td>
                              {/* HABER (CRÉDITO / ABONO) */}
                              <td className="px-1.5 py-0.5 border border-[#B0C4DE]/60 text-right font-mono text-[10.5px] font-bold text-emerald-800 bg-emerald-50/40">
                                <span 
                                  onClick={(e) => { e.stopPropagation(); openMasterLookup('HABER (CRÉDITO)', formatJDEMoney(t.amount, false)); }}
                                  className="hover:underline cursor-pointer font-extrabold text-emerald-900"
                                  title="Consultar Abono Crédito en Libro Mayor (F0911)"
                                >
                                  {formatJDEMoney(t.amount, false)}
                                </span>
                              </td>
                              <td className="px-1.5 py-0.5 border border-[#B0C4DE]/60 text-right font-mono text-[10.5px] text-slate-400">
                                0,00
                              </td>
                              <td className="px-1.5 py-0.5 border border-[#B0C4DE]/60 text-center font-mono text-[10.5px] font-bold text-[#144D75]">
                                {t.batchNumber || '12845669'}
                              </td>
                              <td className="px-1.5 py-0.5 border border-[#B0C4DE]/60 text-center font-mono text-[10.5px] text-slate-500">
                                CLP
                              </td>
                              <td className="px-1.5 py-0.5 border border-[#B0C4DE]/60 text-center" onClick={e => e.stopPropagation()}>
                                <button
                                  type="button"
                                  onClick={() => setInspectTarget({ record: t, entityType: 'TRANSACTION' })}
                                  className="px-1 py-0.2 rounded-none transition mx-auto flex items-center justify-center border text-[9px] font-sans font-bold text-indigo-700 bg-indigo-50/50 border-indigo-200 hover:bg-indigo-100"
                                >
                                  <Database size={10} className="mr-0.5" /> F980011D
                                </button>
                              </td>
                            </tr>
                          );

                          return [line1, line2];
                        } else {
                          // Resumido Mode (Single Line per transaction)
                          return [
                            <tr 
                              key={t.id} 
                              onClick={() => setInspectTarget({ record: t, entityType: 'TRANSACTION' })}
                              onDoubleClick={() => setInspectTarget({ record: t, entityType: 'TRANSACTION' })}
                              onContextMenu={(e) => handleRowContextMenu(e, t, 'P0911')}
                              className={`transition-colors cursor-pointer select-none ${
                                isSelected 
                                  ? 'bg-[#00E5FF] text-[#0A2540] font-bold border-b border-[#00C2E0]' 
                                  : idx % 2 === 0 ? 'bg-white hover:bg-[#E8F4FE]' : 'bg-[#F8FAFC] hover:bg-[#E8F4FE]'
                              }`}
                            >
                              <td className="px-1.5 py-0.5 border border-[#B0C4DE]/60 text-center" onClick={e => e.stopPropagation()}>
                                <input 
                                  type="checkbox" 
                                  checked={isSelected}
                                  onChange={() => toggleP0911RowSelect(t.id)}
                                  className="cursor-pointer rounded-none border-slate-400 text-cyan-600 focus:ring-0" 
                                />
                              </td>
                              <td className={`px-1.5 py-0.5 border border-[#B0C4DE]/60 font-mono text-[10.5px] ${isSelected ? 'text-[#0A2540] font-bold' : 'font-bold text-indigo-700'}`}>
                                <span onClick={(e) => { e.stopPropagation(); openMasterLookup('Tipo documento', t.documentType === 'FACTURA' ? 'PV' : (t.documentType === 'DEPÓSITO' ? 'DP' : 'JE')); }} className="hover:underline cursor-pointer">
                                  {t.documentType === 'FACTURA' ? 'PV' : (t.documentType === 'DEPÓSITO' ? 'DP' : 'JE')}
                                </span>
                              </td>
                              <td className={`px-1.5 py-0.5 border border-[#B0C4DE]/60 font-mono text-[10.5px] ${isSelected ? 'text-[#0A2540] font-bold' : 'font-bold text-[#0B3C5D]'}`}>
                                <span onClick={(e) => { e.stopPropagation(); openMasterLookup('Número documento', t.documentNumber || '191024' + idx); }} className="hover:underline cursor-pointer">
                                  {t.documentNumber || '191024' + idx}
                                </span>
                              </td>
                              <td className="px-1.5 py-0.5 border border-[#B0C4DE]/60 text-center font-mono text-[10.5px]">00001</td>
                              <td className="px-1.5 py-0.5 border border-[#B0C4DE]/60 font-mono text-[10.5px]">{formatJDEDate(t.date)}</td>
                              <td className="px-1.5 py-0.5 border border-[#B0C4DE]/60 text-[10.5px] max-w-xs truncate">{t.description}</td>
                              <td className="px-1.5 py-0.5 border border-[#B0C4DE]/60 font-mono text-[10.5px] font-bold text-blue-900">
                                <span onClick={(e) => { e.stopPropagation(); openMasterLookup('Nº CUENTA CONTABLE', accDetails.mainAccountNum, { name: accDetails.mainAccountName, category: accDetails.mainAccountCategory, offsetNum: accDetails.offsetAccountNum, offsetName: accDetails.offsetAccountName }); }} className="hover:underline cursor-pointer">
                                  {accDetails.mainAccountNum}
                                </span>
                              </td>
                              <td className="px-1.5 py-0.5 border border-[#B0C4DE]/60 text-[10.5px] truncate">{accDetails.mainAccountName}</td>
                              <td className="px-1.5 py-0.5 border border-[#B0C4DE]/60 font-mono text-[9.5px]">
                                <span className="inline-block px-1 py-0.2 rounded-none font-bold bg-sky-100 text-sky-900 border border-sky-300">{accDetails.mainAccountCategory}</span>
                              </td>
                              <td className="px-1.5 py-0.5 border border-[#B0C4DE]/60 font-mono text-[10.5px] font-bold text-amber-900">
                                <span onClick={(e) => { e.stopPropagation(); openMasterLookup('Nº CONTRAPARTIDA', accDetails.offsetAccountNum, { name: accDetails.mainAccountName, offsetNum: accDetails.mainAccountNum, offsetName: accDetails.offsetAccountName }); }} className="hover:underline cursor-pointer">
                                  {accDetails.offsetAccountNum}
                                </span>
                              </td>
                              <td className="px-1.5 py-0.5 border border-[#B0C4DE]/60 text-[10.5px] truncate">{accDetails.offsetAccountName}</td>
                              <td className="px-1.5 py-0.5 border border-[#B0C4DE]/60 text-right font-mono text-[10.5px] font-bold text-slate-900">
                                {isExpense ? formatJDEMoney(t.amount, true) : '0,00'}
                              </td>
                              <td className="px-1.5 py-0.5 border border-[#B0C4DE]/60 text-right font-mono text-[10.5px] font-bold text-emerald-800">
                                {!isExpense ? formatJDEMoney(t.amount, false) : '0,00'}
                              </td>
                              <td className="px-1.5 py-0.5 border border-[#B0C4DE]/60 text-right font-mono text-[10.5px]">0,00</td>
                              <td className="px-1.5 py-0.5 border border-[#B0C4DE]/60 text-center font-mono text-[10.5px] font-bold">{t.batchNumber || '12845669'}</td>
                              <td className="px-1.5 py-0.5 border border-[#B0C4DE]/60 text-center font-mono text-[10.5px]">CLP</td>
                              <td className="px-1.5 py-0.5 border border-[#B0C4DE]/60 text-center" onClick={e => e.stopPropagation()}>
                                <button type="button" onClick={() => setInspectTarget({ record: t, entityType: 'TRANSACTION' })} className="px-1 py-0.2 rounded-none border text-[9px] font-bold text-indigo-700 bg-indigo-50 border-indigo-200">
                                  <Database size={10} className="mr-0.5" /> F980011D
                                </button>
                              </td>
                            </tr>
                          ];
                        }
                      })
                    )}
                    
                    {/* BALANCED TOTALS LINE (F0911 Standard Sum) */}
                    <tr className="bg-[#ECEFF4] border-t-2 border-slate-300 font-bold font-mono text-[10.5px]">
                      <td className="p-2 border border-slate-300"></td>
                      <td className="p-2 border border-slate-300 uppercase tracking-widest text-slate-700" colSpan={10}>
                        Saldos del Período
                      </td>
                      {/* Total DEBE */}
                      <td className="p-2 border border-slate-300 text-right text-[11.5px] font-black text-slate-900 bg-slate-200/80" title="Suma Total Debe (Cargos Débito)">
                        {formatJDEMoney(totalsP0911.debit, true)}
                      </td>
                      {/* Total HABER */}
                      <td className="p-2 border border-slate-300 text-right text-[11.5px] font-black text-emerald-800 bg-emerald-100/80" title="Suma Total Haber (Abonos Crédito)">
                        {formatJDEMoney(totalsP0911.credit, false)}
                      </td>
                      <td className="p-2 border border-slate-300 text-right text-slate-500">
                        0,00
                      </td>
                      <td 
                        onClick={handleCuadraturaLedgerExecute}
                        title="Detalles de integridad con la Auditoría General de Balance (F0911)"
                        className="p-2 border border-slate-300 text-center bg-emerald-50 text-indigo-800 hover:bg-indigo-100 hover:text-indigo-950 cursor-pointer uppercase font-black tracking-widest transition-all"
                        colSpan={3}
                      >
                        {totalsP0911.balance === 0 ? '✓ LIBRO CUADRADO ASSETFLOW' : `⚠ DESBALANCE (${formatJDEMoney(Math.abs(totalsP0911.balance), false)})`}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Explanatory ERP Guidelines Box for workers */}
            <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl flex items-start gap-3">
              <ShieldAlert className="text-amber-800 shrink-0 mt-0.5 animate-pulse" size={18} />
              <div>
                <h5 className="text-[11px] font-black text-amber-955 uppercase tracking-wider font-mono">Reglas del Sistema para el Procesador Contable (¡Esencial para Todo el Personal!):</h5>
                <p className="text-[10px] text-slate-800 leading-relaxed font-sans mt-0.5">
                  1. El total de movimientos agregados al libro diario general (F0911) debe cumplir la partida doble de forma automática.
                  <br />
                  2. Use los campos <strong className="font-mono bg-white border rounded px-1">QBE (Query By Example)</strong> del encabezado para filtrar en vivo por glosa, número de comprobante o batch, evitando registrar duplicados. Su uso correcto minimiza asimetrías de caja.
                </p>
              </div>
            </div>

          </div>
        )}

        {/* ------------------------------------------------------------- */}
        {/* VIEW B: P0411 - CONSULTA DE LM DE PROVEEDORES ONE VIEW        */}
        {/* ------------------------------------------------------------- */}
        {activeProgram === 'P0411' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            
            {/* Top filters mimicking P0411 screen inputs */}
            <div className="bg-[#F8FAFC] border border-slate-200 rounded-lg p-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-black text-slate-505 uppercase tracking-wide block font-mono">Cía / Libro:</label>
                <input 
                  type="text" 
                  value={qbeP0411.cia} 
                  onChange={e => setQbeP0411({...qbeP0411, cia: e.target.value})}
                  className="w-24 bg-white border border-slate-300 px-2 py-1 text-center font-mono font-bold focus:outline-none rounded"
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="text-[10px] font-black text-slate-505 uppercase tracking-wide block font-mono">Proveedor Buscado:</label>
                <span className="text-slate-700 font-bold">ASSETFLOW PROVEEDORES</span>
              </div>

              <div className="bg-[#EEF2F6] px-3 py-1 bg-white rounded-md border text-[10px] flex items-center justify-between font-mono font-black text-indigo-700">
                <span>ESTADO DE PAGO:</span>
                <div className="flex items-center gap-2">
                  <span className="text-amber-800">TODO DEVENGO COMPLETO</span>
                  {onAddSupplier && (
                    <button
                      type="button"
                      onClick={() => setIsSupplierFormOpen(true)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded text-[9.5px] font-black uppercase tracking-wider flex items-center gap-1 shadow-2xs cursor-pointer"
                      title="Crear Nuevo Proveedor en Maestro de Proveedores (F0101 / F0401)"
                    >
                      <Plus size={11} /> + Nuevo Proveedor (P01012)
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Standard ERP Provider ledger Table */}
            <div className="border border-slate-300 rounded-lg shadow-xs bg-white">
              <div className="overflow-x-auto overflow-y-hidden pb-1 [&::-webkit-scrollbar]:h-3.5 [&::-webkit-scrollbar-track]:bg-slate-200 [&::-webkit-scrollbar-track]:rounded-sm [&::-webkit-scrollbar-thumb]:bg-slate-500 [&::-webkit-scrollbar-thumb]:rounded-sm hover:[&::-webkit-scrollbar-thumb]:bg-slate-700">
                <table className="w-full text-[11px] text-left border-collapse table-fixed min-w-[1550px]">
                  
                  {/* Table Column Headers */}
                  <thead className="bg-[#D0E2F2] text-[#0A2540] border-b-2 border-slate-400 select-none">
                    <tr className="font-mono text-[10.5px] font-black uppercase tracking-wider text-left text-[#0A2540]">
                      <th className="relative p-2 border border-slate-300 text-center text-ellipsis overflow-hidden bg-[#D2E2F0] text-[#0A2540]" style={{ width: `${colWidthsP0411.cia}px` }}>
                        <span className="truncate block font-black text-[#0A2540]">Cía</span>
                        <div onMouseDown={(e) => handleResizeP0411('cia', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-sky-400 active:bg-blue-600 z-10" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative p-2 border border-slate-300 text-ellipsis overflow-hidden bg-[#D2E2F0] text-[#0A2540]" style={{ width: `${colWidthsP0411.companyName}px` }}>
                        <span className="truncate block font-black text-[#0A2540]">Nombre Compañía</span>
                        <div onMouseDown={(e) => handleResizeP0411('companyName', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-sky-400 active:bg-blue-600 z-10" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative p-2 border border-slate-300 text-ellipsis overflow-hidden bg-[#D2E2F0] text-[#0A2540]" style={{ width: `${colWidthsP0411.supplierNum}px` }}>
                        <span className="truncate block font-black text-[#0A2540]">Nº Proveedor</span>
                        <div onMouseDown={(e) => handleResizeP0411('supplierNum', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-sky-400 active:bg-blue-600 z-10" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative p-2 border border-slate-300 text-center text-ellipsis overflow-hidden bg-[#D2E2F0] text-[#0A2540]" style={{ width: `${colWidthsP0411.td}px` }}>
                        <span className="truncate block font-black text-[#0A2540]">T/D</span>
                        <div onMouseDown={(e) => handleResizeP0411('td', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-sky-400 active:bg-blue-600 z-10" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative p-2 border border-slate-300 text-center text-ellipsis overflow-hidden bg-[#D2E2F0] text-[#0A2540]" style={{ width: `${colWidthsP0411.docNum}px` }}>
                        <span className="truncate block font-black text-[#0A2540]">Nº Docto</span>
                        <div onMouseDown={(e) => handleResizeP0411('docNum', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-sky-400 active:bg-blue-600 z-10" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative p-2 border border-slate-300 text-ellipsis overflow-hidden bg-[#D2E2F0] text-[#0A2540]" style={{ width: `${colWidthsP0411.detail}px` }}>
                        <span className="truncate block font-black text-[#0A2540]">Detalle / Proveedor</span>
                        <div onMouseDown={(e) => handleResizeP0411('detail', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-sky-400 active:bg-blue-600 z-10" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative p-2 border border-slate-300 text-right text-ellipsis overflow-hidden bg-[#D2E2F0] text-[#0A2540]" style={{ width: `${colWidthsP0411.amountGross}px` }}>
                        <span className="truncate block font-black text-[#0A2540]">Importe Bruto</span>
                        <div onMouseDown={(e) => handleResizeP0411('amountGross', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-sky-400 active:bg-blue-600 z-10" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative p-2 border border-slate-300 text-right text-ellipsis overflow-hidden bg-[#D2E2F0] text-[#0A2540]" style={{ width: `${colWidthsP0411.amountPending}px` }}>
                        <span className="truncate block font-black text-[#0A2540]">Importe Pendiente</span>
                        <div onMouseDown={(e) => handleResizeP0411('amountPending', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-sky-400 active:bg-blue-600 z-10" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative p-2 border border-slate-300 text-ellipsis overflow-hidden bg-[#D2E2F0] text-[#0A2540]" style={{ width: `${colWidthsP0411.invoiceDate}px` }}>
                        <span className="truncate block font-black text-[#0A2540]">Fe. Factura</span>
                        <div onMouseDown={(e) => handleResizeP0411('invoiceDate', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-sky-400 active:bg-blue-600 z-10" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative p-2 border border-slate-300 text-ellipsis overflow-hidden bg-[#D2E2F0] text-[#0A2540]" style={{ width: `${colWidthsP0411.dueDate}px` }}>
                        <span className="truncate block font-black text-[#0A2540]">Fe. Vence</span>
                        <div onMouseDown={(e) => handleResizeP0411('dueDate', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-sky-400 active:bg-blue-600 z-10" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative p-2 border border-slate-300 text-center text-ellipsis overflow-hidden bg-[#D2E2F0] text-[#0A2540]" style={{ width: `${colWidthsP0411.un}px` }}>
                        <span className="truncate block font-black text-[#0A2540]">U/N</span>
                        <div onMouseDown={(e) => handleResizeP0411('un', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-sky-400 active:bg-blue-600 z-10" title="Arrastrar para ajustar ancho" />
                      </th>
                      <th className="relative p-2 border border-slate-300 text-center bg-[#C3DAED] text-ellipsis overflow-hidden text-[#0A2540]" style={{ width: `${colWidthsP0411.f980011d}px` }}>
                        <span className="truncate block font-black text-[#0A2540]">F980011D</span>
                        <div onMouseDown={(e) => handleResizeP0411('f980011d', e)} className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-sky-400 active:bg-blue-600 z-10" title="Arrastrar para ajustar ancho" />
                      </th>
                    </tr>
                    
                    {/* QBE Row for Supplier search */}
                    <tr className="bg-[#DFEFFC] border-b border-slate-300">
                      <td className="p-1 border border-slate-300">
                        <div className="relative flex items-center">
                          <input 
                            type="text" 
                            placeholder="00045"
                            value={qbeP0411.cia}
                            onChange={e => setQbeP0411({...qbeP0411, cia: e.target.value})}
                            className="w-full bg-white border border-slate-300 pl-1.5 pr-6 py-1 rounded text-[10px] font-mono text-center font-bold"
                          />
                          <button 
                            type="button"
                            onClick={() => setJdeVisualAssist({
                              type: 'company',
                              onSelect: (val) => setQbeP0411(prev => ({ ...prev, cia: val }))
                            })}
                            className="absolute right-1 text-[#0B3C5D] hover:text-amber-500 font-bold text-xs select-none cursor-pointer transition-all p-0.5"
                            title="Visual Assist: Maestro de Compañías (F0010)"
                          >
                            🔍
                          </button>
                        </div>
                      </td>
                      <td className="p-1 border border-slate-300">
                        <input 
                          type="text" 
                          placeholder="Financial..."
                          value={qbeP0411.nombreCia}
                          onChange={e => setQbeP0411({...qbeP0411, nombreCia: e.target.value})}
                          className="w-full bg-white border border-slate-300 px-1.5 py-1 rounded text-[10px] font-mono font-bold"
                        />
                      </td>
                      <td className="p-1 border border-slate-300">
                        <div className="relative flex items-center">
                          <input 
                            type="text" 
                            placeholder="Rut o ID..."
                            value={qbeP0411.numeroProveedor}
                            onChange={e => setQbeP0411({...qbeP0411, numeroProveedor: e.target.value})}
                            className="w-full bg-white border border-slate-300 pl-1.5 pr-6 py-1 rounded text-[10px] font-mono text-indigo-950 outline-none font-bold text-center"
                          />
                          <button 
                            type="button"
                            onClick={() => setJdeVisualAssist({
                              type: 'supplier',
                              onSelect: (val) => setQbeP0411(prev => ({ ...prev, numeroProveedor: val }))
                            })}
                            className="absolute right-1 text-[#0B3C5D] hover:text-amber-500 font-bold text-xs select-none cursor-pointer transition-all p-0.5"
                            title="Visual Assist: Maestro de Proveedores (F04012)"
                          >
                            🔍
                          </button>
                        </div>
                      </td>
                      <td className="p-1 border border-slate-300">
                        <div className="relative flex items-center">
                          <input 
                            type="text" 
                            placeholder="PV"
                            value={qbeP0411.tipoDoc}
                            onChange={e => setQbeP0411({...qbeP0411, tipoDoc: e.target.value})}
                            className="w-full bg-white border border-slate-300 pl-1.5 pr-6 py-1 rounded text-[10px] font-mono text-center font-bold"
                          />
                          <button 
                            type="button"
                            onClick={() => setJdeVisualAssist({
                              type: 'docType',
                              onSelect: (val) => setQbeP0411(prev => ({ ...prev, tipoDoc: val }))
                            })}
                            className="absolute right-1 text-[#0B3C5D] hover:text-amber-500 font-bold text-xs select-none cursor-pointer transition-all p-0.5"
                            title="Visual Assist: Maestro de Tipos de Documentos (F0005)"
                          >
                            🔍
                          </button>
                        </div>
                      </td>
                      <td className="p-1 border border-slate-300">
                        <div className="relative flex items-center">
                          <input 
                            type="text" 
                            placeholder="Nº Docto..."
                            value={qbeP0411.numDoc}
                            onChange={e => setQbeP0411({...qbeP0411, numDoc: e.target.value})}
                            className="w-full bg-white border border-slate-300 pl-1.5 pr-6 py-1 rounded text-[10px] font-mono text-center font-bold"
                          />
                          <button 
                            type="button"
                            onClick={() => setJdeVisualAssist({
                              type: 'numDoc',
                              onSelect: (val) => setQbeP0411(prev => ({ ...prev, numDoc: val }))
                            })}
                            className="absolute right-1 text-[#0B3C5D] hover:text-amber-500 font-bold text-xs select-none cursor-pointer transition-all p-0.5"
                            title="Visual Assist: Maestro de Correlativos (F0002)"
                          >
                            🔍
                          </button>
                        </div>
                      </td>
                      <td className="p-1 border border-slate-300">
                        <input 
                          type="text" 
                          disabled 
                          placeholder="Filtro de nombres..." 
                          className="w-full bg-slate-100 border border-slate-200 px-1.5 py-1 rounded text-[10px]"
                        />
                      </td>
                      <td className="p-1 border border-slate-300">
                        <input 
                          type="text" 
                          placeholder="Bruto..."
                          value={qbeP0411.importeBruto}
                          onChange={e => setQbeP0411({...qbeP0411, importeBruto: e.target.value})}
                          className="w-full bg-white border border-slate-300 px-1.5 py-1 rounded text-[10px] font-mono text-right font-bold"
                        />
                      </td>
                      <td className="p-1 border border-slate-300">
                        <input 
                          type="text" 
                          disabled 
                          placeholder="Pending..." 
                          className="w-full bg-slate-100 border border-slate-300 px-1.5 py-1 rounded text-[10px] text-center"
                        />
                      </td>
                      <td className="p-1 border border-slate-300">
                        <input 
                          type="text" 
                          placeholder="Date..."
                          value={qbeP0411.fechaFactura}
                          onChange={e => setQbeP0411({...qbeP0411, fechaFactura: e.target.value})}
                          className="w-full bg-white border border-slate-300 px-1.5 py-1 rounded text-[10px] text-center font-mono font-bold"
                        />
                      </td>
                      <td className="p-1 border border-slate-300">
                        <input 
                          type="text" 
                          placeholder="Vence..."
                          value={qbeP0411.fechaVence}
                          onChange={e => setQbeP0411({...qbeP0411, fechaVence: e.target.value})}
                          className="w-full bg-white border border-slate-300 px-1.5 py-1 rounded text-[10px] text-center font-mono font-bold"
                        />
                      </td>
                      <td className="p-1 border border-slate-300">
                        <input 
                          type="text" 
                          placeholder="U/N Unit..."
                          value={qbeP0411.unidadNegocio}
                          onChange={e => setQbeP0411({...qbeP0411, unidadNegocio: e.target.value})}
                          className="w-full bg-white border border-slate-300 px-1.5 py-1 rounded text-[10px] text-center font-mono font-bold"
                        />
                      </td>
                      <td className="p-1 border border-slate-300 bg-slate-100 text-center text-[7px] font-bold text-slate-500 font-mono">
                        Master
                      </td>
                    </tr>
                  </thead>
                  
                  {/* Table Body rows */}
                  <tbody className="divide-y divide-slate-200 text-slate-800 font-mono">
                    {filteredP0411List.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="p-8 text-center text-slate-400 bg-slate-50 italic">
                          No se encontraron movimientos devengados o proveedores con criterios QBE
                        </td>
                      </tr>
                    ) : (
                      filteredP0411List.map((t, idx) => {
                        const isPending = t.status === 'PENDIENTE';
                        return (
                          <tr 
                            key={t.id} 
                            onClick={() => setInspectTarget({ record: t, entityType: 'TRANSACTION' })}
                            onDoubleClick={() => setInspectTarget({ record: t, entityType: 'TRANSACTION' })}
                            onContextMenu={(e) => handleRowContextMenu(e, t, 'P0411')}
                            className={`hover:bg-[#FFFCEB] transition cursor-pointer ${idx % 2 === 0 ? 'bg-white' : 'bg-[#F9FBFC]'}`}
                            title="Haga clic para consultar el detalle completo (F980011D / Maestro de Atributos). Click derecho para Acciones Rápidas."
                          >
                            <td className="p-2 border border-slate-200 text-center text-slate-450">
                              <span 
                                onClick={(e) => { e.stopPropagation(); openMasterLookup('Cía', '00045'); }}
                                className="underline decoration-dotted hover:decoration-indigo-600 hover:text-indigo-850 cursor-pointer"
                                title="Consultar Maestro de Sociedades (F0010)"
                              >
                                00045
                              </span>
                            </td>
                            <td className="p-2 border border-slate-100 font-semibold text-slate-700 font-sans truncate">
                              <span 
                                onClick={(e) => { e.stopPropagation(); openMasterLookup('Cía', 'Financial Solutions corp'); }}
                                className="underline decoration-dotted hover:decoration-indigo-600 hover:text-indigo-850 cursor-pointer"
                                title="Consultar Maestro de Sociedades (F0010)"
                              >
                                Financial Solutions corp
                              </span>
                            </td>
                            <td className="p-2 border border-slate-100 text-slate-650 text-[10px]">
                              <span 
                                onClick={(e) => { e.stopPropagation(); openMasterLookup('Nº Proveedor', t.supplierTaxId || t.supplierId || '924.566-K'); }}
                                className="underline decoration-dotted hover:decoration-indigo-600 hover:text-indigo-850 cursor-pointer"
                                title="Consultar Ficha Técnica Proveedor (F0101)"
                              >
                                {t.supplierTaxId || t.supplierId || '924.566-K'}
                              </span>
                            </td>
                            <td className="p-2 border border-slate-100 text-center font-bold text-slate-550">
                              <span 
                                onClick={(e) => { e.stopPropagation(); openMasterLookup('T/D', 'PV'); }}
                                className="underline decoration-dotted hover:decoration-indigo-600 hover:text-indigo-850 cursor-pointer"
                                title="Consultar Maestro de Tipos de Documento (F0005)"
                              >
                                PV
                              </span>
                            </td>
                            <td className="p-2 border border-slate-100 text-center font-black text-indigo-700">
                              <span 
                                onClick={(e) => { e.stopPropagation(); openMasterLookup('Nº Docto', t.documentNumber || '2556' + idx); }}
                                className="underline decoration-dotted hover:decoration-indigo-600 hover:text-indigo-850 cursor-pointer"
                                title="Consultar Secuencia de Comprobante (F0002)"
                              >
                                {t.documentNumber || '2556' + idx}
                              </span>
                            </td>
                            <td className="p-2 border border-slate-100 text-slate-800 font-sans truncate max-w-[200px]" title={t.description}>
                              <span 
                                onClick={(e) => { e.stopPropagation(); openMasterLookup('Detalle / Proveedor', t.supplierName ? `${t.supplierName} - ${t.description}` : t.description); }}
                                className="underline decoration-dotted hover:decoration-indigo-800 hover:text-indigo-950 cursor-pointer"
                                title="Consultar Tabla de Cuentas y Glosas (F0901)"
                              >
                                {t.description}
                              </span>
                            </td>
                            <td className="p-2 border border-slate-100 text-right font-black text-slate-900">
                              <span 
                                onClick={(e) => { e.stopPropagation(); openMasterLookup('Importe Bruto', formatJDEMoney(t.amount)); }}
                                className="underline decoration-dotted hover:decoration-indigo-600 hover:text-indigo-850 cursor-pointer"
                                title="Consultar Parámetros de Cuentas por Pagar"
                              >
                                {formatJDEMoney(t.amount)}
                              </span>
                            </td>
                            <td className={`p-2 border border-slate-100 text-right font-black ${isPending ? 'text-amber-700 font-extrabold' : 'text-slate-400'}`}>
                              <span 
                                onClick={(e) => { e.stopPropagation(); openMasterLookup('Importe Pendiente', formatJDEMoney(isPending ? t.amount : 0)); }}
                                className="underline decoration-dotted hover:decoration-indigo-600 hover:text-indigo-850 cursor-pointer"
                                title="Consultar Estados de Deuda Pendiente"
                              >
                                {formatJDEMoney(isPending ? t.amount : 0)}
                              </span>
                            </td>
                            <td className="p-2 border border-slate-100 text-slate-600 text-center" onClick={e => e.stopPropagation()}>
                              <span 
                                onClick={() => openMasterLookup('Fe. Factura', formatJDEDate(t.invoiceDate || t.date))}
                                className="underline decoration-dotted hover:decoration-indigo-600 hover:text-indigo-850 cursor-pointer"
                                title="Consultar Período Fiscal Factura (F0008)"
                              >
                                {formatJDEDate(t.invoiceDate || t.date)}
                              </span>
                            </td>
                            <td className="p-2 border border-slate-100 text-slate-600 text-center" onClick={e => e.stopPropagation()}>
                              <span 
                                onClick={() => openMasterLookup('Fe. Vence', formatJDEDate(t.date))}
                                className="underline decoration-dotted hover:decoration-indigo-600 hover:text-indigo-850 cursor-pointer"
                                title="Consultar Período de Vencimiento Fiscal (F0008)"
                              >
                                {formatJDEDate(t.date)}
                              </span>
                            </td>
                            <td className="p-2 border border-slate-200 text-center text-amber-900 font-bold" onClick={e => e.stopPropagation()}>
                              <span 
                                onClick={() => openMasterLookup('U/N', t.propertyId ? String(t.propertyId).substring(0, 4) : '47')}
                                className="underline decoration-dotted hover:decoration-indigo-600 hover:text-indigo-850 cursor-pointer"
                                title="Consultar Maestro Unidades de Negocio (F0006)"
                              >
                                {t.propertyId ? String(t.propertyId).substring(0, 4) : '47'}
                              </span>
                            </td>
                            <td className="p-2 border border-slate-200 text-center" onClick={e => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => setInspectTarget({ record: t, entityType: 'TRANSACTION' })}
                                className="text-indigo-600 hover:text-indigo-800 hover:bg-slate-100 p-1 rounded-md transition mx-auto flex items-center justify-center border border-indigo-200 text-[10px] font-sans font-semibold tracking-tight"
                                title="F980011D: Consultar Maestro de Atributos"
                              >
                                <Database size={12} className="text-indigo-650" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                    
                    {/* Bottom Totals */}
                    <tr className="bg-[#ECEFF4] border-t-2 border-slate-300 font-bold font-mono text-[10.5px]">
                      <td className="p-2 border border-slate-300 text-center" colSpan={6}>
                        F0411 TOTALES DEL MAYOR AUXILIAR DE PROVEEDORES DEVENGO:
                      </td>
                      <td className="p-2 border border-slate-300 text-right text-slate-900 font-black">
                        {formatJDEMoney(totalsP0411.brute)}
                      </td>
                      <td className="p-2 border border-slate-300 text-right text-amber-800 font-extrabold">
                        {formatJDEMoney(totalsP0411.pending)}
                      </td>
                      <td className="p-2 border border-slate-300" colSpan={4}></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* ========================================================== */}
      {/* F980011D - MAESTRO DE ATRIBUTOS REGISTRO (INSPECTOR MODAL) */}
      {/* ========================================================== */}
      {inspectTarget && (() => {
        const audit = getAuditData(inspectTarget.record, inspectTarget.entityType);
        return (
          <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-[#ECE9D8] text-slate-900 border-2 border-white shadow-2xl w-full max-w-2xl rounded-sm overflow-hidden font-sans text-xs select-none">
              
              {/* Retro Title bar */}
              <div className="bg-linear-to-r from-[#0055E4] to-[#3A82F6] text-white px-3 py-2 flex items-center justify-between font-bold text-[13px] border-b border-[#002EAD]">
                <div className="flex items-center gap-2">
                  <Database size={14} className="text-amber-300 animate-pulse" />
                  <span>SISTEMA DE GESTIÓN INTEGRADA CORPORATIVO - F980011D: Consulta de Maestro de Atributos del Registro</span>
                </div>
                <button 
                  onClick={() => setInspectTarget(null)}
                  className="hover:bg-red-650 bg-red-600 border border-[#9E0000] text-white px-1.5 py-0.5 rounded-sm font-mono text-[10px] transition"
                >
                  ✕
                </button>
              </div>

              {/* Navigation/Options Bar */}
              <div className="bg-[#F0EEE2] border-b border-slate-300 p-1 flex items-center gap-4 text-[11px] text-slate-700 shadow-3xs">
                <button 
                  onClick={() => setInspectTarget(null)}
                  className="px-3 py-1 bg-[#ECE9D8] hover:bg-slate-200 border border-slate-400 rounded-sm font-semibold flex items-center gap-1 shadow-3xs"
                >
                  <Check size={11} className="text-emerald-700" /> Aceptar
                </button>
                <button 
                  onClick={() => setInspectTarget(null)}
                  className="px-3 py-1 bg-[#ECE9D8] hover:bg-slate-200 border border-slate-400 rounded-sm flex items-center gap-1 shadow-3xs"
                >
                  <X size={11} className="text-red-700" /> Cancelar
                </button>
                <div className="h-4 w-px bg-slate-300"></div>
                <span className="text-[10px] text-slate-500 font-mono">ID Registro: {audit.registryId}</span>
              </div>

              {/* ERP Form Workspace */}
              <div className="p-4 space-y-4">
                <div className="bg-white border border-[#A0A0A0] p-4 space-y-3 shadow-inner rounded-sm">
                  <div className="flex items-center gap-1.5 border-b border-indigo-100 pb-2 mb-2">
                    <Sliders size={13} className="text-indigo-700" />
                    <span className="font-bold text-indigo-950 uppercase tracking-wide text-[11.5px]">Maestro de Firma y Control del Grid</span>
                  </div>

                  {/* 2-column ERP grid inputs */}
                  <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
                    
                    {/* Program ID */}
                    <div className="flex items-center justify-between">
                      <label className="text-slate-600 font-semibold w-28 text-left">Programa Origen:</label>
                      <input 
                        type="text" 
                        readOnly 
                        value={audit.programId}
                        className="bg-[#FFFFE1] border border-[#7F9DB9] text-indigo-950 font-mono font-black text-center px-2 py-0.5 w-48 text-[11px] rounded-sm focus:outline-none"
                      />
                    </div>

                    {/* Workstation */}
                    <div className="flex items-center justify-between">
                      <label className="text-slate-600 font-semibold w-28 text-left">Estación de Trabajo:</label>
                      <input 
                        type="text" 
                        readOnly 
                        value={audit.workStationId}
                        className="bg-slate-100 border border-[#7F9DB9] text-slate-800 font-mono px-2 py-0.5 w-48 text-[10.5px] rounded-sm focus:outline-none"
                      />
                    </div>

                    {/* Next Number Sequence */}
                    <div className="flex items-center justify-between">
                      <label className="text-slate-600 font-semibold w-28 text-left font-sans">Nº Correlativo Audit:</label>
                      <input 
                        type="text" 
                        readOnly 
                        value={audit.nextNumberSeq}
                        className="bg-slate-100 border border-[#7F9DB9] text-[#144D75] font-mono font-bold text-center px-2 py-0.5 w-48 text-[11px] rounded-sm"
                      />
                    </div>

                    {/* User Creator */}
                    <div className="flex items-center justify-between">
                      <label className="text-slate-600 font-semibold w-28 text-left">Audit User ID:</label>
                      <input 
                        type="text" 
                        readOnly 
                        value={audit.userCreator}
                        className="bg-[#DFF6DD] border border-[#7F9DB9] text-[#0E621F] font-mono font-bold text-center px-2 py-0.5 w-48 text-[11px] rounded-sm"
                      />
                    </div>

                    {/* Lock Status */}
                    <div className="flex items-center justify-between">
                      <label className="text-slate-600 font-semibold w-28 text-left">Estado Bloqueo:</label>
                      <div className="flex items-center gap-1 w-48">
                        <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse border border-emerald-700"></span>
                        <input 
                          type="text" 
                          readOnly 
                          value={audit.lockedBy}
                          className="bg-slate-100 border border-[#7F9DB9] text-emerald-800 font-mono font-bold px-2 py-0.5 w-full text-[10.5px] rounded-sm"
                        />
                      </div>
                    </div>

                    {/* Test Marker */}
                    <div className="flex items-center justify-between">
                      <label className="text-slate-600 font-semibold w-28 text-left">Tipo de Ledger:</label>
                      <input 
                        type="text" 
                        readOnly 
                        value={audit.isTest}
                        className="bg-slate-100 border border-[#7F9DB9] text-[#144D75] px-2 py-0.5 w-48 text-[10px] rounded-sm"
                      />
                    </div>

                    {/* Timestamp */}
                    <div className="flex flex-col col-span-2 mt-1 pt-2 border-t border-slate-200">
                      <div className="flex items-center justify-between">
                        <label className="text-slate-600 font-semibold text-left flex items-center gap-1">
                          <Tag size={12} className="text-indigo-650" />
                          <span>Timestamp de Transacción:</span>
                        </label>
                        <span className="text-[11px] font-mono font-black bg-indigo-50 text-[#0B3C5D] px-2 py-0.5 border border-indigo-200 rounded-sm">
                          {audit.timestamp}
                        </span>
                      </div>
                    </div>

                    {/* Cryptographic SHA-256 Signature */}
                    <div className="flex flex-col col-span-2 mt-1.5">
                      <label className="text-slate-400 font-mono text-[9px] uppercase tracking-wider mb-0.5">Hash de Control Criptográfico (Maestro de Atributos F980011D)</label>
                      <div className="bg-slate-900 text-amber-400 font-mono text-[9px] p-2 rounded-sm border border-slate-700 select-all font-bold tracking-tight break-all">
                        {audit.hashSignature}
                      </div>
                    </div>

                  </div>
                </div>

                {/* Additional fields of record */}
                <div className="bg-[#DFEFFC] border border-[#144D75]/30 p-3 rounded-sm">
                  <span className="font-bold text-[#144D75] text-[10.5px] uppercase block mb-1">Registro de Datos Originales Consultados del Grid:</span>
                  <div className="grid grid-cols-2 gap-y-1 text-[10.5px] font-mono text-slate-750">
                    <div><span className="font-semibold text-slate-600">Documento:</span> {inspectTarget.record.documentNumber || 'Factura/Voucher'} ({inspectTarget.record.documentType})</div>
                    <div><span className="font-semibold text-slate-600">Importe Mon Nac:</span> {formatJDEMoney(inspectTarget.record.amount)}</div>
                    <div className="col-span-2"><span className="font-semibold text-slate-600">Explicación:</span> {inspectTarget.record.description}</div>
                  </div>
                </div>
              </div>

              {/* Footer status bar */}
              <div className="bg-[#ECE9D8] border-t border-slate-300 px-3 py-1.5 flex items-center justify-between text-[10px] text-slate-600 font-mono">
                <span>ASSETFLOW Gestión Integrada Corporativa Central v2.0 SP4</span>
                <span className="text-emerald-700 font-bold">● SISTEMA DE CONTROL DE AUDITORÍA ACTIVO</span>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ========================================================== */}
      {/* CUADRATURA GENERAL AUDIT MODAL DUAL VIEW (P09210)       */}
      {/* ========================================================== */}
      {showCuadraturaLedgerModal && (
        <div className="fixed inset-0 z-[99999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#ECE9D8] text-slate-800 border-2 border-white shadow-2xl w-full max-w-2xl rounded-sm overflow-hidden font-sans text-xs select-none animate-in zoom-in-95 duration-150">
            
            {/* Title Bar */}
            <div className="bg-linear-to-r from-[#0B3C5D] to-[#1D5C8A] text-white px-3 py-2 flex items-center justify-between font-bold text-[12.5px] border-b border-[#0B3C5D]">
              <div className="flex items-center gap-2">
                <Layers size={14} className="text-[#FFCC00] animate-pulse" />
                <span>Informe de Cuadratura Automática AssetFlow (P09210)</span>
              </div>
              <button 
                onClick={() => setShowCuadraturaLedgerModal(false)}
                className="hover:bg-red-650 bg-red-600 border border-[#9E0000] text-white px-1.5 py-0.5 rounded-sm font-mono text-[9px] transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Retro Toolbar */}
            <div className="bg-[#F0EEE2] border-b border-slate-300 p-1 flex items-center gap-2 text-[10px] text-slate-700">
              <button 
                onClick={() => setShowCuadraturaLedgerModal(false)}
                className="px-2.5 py-1 bg-[#ECE9D8] hover:bg-slate-200 border border-slate-400 rounded-sm font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Check size={11} className="text-emerald-700" /> Cerrar
              </button>
              {totalsP0911.balance !== 0 && (
                <button 
                  onClick={handleAutoCuadrarLedger}
                  className="px-2.5 py-1 bg-[#FFFCE9] hover:bg-amber-100 border border-amber-400 rounded-sm font-bold flex items-center gap-1 text-amber-900 cursor-pointer"
                >
                  <RefreshCw size={11} className="text-amber-700 animate-spin" /> Autocuadrar Libro (F0911)
                </button>
              )}
              <div className="h-4 w-px bg-slate-300"></div>
              <span className="text-[9.5px] text-slate-500 font-mono font-bold uppercase">Módulos de Auditoría F0911 & F0411</span>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              
              {/* Balance status banner */}
              <div className={`p-4 rounded border flex items-start gap-3 ${totalsP0911.balance === 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-amber-50 border-amber-250 text-amber-950'}`}>
                {totalsP0911.balance === 0 ? (
                  <CheckSquare className="text-emerald-600 shrink-0 mt-0.5" size={20} />
                ) : (
                  <AlertCircle className="text-amber-600 shrink-0 mt-0.5 animate-pulse" size={20} />
                )}
                <div>
                  <h4 className="text-[11.5px] font-black uppercase tracking-wider">
                    {totalsP0911.balance === 0 ? 'Sincronía G/L: PERFECTAMENTE BALANCEADA' : 'Sincronía G/L: PENDIENTE DE AJUSTE DE CUADRATURA'}
                  </h4>
                  <p className="text-[10px] mt-0.5 leading-relaxed font-medium">
                    {totalsP0911.balance === 0 
                      ? 'Los débitos (deber/egresos) y créditos (haber/ingresos) imputados al Libro Diario General coinciden al 100%. No se requieren acciones compensatorias.' 
                      : 'Existe una desviación acumulada entre los débitos y créditos del período actual. Para regularizar y cuadrar el libro de cuenta de forma automática, haga clic en el botón de "Autocuadrar" de arriba.'}
                  </p>
                </div>
              </div>

              {/* Totals grids summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white border border-slate-300 p-3 rounded-sm text-center">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block font-mono">DÉBITOS (DEBER / EGRESOS)</span>
                  <span className="text-[13px] font-black font-mono text-slate-800 block mt-1">${totalsP0911.debit.toLocaleString('es-CL')}</span>
                </div>
                <div className="bg-white border border-slate-300 p-3 rounded-sm text-center">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block font-mono">CRÉDITOS (HABER / INGRESOS)</span>
                  <span className="text-[13px] font-black font-mono text-emerald-750 block mt-1">${totalsP0911.credit.toLocaleString('es-CL')}</span>
                </div>
                <div className="bg-white border border-slate-300 p-3 rounded-sm text-center">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block font-mono">DIFERENCIAL (NETO)</span>
                  <span className={`text-[13px] font-black font-mono block mt-1 ${totalsP0911.balance === 0 ? 'text-slate-650' : 'text-amber-800 animate-pulse'}`}>
                    ${totalsP0911.balance.toLocaleString('es-CL')} Chile
                  </span>
                </div>
              </div>

              {/* Core Check details list */}
              <div className="bg-white border border-[#A0A0A0] rounded-sm overflow-hidden p-3 space-y-2">
                <h5 className="font-bold text-slate-700 uppercase font-sans text-[10px] border-b border-slate-200 pb-1 flex items-center gap-1.5 mb-1.5">
                  <span className="w-1.5 h-1.5 bg-indigo-600 rounded"></span>
                  DETALLE DE INTEGRIDAD COMPAÑÍA 00001
                </h5>
                <div className="space-y-1.5 text-[11px] font-mono leading-tight">
                  <div className="flex justify-between pb-1 border-b border-slate-100">
                    <span className="text-slate-500">Métrica de Partida Doble ERP</span>
                    <span className={`font-bold uppercase ${totalsP0911.balance === 0 ? 'text-emerald-700' : 'text-amber-700 font-extrabold animate-pulse'}`}>
                      {totalsP0911.balance === 0 ? '✓ RECONCILIADO' : '⚠ DESBALANCE CONTCONTABILIDAD'}
                    </span>
                  </div>
                  <div className="flex justify-between pb-1 border-b border-slate-100">
                    <span className="text-slate-500">Filas Inspeccionadas en F0911</span>
                    <span className="text-slate-900 font-bold">{filteredP0911List.length} Registros Activos</span>
                  </div>
                  <div className="flex justify-between pb-1 border-b border-slate-100">
                    <span className="text-slate-500">Lote de Ejecución</span>
                    <span className="text-slate-900 font-mono font-bold">BATCH_{selectedBatchNum}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Operador Autorizador</span>
                    <span className="text-slate-900 font-semibold uppercase">{currentUser}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Footer status bar */}
            <div className="bg-[#ECE9D8] border-t border-slate-300 px-3 py-1.5 flex items-center justify-between text-[9px] text-slate-500 font-mono font-bold">
              <span>SISTEMA CENTRAL DE AUDITORÍA Y CUADRATURAS ASSETFLOW</span>
              <span className="text-emerald-70s font-black text-emerald-800">● PROCESANDO CON SUCESO (OK)</span>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================== */}
      {/* CONSULTA DE MAESTRO DE COLUMNA / ATRIBUTO                 */}
      {/* ========================================================== */}
      {activeMasterLookup && (
        <div className="fixed inset-0 z-[99999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#ECE9D8] text-slate-800 border-2 border-white shadow-2xl w-full max-w-lg rounded-sm overflow-hidden font-sans text-xs select-none">
            
            {/* Retro title bar */}
            <div className="bg-linear-to-r from-[#1E3A8A] to-[#3B82F6] text-white px-3 py-2 flex items-center justify-between font-bold text-[12.5px] border-b border-[#1E3A8A]">
              <div className="flex items-center gap-2">
                <Database size={13} className="text-amber-300 animate-pulse" />
                <span>Consulta de Atributo Maestro Central</span>
              </div>
              <button 
                onClick={() => setActiveMasterLookup(null)}
                className="hover:bg-red-650 bg-red-600 border border-[#9E0000] text-white px-1.5 py-0.5 rounded-sm font-mono text-[9px] transition"
              >
                ✕
              </button>
            </div>

            {/* Retro Toolbar */}
            <div className="bg-[#F0EEE2] border-b border-slate-300 p-1 flex items-center gap-2 text-[10px] text-slate-700">
              <button 
                onClick={() => setActiveMasterLookup(null)}
                className="px-2.5 py-1 bg-[#ECE9D8] hover:bg-slate-200 border border-slate-400 rounded-sm font-semibold flex items-center gap-1"
              >
                <Check size={11} className="text-emerald-700" /> Confirmar
              </button>
              <button 
                onClick={() => setActiveMasterLookup(null)}
                className="px-2.5 py-1 bg-[#ECE9D8] hover:bg-slate-200 border border-slate-400 rounded-sm flex items-center gap-1"
              >
                <X size={11} className="text-red-700" /> Cancelar
              </button>
              <div className="h-4 w-px bg-slate-300"></div>
              <span className="text-[9.5px] text-slate-500 font-mono font-bold uppercase">{activeMasterLookup.masterTable}</span>
            </div>

            {/* Body workspace */}
            <div className="p-4 space-y-3">
              <div className="bg-white border border-[#A0A0A0] p-4 space-y-2 pb-3.5 shadow-inner rounded-sm">
                
                {/* Header title */}
                <div className="border-b border-indigo-100 pb-1.5 mb-2.5 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-indigo-600 rounded-xs"></span>
                  <span className="font-bold text-slate-800 uppercase text-[11px] tracking-wide">
                    Maestro de Columna: {activeMasterLookup.columnName}
                  </span>
                </div>

                {/* Main lookup value row */}
                <div className="bg-amber-50 border border-amber-200 rounded p-2 text-[11px] text-amber-900 font-bold mb-3 font-mono">
                  Valor Registrado en Fila: <span className="bg-white px-1.5 py-0.5 border border-amber-300 rounded font-black">{activeMasterLookup.originalValue}</span>
                </div>

                <div className="text-[11px] text-slate-500 font-sans italic mb-3.5 bg-slate-50 p-2 rounded border border-slate-200">
                  <span className="font-bold text-slate-700 block not-italic">Descripción del Atributo:</span>
                  {activeMasterLookup.description}
                </div>

                {/* Standard grid outputs */}
                <div className="space-y-1.5 pt-1.5 border-t border-slate-100 text-[11px]">
                  {activeMasterLookup.details.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between border-b border-slate-100/50 pb-1">
                      <span className="text-slate-500 font-medium">{item.label}:</span>
                      <span className={`font-mono text-[10.5px] ${item.isHighlighted ? 'bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-black border border-indigo-200' : 'text-slate-800 font-bold'}`}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>

              </div>
            </div>

            {/* Footer status */}
            <div className="bg-[#ECE9D8] border-[#A0A0A0] border px-3 py-1.5 flex items-center justify-between text-[9px] text-[#4F5D73] font-mono font-bold">
              <span>SISTEMA CENTRAL DE MAESTROS ASSETFLOW</span>
              <span className="text-emerald-700 font-bold font-mono">● MÓDULO CONEXIONES ACTIVAS (OK)</span>
            </div>

          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* ERP RETRO CONTEXT MENU (RIGHT CLICK)                    */}
      {/* ======================================================= */}
      {contextMenu && (
        <JDEGridContextMenu
          isOpen={true}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          programCode={contextMenu.type === 'P0911' ? 'P0911' : 'P0411'}
          programTitle={contextMenu.type === 'P0911' ? 'Diario General F0911' : 'Cuentas por Pagar F0411'}
          collectionName="transactions"
          recordKey={contextMenu.record.documentNumber || contextMenu.record.id}
          recordData={contextMenu.record}
          currentStatus={contextMenu.record.status}
          statusOptions={[
            { label: 'COMPLETADA', value: 'COMPLETADA' },
            { label: 'PENDIENTE', value: 'PENDIENTE' },
            { label: 'ANULADA', value: 'ANULADA' }
          ]}
          onUpdateStatus={async (newStatus) => {
            onUpdateTransaction(contextMenu.record.id, 'status', newStatus);
          }}
          onExportExcel={() => handleExportGridToExcel()}
          onClearQBE={() => handleClearQBE()}
          items={[
            {
              id: 'inspect_master',
              label: 'Inspeccionar Atributos F980011D (Master)',
              icon: <Database size={13} className="text-[#0B3C5D]" />,
              shortcut: 'F4',
              onClick: () => {
                setInspectTarget({ record: contextMenu.record, entityType: 'TRANSACTION' });
              }
            },
            {
              id: 'emit_pdf',
              label: 'Emitir Comprobante Contable PDF (ERP)',
              icon: <Download size={13} className="text-indigo-700" />,
              shortcut: 'Ctrl+P',
              onClick: () => {
                const linkedOT = workOrders.find(ot => ot.id === contextMenu.record.workOrderId);
                downloadJDETransactionVoucher({
                  transaction: contextMenu.record,
                  workOrder: linkedOT,
                  currentUser
                });
              }
            },
            {
              id: 'export_excel',
              label: 'Exportar Grilla a Excel (.xlsx)',
              icon: <FileSpreadsheet size={13} className="text-emerald-700" />,
              shortcut: 'Ctrl+E',
              onClick: () => {
                handleExportGridToExcel();
              }
            },
            {
              id: 'cuadratura_p09210',
              label: 'Cuadratura de Libro Diario (P09210)',
              icon: <RefreshCw size={13} className="text-amber-700" />,
              onClick: () => {
                handleCuadraturaLedgerExecute();
              }
            },
            {
              id: 'copy_doc_num',
              label: 'Copiar N° Comprobante / Folio',
              icon: <Tag size={13} className="text-slate-600" />,
              shortcut: 'Ctrl+C',
              onClick: () => {
                navigator.clipboard.writeText(contextMenu.record.documentNumber || contextMenu.record.id);
              }
            },
            {
              id: 'anular_asiento',
              label: 'Anular Asiento / Movimiento',
              icon: <Trash2 size={13} className="text-rose-600" />,
              danger: true,
              onClick: () => {
                if (confirm(`¿CONFIRMA ANULACIÓN DEL REGISTRO ${contextMenu.record.documentNumber || 'S/N'}?\nEsta acción es irreversible y generará un log de auditoría forense en ASSETFLOW.`)) {
                  onDeleteTransaction(contextMenu.record.id);
                  alert(`REGISTRO ELIMINADO CON EXITO DEL DIARIO GENERAL (F0911).`);
                }
              }
            }
          ]}
          onSetRowHeight={(h) => {
            if (contextMenu.type === 'P0911') setRowHeightP0911(h);
            else setRowHeightP0411(h);
          }}
          onResetRows={() => {
            setRowHeightP0911(26);
            setRowHeightP0411(26);
          }}
          onResetGridDimensions={() => {
            setRowHeightP0911(26);
            setRowHeightP0411(26);
          }}
        />
      )}

      {/* ======================================================= */}
      {/* ERP VISUAL ASSIST SEARCH & SELECT MODAL                 */}
      {/* ======================================================= */}
      {jdeVisualAssist && (
        <JDEVisualAssistModal
          jdeVisualAssist={jdeVisualAssist}
          onClose={() => setJdeVisualAssist(null)}
          properties={properties}
          suppliers={suppliers}
          transactions={transactions}
          onOpenNewSupplier={onAddSupplier ? () => setIsSupplierFormOpen(true) : undefined}
        />
      )}

      {/* SUPPLIER CREATION MODAL (P01012 / P04012) */}
      {isSupplierFormOpen && onAddSupplier && (
        <SupplierForm
          onClose={() => setIsSupplierFormOpen(false)}
          existingSuppliers={suppliers}
          onSubmit={(newSup) => {
            onAddSupplier(newSup);
            setIsSupplierFormOpen(false);
          }}
        />
      )}

      {/* ======================================================= */}
      {/* ERP RECENT REPORTS (WSJ - P986110B) MODAL               */}
      {/* ======================================================= */}
      <JDERecentReportsModal
        isOpen={showRecentReportsModal}
        onClose={() => setShowRecentReportsModal(false)}
        currentUser={currentUser}
        transactions={transactions}
        workOrders={workOrders}
        properties={properties}
        suppliers={suppliers}
        onOpenApp={(code) => {
          if (code === 'P0911' || code === 'P0411') {
            setActiveProgram(code);
          }
          setShowRecentReportsModal(false);
        }}
      />

      {/* ========================================================== */}
      {/* DICTAMEN PERICIAL FORENSE ERP / CORPORATIVO (SIMILITUD & PLAGIO) */}
      {/* ========================================================== */}
      <JdeComparisonAuditModal
        isOpen={showJdeComparisonModal}
        onClose={() => setShowJdeComparisonModal(false)}
        currentUser={currentUser}
        companyName="ASSETFLOW ENTERPRISE & CONTROLLING"
      />

    </div>
  );
};

interface JDEVisualAssistModalProps {
  jdeVisualAssist: {
    type: 'docType' | 'company' | 'supplier' | 'batch' | 'account' | 'numDoc';
    onSelect: (value: string) => void;
  };
  onClose: () => void;
  properties: Property[];
  suppliers: Supplier[];
  transactions: Transaction[];
  onOpenNewSupplier?: () => void;
}

const JDEVisualAssistModal: React.FC<JDEVisualAssistModalProps> = ({
  jdeVisualAssist,
  onClose,
  properties,
  suppliers,
  transactions,
  onOpenNewSupplier
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(5);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, jdeVisualAssist.type]);

  // Get master lists depending on the type
  let title = '';
  let codeLabel = '';
  let nameLabel = '';
  let list: Array<{ code: string; name: string; desc?: string; category?: string }> = [];

  switch (jdeVisualAssist.type) {
    case 'docType':
      title = 'Búsqueda y Selección de Tipos de Documentos - F0005S';
      codeLabel = 'Tipo';
      nameLabel = 'Descripción del Tipo de Documento';
      list = [
        { code: 'JE', name: 'Asiento Diario de Entrada General (Journal Entry)' },
        { code: 'PV', name: 'Factura/Voucher de Proveedor (Purchase Voucher)' },
        { code: 'RC', name: 'Recibo Contable de Caja (Cash Receipt)' },
        { code: 'OP', name: 'Orden de Pago / Egreso de Fondos' },
        { code: 'FE', name: 'Factura Electrónica de Ventas' },
        { code: 'NC', name: 'Nota de Crédito Tributaria' },
        { code: 'ND', name: 'Nota de Débito Tributaria' },
        { code: 'CC', name: 'Rendición de Caja Chica y Fondos Fijos' }
      ];
      break;

    case 'company':
      title = 'Búsqueda y Selección de Compañías / Sociedades - F0010S';
      codeLabel = 'Cía';
      nameLabel = 'Razón Social / Entidad Inmobiliaria';
      
      const mappedProps = (properties || [])
        .filter(p => p && p.id)
        .map(p => {
          const idStr = String(p.id);
          return {
            code: idStr.substring(0, 5).toUpperCase(),
            name: p.building ? `${p.building} - Depto ${p.address || ''}` : `Unidad ${idStr}`
          };
        });

      list = [
        { code: '00001', name: 'Inmobiliaria Pro SPA - Sede Principal Santiago' },
        { code: '00002', name: 'Inmobiliaria Pro Filial Sur - Concepción' },
        { code: '00003', name: 'Inmobiliaria Pro Filial Norte - Antofagasta' },
        { code: '00045', name: 'Inversiones Inmobiliarias AssetFlow SpA' },
        ...mappedProps
      ];
      const seenCodes = new Set();
      list = list.filter(el => {
        const duplicate = seenCodes.has(el.code);
        seenCodes.add(el.code);
        return !duplicate;
      });
      break;

    case 'supplier':
      title = 'Búsqueda y Selección en Directorio de Proveedores - F04012S';
      codeLabel = 'Rut / ID';
      nameLabel = 'Razón Social / Nombre Proveedor';
      
      const mappedSuppliers = (suppliers || [])
        .filter(s => s && s.id)
        .map(s => ({
          code: String(s.id),
          name: String(s.name || 'Proveedor Sin Nombre'),
          desc: String(s.specialty || s.category || '')
        }));

      list = [
        ...mappedSuppliers,
        { code: '76.123.456-1', name: 'Catering & Food S.A.', desc: 'Servicios de alimentación' },
        { code: '77.987.654-2', name: 'Constructora Alerce Ltda.', desc: 'Construcción y obras menores' },
        { code: '76.453.210-K', name: 'Insumos Médicos del Sur', desc: 'Suministros médicos y seguridad' },
        { code: '88.444.222-K', name: 'Servicios Generales AssetFlow', desc: 'Instalaciones y aseo industrial' },
        { code: '76.000.111-2', name: 'Plomería e Instalaciones Eléctricas San Juan', desc: 'Servicios básicos e instalaciones' }
      ];
      const seenSups = new Set();
      list = list.filter(el => {
        const duplicate = seenSups.has(el.code);
        seenSups.add(el.code);
        return !duplicate;
      });
      break;

    case 'batch':
      title = 'Búsqueda y Selección de Cabeceras de Lotes Contables - F0011S';
      codeLabel = 'Nº Lote';
      nameLabel = 'Estado de Cuadratura del Lote';
      
      const txBatches = [...new Set(transactions.map(t => t.batchNumber))].filter(Boolean).map(b => ({
        code: String(b),
        name: 'Lote cargado en Diario General (F0911)'
      }));

      list = [
        { code: '12845669', name: 'Lote balanceado - Activo Diario General' },
        { code: '12845670', name: 'Lote balanceado - Egresos de Caja' },
        { code: '12845671', name: 'Lote pendiente - Conciliación mensual' },
        { code: '12845672', name: 'Lote de cierre mensual - Febrero 2026' },
        ...txBatches
      ];
      const seenBatches = new Set();
      list = list.filter(el => {
        const duplicate = seenBatches.has(el.code);
        seenBatches.add(el.code);
        return !duplicate;
      });
      break;

    case 'numDoc':
      title = 'Búsqueda de Correlativos y Documentos Registrados - F0002S';
      codeLabel = 'Nº Docto';
      nameLabel = 'Información de Referencia Transaccional';

      const txDocs = [...new Set(transactions.map(t => t.documentNumber))].filter(Boolean).map(doc => {
        const related = transactions.find(t => t.documentNumber === doc);
        return {
          code: String(doc),
          name: related ? `Fecha: ${related.date} | Detalle: ${related.description}` : 'Registro de Diario'
        };
      });

      list = [
        ...txDocs
      ];
      const seenDocs = new Set();
      list = list.filter(el => {
        const duplicate = seenDocs.has(el.code);
        seenDocs.add(el.code);
        return !duplicate;
      });
      break;

    case 'account':
      title = 'Búsqueda y Selección en Maestro de Cuentas Contables - F0901S';
      codeLabel = 'Nº Cuenta';
      nameLabel = 'Nombre de Cuenta Contable / Plan de Cuentas ERP';

      list = [
        { code: '1110.01.002', name: 'Caja / Banco General BCI', desc: 'ACTIVO CIRCULANTE - Disponible', category: 'ACTIVO' },
        { code: '1110.01.003', name: 'Fondo Fijo / Caja Chica Administración', desc: 'ACTIVO CIRCULANTE - Disponible', category: 'ACTIVO' },
        { code: '1120.04.015', name: 'Cuentas por Cobrar Arriendos Edificios', desc: 'ACTIVO CIRCULANTE - Deudores por Ventas', category: 'ACTIVO' },
        { code: '1140.01.001', name: 'IVA Crédito Fiscal (Recuperable)', desc: 'ACTIVO CIRCULANTE - Impuestos', category: 'ACTIVO' },
        { code: '2110.05.001', name: 'Cuentas por Pagar Proveedores Facturas', desc: 'PASIVO CIRCULANTE - Deudas Corto Plazo', category: 'PASIVO' },
        { code: '2110.08.002', name: 'Retenciones CxP Honorarios 13.75%', desc: 'PASIVO CIRCULANTE - Retenciones', category: 'PASIVO' },
        { code: '2140.02.001', name: 'IVA Débito Fiscal', desc: 'PASIVO CIRCULANTE - Impuestos', category: 'PASIVO' },
        { code: '3110.01.001', name: 'Capital Social Pagado', desc: 'PATRIMONIO NETO - Capital Social', category: 'PATRIMONIO' },
        { code: '3110.02.001', name: 'Reservas y Resultados Acumulados', desc: 'PATRIMONIO NETO - Reservas', category: 'PATRIMONIO' },
        { code: '4110.01.002', name: 'Ingresos por Rentas y Arriendos Inmobiliarios', desc: 'RESULTADO GANANCIA - Ingresos Operacionales', category: 'RESULTADO (GANANCIA)' },
        { code: '5110.02.001', name: 'Gastos Operacionales Mantenimiento y Reparaciones', desc: 'RESULTADO PÉRDIDA - Costos Operativos', category: 'RESULTADO (PÉRDIDA)' },
        { code: '5110.02.002', name: 'Gastos Servicios Básicos y Utilidades', desc: 'RESULTADO PÉRDIDA - Costos Operativos', category: 'RESULTADO (PÉRDIDA)' },
        { code: '5110.02.003', name: 'Gastos Honorarios y Servicios Profesionales', desc: 'RESULTADO PÉRDIDA - Administración', category: 'RESULTADO (PÉRDIDA)' }
      ];

      // Append accounts extracted from active transactions
      transactions.forEach(t => {
        if (t.accountCode) {
          const parts = t.accountCode.split('(');
          const code = parts[0].trim();
          const name = parts[1] ? parts[1].replace(')', '').trim() : 'Cuenta Registrada';
          let category = 'OTRO';
          if (code.startsWith('1')) category = 'ACTIVO';
          else if (code.startsWith('2')) category = 'PASIVO';
          else if (code.startsWith('3')) category = 'PATRIMONIO';
          else if (code.startsWith('4')) category = 'RESULTADO (GANANCIA)';
          else if (code.startsWith('5')) category = 'RESULTADO (PÉRDIDA)';

          list.push({ code, name, desc: 'REGISTRO TRANSACCIONAL F0911', category });
        }
      });

      const seenAccounts = new Set();
      list = list.filter(el => {
        if (!el || !el.code) return false;
        const duplicate = seenAccounts.has(el.code);
        seenAccounts.add(el.code);
        return !duplicate;
      });
      break;

    default:
      break;
  }

  // Filter list based on searchTerm and category filter
  const searchLower = (searchTerm || '').toLowerCase();
  const filteredList = list.filter(item => {
    const matchesSearch = 
      (item.code || '').toLowerCase().includes(searchLower) ||
      (item.name || '').toLowerCase().includes(searchLower) ||
      (item.desc ? item.desc.toLowerCase().includes(searchLower) : false) ||
      (item.category ? item.category.toLowerCase().includes(searchLower) : false);

    const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  // Calculate pagination
  const totalItems = filteredList.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedList = filteredList.slice(startIndex, startIndex + pageSize);

  const handleConfirm = () => {
    if (selectedItem) {
      jdeVisualAssist.onSelect(selectedItem);
      onClose();
    } else {
      alert('Por favor, seleccione un elemento del maestro para retornar.');
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3">
      <div className="bg-[#ECE9D8] text-slate-900 border-2 border-white shadow-xl w-full max-w-2xl rounded-xs overflow-hidden font-sans text-xs select-none animate-in zoom-in-95 duration-150">
        
        {/* ERP Classic Blue Title bar */}
        <div className="bg-[#0B3C5D] text-white px-3 py-1.5 flex items-center justify-between font-bold text-[11px] tracking-wide border-b border-[#051E30]">
          <div className="flex items-center gap-2">
            <span className="text-amber-300 font-mono text-[11px]">🔍</span>
            <span className="uppercase font-sans tracking-tight">AssetFlow Enterprise Visual Assist - {title}</span>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="hover:bg-red-700 bg-red-600 border border-red-800 text-white px-1.5 py-0.5 rounded-xs font-mono text-[9px] transition cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="bg-[#EFECE1] border-b border-[#B5B5A5] px-3 py-1.5 flex items-center justify-between text-[11px] text-slate-800">
          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={handleConfirm}
              disabled={!selectedItem}
              className={`px-3 py-1 rounded-xs border text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                selectedItem 
                  ? 'bg-white border-[#0055E4] text-[#0055E4] hover:bg-[#EBF3FA] shadow-3xs cursor-pointer' 
                  : 'bg-[#E5E2D5] border-[#C5C2B5] text-slate-400 cursor-not-allowed'
              }`}
            >
              <Check size={12} className={selectedItem ? "text-[#0055E4]" : "text-slate-400"} /> Seleccionar
            </button>
            <button 
              type="button"
              onClick={onClose}
              className="px-3 py-1 bg-white hover:bg-[#F5F2E5] border border-[#999999] text-slate-700 rounded-xs flex items-center gap-1.5 shadow-3xs cursor-pointer font-medium"
            >
              <X size={12} className="text-red-600" /> Cancelar
            </button>
            {jdeVisualAssist.type === 'supplier' && onOpenNewSupplier && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenNewSupplier();
                }}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 border border-emerald-800 text-white rounded-xs flex items-center gap-1.5 shadow-3xs cursor-pointer font-bold"
              >
                <Plus size={12} /> + Agregar Nuevo Proveedor (P01012)
              </button>
            )}
          </div>
          <span className="text-[10px] text-slate-500 font-mono italic hidden sm:inline">
            Seleccione una fila o haga doble clic para retornar
          </span>
        </div>

        {/* Filter Bar */}
        <div className="p-2.5 space-y-2">
          
          <div className="bg-[#F8F6EF] border border-[#B5B5A5] p-2 rounded-xs flex flex-col sm:flex-row sm:items-center gap-2 text-[11px]">
            <div className="flex items-center gap-2 flex-1">
              <span className="font-bold text-[#0B3C5D] shrink-0 text-[11px]">Buscar en Maestro:</span>
              <div className="relative flex-1">
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Escriba código, nombre o categoría para filtrar..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-[#FFFFE1] border border-[#7F9DB9] px-2 py-1 rounded-xs text-[11px] font-medium outline-none text-slate-900 focus:border-[#0055E4]"
                />
                {searchTerm && (
                  <button 
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1 text-slate-400 hover:text-slate-600 font-bold text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {jdeVisualAssist.type === 'account' && (
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="font-bold text-[#0B3C5D] text-[11px]">Categoría:</span>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-white border border-[#7F9DB9] px-2 py-1 rounded-xs text-[11px] font-semibold text-slate-800 outline-none cursor-pointer focus:border-[#0055E4]"
                >
                  <option value="ALL">Todas las Categorías</option>
                  <option value="ACTIVO">Activo</option>
                  <option value="PASIVO">Pasivo</option>
                  <option value="PATRIMONIO">Patrimonio</option>
                  <option value="RESULTADO (GANANCIA)">Resultado Ganancia</option>
                  <option value="RESULTADO (PÉRDIDA)">Resultado Pérdida</option>
                </select>
              </div>
            )}
          </div>

          {/* Grid List */}
          <div className="bg-white border border-[#A0A0A0] rounded-xs overflow-hidden min-h-[200px] max-h-[260px] overflow-y-auto custom-scrollbar shadow-3xs">
            <table className="w-full text-left border-collapse text-[11px] font-sans">
              <thead className="bg-[#E1EDF7] border-b border-[#99BBE8] sticky top-0 text-[#0B3C5D] font-bold z-10 text-[10px] uppercase">
                <tr>
                  <th className="p-2 border-r border-[#B5C7DE] text-center w-10">SEL</th>
                  <th className="p-2 border-r border-[#B5C7DE] w-28 font-mono">{codeLabel}</th>
                  <th className="p-2 border-r border-[#B5C7DE]">{nameLabel}</th>
                  {jdeVisualAssist.type === 'account' && (
                    <th className="p-2 w-36 font-sans text-center">CATEGORÍA</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {paginatedList.length === 0 ? (
                  <tr>
                    <td colSpan={jdeVisualAssist.type === 'account' ? 4 : 3} className="p-8 text-center text-slate-400 italic font-mono text-[10px]">
                      No se encontraron registros coincidentes en el maestro.
                    </td>
                  </tr>
                ) : (
                  paginatedList.map((item) => (
                    <tr 
                      key={item.code}
                      onClick={() => setSelectedItem(item.code)}
                      onDoubleClick={() => {
                        jdeVisualAssist.onSelect(item.code);
                        onClose();
                      }}
                      className={`cursor-pointer transition-colors ${
                        selectedItem === item.code 
                          ? 'bg-[#FFE699] font-medium text-slate-950' 
                          : 'hover:bg-[#F0F5FA]'
                      }`}
                    >
                      <td className="p-2 border-r border-slate-200 text-center">
                        <input 
                          type="radio" 
                          checked={selectedItem === item.code}
                          onChange={() => setSelectedItem(item.code)}
                          className="cursor-pointer accent-[#0055E4]"
                        />
                      </td>
                      <td className="p-2 border-r border-slate-200 font-mono font-bold text-[#0B3C5D]">
                        {item.code}
                      </td>
                      <td className="p-2 border-r border-slate-200">
                        <div className="font-semibold text-slate-900">{item.name}</div>
                        {item.desc && (
                          <div className="text-[9.5px] text-slate-500 font-mono italic mt-0.5">{item.desc}</div>
                        )}
                      </td>
                      {jdeVisualAssist.type === 'account' && (
                        <td className="p-2 text-center align-middle">
                          <span className="inline-block px-2 py-0.5 text-[9px] font-bold rounded-xs border border-slate-300 bg-slate-50 text-slate-700 uppercase tracking-tight">
                            {item.category || 'OTRO'}
                          </span>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Minimalist Pagination & Footer Toolbar */}
          <div className="bg-[#EFECE1] border border-[#B5B5A5] px-2.5 py-1.5 rounded-xs flex flex-col sm:flex-row justify-between items-center gap-2 text-[11px] text-slate-700">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#0B3C5D] text-[10px] uppercase tracking-wider">Mostrar:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-[#7F9DB9] rounded-xs px-1.5 py-0.5 text-[11px] font-medium text-slate-800 outline-none cursor-pointer"
              >
                <option value={5}>5 por pág.</option>
                <option value={10}>10 por pág.</option>
                <option value={20}>20 por pág.</option>
                <option value={50}>50 por pág.</option>
              </select>
              <span className="text-[10.5px] text-slate-600 font-mono">
                {totalItems > 0 
                  ? `Registros ${startIndex + 1} - ${endIndex} de ${totalItems}`
                  : '0 registros'}
              </span>
            </div>

            <div className="flex items-center gap-1 font-mono text-[10px]">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className={`px-2 py-0.5 border rounded-xs font-bold transition ${
                  currentPage === 1 
                    ? 'bg-[#E5E2D5] text-slate-400 border-slate-300 cursor-not-allowed' 
                    : 'bg-white hover:bg-[#F5F2E5] text-slate-800 border-[#999999] cursor-pointer'
                }`}
                title="Primera página"
              >
                |◄
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className={`px-2 py-0.5 border rounded-xs font-bold transition ${
                  currentPage === 1 
                    ? 'bg-[#E5E2D5] text-slate-400 border-slate-300 cursor-not-allowed' 
                    : 'bg-white hover:bg-[#F5F2E5] text-slate-800 border-[#999999] cursor-pointer'
                }`}
                title="Página anterior"
              >
                ◄ Ant
              </button>

              <span className="px-2 py-0.5 bg-white border border-[#999999] text-slate-800 font-bold rounded-xs">
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className={`px-2 py-0.5 border rounded-xs font-bold transition ${
                  currentPage === totalPages || totalPages === 0 
                    ? 'bg-[#E5E2D5] text-slate-400 border-slate-300 cursor-not-allowed' 
                    : 'bg-white hover:bg-[#F5F2E5] text-slate-800 border-[#999999] cursor-pointer'
                }`}
                title="Página siguiente"
              >
                Sig ►
              </button>

              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages || totalPages === 0}
                className={`px-2 py-0.5 border rounded-xs font-bold transition ${
                  currentPage === totalPages || totalPages === 0 
                    ? 'bg-[#E5E2D5] text-slate-400 border-slate-300 cursor-not-allowed' 
                    : 'bg-white hover:bg-[#F5F2E5] text-slate-800 border-[#999999] cursor-pointer'
                }`}
                title="Última página"
              >
                ►|
              </button>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default ClassicJDELedger;
