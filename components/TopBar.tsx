import React, { useState, useEffect, useRef } from 'react';
import { 
  LogOut, RefreshCw, Cloud, Download, ShieldCheck, Database, FileCheck, 
  HelpCircle, Activity, Sliders, Printer, FileText, Search, Check, Plus, 
  Trash2, BookOpen, ExternalLink, X, Key, BarChart3, Info, Terminal, Settings, 
  Copy, FilterX, Calculator, HardDrive
} from 'lucide-react';
import { ModuleType } from '../types';

interface TopBarProps {
  currentUser: string;
  onLogout: () => void;
  isSyncActive: boolean;
  isDbConnected: boolean;
  onShowSync: () => void;
  onUnlink: () => void;
  onReGrant: () => void;
  onConsistency: () => void;
  onAudit: () => void;
  onBackup: () => void;
  onCloudSync: () => void;
  isCloudSyncing: boolean;
  isFirebaseConnected: boolean;
  firebaseUserEmail: string | null;
  dataShowMode: 'ALL' | 'REAL_ONLY' | 'TEST_ONLY';
  onChangeDataShowMode: (mode: 'ALL' | 'REAL_ONLY' | 'TEST_ONLY') => void;
  activeModule?: ModuleType;
  setActiveModule?: (module: ModuleType) => void;
  userRole?: string;
  allowedModules?: ModuleType[];
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onOpenRecentReports?: () => void;
  onOpenP4310?: () => void;
  onOpenNewSupplier?: () => void;
  openTabs?: Array<{ id: ModuleType; code: string; title: string; formCode?: string }>;
  onSelectTab?: (id: ModuleType) => void;
  onCloseTab?: (id: ModuleType) => void;
}

// AssetFlow Enterprise Application Directory Mapping
const moduleToJdeMap: Record<string, { code: string; title: string }> = {
  'DASHBOARD': { code: 'P0000', title: 'Dashboard Principal de Activos' },
  'TAREAS': { code: 'P0001', title: 'Tareas y Flujos de Inicio' },
  'OFICIOS': { code: 'P0115', title: 'Oficios y Comunicados de Arriendo' },
  'INGRESOS': { code: 'P03B11', title: 'Ingresos y Cuentas por Cobrar (RE)' },
  'EGRESOS': { code: 'P0411', title: 'Egresos y Cuentas por Pagar (AP)' },
  'FINANZAS': { code: 'P092102', title: 'Consulta de Mayor y Balance' },
  'ORDENES': { code: 'P48201', title: 'Mantenimiento de Órdenes de Trabajo' },
  'RECEPCION_OT': { code: 'P4312', title: 'Recepción Técnica de Servicios (F4312)' },
  'PROPIEDADES': { code: 'P1501', title: 'Maestro de Unidades Inmobiliarias' },
  'SEGUROS': { code: 'P44H5004', title: 'Maestro de Pólizas de Seguro de Activos' },
  'PROVEEDORES': { code: 'P01012 / P04012', title: 'Maestro de Proveedores y Libro de Direcciones (F0101 / F0401)' },
  'REPORTE_B13': { code: 'R09321', title: 'Informe B.13 CMF (Cartera & Morosidad)' },
  'REPORTE_B4': { code: 'R09322', title: 'Informe B.4 CMF (Bienes Raíces & Inversiones)' },
  'CONCILIACION': { code: 'P09131', title: 'Conciliación Bancaria Automática' },
  'CAJA_CHICA': { code: 'P0002M', title: 'Caja Chica y Fondos Fijos' },
  'CONFIG': { code: 'P98OWSEC', title: 'Seguridad y Perfiles de Acceso' },
  'AUDITORIA': { code: 'P950000', title: 'Consola e Historial de Auditoría' },
  'BITACORA': { code: 'P0911', title: 'Diario General / Libro Diario' },
  'CUENTAS': { code: 'P0901', title: 'Definición del Plan de Cuentas' },
  'DUE_DILIGENCIA': { code: 'P01012A', title: 'Debida Diligencia de Proveedores' },
  'CONTRATOS_ARRIENDO': { code: 'P15012', title: 'Gestión de Contratos de Arriendo (F15017)' },
  'GARANTIAS': { code: 'P1540', title: 'Liquidación de Garantías de Arriendo' },
  'MANTENCIONES': { code: 'P13700', title: 'Expedientes de Mantención Real' },
  'UAF_COMPLIANCE': { code: 'P0115U', title: 'Formularios Beneficiarios Finales UAF' },
  'DEVELOPER_CONSOLE': { code: 'P980011D', title: 'Consola Interactiva del Desarrollador' },
  'SALUD_SISTEMA': { code: 'P986110', title: 'Estado del Servidor de Aplicaciones (AIS)' },
  'DUE_DILIGENCIA_CONSULTA': { code: 'P01012B', title: 'Consulta Interconectada de Proveedores' },
  'TASACIONES': { code: 'P15401', title: 'Valoración y Tasación de Activos' },
  'BOVEDA_DIGITAL': { code: 'P986110D', title: 'Bóveda de Documentos Digitales' },
  'CARGA_INTELIGENTE': { code: 'R15011Z1I', title: 'Ingesta Masiva de Activos (Excel)' },
  'REVISION_REPORTES': { code: 'P0911R', title: 'Revisión & Corrección de Lotes' },
  'PROPIEDADES_INVERSION': { code: 'M0912', title: 'Control Auxiliares (Fin de Mes)' },
  'BROCHURE': { code: 'P2026B', title: 'Brochure Comercial PDF Generador' },
  'EVALUACION_POSTULANTES': { code: 'P15013', title: 'Evaluación de Postulantes a Arriendo' },
  'CONTROLLING': { code: 'P09210', title: 'Inquiry & Financial Controlling' },
  'REVISION_PAGOS_SEMANALES': { code: 'P0411A', title: 'Auditoría Semanal de Pagos' },
  'REPORTE_MENSUAL_GASTOS': { code: 'R09325', title: 'Informe Mensual de Gastos Inmobiliarios IA' },
  'CISO_REPORT': { code: 'R09OWSEC', title: 'Informe Ejecutivo CISO (.PDF)' },
  'PROJECTS_REPORT': { code: 'R09OWPRJ', title: 'Propuesta de Innovación y Proyectos' },
  'SOLICITUDES': { code: 'P18500', title: 'Solicitudes de Mantenimiento de Inquilinos' },
  'MANUAL_USUARIO': { code: 'P0000A', title: 'Manual de Usuario y Ayuda ERP' },
  'CERTIFICADOS_DOMINIO': { code: 'P1505', title: 'Certificados de Dominio de Conservador' },
  'MAPA_DATOS_LEGAL': { code: 'R09OWDAT', title: 'Mapa de Datos de Ley 21696 (Datos Personales)' },
  'CASH_FLOW_RUNWAY': { code: 'P09220', title: 'Cash Flow Runway Consolidador' },
  'LIBROS_AUXILIARES': { code: 'P0912AUX', title: 'Módulo de Libros Auxiliares Contables' },
  'BENFORD_ANALYSIS': { code: 'P09BEN', title: 'Análisis de Ley de Benford (Auditoría Forense)' },
  'REVISION_PROPIEDADES': { code: 'P1501RV', title: 'Revisión Física de Unidades (Actas)' },
  'CICLO_VIDA': { code: 'P1501CV', title: 'Ciclo de Vida de Arriendos AssetFlow' },
  'HISTORIAL_ARRIENDOS': { code: 'P1501HA', title: 'Historial & Comportamiento de Pago de Arrendatarios' },
  'REGISTRO_PAGOS': { code: 'P03B20', title: 'Módulo de Registro de Pagos, Tesorería y Comprobantes' },
  'FACTURACION_DTE': { code: 'P4210DTE', title: 'Facturación Electrónica DTE & Exenciones D.L. 825 Art. 8g' },
  'IMPUESTOS_F29_F22': { code: 'P029F22', title: 'Módulo de Declaración de Impuestos F29 / F22 SII' },
  'BUSQUEDA_EMPLEO': { code: 'P09OWJOB', title: 'Búsqueda de Empleo Chile & Match CV' },
  'RUTAS_APROBACION': { code: 'P43008', title: 'Rutas Jerárquicas de Aprobación ERP (F43008)' },
  'APROBACIONES_JDE': { code: 'P43081 / P43280', title: 'Centro de Aprobaciones de OT / OC (F4209 / F43092)' },
  'CENTRO_DESPACHO': { code: 'P0115M', title: 'Centro de Despacho & Correos Automatizados Gmail' },
  'LOGISTICA_WMS': { code: 'P4600', title: 'Logística & Gestión de Almacenes WMS (Extra Item)' }
};

// Map of codes to modules for fast path support
const fastPathMap: Record<string, ModuleType> = {
  'p0115m': 'CENTRO_DESPACHO',
  'email': 'CENTRO_DESPACHO',
  'correo': 'CENTRO_DESPACHO',
  'correos': 'CENTRO_DESPACHO',
  'gmail': 'CENTRO_DESPACHO',
  'despacho': 'CENTRO_DESPACHO',
  'p43008': 'RUTAS_APROBACION',
  'rutas': 'RUTAS_APROBACION',
  'aprobaciones': 'APROBACIONES_JDE',
  'aprobacion': 'APROBACIONES_JDE',
  'p43280': 'APROBACIONES_JDE',
  'f4209': 'APROBACIONES_JDE',
  'f43092': 'APROBACIONES_JDE',
  'p4310': 'ORDENES',
  'oc': 'ORDENES',
  'p43214': 'CONSULTAS_JDE',
  'p43081': 'APROBACIONES_JDE',
  'p042004': 'CONSULTAS_JDE',
  'p09200': 'CONSULTAS_JDE',
  'consultas': 'CONSULTAS_JDE',
  'consultasjde': 'CONSULTAS_JDE',
  'inquiry': 'CONSULTAS_JDE',
  'solicitud': 'SOLICITUDES',
  'p4310sq': 'SOLICITUDES',
  'p4210dte': 'FACTURACION_DTE',
  'dte': 'FACTURACION_DTE',
  'factura': 'FACTURACION_DTE',
  'facturas': 'FACTURACION_DTE',
  'facturacion': 'FACTURACION_DTE',
  'exencion': 'FACTURACION_DTE',
  'dl825': 'FACTURACION_DTE',
  'p09owjob': 'BUSQUEDA_EMPLEO',
  'empleo': 'BUSQUEDA_EMPLEO',
  'empleos': 'BUSQUEDA_EMPLEO',
  'trabajo': 'BUSQUEDA_EMPLEO',
  'trabajos': 'BUSQUEDA_EMPLEO',
  'matchcv': 'BUSQUEDA_EMPLEO',
  'p029f22': 'IMPUESTOS_F29_F22',
  'f29': 'IMPUESTOS_F29_F22',
  'f22': 'IMPUESTOS_F29_F22',
  'impuestos': 'IMPUESTOS_F29_F22',
  'p0911': 'CONTABILIDAD_JDE',
  'p09216': 'CONTABILIDAD_JDE',
  'p09801': 'CONTABILIDAD_JDE',
  'contabilidad': 'CONTABILIDAD_JDE',
  'contabilidadjde': 'CONTABILIDAD_JDE',
  'diario': 'BITACORA',
  'p03b11': 'INGRESOS',
  'cobros': 'INGRESOS',
  'cobro': 'INGRESOS',
  'cobranza': 'INGRESOS',
  'cobranzas': 'INGRESOS',
  'cuentasporcobrar': 'INGRESOS',
  'cxc': 'INGRESOS',
  'r15132': 'CONTRATOS_ARRIENDO',
  'p15012b': 'CONTRATOS_ARRIENDO',
  'p03b20': 'REGISTRO_PAGOS',
  'pagos': 'REGISTRO_PAGOS',
  'recaudacion': 'REGISTRO_PAGOS',
  'recaudaciones': 'REGISTRO_PAGOS',
  'comprobantes': 'REGISTRO_PAGOS',
  'p0411': 'EGRESOS',
  'p0411a': 'REVISION_PAGOS_SEMANALES',
  'p092102': 'FINANZAS',
  'p0912aux': 'LIBROS_AUXILIARES',
  'libros': 'LIBROS_AUXILIARES',
  'p09210': 'CONTROLLING',
  'p09220': 'CASH_FLOW_RUNWAY',
  'cashflow': 'CASH_FLOW_RUNWAY',
  'runway': 'CASH_FLOW_RUNWAY',
  'p0002m': 'CAJA_CHICA',
  'p09131': 'CONCILIACION',
  'p0901': 'CUENTAS',
  'p48201': 'ORDENES',
  'p4312': 'RECEPCION_OT',
  'f4312': 'RECEPCION_OT',
  'recepcion': 'RECEPCION_OT',
  'recepciones': 'RECEPCION_OT',
  'p13700': 'MANTENCIONES',
  'p18500': 'SOLICITUDES',
  'p1501': 'PROPIEDADES',
  'p1505': 'CERTIFICADOS_DOMINIO',
  'r15011z1i': 'CARGA_INTELIGENTE',
  'p15012': 'CONTRATOS_ARRIENDO',
  'm0912': 'PROPIEDADES_INVERSION',
  'p15012a': 'PROPIEDADES_INVERSION',
  'p15013': 'EVALUACION_POSTULANTES',
  'p1540': 'GARANTIAS',
  'p15401': 'TASACIONES',
  'p44h5004': 'SEGUROS',
  'p17500': 'HELPDESK',
  'p0115': 'OFICIOS',
  'p986110d': 'BOVEDA_DIGITAL',
  'p01012': 'PROVEEDORES',
  'f0101': 'PROVEEDORES',
  'f0401': 'PROVEEDORES',
  'proveedores': 'PROVEEDORES',
  'libro de direcciones': 'PROVEEDORES',
  'maestro de proveedores': 'PROVEEDORES',
  'p04012': 'PROVEEDORES',
  'p01012a': 'DUE_DILIGENCIA',
  'p01012b': 'DUE_DILIGENCIA_CONSULTA',
  'p0115u': 'UAF_COMPLIANCE',
  'beneficiarios': 'UAF_COMPLIANCE',
  'r09321': 'REPORTE_B13',
  'b13': 'REPORTE_B13',
  'b.13': 'REPORTE_B13',
  'reporteb13': 'REPORTE_B13',
  'informeb13': 'REPORTE_B13',
  'r09322': 'REPORTE_B4',
  'b4': 'REPORTE_B4',
  'b.4': 'REPORTE_B4',
  'reporteb4': 'REPORTE_B4',
  'informeb4': 'REPORTE_B4',
  'bienesraices': 'REPORTE_B4',
  'inversiones': 'REPORTE_B4',
  'p0911r': 'REVISION_REPORTES',
  'r09314': 'NOTA_14',
  'r09325': 'REPORTE_MENSUAL_GASTOS',
  'p986110': 'SALUD_SISTEMA',
  'p950000': 'AUDITORIA',
  'p98owsec': 'CONFIG',
  'p980011d': 'DEVELOPER_CONSOLE',
  'tareas': 'TAREAS',
  'inicio': 'TAREAS',
  'p0000': 'DASHBOARD',
  'dashboard': 'DASHBOARD',
  'principal': 'DASHBOARD',
  'brochure': 'BROCHURE',
  'p2026b': 'BROCHURE',
  'r09owprj': 'PROJECTS_REPORT',
  'p21696': 'MAPA_DATOS_LEGAL',
  'p0000a': 'MANUAL_USUARIO',
  'manual': 'MANUAL_USUARIO',
  'ayuda': 'MANUAL_USUARIO',
  'benford': 'BENFORD_ANALYSIS',
  'p09ben': 'BENFORD_ANALYSIS',
  'ciclo': 'CICLO_VIDA',
  'ciclovida': 'CICLO_VIDA',
  'p1501cv': 'CICLO_VIDA',
  'revision': 'REVISION_PROPIEDADES',
  'p1501rv': 'REVISION_PROPIEDADES',
  'historialarriendos': 'HISTORIAL_ARRIENDOS',
  'p1501ha': 'HISTORIAL_ARRIENDOS',
  'comportamiento': 'HISTORIAL_ARRIENDOS',
  'pagoarrendatarios': 'HISTORIAL_ARRIENDOS',
  'ot': 'ORDENES',
  'ots': 'ORDENES',
  'f4801': 'ORDENES',
  'f0911': 'BITACORA',
  'f0411': 'EGRESOS',
  'f03b11': 'INGRESOS',
  'f1501': 'PROPIEDADES',
  'f15017': 'CONTRATOS_ARRIENDO',
  'contratos': 'CONTRATOS_ARRIENDO',
  'proveedor': 'PROVEEDORES',
  'propiedad': 'PROPIEDADES',
  'propiedades': 'PROPIEDADES',
  'banco': 'CONCILIACION',
  'bancos': 'CONCILIACION',
  'cartola': 'CONCILIACION',
  'mayor': 'FINANZAS',
  'balance': 'FINANZAS',
  'sox': 'AUDITORIA',
  'ciso': 'CISO_REPORT',
  'seguro': 'SEGUROS',
  'seguros': 'SEGUROS',
  'polizas': 'SEGUROS',
  'gastos': 'REPORTE_MENSUAL_GASTOS',
  'dictamen': 'CONTROLLING',
  'jde': 'CONTROLLING',
  'corporativo': 'CONTROLLING',
  'plagio': 'CONTROLLING',
  'wms': 'LOGISTICA_WMS',
  'logistica': 'LOGISTICA_WMS',
  'bodega': 'LOGISTICA_WMS',
  'bodegas': 'LOGISTICA_WMS',
  'almacen': 'LOGISTICA_WMS',
  'inventario': 'LOGISTICA_WMS',
  'lpn': 'LOGISTICA_WMS',
  'putaway': 'LOGISTICA_WMS',
  'picking': 'LOGISTICA_WMS',
  'cardex': 'LOGISTICA_WMS',
  'kardex': 'LOGISTICA_WMS',
  'p4600': 'LOGISTICA_WMS',
  'p4101': 'LOGISTICA_WMS',
  'p4611': 'LOGISTICA_WMS',
  'p4114': 'LOGISTICA_WMS',
  'p4915': 'LOGISTICA_WMS',
  'p4100': 'LOGISTICA_WMS',
  'f4101': 'LOGISTICA_WMS',
  'f41021': 'LOGISTICA_WMS',
  'f4611': 'LOGISTICA_WMS',
  'f4111': 'LOGISTICA_WMS',
  'f4915': 'LOGISTICA_WMS'
};

const JDE_MENU_AREAS = [
  {
    id: 'general',
    label: '1. General & Sistema',
    items: [
      { id: 'DASHBOARD', label: 'Dashboard Principal de Activos', code: 'P0000' },
      { id: 'TAREAS', label: 'Tareas y Flujos de Inicio', code: 'P0001' },
      { id: 'CICLO_VIDA', label: 'Ciclo de Vida de Arriendos', code: 'P1501CV' },
      { id: 'BOVEDA_DIGITAL', label: 'Bóveda de Documentos Digitales', code: 'P986110D' },
      { id: 'BROCHURE', label: 'Generador de Brochure Comercial PDF', code: 'P2026B' },
      { id: 'MANUAL_USUARIO', label: 'Manual de Usuario y Ayuda ERP', code: 'P0000A' },
      { id: 'BITACORA', label: 'Libro Diario / Diario General', code: 'P0911' },
      { id: 'CENTRO_DESPACHO', label: 'Centro de Despacho & Correos Automatizados Gmail', code: 'P0115M' },
    ]
  },
  {
    id: 'finanzas',
    label: '2. Contabilidad General (Finance)',
    items: [
      { id: 'CONTABILIDAD_JDE', label: 'Contabilidad General ERP (P0911 / P09216)', code: 'P0911' },
      { id: 'INGRESOS', label: 'Módulo de Ingresos & Cobros (Cuentas por Cobrar RE)', code: 'P03B11' },
      { id: 'FACTURACION_DTE', label: 'Facturación DTE & Exenciones DL 825 (Art. 8g)', code: 'P4210DTE' },
      { id: 'REGISTRO_PAGOS', label: 'Registro de Pagos, Cobros & Comprobantes Arriendo', code: 'P03B20' },
      { id: 'EGRESOS', label: 'Módulo de Egresos (Cuentas por Pagar)', code: 'P0411' },
      { id: 'FINANZAS', label: 'Consultas de Mayor de Cuentas', code: 'P092102' },
      { id: 'LIBROS_AUXILIARES', label: 'Módulo de Libros Auxiliares', code: 'P0912AUX' },
      { id: 'CONTROLLING', label: 'Inquiry & Financial Controlling', code: 'P09210' },
      { id: 'CASH_FLOW_RUNWAY', label: 'Cash Flow Runway Consolidador', code: 'P09220' },
      { id: 'CAJA_CHICA', label: 'Caja Chica y Fondos Fijos', code: 'P0002M' },
      { id: 'CONCILIACION', label: 'Conciliación Bancaria', code: 'P09131' },
      { id: 'CUENTAS', label: 'Definición Plan De Cuentas', code: 'P0901' },
    ]
  },
  {
    id: 'operaciones',
    label: '3. Gestión Inmobiliaria & Activos',
    items: [
      { id: 'ORDENES', label: 'Mantenimiento Órdenes de Trabajo', code: 'P48201' },
      { id: 'APROBACIONES_JDE', label: 'Aprobaciones de OT / OC (JDE 9.11)', code: 'P43081' },
      { id: 'RECEPCION_OT', label: 'Recepción Técnica de OTs (F4312)', code: 'P4312' },
      { id: 'MANTENCIONES', label: 'Expedientes de Mantención Real', code: 'P13700' },
      { id: 'SOLICITUDES', label: 'Solicitudes de Mantención de Inquilino', code: 'P18500' },
      { id: 'PROPIEDADES', label: 'Maestro de Unidades Inmobiliarias', code: 'P1501' },
      { id: 'CERTIFICADOS_DOMINIO', label: 'Certificados de Dominio Conservador', code: 'P1505' },
      { id: 'CARGA_INTELIGENTE', label: 'Ingesta de Activos (Excel)', code: 'R15011Z1I' },
      { id: 'EVALUACION_POSTULANTES', label: 'Evaluación de Postulantes', code: 'P15013' },
      { id: 'CONTRATOS_ARRIENDO', label: 'Gestión de Contratos de Arriendo', code: 'P15012' },
      { id: 'HISTORIAL_ARRIENDOS', label: 'Historial & Comportamiento de Pago Arrendatarios', code: 'P1501HA' },
      { id: 'REVISION_PROPIEDADES', label: 'Revisión Física de Unidades (Actas)', code: 'P1501RV' },
      { id: 'PROPIEDADES_INVERSION', label: 'Control Auxiliares (Fin de Mes)', code: 'M0912' },
      { id: 'GARANTIAS', label: 'Liquidación de Garantías de Arriendo', code: 'P1540' },
      { id: 'TASACIONES', label: 'Valoración y Tasaciones Activo', code: 'P15401' },
      { id: 'SEGUROS', label: 'Maestro Pólizas de Seguro Activo', code: 'P44H5004' },
      { id: 'HELPDESK', label: 'Centro Atención Help Desk Soporte', code: 'P17500' },
      { id: 'OFICIOS', label: 'Módulo Oficios y Comunicados', code: 'P0115' },
    ]
  },
  {
    id: 'proveedores',
    label: '4. Compras & Proveedores',
    items: [
      { id: 'PROVEEDORES', label: 'Maestro de Proveedores / Libro de Direcciones', code: 'P01012 / P04012' },
      { id: 'APROBACIONES_JDE', label: 'Aprobaciones de OT / OC (JDE 9.11)', code: 'P43081 / P43280' },
      { id: 'DUE_DILIGENCIA', label: 'Debida Diligencia Proveedores', code: 'P01012A' },
      { id: 'DUE_DILIGENCIA_CONSULTA', label: 'Consulta General e Interconectada', code: 'P01012B' },
      { id: 'UAF_COMPLIANCE', label: 'Formularios Beneficiarios Finales UAF', code: 'P0115U' },
      { id: 'REVISION_PAGOS_SEMANALES', label: 'Auditoría Semanal de Pagos', code: 'P0411A' },
    ]
  },
  {
    id: 'reportes',
    label: '5. Informes de Cierre & Gobierno',
    items: [
      { id: 'REPORTE_B13', label: 'Generación Planilla Reguladora B13', code: 'R09321' },
      { id: 'REPORTE_B4', label: 'Estructuración Reporte B4', code: 'R09322' },
      { id: 'CISO_REPORT', label: 'Informe Ejecutivo CISO (.PDF)', code: 'R09OWSEC' },
      { id: 'MAPA_DATOS_LEGAL', label: 'Mapa de Datos de Ley 21696', code: 'R09OWDAT' },
      { id: 'PROJECTS_REPORT', label: 'Propuesta Completa / Beneficios de Innovación', code: 'R09OWPRJ' },
      { id: 'REVISION_REPORTES', label: 'Revisión & Corrección de Lotes', code: 'P0911R' },
      { id: 'REPORTE_MENSUAL_GASTOS', label: 'Informe Gastos Mensual Inmobiliario IA', code: 'R09325' },
      { id: 'NOTA_14', label: 'Formulación Estados Financieros N14', code: 'R09314' },
      { id: 'BENFORD_ANALYSIS', label: 'Análisis de Ley de Benford', code: 'P09BEN' },
      { id: 'WSJ_REPORTS', label: 'Trabajar con Trabajos Enviados (WSJ) - Informes Recientes', code: 'P986110B' },
    ]
  },
  {
    id: 'sistema',
    label: '6. Seguridad & Parámetros Base',
    items: [
      { id: 'SALUD_SISTEMA', label: 'Estado del Servidor de Aplicaciones', code: 'P986110' },
      { id: 'AUDITORIA', label: 'Consola Historial Auditorías Log', code: 'P950000' },
      { id: 'CONFIG', label: 'Seguridad Acceso Perfiles Canales', code: 'P98OWSEC' },
      { id: 'RUTAS_APROBACION', label: 'Rutas Jerárquicas de Aprobación (P43008)', code: 'P43008' },
      { id: 'DEVELOPER_CONSOLE', label: 'Consola Interactiva Developer', code: 'P980011D' },
    ]
  },
  {
    id: 'extra_logistica',
    label: '7. Extra Item: Logística & WMS (Independiente)',
    items: [
      { id: 'LOGISTICA_WMS', label: 'Logística & Gestión de Almacenes WMS (P4600 / F4611)', code: 'P4600' },
    ]
  }
];

type TopMenuId = 'NAV' | 'FILE' | 'EDIT' | 'VIEW' | 'FORM' | 'ROW' | 'REPORT' | 'TOOLS' | 'HELP' | null;

const TopBar: React.FC<TopBarProps> = ({
  currentUser,
  onLogout,
  isSyncActive,
  isDbConnected,
  onShowSync,
  onUnlink,
  onReGrant,
  onConsistency,
  onAudit,
  onBackup,
  onCloudSync,
  isCloudSyncing,
  isFirebaseConnected,
  firebaseUserEmail,
  dataShowMode,
  onChangeDataShowMode,
  activeModule = 'DASHBOARD',
  setActiveModule,
  userRole,
  allowedModules,
  isSidebarCollapsed = false,
  onToggleSidebar,
  onOpenRecentReports,
  onOpenP4310,
  onOpenNewSupplier,
  openTabs,
  onSelectTab,
  onCloseTab
}) => {
  const [fastPathValue, setFastPathValue] = useState('');
  const [fastPathError, setFastPathError] = useState(false);
  const [activeTopMenu, setActiveTopMenu] = useState<TopMenuId>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>('general');
  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [showAboutDialog, setShowAboutDialog] = useState(false);
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false);
  const [toolbarDropdown, setToolbarDropdown] = useState<'FORM' | 'ROW' | null>(null);
  
  const menuContainerRef = useRef<HTMLDivElement>(null);

  const showFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => {
      setActionFeedback(prev => prev === msg ? null : prev);
    }, 2800);
  };

  const handleOpenRecentReports = () => {
    if (onOpenRecentReports) {
      onOpenRecentReports();
    } else {
      window.dispatchEvent(new CustomEvent('jde:open-recent-reports'));
    }
    showFeedback('Abriendo Trabajar con Trabajos Enviados (WSJ - P986110B)');
    setActiveTopMenu(null);
    setToolbarDropdown(null);
  };

  // Close menus on click outside & keyboard shortcuts
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (target && !document.body.contains(target)) return;
      if (menuContainerRef.current && !menuContainerRef.current.contains(target)) {
        setActiveTopMenu(null);
        setToolbarDropdown(null);
        setMenuSearchQuery('');
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveTopMenu(null);
        setToolbarDropdown(null);
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'j') {
        event.preventDefault();
        handleOpenRecentReports();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onOpenRecentReports]);

  // Active module properties
  const activeInfo = moduleToJdeMap[activeModule] || { code: 'P0000', title: 'Panel de Control ERP' };

  // Category determination for active module
  const currentCategoryLabel = React.useMemo(() => {
    for (const area of JDE_MENU_AREAS) {
      if (area.items.some(item => item.id === activeModule)) {
        return area.label.replace(/^\d+\.\s*/, '');
      }
    }
    return 'Gestión de Activos & Contabilidad';
  }, [activeModule]);

  const effectiveMenuAreas = React.useMemo(() => {
    if (userRole === 'SOLO_EMPLEO') {
      return [
        {
          id: 'empleo',
          label: '💼 Portal Laboral & Empleo',
          items: [
            { id: 'BUSQUEDA_EMPLEO', label: 'Búsqueda de Empleo Chile & Match CV', code: 'P09OWJOB' }
          ]
        }
      ];
    }
    if (!allowedModules) return JDE_MENU_AREAS;
    return JDE_MENU_AREAS
      .map(area => ({
        ...area,
        items: area.items.filter(item => allowedModules.includes(item.id as ModuleType))
      }))
      .filter(area => area.items.length > 0);
  }, [userRole, allowedModules]);

  // Flattened items for fast searching within the menu
  const searchResults = React.useMemo(() => {
    if (!menuSearchQuery.trim()) return [];
    const q = menuSearchQuery.trim().toLowerCase();
    const results: { id: string; label: string; code: string; areaLabel: string }[] = [];
    for (const area of effectiveMenuAreas) {
      for (const item of area.items) {
        if (
          item.label.toLowerCase().includes(q) ||
          item.code.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q)
        ) {
          results.push({
            ...item,
            areaLabel: area.label.replace(/^\d+\.\s*/, '')
          });
        }
      }
    }
    return results;
  }, [menuSearchQuery, effectiveMenuAreas]);

  const handleTopFastPathSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!setActiveModule) return;
    
    const code = fastPathValue.trim().toLowerCase();

    // Fast Path to Recent Reports (WSJ - P986110B)
    if (code === 'wsj' || code === 'p986110b' || code === 'p986110' || code === 'informes' || code === 'reportes' || code === 'jobs' || code === 'ube') {
      handleOpenRecentReports();
      setFastPathError(false);
      setFastPathValue('');
      return;
    }

    if (userRole === 'SOLO_EMPLEO') {
      if (code === 'p09owjob' || code === 'empleo' || code === 'empleos' || code === 'trabajo' || code === 'trabajos' || code === 'matchcv') {
        setActiveModule('BUSQUEDA_EMPLEO');
        setFastPathError(false);
        setFastPathValue('');
        showFeedback('Acceso rápido: P09OWJOB');
      } else {
        setFastPathError(true);
        setTimeout(() => setFastPathError(false), 2000);
      }
      return;
    }

    if (fastPathMap[code]) {
      const dest = fastPathMap[code];
      if (allowedModules && !allowedModules.includes(dest)) {
        setFastPathError(true);
        setTimeout(() => setFastPathError(false), 2000);
        return;
      }
      setActiveModule(dest);
      setFastPathError(false);
      setFastPathValue('');
      const destInfo = moduleToJdeMap[dest];
      showFeedback(`Acceso rápido: ${destInfo?.code || dest}`);
    } else {
      setFastPathError(true);
      setTimeout(() => setFastPathError(false), 2000);
    }
  };

  // Top Menu Handlers
  const handleDispatch = (eventName: string, detailMsg: string) => {
    window.dispatchEvent(new CustomEvent(eventName, { detail: { module: activeModule } }));
    showFeedback(detailMsg);
    setActiveTopMenu(null);
  };

  const handleToolbarFind = () => handleDispatch('jde:find', `🔍 Búsqueda / Re-Query actualizada (${activeInfo.code})`);
  const handleToolbarSelect = () => handleDispatch('jde:select', `✓ Fila seleccionada (${activeInfo.code})`);
  const handleToolbarNew = () => {
    if (onOpenNewSupplier && ['PROVEEDORES', 'DUE_DILIGENCIA', 'DUE_DILIGENCIA_CONSULTA', 'UAF_COMPLIANCE'].includes(activeModule)) {
      onOpenNewSupplier();
    }
    handleDispatch('jde:new', `➕ Nuevo Registro (${activeInfo.code})`);
  };
  const handleToolbarSave = () => handleDispatch('jde:save', `💾 Registro Guardado (${activeInfo.code})`);
  const handleToolbarExport = () => handleDispatch('jde:export', `📊 Exportando Grilla a Excel (.xlsx)`);
  const handleToolbarPrint = () => handleDispatch('jde:print', `🖨️ Imprimiendo Formulario / Cuadrícula`);
  const handleToolbarClearQBE = () => handleDispatch('jde:clear_qbe', `🧹 Filtros QBE Limpiados`);
  const handleToolbarSelectAll = () => handleDispatch('jde:select_all', `☑️ Todas las filas seleccionadas`);

  const handleToolbarClose = () => {
    setActiveTopMenu(null);
    onLogout();
  };

  const toggleMenu = (menuId: TopMenuId) => {
    setActiveTopMenu(prev => prev === menuId ? null : menuId);
  };

  const hoverMenu = (menuId: TopMenuId) => {
    if (activeTopMenu !== null && activeTopMenu !== menuId) {
      setActiveTopMenu(menuId);
    }
  };

  return (
    <div ref={menuContainerRef} data-jde-topbar className="flex flex-col select-none z-[120] no-print font-sans shadow-xs relative overflow-visible">
      
      {/* Dynamic Action Feedback Pill */}
      {actionFeedback && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-[1050] bg-[#002D62] text-[#FFCC00] border border-[#FFCC00] text-[10.5px] font-mono font-bold px-3 py-1 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200 flex items-center gap-1.5 rounded-none pointer-events-none">
          <span>⚙️</span>
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* 
        ========================================================================
        ROW 1: ASSETFLOW ENTERPRISE GLOBAL BRAND BAR
        ========================================================================
      */}
      <div className="h-10 bg-white border-b border-[#D2DFEC] px-3 md:px-4 flex items-center justify-between flex-nowrap min-w-0 text-slate-800 relative z-30 overflow-visible">
        
        {/* Left: Authentic AssetFlow Enterprise Branding */}
        <div className="flex items-center gap-2.5 shrink-0 min-w-0">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="no-jde-override px-2 py-1 bg-[#F4F8FB] hover:bg-[#E2EDF8] border border-[#A2BCCF] rounded-xs text-[#002D62] transition-colors cursor-pointer flex items-center gap-1 text-[10.5px] font-bold shadow-3xs"
              title={isSidebarCollapsed ? "Mostrar Navegador ERP" : "Ocultar Navegador ERP"}
            >
              <span className="text-xs">📁</span>
              <span className="hidden sm:inline font-mono text-[10px] tracking-tight">Navegador</span>
            </button>
          )}

          <div className="flex items-center gap-1.5 shrink-0">
            <span className="bg-[#C74634] text-white px-1.5 py-0.5 rounded-xs font-black text-[9.5px] tracking-widest font-sans uppercase shadow-3xs">
              ORACLE
            </span>
            <span className="text-[#002D62] font-black tracking-tight text-[13.5px] md:text-[15.5px] font-sans">
              JD Edwards EnterpriseOne
            </span>
            <span className="h-3.5 w-[1px] bg-slate-300 mx-1 hidden sm:inline"></span>
            <span className="text-[#4A5568] font-sans text-xs md:text-[12px] tracking-tight font-bold hidden sm:inline">
              AssetFlow Suite Inmobiliaria &amp; Finanzas
            </span>
            <span className="bg-[#EBF1F6] text-[#002D62] border border-[#A2BCCF] px-1.5 py-0.2 rounded-xs text-[8.5px] font-mono font-black uppercase tracking-wider hidden lg:inline">
              E1 9.2
            </span>
          </div>
        </div>

        {/* Center: Authentic ERP Fast Path Box */}
        {setActiveModule && (
          <form onSubmit={handleTopFastPathSubmit} className="hidden md:flex items-center gap-1.5 mx-2 bg-[#F8FAFC] border border-[#A2BCCF] rounded-xs px-2 py-0.5 transition-all focus-within:border-[#005B94] focus-within:bg-[#FFFFE1] shadow-3xs">
            <span className="text-[9.5px] font-bold text-[#005B94] font-mono uppercase tracking-tight select-none">
              Acceso rápido:
            </span>
            <input 
              type="text"
              value={fastPathValue}
              onChange={(e) => setFastPathValue(e.target.value)}
              placeholder="P0911, P48201, P4210DTE..."
              className={`bg-transparent border-none text-[10.5px] text-[#002D62] font-mono font-bold uppercase focus:outline-none w-32 p-0 tracking-wider placeholder:text-slate-400 ${fastPathError ? 'text-rose-600 font-black' : ''}`}
            />
            <button 
              type="submit" 
              className="no-jde-override bg-[#E5EDF4] hover:bg-[#D2DFEC] text-[#005B94] px-1.5 py-0.2 rounded-xs font-mono font-black text-[9px] border border-[#9DB2C3] transition-colors cursor-pointer"
            >
              Ir
            </button>
          </form>
        )}

        {/* P4310 Fast Shortcut Button */}
        {onOpenP4310 && (
          <button 
            type="button" 
            onClick={onOpenP4310} 
            className="no-jde-override hidden lg:flex items-center gap-1.5 bg-[#FFF0B3] hover:bg-[#FFE580] text-[#002D62] px-2.5 py-1 rounded border border-[#D4B106] font-mono font-black text-[10px] uppercase shadow-xs transition-all cursor-pointer shrink-0 ml-1"
            title="P4310 - Emisión de Órdenes de Compra y Solicitudes ERP (Catálogo F4101)"
          >
            <span className="bg-[#002D62] text-white px-1 py-0.2 rounded text-[8px]">P4310</span>
            <span>Emisión OC / Solicitud</span>
          </button>
        )}

        {/* P01012 / P04012 Nuevo Proveedor Fast Shortcut Button */}
        {onOpenNewSupplier && (
          <button 
            type="button" 
            onClick={onOpenNewSupplier} 
            className="no-jde-override hidden md:flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded border border-emerald-700 font-mono font-black text-[10px] uppercase shadow-xs transition-all cursor-pointer shrink-0 ml-1"
            title="P01012 / P04012 - Crear Nuevo Proveedor en Libro de Direcciones (F0101) y Maestro de Proveedores (F0401)"
          >
            <span className="bg-emerald-900 text-emerald-200 px-1 py-0.2 rounded text-[8px]">P01012</span>
            <span>+ Nuevo Proveedor</span>
          </button>
        )}

        {/* P09OWJOB Búsqueda de Empleo Fast Shortcut Button */}
        {setActiveModule && (!allowedModules || allowedModules.includes('BUSQUEDA_EMPLEO')) && (
          <button 
            type="button" 
            onClick={() => setActiveModule('BUSQUEDA_EMPLEO')} 
            className="no-jde-override hidden sm:flex items-center gap-1.5 bg-gradient-to-r from-amber-100 to-amber-200 hover:from-amber-200 hover:to-amber-300 text-[#002D62] px-2.5 py-1 rounded border border-amber-400 font-mono font-black text-[10px] uppercase shadow-xs transition-all cursor-pointer shrink-0 ml-1"
            title="P09OWJOB - Portal de Búsqueda de Empleo Chile & Match CV"
          >
            <span className="bg-amber-700 text-white px-1 py-0.2 rounded text-[8px] font-black">P09OWJOB</span>
            <span>Empleo & CV</span>
          </button>
        )}

        {/* Right: Environment, User, Tools and Logout */}
        <div className="flex items-center gap-2 md:gap-3 shrink-0 ml-auto text-[10px] font-sans text-[#005B94]">
          <div className="hidden xl:flex items-center gap-2 text-[10px]">
            <span className="text-slate-600">Compañía <strong className="text-[#002D62] font-mono">[00001]</strong></span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600">Entorno <strong className="text-[#002D62] font-mono">[JD910_PD]</strong></span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600">Rol <strong className="text-[#002D62] font-mono">[{userRole || '*ALL'}]</strong></span>
            <span className="text-slate-300">|</span>
          </div>

          <div className="flex items-center gap-1.5 font-medium text-slate-700">
            <span className="hidden sm:inline text-slate-500">Usuario:</span>
            <strong className="text-[#002D62] font-bold max-w-[120px] truncate" title={currentUser}>
              {currentUser}
            </strong>
          </div>

          <span className="text-slate-300 hidden sm:inline">|</span>

          <button 
            onClick={onLogout} 
            title="Cerrar la sesión del sistema AssetFlow Enterprise"
            className="no-jde-override hover:underline cursor-pointer font-bold text-rose-700 flex items-center gap-1 text-[10px] uppercase font-mono tracking-tight"
          >
            [ Desconexión ]
          </button>
        </div>
      </div>

      {/* 
        ========================================================================
        ROW 2: ASSETFLOW ENTERPRISE TOP MENU BAR (#005B94)
        ========================================================================
      */}
      <div className="h-9 bg-[#005B94] text-white px-2 md:px-3 border-b border-[#004B7B] shrink-0 flex items-center justify-between gap-1 text-[11px] font-sans select-none relative z-50 overflow-visible">
        
        {/* Navigation Menus Bar */}
        <div className="flex items-center gap-0.5 min-w-0 flex-1 overflow-visible">
          
          {/* 1. Cascading Menu Trigger: Menús AssetFlow Enterprise*/}
          <div className="relative shrink-0">
            <button
              onClick={() => toggleMenu('NAV')}
              onMouseEnter={() => hoverMenu('NAV')}
              className={`no-jde-override jde-menu-btn ${
                activeTopMenu === 'NAV'
                  ? 'jde-menu-btn-active'
                  : 'bg-[#004B7B] hover:bg-[#003B66] text-white border-[#003B66]'
              }`}
            >
              <span>📁 Menús AssetFlow</span>
              <span className="text-amber-300 text-[8px] ml-0.5">{activeTopMenu === 'NAV' ? '▲' : '▼'}</span>
            </button>

            {/* Cascading Task Index Dropdown */}
            {activeTopMenu === 'NAV' && (
              <div className="absolute left-0 top-full mt-0.5 w-80 md:w-96 bg-white border border-[#002D62] shadow-2xl rounded-none font-sans py-1 text-xs select-none z-[9999] text-slate-800 animate-in fade-in duration-75">
                <div className="bg-[#002D62] text-[#FFCC00] font-black uppercase text-[10px] tracking-widest px-3 py-2 border-b border-[#001B3B] flex items-center justify-between">
                  <span>Navegador AssetFlow Enterprise</span>
                  <span className="text-[8px] font-mono text-slate-300">[SUITE INMOBILIARIA & FINANZAS]</span>
                </div>

                {/* Instant Program Search Filter Box */}
                <div className="p-2 bg-[#F4F8FB] border-b border-slate-200">
                  <input
                    type="text"
                    value={menuSearchQuery}
                    onChange={(e) => setMenuSearchQuery(e.target.value)}
                    placeholder="Filtrar tarea o código (ej: P0911, OT, Bancos, DTE)..."
                    className="w-full px-2.5 py-1 bg-white border border-[#A2BCCF] text-xs font-medium text-slate-800 focus:outline-none focus:border-[#005B94] focus:bg-[#FFFFE1] placeholder:text-slate-400 rounded-none shadow-inner"
                    autoFocus
                  />
                </div>
                
                {/* Search Results Mode */}
                {menuSearchQuery.trim() ? (
                  <div className="max-h-[360px] overflow-y-auto custom-scrollbar">
                    {searchResults.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500 font-mono">
                        No se encontraron aplicaciones con "{menuSearchQuery}"
                      </div>
                    ) : (
                      searchResults.map((item) => (
                        <div
                          key={item.id}
                          className="px-3 py-2 hover:bg-[#FFFCDD] hover:text-[#002D62] cursor-pointer flex items-center justify-between transition-all border-b border-slate-100"
                          onClick={() => {
                            if (item.id === 'WSJ_REPORTS') {
                              handleOpenRecentReports();
                              setActiveTopMenu(null);
                              setMenuSearchQuery('');
                              return;
                            }
                            if (setActiveModule) {
                              setActiveModule(item.id as ModuleType);
                            }
                            setActiveTopMenu(null);
                            setMenuSearchQuery('');
                          }}
                        >
                          <div className="flex flex-col min-w-0 pr-2">
                            <span className="font-semibold text-xs text-slate-800 truncate">{item.label}</span>
                            <span className="text-[9px] text-slate-600 font-bold font-mono">{item.areaLabel}</span>
                          </div>
                          <span className="font-mono text-[9px] font-bold text-[#002D62] bg-[#EBF1F6] px-1.5 py-0.2 border border-[#A5B9CC] shrink-0">
                            {item.code}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  /* Standard Categories Mode */
                  <div className="max-h-[420px] overflow-y-auto custom-scrollbar">
                    {effectiveMenuAreas.map((area) => (
                      <div key={area.id} className="border-b border-slate-100 last:border-b-0">
                        <div 
                          className={`px-3 py-2 cursor-pointer flex justify-between items-center transition-all ${
                            activeCategory === area.id 
                              ? 'bg-[#E1EDF7] text-[#002D62] font-black' 
                              : 'hover:bg-[#FFFCDD] text-slate-800 font-semibold'
                          }`}
                          onClick={() => setActiveCategory(activeCategory === area.id ? null : area.id)}
                        >
                          <span className="truncate pr-2 text-xs">{area.label}</span>
                          <span className="text-[#002D62] text-[9px] font-bold">
                            {activeCategory === area.id ? '▼' : '▶'}
                          </span>
                        </div>

                        {/* Submenu Accordion */}
                        {activeCategory === area.id && (
                          <div className="bg-[#FAFBFD] border-t border-b border-[#D2DFEC] py-1 pl-3 pr-2">
                            {area.items.map((item) => (
                              <div
                                key={item.id}
                                className="px-2.5 py-1.5 hover:bg-[#FFFCDD] hover:text-[#002D62] text-slate-700 cursor-pointer flex items-center justify-between transition-all rounded-none my-0.5 border border-transparent hover:border-[#F0DC82]"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (item.id === 'WSJ_REPORTS') {
                                    handleOpenRecentReports();
                                    setActiveTopMenu(null);
                                    setMenuSearchQuery('');
                                    return;
                                  }
                                  if (setActiveModule) {
                                    setActiveModule(item.id as ModuleType);
                                  }
                                  setActiveTopMenu(null);
                                  setMenuSearchQuery('');
                                }}
                              >
                                <span className="truncate max-w-[210px] font-normal text-xs">{item.label}</span>
                                <span className="font-mono text-[9px] font-bold text-[#002D62] bg-[#EBF1F6] px-1.5 py-0.2 border border-[#A5B9CC]">
                                  {item.code}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Direct Top Bar Action: Informes recientes (WSJ - P986110B) */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={handleOpenRecentReports}
              className="no-jde-override jde-menu-btn bg-[#004B7B] hover:bg-[#003B66] text-amber-300 hover:text-white border-[#003B66]"
              title="Trabajar con Trabajos Enviados (WSJ - P986110B) • Informes Recientes y Reportes UBE (Atajo: Ctrl+J)"
            >
              <FileText size={12} className="text-amber-300" />
              <span className="tracking-tight">Informes recientes</span>
              <span className="bg-amber-400 text-slate-950 font-black text-[8px] font-mono px-1 py-0.2 rounded-xs ml-0.5">
                WSJ
              </span>
            </button>
          </div>

          <span className="text-white/30 hidden sm:inline mx-0.5 select-none">|</span>

          {/* 2. Menu: Archivo (File) */}
          <div className="relative shrink-0">
            <button
              onClick={() => toggleMenu('FILE')}
              onMouseEnter={() => hoverMenu('FILE')}
              className={`no-jde-override jde-menu-btn ${
                activeTopMenu === 'FILE' ? 'jde-menu-btn-active' : ''
              }`}
            >
              Archivo
            </button>
            {activeTopMenu === 'FILE' && (
              <div className="absolute left-0 top-full mt-0.5 w-64 md:w-72 bg-white border border-[#002D62] shadow-2xl rounded-none text-slate-800 z-[9999] py-1 text-xs animate-in fade-in duration-75 select-none">
                <div className="bg-[#002D62] text-[#FFCC00] font-bold text-[9px] uppercase px-3 py-1 font-mono border-b border-[#001B3B]">
                  Archivo - {activeInfo.code}
                </div>
                <button
                  onClick={handleToolbarNew}
                  className="no-jde-override jde-dropdown-item"
                >
                  <span className="flex items-center gap-2"><Plus size={12} className="text-emerald-700" /> Nuevo Registro</span>
                  <span className="font-mono text-[9px] text-slate-700 font-bold bg-slate-100 border border-slate-200 px-1">Ctrl+N</span>
                </button>
                <button
                  onClick={handleToolbarSave}
                  className="no-jde-override jde-dropdown-item"
                >
                  <span className="flex items-center gap-2"><Check size={12} className="text-blue-700" /> Guardar / Confirmar</span>
                  <span className="font-mono text-[9px] text-slate-700 font-bold bg-slate-100 border border-slate-200 px-1">Ctrl+S</span>
                </button>
                <button
                  onClick={handleToolbarFind}
                  className="no-jde-override jde-dropdown-item"
                >
                  <span className="flex items-center gap-2"><Search size={12} className="text-[#005B94]" /> Buscar / Actualizar (Find)</span>
                  <span className="font-mono text-[9px] text-slate-700 font-bold bg-slate-100 border border-slate-200 px-1">F5</span>
                </button>
                <button
                  onClick={handleToolbarExport}
                  className="no-jde-override jde-dropdown-item"
                >
                  <span className="flex items-center gap-2"><Download size={12} className="text-emerald-700" /> Exportar Grilla a Excel (.xlsx)</span>
                  <span className="font-mono text-[9px] text-slate-700 font-bold bg-slate-100 border border-slate-200 px-1">Ctrl+E</span>
                </button>
                <button
                  onClick={handleToolbarPrint}
                  className="no-jde-override jde-dropdown-item"
                >
                  <span className="flex items-center gap-2"><Printer size={12} className="text-slate-700" /> Imprimir Formulario / PDF</span>
                  <span className="font-mono text-[9px] text-slate-700 font-bold bg-slate-100 border border-slate-200 px-1">Ctrl+P</span>
                </button>
                <div className="h-px bg-slate-200 my-1"></div>
                <button
                  onClick={handleToolbarClose}
                  className="no-jde-override jde-dropdown-item text-rose-700 font-bold hover:bg-rose-50"
                >
                  <span className="flex items-center gap-2"><X size={12} className="text-rose-700" /> Cerrar Sistema Completo</span>
                  <span className="font-mono text-[9px] bg-rose-100 text-rose-900 font-bold px-1">Salir</span>
                </button>
                <button
                  onClick={onLogout}
                  className="no-jde-override jde-dropdown-item text-rose-700 font-bold hover:bg-rose-50"
                >
                  <span className="flex items-center gap-2"><LogOut size={12} className="text-rose-700" /> Desconexión de Sesión</span>
                  <span className="font-mono text-[9px] bg-rose-100 text-rose-900 font-bold px-1">Logout</span>
                </button>
              </div>
            )}
          </div>

          {/* 3. Menu: Edición (Edit) */}
          <div className="relative shrink-0">
            <button
              onClick={() => toggleMenu('EDIT')}
              onMouseEnter={() => hoverMenu('EDIT')}
              className={`no-jde-override jde-menu-btn ${
                activeTopMenu === 'EDIT' ? 'jde-menu-btn-active' : ''
              }`}
            >
              Edición
            </button>
            {activeTopMenu === 'EDIT' && (
              <div className="absolute left-0 top-full mt-0.5 w-64 md:w-72 bg-white border border-[#002D62] shadow-2xl rounded-none text-slate-800 z-[9999] py-1 text-xs animate-in fade-in duration-75 select-none">
                <div className="bg-[#002D62] text-[#FFCC00] font-bold text-[9px] uppercase px-3 py-1 font-mono border-b border-[#001B3B]">
                  Edición y Cuadrícula
                </div>
                <button
                  onClick={handleToolbarSelect}
                  className="no-jde-override jde-dropdown-item"
                >
                  <span className="flex items-center gap-2"><Check size={12} className="text-emerald-700" /> Seleccionar Fila Activa</span>
                  <span className="font-mono text-[9px] text-slate-700 font-bold bg-slate-100 border border-slate-200 px-1">Enter</span>
                </button>
                <button
                  onClick={handleToolbarClearQBE}
                  className="no-jde-override jde-dropdown-item"
                >
                  <span className="flex items-center gap-2"><FilterX size={12} className="text-amber-800" /> Limpiar Filtros QBE</span>
                  <span className="font-mono text-[9px] text-slate-700 font-bold bg-slate-100 border border-slate-200 px-1">Ctrl+Q</span>
                </button>
                <button
                  onClick={handleToolbarSelectAll}
                  className="no-jde-override jde-dropdown-item"
                >
                  <span className="flex items-center gap-2"><Check size={12} className="text-blue-700" /> Seleccionar Todo</span>
                  <span className="font-mono text-[9px] text-slate-700 font-bold bg-slate-100 border border-slate-200 px-1">Ctrl+A</span>
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(activeInfo.code);
                    showFeedback(`Copiado código de programa: ${activeInfo.code}`);
                    setActiveTopMenu(null);
                  }}
                  className="no-jde-override jde-dropdown-item"
                >
                  <span className="flex items-center gap-2"><Copy size={12} className="text-slate-600" /> Copiar Código [{activeInfo.code}]</span>
                  <span className="font-mono text-[9px] text-slate-700 font-bold bg-slate-100 border border-slate-200 px-1">Ctrl+C</span>
                </button>
                <button
                  onClick={() => {
                    handleDispatch('jde:reset_grid', 'Vista predeterminada de cuadrícula restaurada');
                  }}
                  className="no-jde-override jde-dropdown-item"
                >
                  <span className="flex items-center gap-2"><RefreshCw size={12} className="text-slate-600" /> Restablecer Cuadrícula</span>
                  <span className="font-mono text-[9px] text-slate-400 bg-slate-100 px-1">Reset</span>
                </button>
              </div>
            )}
          </div>

          {/* 4. Menu: Ver (View) */}
          <div className="relative shrink-0">
            <button
              onClick={() => toggleMenu('VIEW')}
              onMouseEnter={() => hoverMenu('VIEW')}
              className={`no-jde-override jde-menu-btn ${
                activeTopMenu === 'VIEW' ? 'jde-menu-btn-active' : ''
              }`}
            >
              Ver
            </button>
            {activeTopMenu === 'VIEW' && (
              <div className="absolute left-0 top-full mt-0.5 w-64 md:w-72 bg-white border border-[#002D62] shadow-2xl rounded-none text-slate-800 z-[9999] py-1 text-xs animate-in fade-in duration-75 select-none">
                <div className="bg-[#002D62] text-[#FFCC00] font-bold text-[9px] uppercase px-3 py-1 font-mono border-b border-[#001B3B]">
                  Opciones de Visualización
                </div>
                <button
                  onClick={handleToolbarFind}
                  className="no-jde-override jde-dropdown-item"
                >
                  <span className="flex items-center gap-2"><RefreshCw size={12} className="text-emerald-700" /> Re-Query / Actualizar BD</span>
                  <span className="font-mono text-[9px] text-slate-400 bg-slate-100 px-1">F5</span>
                </button>
                {onToggleSidebar && (
                  <button
                    onClick={() => {
                      onToggleSidebar();
                      setActiveTopMenu(null);
                    }}
                    className="no-jde-override jde-dropdown-item"
                  >
                    <span className="flex items-center gap-2">📁 {isSidebarCollapsed ? "Mostrar Navegador ERP" : "Ocultar Navegador ERP"}</span>
                    <span className="font-mono text-[9px] text-slate-400 bg-slate-100 px-1">Ctrl+B</span>
                  </button>
                )}
                <div className="px-3 py-1 text-[9px] font-bold font-mono text-slate-500 bg-slate-50 uppercase">
                  Filtro de Modo de Datos
                </div>
                <button
                  onClick={() => {
                    onChangeDataShowMode('ALL');
                    showFeedback('Filtro de Datos: Mostrando TODOS los registros');
                    setActiveTopMenu(null);
                  }}
                  className={`no-jde-override jde-dropdown-item ${dataShowMode === 'ALL' ? 'font-bold text-[#002D62] bg-[#E2EDF8]' : ''}`}
                >
                  <span>● Todos los Registros (Reales + Demos)</span>
                  {dataShowMode === 'ALL' && <Check size={12} className="text-blue-700" />}
                </button>
                <button
                  onClick={() => {
                    onChangeDataShowMode('REAL_ONLY');
                    showFeedback('Filtro de Datos: Mostrando SOLO REGISTROS REALES');
                    setActiveTopMenu(null);
                  }}
                  className={`no-jde-override jde-dropdown-item ${dataShowMode === 'REAL_ONLY' ? 'font-bold text-emerald-800 bg-emerald-50' : ''}`}
                >
                  <span>● Solo Registros Reales (Producción)</span>
                  {dataShowMode === 'REAL_ONLY' && <Check size={12} className="text-emerald-700" />}
                </button>
                <button
                  onClick={() => {
                    onChangeDataShowMode('TEST_ONLY');
                    showFeedback('Filtro de Datos: Mostrando SOLO DEMOS');
                    setActiveTopMenu(null);
                  }}
                  className={`no-jde-override jde-dropdown-item ${dataShowMode === 'TEST_ONLY' ? 'font-bold text-amber-800 bg-amber-50' : ''}`}
                >
                  <span>● Solo Registros Demos / Pruebas</span>
                  {dataShowMode === 'TEST_ONLY' && <Check size={12} className="text-amber-700" />}
                </button>
              </div>
            )}
          </div>

          {/* 5. Menu: Formulario (Form) */}
          <div className="relative shrink-0">
            <button
              onClick={() => toggleMenu('FORM')}
              onMouseEnter={() => hoverMenu('FORM')}
              className={`no-jde-override jde-menu-btn ${
                activeTopMenu === 'FORM' ? 'jde-menu-btn-active' : ''
              }`}
            >
              Formulario
            </button>
            {activeTopMenu === 'FORM' && (
              <div className="absolute left-0 top-full mt-0.5 w-64 md:w-72 bg-white border border-[#002D62] shadow-2xl rounded-none text-slate-800 z-[9999] py-1 text-xs animate-in fade-in duration-75 select-none">
                <div className="bg-[#002D62] text-[#FFCC00] font-bold text-[9px] uppercase px-3 py-1 font-mono border-b border-[#001B3B]">
                  Salidas de Formulario [W{activeInfo.code.replace('P', 'W')}A]
                </div>
                <button
                  onClick={handleOpenRecentReports}
                  className="no-jde-override jde-dropdown-item font-bold text-[#002D62]"
                >
                  <span className="flex items-center gap-2"><FileText size={12} className="text-amber-600" /> Informes Recientes (WSJ)</span>
                  <span className="font-mono text-[9px] text-amber-900 bg-amber-100 px-1 border border-amber-300 font-black">P986110B</span>
                </button>
                <button
                  onClick={() => {
                    onConsistency();
                    setActiveTopMenu(null);
                  }}
                  className="no-jde-override jde-dropdown-item"
                >
                  <span className="flex items-center gap-2"><FileCheck size={12} className="text-[#005B94]" /> Coherencia de Datos</span>
                  <span className="font-mono text-[9px] text-slate-400 bg-slate-100 px-1">R15011C</span>
                </button>
                <button
                  onClick={() => {
                    onAudit();
                    setActiveTopMenu(null);
                  }}
                  className="no-jde-override jde-dropdown-item"
                >
                  <span className="flex items-center gap-2"><ShieldCheck size={12} className="text-emerald-700" /> Historial de Auditoría</span>
                  <span className="font-mono text-[9px] text-slate-400 bg-slate-100 px-1">R15312</span>
                </button>
                <button
                  onClick={() => {
                    onBackup();
                    setActiveTopMenu(null);
                  }}
                  className="no-jde-override jde-dropdown-item"
                >
                  <span className="flex items-center gap-2"><Download size={12} className="text-slate-600" /> Exportar Base Offline</span>
                  <span className="font-mono text-[9px] text-slate-400 bg-slate-100 px-1">R98005U</span>
                </button>
                <button
                  onClick={() => {
                    import('../lib/printDocument').then(({ printTestPage }) => printTestPage());
                    setActiveTopMenu(null);
                  }}
                  className="no-jde-override jde-dropdown-item"
                >
                  <span className="flex items-center gap-2"><Printer size={12} className="text-emerald-700" /> Probar Impresora & Color</span>
                  <span className="font-mono text-[9px] text-slate-400 bg-slate-100 px-1">PrintTest</span>
                </button>
                <button
                  onClick={() => {
                    setActiveModule?.('DEVELOPER_CONSOLE');
                    setActiveTopMenu(null);
                  }}
                  className="no-jde-override jde-dropdown-item"
                >
                  <span className="flex items-center gap-2"><Terminal size={12} className="text-indigo-700" /> Consola del Desarrollador</span>
                  <span className="font-mono text-[9px] text-slate-400 bg-slate-100 px-1">P980011D</span>
                </button>
                <button
                  onClick={() => {
                    setActiveModule?.('MAPA_DATOS_LEGAL');
                    setActiveTopMenu(null);
                  }}
                  className="no-jde-override jde-dropdown-item"
                >
                  <span className="flex items-center gap-2"><BookOpen size={12} className="text-blue-700" /> Mapa de Datos Ley 21696</span>
                  <span className="font-mono text-[9px] text-slate-400 bg-slate-100 px-1">R09OWDAT</span>
                </button>
              </div>
            )}
          </div>

          {/* 6. Menu: Fila (Row) */}
          <div className="relative shrink-0">
            <button
              onClick={() => toggleMenu('ROW')}
              onMouseEnter={() => hoverMenu('ROW')}
              className={`no-jde-override jde-menu-btn ${
                activeTopMenu === 'ROW' ? 'jde-menu-btn-active' : ''
              }`}
            >
              Fila
            </button>
            {activeTopMenu === 'ROW' && (
              <div className="absolute left-0 top-full mt-0.5 w-64 md:w-72 bg-white border border-[#002D62] shadow-2xl rounded-none text-slate-800 z-[9999] py-1 text-xs animate-in fade-in duration-75 select-none">
                <div className="bg-[#002D62] text-[#FFCC00] font-bold text-[9px] uppercase px-3 py-1 font-mono border-b border-[#001B3B]">
                  Acciones y Salidas de Fila
                </div>
                <button
                  onClick={handleToolbarSelect}
                  className="no-jde-override jde-dropdown-item"
                >
                  <span className="flex items-center gap-2"><Check size={12} className="text-emerald-700" /> Ver Detalle / Seleccionar</span>
                  <span className="font-mono text-[9px] text-slate-400 bg-slate-100 px-1">F4</span>
                </button>
                <button
                  onClick={() => handleDispatch('jde:traceability', 'Abriendo Trazabilidad Cruzada One View (P00901)')}
                  className="no-jde-override jde-dropdown-item"
                >
                  <span className="flex items-center gap-2"><BookOpen size={12} className="text-indigo-700" /> Trazabilidad One View</span>
                  <span className="font-mono text-[9px] text-slate-400 bg-slate-100 px-1">F8</span>
                </button>
                <button
                  onClick={() => handleDispatch('jde:tally', 'Calculando totalizador de registros de cuadrícula')}
                  className="no-jde-override jde-dropdown-item"
                >
                  <span className="flex items-center gap-2"><Calculator size={12} className="text-blue-700" /> Totalizador de Grilla</span>
                  <span className="font-mono text-[9px] text-slate-400 bg-slate-100 px-1">Tally</span>
                </button>
                <button
                  onClick={() => handleDispatch('jde:delete', 'Solicitud de anulación/eliminación de registro activo')}
                  className="no-jde-override jde-dropdown-item text-rose-700 font-semibold hover:bg-rose-50"
                >
                  <span className="flex items-center gap-2"><Trash2 size={12} className="text-rose-600" /> Eliminar / Anular Registro</span>
                  <span className="font-mono text-[9px] bg-rose-100 px-1">Del</span>
                </button>
              </div>
            )}
          </div>

          {/* 7. Menu: Informe (Report / UBE Batch Jobs) */}
          <div className="relative shrink-0">
            <button
              onClick={() => toggleMenu('REPORT')}
              onMouseEnter={() => hoverMenu('REPORT')}
              className={`no-jde-override jde-menu-btn ${
                activeTopMenu === 'REPORT' ? 'jde-menu-btn-active' : ''
              }`}
            >
              Informe
            </button>
            {activeTopMenu === 'REPORT' && (
              <div className="absolute left-0 top-full mt-0.5 w-72 md:w-80 bg-white border border-[#002D62] shadow-2xl rounded-none text-slate-800 z-[9999] py-1 text-xs animate-in fade-in duration-75 select-none">
                <div className="bg-[#002D62] text-[#FFCC00] font-bold text-[9px] uppercase px-3 py-1 font-mono border-b border-[#001B3B] flex items-center justify-between">
                  <span>Informes y Reportes UBE ERP</span>
                  <span className="text-[8px] font-mono text-slate-300">[REPORTS]</span>
                </div>
                <button
                  onClick={handleOpenRecentReports}
                  className="no-jde-override jde-dropdown-item font-bold text-[#002D62]"
                >
                  <span className="flex items-center gap-2"><FileText size={12} className="text-amber-600" /> Trabajar con Trabajos Enviados (WSJ)</span>
                  <span className="font-mono text-[9px] text-amber-900 bg-amber-100 px-1 border border-amber-300 font-black">WSJ</span>
                </button>
                <button
                  onClick={() => {
                    setActiveModule?.('REPORTE_B13');
                    setActiveTopMenu(null);
                  }}
                  className="no-jde-override jde-dropdown-item"
                >
                  <span className="flex items-center gap-2"><FileText size={12} className="text-blue-700" /> Planilla Reguladora B13</span>
                  <span className="font-mono text-[9px] text-slate-400 bg-slate-100 px-1">R09321</span>
                </button>
                <button
                  onClick={() => {
                    setActiveModule?.('REPORTE_B4');
                    setActiveTopMenu(null);
                  }}
                  className="no-jde-override jde-dropdown-item"
                >
                  <span className="flex items-center gap-2"><FileText size={12} className="text-indigo-700" /> Estructuración Reporte B4</span>
                  <span className="font-mono text-[9px] text-slate-400 bg-slate-100 px-1">R09322</span>
                </button>
                <button
                  onClick={() => {
                    setActiveModule?.('NOTA_14');
                    setActiveTopMenu(null);
                  }}
                  className="no-jde-override jde-dropdown-item"
                >
                  <span className="flex items-center gap-2"><FileText size={12} className="text-purple-700" /> Estados Financieros Nota 14</span>
                  <span className="font-mono text-[9px] text-slate-400 bg-slate-100 px-1">R09314</span>
                </button>
                <button
                  onClick={() => {
                    setActiveModule?.('REPORTE_MENSUAL_GASTOS');
                    setActiveTopMenu(null);
                  }}
                  className="no-jde-override jde-dropdown-item"
                >
                  <span className="flex items-center gap-2"><BarChart3 size={12} className="text-emerald-700" /> Informe Mensual de Gastos IA</span>
                  <span className="font-mono text-[9px] text-slate-400 bg-slate-100 px-1">R09325</span>
                </button>
                <button
                  onClick={() => {
                    setActiveModule?.('CISO_REPORT');
                    setActiveTopMenu(null);
                  }}
                  className="no-jde-override jde-dropdown-item"
                >
                  <span className="flex items-center gap-2"><ShieldCheck size={12} className="text-rose-700" /> Informe Ejecutivo CISO (.PDF)</span>
                  <span className="font-mono text-[9px] text-slate-400 bg-slate-100 px-1">R09OWSEC</span>
                </button>
                <button
                  onClick={() => {
                    setActiveModule?.('FACTURACION_DTE');
                    setActiveTopMenu(null);
                  }}
                  className="no-jde-override jde-dropdown-item"
                >
                  <span className="flex items-center gap-2"><FileText size={12} className="text-emerald-700" /> Facturación DTE & Exenciones DL 825</span>
                  <span className="font-mono text-[9px] text-emerald-800 bg-emerald-50 px-1 border border-emerald-200 font-bold">P4210DTE</span>
                </button>
                <button
                  onClick={() => {
                    setActiveModule?.('IMPUESTOS_F29_F22');
                    setActiveTopMenu(null);
                  }}
                  className="no-jde-override jde-dropdown-item"
                >
                  <span className="flex items-center gap-2"><Calculator size={12} className="text-blue-700" /> Declaración F29 / F22 SII</span>
                  <span className="font-mono text-[9px] text-slate-400 bg-slate-100 px-1">P029F22</span>
                </button>
                <button
                  onClick={() => {
                    setActiveModule?.('BENFORD_ANALYSIS');
                    setActiveTopMenu(null);
                  }}
                  className="no-jde-override jde-dropdown-item"
                >
                  <span className="flex items-center gap-2"><Activity size={12} className="text-indigo-700" /> Análisis Forense de Benford</span>
                  <span className="font-mono text-[9px] text-slate-400 bg-slate-100 px-1">P09BEN</span>
                </button>
                <button
                  onClick={() => {
                    setActiveModule?.('REVISION_REPORTES');
                    setActiveTopMenu(null);
                  }}
                  className="no-jde-override jde-dropdown-item"
                >
                  <span className="flex items-center gap-2"><FileCheck size={12} className="text-slate-700" /> Revisión y Corrección de Lotes</span>
                  <span className="font-mono text-[9px] text-slate-400 bg-slate-100 px-1">P0911R</span>
                </button>
              </div>
            )}
          </div>

          {/* 8. Menu: Herramientas (Tools) */}
          <div className="relative shrink-0">
            <button
              onClick={() => toggleMenu('TOOLS')}
              onMouseEnter={() => hoverMenu('TOOLS')}
              className={`no-jde-override jde-menu-btn ${
                activeTopMenu === 'TOOLS' ? 'jde-menu-btn-active' : ''
              }`}
            >
              Herramientas
            </button>
            {activeTopMenu === 'TOOLS' && (
              <div className="absolute left-0 top-full mt-0.5 w-64 md:w-72 bg-white border border-[#002D62] shadow-2xl rounded-none text-slate-800 z-[9999] py-1 text-xs animate-in fade-in duration-75 select-none">
                <div className="bg-[#002D62] text-[#FFCC00] font-bold text-[9px] uppercase px-3 py-1 font-mono border-b border-[#001B3B]">
                  Herramientas y Servicios ERP
                </div>
                <button
                  onClick={handleOpenRecentReports}
                  className="no-jde-override jde-dropdown-item font-bold text-[#002D62]"
                >
                  <span className="flex items-center gap-2"><FileText size={12} className="text-amber-600" /> Trabajar con Trabajos Enviados (WSJ)</span>
                  <span className="font-mono text-[9px] text-amber-900 bg-amber-100 px-1 border border-amber-300 font-black">WSJ</span>
                </button>
                <button
                  onClick={() => {
                    onCloudSync();
                    setActiveTopMenu(null);
                  }}
                  className="no-jde-override jde-dropdown-item"
                >
                  <span className="flex items-center gap-2"><RefreshCw size={12} className="text-emerald-700" /> Publicar Lote en Tiempo Real (AIS)</span>
                  <span className="font-mono text-[9px] text-slate-400 bg-slate-100 px-1">Post</span>
                </button>
                <button
                  onClick={() => {
                    setActiveModule?.('CONFIG');
                    setActiveTopMenu(null);
                  }}
                  className="no-jde-override jde-dropdown-item"
                >
                  <span className="flex items-center gap-2"><Settings size={12} className="text-slate-700" /> Seguridad & Perfiles (P98OWSEC)</span>
                  <span className="font-mono text-[9px] text-slate-400 bg-slate-100 px-1">Sec</span>
                </button>
                <button
                  onClick={() => {
                    setActiveModule?.('SALUD_SISTEMA');
                    setActiveTopMenu(null);
                  }}
                  className="no-jde-override jde-dropdown-item"
                >
                  <span className="flex items-center gap-2"><Activity size={12} className="text-emerald-700" /> Servidor AIS & Health (P986110)</span>
                  <span className="font-mono text-[9px] text-slate-400 bg-slate-100 px-1">AIS</span>
                </button>
                <button
                  onClick={() => {
                    setActiveModule?.('PROPIEDADES_INVERSION');
                    setActiveTopMenu(null);
                  }}
                  className="no-jde-override jde-dropdown-item"
                >
                  <span className="flex items-center gap-2"><BarChart3 size={12} className="text-blue-700" /> Control Auxiliares Fin Mes</span>
                  <span className="font-mono text-[9px] text-slate-400 bg-slate-100 px-1">M0912</span>
                </button>
                <button
                  onClick={() => {
                    setActiveModule?.('BENFORD_ANALYSIS');
                    setActiveTopMenu(null);
                  }}
                  className="no-jde-override jde-dropdown-item"
                >
                  <span className="flex items-center gap-2"><ShieldCheck size={12} className="text-indigo-700" /> Análisis Forense Benford</span>
                  <span className="font-mono text-[9px] text-slate-400 bg-slate-100 px-1">P09BEN</span>
                </button>
                
                {/* Real-time DB sync sub-block */}
                <div className="p-2 bg-slate-50 border-t border-slate-200">
                  {isSyncActive ? (
                    <div className="flex items-center justify-between text-[9.5px] font-mono text-emerald-800">
                      <span className="flex items-center gap-1 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        FIRESTORE CONECTADO
                      </span>
                      <button
                        onClick={() => {
                          onUnlink();
                          setActiveTopMenu(null);
                        }}
                        className="no-jde-override text-rose-700 hover:underline cursor-pointer font-bold"
                      >
                        [Desvincular]
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        onShowSync();
                        setActiveTopMenu(null);
                      }}
                      className="no-jde-override w-full py-1 bg-white hover:bg-slate-100 border border-slate-300 text-[9.5px] font-mono font-bold text-[#002D62] rounded-xs cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Cloud size={11} className="text-indigo-600" /> Conectar Nube en Tiempo Real
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 9. Menu: Ayuda (Help) */}
          <div className="relative shrink-0">
            <button
              onClick={() => toggleMenu('HELP')}
              onMouseEnter={() => hoverMenu('HELP')}
              className={`no-jde-override jde-menu-btn ${
                activeTopMenu === 'HELP' ? 'jde-menu-btn-active' : ''
              }`}
            >
              Ayuda
            </button>
            {activeTopMenu === 'HELP' && (
              <div className="absolute left-0 top-full mt-0.5 w-64 md:w-72 bg-white border border-[#002D62] shadow-2xl rounded-none text-slate-800 z-[9999] py-1 text-xs animate-in fade-in duration-75 select-none">
                <div className="bg-[#002D62] text-[#FFCC00] font-bold text-[9px] uppercase px-3 py-1 font-mono border-b border-[#001B3B]">
                  Ayuda y Soporte ERP
                </div>
                <button
                  onClick={() => {
                    setActiveModule?.('MANUAL_USUARIO');
                    setActiveTopMenu(null);
                  }}
                  className="no-jde-override jde-dropdown-item"
                >
                  <span className="flex items-center gap-2"><BookOpen size={12} className="text-[#005B94]" /> Manual de Usuario ERP</span>
                  <span className="font-mono text-[9px] text-slate-400 bg-slate-100 px-1">P0000A</span>
                </button>
                <button
                  onClick={() => {
                    setShowShortcutsDialog(true);
                    setActiveTopMenu(null);
                  }}
                  className="no-jde-override jde-dropdown-item"
                >
                  <span className="flex items-center gap-2"><Key size={12} className="text-amber-800" /> Guía de Teclas Rápidas</span>
                  <span className="font-mono text-[9px] text-slate-400 bg-slate-100 px-1">Atajos</span>
                </button>
                <button
                  onClick={() => {
                    setActiveModule?.('PROJECTS_REPORT');
                    setActiveTopMenu(null);
                  }}
                  className="no-jde-override jde-dropdown-item"
                >
                  <span className="flex items-center gap-2"><FileText size={12} className="text-emerald-700" /> Propuesta de Innovación</span>
                  <span className="font-mono text-[9px] text-slate-400 bg-slate-100 px-1">R09OWPRJ</span>
                </button>
                <button
                  onClick={() => {
                    setShowAboutDialog(true);
                    setActiveTopMenu(null);
                  }}
                  className="no-jde-override jde-dropdown-item"
                >
                  <span className="flex items-center gap-2"><Info size={12} className="text-indigo-700" /> Acerca de ERP</span>
                  <span className="font-mono text-[9px] text-slate-400 bg-slate-100 px-1">Info</span>
                </button>
              </div>
            )}
          </div>

          <span className="text-white/40 hidden xl:inline mx-1">|</span>

          {/* Interactive Breadcrumb Trail */}
          <div className="hidden 2xl:flex items-center gap-1.5 text-[10px] text-white/90 truncate min-w-0">
            <span 
              onClick={() => setActiveModule?.('DASHBOARD')}
              className="hover:text-amber-300 cursor-pointer font-semibold underline decoration-white/30 hover:decoration-amber-300 transition-colors"
              title="Ir a Inicio / Dashboard Principal"
            >
              Inicio
            </span>
            <span className="text-white/40">›</span>
            <span 
              onClick={() => toggleMenu('NAV')}
              className="text-white/80 hover:text-amber-300 cursor-pointer transition-colors"
              title="Abrir Menús AssetFlow Enterprise"
            >
              {currentCategoryLabel}
            </span>
            <span className="text-white/40">›</span>
            <span className="font-bold text-amber-300 truncate">{activeInfo.title}</span>
          </div>
        </div>

        {/* Right side of Blue Bar: Data Mode & AIS Status */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {/* Data Filter */}
          <div className="flex items-center gap-1 bg-[#004B7B] border border-[#003B66] px-1.5 py-0.5 rounded-xs">
            <label className="text-[8.5px] font-bold font-mono text-slate-200 uppercase tracking-tight select-none">DATOS:</label>
            <select 
              value={dataShowMode}
              onChange={(e) => onChangeDataShowMode(e.target.value as any)}
              className="bg-transparent border-none text-[9.5px] font-bold text-amber-300 font-mono focus:outline-none cursor-pointer p-0 pr-1 uppercase"
            >
              <option value="ALL" className="text-slate-900 bg-white">TODOS</option>
              <option value="REAL_ONLY" className="text-slate-900 bg-white">REALES</option>
              <option value="TEST_ONLY" className="text-slate-900 bg-white">DEMOS</option>
            </select>
          </div>

          {/* AIS Pulse */}
          <div className="hidden sm:flex items-center gap-1 bg-[#004B7B] border border-[#003B66] px-1.5 py-0.5 text-[9px] font-mono rounded-xs text-white">
            <span className="text-slate-300 font-bold">AIS:</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              ONLINE
            </span>
          </div>

          {/* Sync Batch */}
          <button 
            onClick={onCloudSync} 
            disabled={isCloudSyncing}
            className={`no-jde-override px-2 py-0.5 border flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-wider transition-all rounded-xs cursor-pointer ${
              isCloudSyncing 
                ? 'bg-amber-400 text-slate-950 border-amber-500 animate-pulse' 
                : 'bg-emerald-700 hover:bg-emerald-600 text-white border-emerald-800'
            }`}
            title="Procesar y sincronizar lotes de datos con el servidor AIS"
          >
            <RefreshCw size={9} className={isCloudSyncing ? "animate-spin" : ""} />
            <span>{isCloudSyncing ? "POSTEANDO..." : "POST LOTE"}</span>
          </button>
        </div>
      </div>

      {/* 
        ========================================================================
        ROW 2.5: JDE OPEN APPLICATIONS MDI TAB BAR (EnterpriseOne Multi-Task Window Manager)
        ========================================================================
      */}
      {openTabs && openTabs.length > 0 && (
        <div className="bg-[#B9CEE2] border-b border-[#7FA6C7] px-2 pt-1 flex items-center justify-between gap-1 overflow-x-auto custom-scrollbar select-none shrink-0 min-h-[30px]">
          <div className="flex items-end gap-1 min-w-0 flex-1 overflow-x-auto custom-scrollbar">
            {openTabs.map((tab) => {
              const isActive = tab.id === activeModule;
              return (
                <div
                  key={tab.id}
                  onClick={() => onSelectTab?.(tab.id)}
                  title={`Cambiar a ${tab.title} (${tab.code})`}
                  className={`group relative flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-sans font-medium rounded-t-xs border cursor-pointer transition-colors max-w-[220px] truncate ${
                    isActive
                      ? 'bg-[#FAFBFD] text-[#002D62] font-bold border-[#7FA6C7] border-b-transparent shadow-xs -mb-[1px] z-10'
                      : 'bg-[#D2E0EE] hover:bg-[#E2EDF7] text-[#2A4865] border-[#9EBACF] border-b-[#7FA6C7]'
                  }`}
                >
                  {/* Active Indicator Pip */}
                  {isActive ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FFCC00] border border-[#B89600] shrink-0" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400/50 shrink-0" />
                  )}

                  {/* Program Code Badge */}
                  <span className="font-mono text-[9px] font-bold px-1 py-0.2 rounded-2xs bg-black/5 shrink-0">
                    {tab.code}
                  </span>

                  {/* Form Title */}
                  <span className="truncate min-w-0">
                    {tab.title}
                  </span>

                  {/* Close Tab Button */}
                  {openTabs.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCloseTab?.(tab.id);
                      }}
                      title="Cerrar aplicación (Close Tab)"
                      className="ml-1 p-0.5 rounded-2xs hover:bg-rose-600 hover:text-white text-slate-500 transition-colors opacity-70 group-hover:opacity-100 cursor-pointer"
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick Navigator / Fast New Task button */}
          <div className="flex items-center gap-1 pb-1 shrink-0 ml-2">
            <button
              type="button"
              onClick={() => toggleMenu('NAV')}
              className="px-2 py-0.5 bg-gradient-to-b from-white to-[#E8F1F8] hover:from-[#F0F8FF] hover:to-[#D5E6F5] border border-[#8FA8BE] text-[#002D62] text-[10px] font-bold rounded-xs flex items-center gap-1 shadow-3xs cursor-pointer"
              title="Abrir Navigator JDE para lanzar nueva aplicación"
            >
              <Plus size={10} className="text-emerald-700 stroke-[3]" />
              <span className="hidden sm:inline">Nueva Aplicación</span>
            </button>
          </div>
        </div>
      )}

      {/* 
        ========================================================================
        ROW 3: AUTHENTIC ERP APPLICATION TITLE & STANDARD ALTA ACTION TOOLBAR
        ========================================================================
      */}
      <div className="h-10 bg-gradient-to-r from-[#ECF3FA] to-[#E2EDF8] border-b border-[#A2BCCF] px-2 md:px-4 flex items-center justify-between flex-nowrap min-w-0 relative z-20">
        
        {/* Left: Program ID Badge & Form Title */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Authentic ERP Golden Badge */}
          <div className="bg-[#FFCC00] text-[#002D62] px-1.5 py-0.5 font-mono font-black text-[9.5px] border border-[#B89600] rounded-xs shadow-3xs uppercase tracking-tight shrink-0">
            {activeInfo.code}
          </div>

          {/* Form Title in ERP Alta Navy Style */}
          <div className="flex items-center gap-1 min-w-0">
            <h2 className="text-[#003B66] font-bold text-xs md:text-[13px] uppercase tracking-tight truncate whitespace-nowrap select-none" title={activeInfo.title}>
              Trabajar con {activeInfo.title} <span className="font-mono text-[10.5px] font-normal text-[#5A738E]">[W{activeInfo.code.replace('P', 'W')}A]</span>
            </h2>
          </div>
        </div>

        {/* Right: ERP Alta Action Buttons Bar */}
        <div className="flex items-center gap-1 shrink-0 ml-auto">
          
          {/* Select / OK Button */}
          <button
            onClick={handleToolbarSelect}
            className="no-jde-override jde-btn h-7 text-[10.5px]"
            title="Seleccionar / Inspeccionar registro activo (Enter)"
          >
            <span className="text-emerald-700 font-black text-xs">✓</span>
            <span className="hidden sm:inline">Seleccionar</span>
          </button>

          {/* Find Button */}
          <button
            onClick={handleToolbarFind}
            className="no-jde-override jde-btn h-7 text-[10.5px]"
            title="Buscar / Actualizar cuadrícula desde Base de Datos (F5)"
          >
            <span className="text-[#005B94] font-bold text-xs">🔍</span>
            <span className="hidden sm:inline">Buscar</span>
          </button>

          {/* Dedicated Add Supplier Button when in Supplier/Address Book or Procurement modules */}
          {onOpenNewSupplier && ['PROVEEDORES', 'DUE_DILIGENCIA', 'DUE_DILIGENCIA_CONSULTA', 'CONSULTAS_JDE', 'LIBROS_AUXILIARES', 'UAF_COMPLIANCE'].includes(activeModule) && (
            <button
              onClick={onOpenNewSupplier}
              className="no-jde-override bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-800 px-2.5 h-7 rounded-xs text-[10.5px] font-black uppercase tracking-tight flex items-center gap-1 shadow-xs cursor-pointer mr-1"
              title="Crear Nuevo Proveedor en Libro de Direcciones (F0101) y Maestro de Proveedores (F0401)"
            >
              <Plus size={12} className="text-white shrink-0" />
              <span>+ Agregar Nuevo Proveedor</span>
            </button>
          )}

          {/* Add / New Button */}
          <button
            onClick={handleToolbarNew}
            className="no-jde-override jde-btn h-7 text-[10.5px]"
            title="Crear nuevo registro en este formulario (Ctrl+N)"
          >
            <span className="text-emerald-700 font-bold text-xs">➕</span>
            <span className="hidden sm:inline">Añadir</span>
          </button>

          {/* Save Button */}
          <button
            onClick={handleToolbarSave}
            className="no-jde-override jde-btn h-7 text-[10.5px]"
            title="Guardar cambios del formulario activo (Ctrl+S)"
          >
            <span className="text-blue-700 font-bold text-xs">💾</span>
            <span className="hidden sm:inline">Guardar</span>
          </button>

          {/* Print Button */}
          <button
            onClick={handleToolbarPrint}
            className="no-jde-override jde-btn h-7 text-[10.5px]"
            title="Imprimir formulario activo o comprobante (Ctrl+P)"
          >
            <Printer size={12} className="text-slate-700 shrink-0" />
            <span className="hidden md:inline">Imprimir</span>
          </button>

          {/* Export to Excel */}
          <button
            onClick={handleToolbarExport}
            className="no-jde-override jde-btn h-7 text-[10.5px]"
            title="Exportar cuadrícula actual a formato Excel (.xlsx)"
          >
            <Download size={12} className="text-emerald-700 shrink-0" />
            <span className="hidden md:inline">Exportar</span>
          </button>

          {/* Form Tools Button & Dropdown (Row 3 Toolbar) */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setToolbarDropdown(prev => prev === 'FORM' ? null : 'FORM');
                setActiveTopMenu(null);
              }}
              className={`no-jde-override jde-btn h-7 text-[10.5px] cursor-pointer ${
                toolbarDropdown === 'FORM' ? 'bg-[#002D62] text-white border-[#002D62] shadow-inner' : ''
              }`}
              title="Salidas de Formulario ERP (Form Exit)"
            >
              <Sliders size={12} className={toolbarDropdown === 'FORM' ? 'text-amber-300' : 'text-[#002D62]'} />
              <span className="hidden sm:inline">Formulario</span>
              <span className="text-[8px] ml-0.5">{toolbarDropdown === 'FORM' ? '▲' : '▼'}</span>
            </button>

            {toolbarDropdown === 'FORM' && (
              <div 
                className="absolute right-0 top-full mt-1 w-72 md:w-80 bg-white border-2 border-[#002D62] shadow-2xl rounded-none text-slate-800 z-[99999] py-1 text-xs animate-in fade-in zoom-in-95 duration-100 select-none text-left"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-[#002D62] text-[#FFCC00] font-black text-[9.5px] uppercase px-3 py-1.5 font-mono border-b border-[#001B3B] flex items-center justify-between">
                  <span>Salidas de Formulario [W{activeInfo.code.replace('P', 'W')}A]</span>
                  <span className="text-white/60 text-[8px] font-mono">{activeInfo.code}</span>
                </div>
                
                <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100">
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        handleOpenRecentReports();
                        setToolbarDropdown(null);
                      }}
                      className="no-jde-override jde-dropdown-item font-bold text-[#002D62]"
                    >
                      <span className="flex items-center gap-2"><FileText size={12} className="text-amber-600" /> Informes Recientes (WSJ)</span>
                      <span className="font-mono text-[9px] text-amber-900 bg-amber-100 px-1 border border-amber-300 font-black">WSJ</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleToolbarExport();
                        setToolbarDropdown(null);
                      }}
                      className="no-jde-override jde-dropdown-item"
                    >
                      <span className="flex items-center gap-2"><Download size={12} className="text-emerald-700" /> Exportar Formulario a Excel</span>
                      <span className="font-mono text-[9px] text-emerald-800 bg-emerald-50 px-1 font-bold">.XLSX</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleToolbarPrint();
                        setToolbarDropdown(null);
                      }}
                      className="no-jde-override jde-dropdown-item"
                    >
                      <span className="flex items-center gap-2"><Printer size={12} className="text-[#005B94]" /> Imprimir Formulario / PDF</span>
                      <span className="font-mono text-[9px] text-slate-500 bg-slate-100 px-1">Ctrl+P</span>
                    </button>
                  </div>

                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        onConsistency();
                        setToolbarDropdown(null);
                      }}
                      className="no-jde-override jde-dropdown-item"
                    >
                      <span className="flex items-center gap-2"><FileCheck size={12} className="text-[#005B94]" /> Coherencia e Integridad de Datos</span>
                      <span className="font-mono text-[9px] text-slate-500 bg-slate-100 px-1">R15011C</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onAudit();
                        setToolbarDropdown(null);
                      }}
                      className="no-jde-override jde-dropdown-item"
                    >
                      <span className="flex items-center gap-2"><ShieldCheck size={12} className="text-emerald-700" /> Historial de Auditoría Criptográfica</span>
                      <span className="font-mono text-[9px] text-slate-500 bg-slate-100 px-1">SOX</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onBackup();
                        setToolbarDropdown(null);
                      }}
                      className="no-jde-override jde-dropdown-item"
                    >
                      <span className="flex items-center gap-2"><Download size={12} className="text-slate-600" /> Exportar Respaldo Offline Total</span>
                      <span className="font-mono text-[9px] text-slate-500 bg-slate-100 px-1">R98005U</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        import('../lib/printDocument').then(({ printTestPage }) => printTestPage());
                        setToolbarDropdown(null);
                      }}
                      className="no-jde-override jde-dropdown-item"
                    >
                      <span className="flex items-center gap-2"><Printer size={12} className="text-emerald-700" /> Probar Impresora & Diagnóstico</span>
                      <span className="font-mono text-[9px] text-slate-500 bg-slate-100 px-1">PrintTest</span>
                    </button>
                  </div>

                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveModule?.('BOVEDA_DIGITAL');
                        setToolbarDropdown(null);
                      }}
                      className="no-jde-override jde-dropdown-item font-semibold"
                    >
                      <span className="flex items-center gap-2"><HardDrive size={12} className="text-indigo-700" /> Bóveda de Documentos Digitales</span>
                      <span className="font-mono text-[9px] text-indigo-800 bg-indigo-50 px-1">P986110D</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveModule?.('DEVELOPER_CONSOLE');
                        setToolbarDropdown(null);
                      }}
                      className="no-jde-override jde-dropdown-item"
                    >
                      <span className="flex items-center gap-2"><Terminal size={12} className="text-slate-700" /> Consola del Desarrollador</span>
                      <span className="font-mono text-[9px] text-slate-500 bg-slate-100 px-1">P980011D</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveModule?.('BENFORD_ANALYSIS');
                        setToolbarDropdown(null);
                      }}
                      className="no-jde-override jde-dropdown-item"
                    >
                      <span className="flex items-center gap-2"><BarChart3 size={12} className="text-blue-700" /> Análisis Forense Ley de Benford</span>
                      <span className="font-mono text-[9px] text-slate-500 bg-slate-100 px-1">P09BEN</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveModule?.('MAPA_DATOS_LEGAL');
                        setToolbarDropdown(null);
                      }}
                      className="no-jde-override jde-dropdown-item"
                    >
                      <span className="flex items-center gap-2"><BookOpen size={12} className="text-blue-700" /> Mapa de Datos Ley 21696 / 21719</span>
                      <span className="font-mono text-[9px] text-slate-500 bg-slate-100 px-1">R09OWDAT</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Row Tools Button & Dropdown (Row 3 Toolbar) */}
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setToolbarDropdown(prev => prev === 'ROW' ? null : 'ROW');
                setActiveTopMenu(null);
              }}
              className={`no-jde-override jde-btn h-7 text-[10.5px] cursor-pointer ${
                toolbarDropdown === 'ROW' ? 'bg-[#002D62] text-white border-[#002D62] shadow-inner' : ''
              }`}
              title="Salidas de Fila ERP (Row Exit)"
            >
              <Check size={12} className={toolbarDropdown === 'ROW' ? 'text-amber-300' : 'text-emerald-700'} />
              <span className="hidden sm:inline">Fila</span>
              <span className="text-[8px] ml-0.5">{toolbarDropdown === 'ROW' ? '▲' : '▼'}</span>
            </button>

            {toolbarDropdown === 'ROW' && (
              <div 
                className="absolute right-0 top-full mt-1 w-64 md:w-72 bg-white border-2 border-[#002D62] shadow-2xl rounded-none text-slate-800 z-[99999] py-1 text-xs animate-in fade-in zoom-in-95 duration-100 select-none text-left"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-[#002D62] text-[#FFCC00] font-black text-[9.5px] uppercase px-3 py-1.5 font-mono border-b border-[#001B3B] flex items-center justify-between">
                  <span>Acciones y Salidas de Fila</span>
                  <span className="text-white/60 text-[8px] font-mono">Row Exit</span>
                </div>

                <div className="py-1 divide-y divide-slate-100">
                  <div className="py-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        handleToolbarSelect();
                        setToolbarDropdown(null);
                      }}
                      className="no-jde-override jde-dropdown-item font-semibold"
                    >
                      <span className="flex items-center gap-2"><Check size={12} className="text-emerald-700" /> Ver Detalle / Seleccionar Fila</span>
                      <span className="font-mono text-[9px] text-slate-500 bg-slate-100 px-1 font-bold">F4 / Enter</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleDispatch('jde:traceability', 'Abriendo Trazabilidad Cruzada One View');
                        setToolbarDropdown(null);
                      }}
                      className="no-jde-override jde-dropdown-item"
                    >
                      <span className="flex items-center gap-2"><BookOpen size={12} className="text-indigo-700" /> Trazabilidad One View</span>
                      <span className="font-mono text-[9px] text-slate-500 bg-slate-100 px-1">F8</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleDispatch('jde:tally', 'Calculando totalizador de registros de cuadrícula');
                        setToolbarDropdown(null);
                      }}
                      className="no-jde-override jde-dropdown-item"
                    >
                      <span className="flex items-center gap-2"><Calculator size={12} className="text-blue-700" /> Totalizador de Grilla (Tally)</span>
                      <span className="font-mono text-[9px] text-slate-500 bg-slate-100 px-1">Σ</span>
                    </button>
                  </div>

                  <div className="py-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveModule?.('BOVEDA_DIGITAL');
                        setToolbarDropdown(null);
                      }}
                      className="no-jde-override jde-dropdown-item"
                    >
                      <span className="flex items-center gap-2"><HardDrive size={12} className="text-indigo-700" /> Expediente Digital Asociado</span>
                      <span className="font-mono text-[9px] text-indigo-700 bg-indigo-50 px-1">F986110D</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveModule?.('APROBACIONES_JDE');
                        setToolbarDropdown(null);
                      }}
                      className="no-jde-override jde-dropdown-item"
                    >
                      <span className="flex items-center gap-2"><ShieldCheck size={12} className="text-emerald-700" /> Trazabilidad de Aprobación & Firma</span>
                      <span className="font-mono text-[9px] text-emerald-800 bg-emerald-50 px-1">F4209</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleDispatch('jde:delete', 'Solicitud de anulación/eliminación de registro activo');
                        setToolbarDropdown(null);
                      }}
                      className="no-jde-override jde-dropdown-item text-rose-700 font-semibold hover:bg-rose-50"
                    >
                      <span className="flex items-center gap-2"><Trash2 size={12} className="text-rose-600" /> Eliminar / Anular Registro</span>
                      <span className="font-mono text-[9px] bg-rose-100 text-rose-800 px-1 font-bold">Del</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Close Button - Closes the entire ERP system */}
          <button
            onClick={handleToolbarClose}
            className="no-jde-override jde-btn h-7 text-[10.5px] text-rose-700 hover:bg-rose-50 border-rose-300"
            title="Cerrar el sistema completo y finalizar la sesión activa"
          >
            <span className="text-rose-700 font-black text-xs">✕</span>
            <span className="hidden sm:inline">Cerrar</span>
          </button>
        </div>
      </div>

      {/* About ERP Dialog Modal */}
      {showAboutDialog && (
        <div 
          className="fixed inset-0 z-[1000000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100"
          onClick={() => setShowAboutDialog(false)}
        >
          <div 
            className="bg-white border-2 border-[#002D62] rounded-xs shadow-2xl w-full max-w-lg overflow-hidden font-sans text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-[#103A60] to-[#061A2B] text-white px-4 py-2.5 border-b-2 border-[#E5A823] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info size={15} className="text-[#FFD15C]" />
                <span className="font-bold uppercase tracking-wider text-[11px]">AssetFlow Enterprise</span>
              </div>
              <button onClick={() => setShowAboutDialog(false)} className="text-slate-300 hover:text-white p-1">
                <X size={15} />
              </button>
            </div>
            <div className="p-4 space-y-3 text-slate-700">
              <div className="bg-[#F4F8FB] border border-[#A2BCCF] p-3 rounded-xs font-mono text-[10.5px]">
                <div className="text-[#002D62] font-black text-sm mb-1">AssetFlow Enterprise — PropTech, Finanzas & Compliance</div>
                <div className="text-slate-600">Edición: <strong>Enterprise Cloud Suite</strong> (Gestión Patrimonial & Contable)</div>
                <div className="text-slate-600">Servidor en Línea: <strong>Activo (Sincronización en Tiempo Real)</strong></div>
                <div className="text-slate-600">Base de Datos: <strong>Firestore Cloud DB (Cifrado & Auditoría SHA-256)</strong></div>
                <div className="text-slate-600">Entorno: <strong>PRODUCCIÓN CORPORATIVA</strong></div>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-600">
                Plataforma comercial integral para la administración de carteras inmobiliarias, arriendos, órdenes de trabajo de mantenimiento, contabilidad multilibro automatizada, facturación DTE SII y cumplimiento normativo (UAF / CMF / Ley 21.719).
              </p>
            </div>
            <div className="bg-[#E8EEF5] border-t border-[#A2BCCF] p-3 flex justify-end">
              <button 
                onClick={() => setShowAboutDialog(false)}
                className="bg-[#002D62] hover:bg-[#003B7E] text-white px-4 py-1 rounded-xs font-bold text-xs cursor-pointer"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shortcuts Guide Dialog Modal */}
      {showShortcutsDialog && (
        <div 
          className="fixed inset-0 z-[1000000] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100"
          onClick={() => setShowShortcutsDialog(false)}
        >
          <div 
            className="bg-white border-2 border-[#002D62] rounded-xs shadow-2xl w-full max-w-lg overflow-hidden font-sans text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-[#103A60] to-[#061A2B] text-white px-4 py-2.5 border-b-2 border-[#E5A823] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key size={15} className="text-[#FFD15C]" />
                <span className="font-bold uppercase tracking-wider text-[11px]">Guía de Atajos de Teclado ERP</span>
              </div>
              <button onClick={() => setShowShortcutsDialog(false)} className="text-slate-300 hover:text-white p-1">
                <X size={15} />
              </button>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto custom-audit-scroll">
              <table className="w-full text-left border border-slate-200">
                <thead className="bg-[#E2EDF8] text-[#002D62] font-mono text-[10px] uppercase">
                  <tr>
                    <th className="p-2 border-b border-slate-200">Función</th>
                    <th className="p-2 border-b border-slate-200">Atajo</th>
                    <th className="p-2 border-b border-slate-200">Descripción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[10.5px]">
                  <tr>
                    <td className="p-2 font-semibold">Buscar / Re-Query</td>
                    <td className="p-2 font-mono font-bold text-[#002D62] bg-slate-50">F5</td>
                    <td className="p-2 text-slate-600">Ejecuta consulta a Firestore</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-semibold">Ver Detalle / Form</td>
                    <td className="p-2 font-mono font-bold text-[#002D62] bg-slate-50">F4 / Enter</td>
                    <td className="p-2 text-slate-600">Abre inspección de registro</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-semibold">Trazabilidad One View</td>
                    <td className="p-2 font-mono font-bold text-[#002D62] bg-slate-50">F8</td>
                    <td className="p-2 text-slate-600">Abre trazabilidad P00901</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-semibold">Nuevo Registro</td>
                    <td className="p-2 font-mono font-bold text-[#002D62] bg-slate-50">Ctrl+N</td>
                    <td className="p-2 text-slate-600">Abre formulario de creación</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-semibold">Limpiar Filtros QBE</td>
                    <td className="p-2 font-mono font-bold text-[#002D62] bg-slate-50">Ctrl+Q</td>
                    <td className="p-2 text-slate-600">Restablece filtros de cuadrícula</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-semibold text-amber-900">Informes Recientes (WSJ)</td>
                    <td className="p-2 font-mono font-bold text-[#002D62] bg-amber-50 border border-amber-200">Ctrl+J</td>
                    <td className="p-2 text-slate-600">Abre Trabajar con Trabajos Enviados (WSJ - P986110B)</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-semibold">Exportar a Excel</td>
                    <td className="p-2 font-mono font-bold text-[#002D62] bg-slate-50">Ctrl+E</td>
                    <td className="p-2 text-slate-600">Genera archivo .xlsx</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-semibold">Imprimir / PDF</td>
                    <td className="p-2 font-mono font-bold text-[#002D62] bg-slate-50">Ctrl+P</td>
                    <td className="p-2 text-slate-600">Comprobante ERP</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-semibold">Menú Contextual Fila</td>
                    <td className="p-2 font-mono font-bold text-[#002D62] bg-slate-50">Clic Derecho</td>
                    <td className="p-2 text-slate-600">Menú ERP conectado a BD</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="bg-[#E8EEF5] border-t border-[#A2BCCF] p-3 flex justify-end">
              <button 
                onClick={() => setShowShortcutsDialog(false)}
                className="bg-[#002D62] hover:bg-[#003B7E] text-white px-4 py-1 rounded-xs font-bold text-xs cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TopBar;
