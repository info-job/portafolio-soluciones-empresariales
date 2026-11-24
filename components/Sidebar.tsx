import React, { useState } from 'react';
import { 
  Layout, Wallet, Calculator, Hammer, Users, 
  Building2, ShieldCheck, FileSpreadsheet, FileText, 
  LifeBuoy, History, BookOpen, Settings, Mail, ChevronRight,
  Search, X, FileSearch, Activity, Wrench, Terminal, HardDrive, Sparkles, Folder, Play, ClipboardList,
  LogOut, PackageCheck, GitFork, ClipboardCheck, Briefcase, Receipt, Megaphone, Rocket, GitMerge, Layers, Warehouse
} from 'lucide-react';
import { ModuleType, UserRole } from '../types';

interface SidebarProps {
  activeModule: ModuleType;
  setActiveModule: (module: ModuleType) => void;
  currentUser: string;
  userEmail?: string;
  userRole?: UserRole;
  allowedModules?: ModuleType[];
  companyLogo?: string | null;
  onLogout?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeModule, setActiveModule, currentUser, userEmail, userRole, allowedModules, companyLogo, onLogout, isCollapsed = false, onToggleCollapse }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [fastPathInput, setFastPathInput] = useState('');
  const [fastPathError, setFastPathError] = useState(false);

  // Map of AssetFlow Enterprise Program Codes (Fast Path) to ModuleType
  const fastPathMap: Record<string, ModuleType> = {
    'p0911': 'CONTABILIDAD_JDE',
    'p09216': 'CONTABILIDAD_JDE',
    'p09801': 'CONTABILIDAD_JDE',
    'r097011': 'CONTABILIDAD_JDE',
    'r04701': 'CONTABILIDAD_JDE',
    'r03b701': 'CONTABILIDAD_JDE',
    'r43500': 'CONTABILIDAD_JDE',
    'p0012': 'CONTABILIDAD_JDE',
    'f0012': 'CONTABILIDAD_JDE',
    'p0010': 'CONTABILIDAD_JDE',
    'aai': 'CONTABILIDAD_JDE',
    'integridad': 'CONTABILIDAD_JDE',
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
    'beneficiario': 'UAF_COMPLIANCE',
    'formularios': 'UAF_COMPLIANCE',
    'beneficiarios_finales': 'UAF_COMPLIANCE',
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
    'propuesta': 'PROJECTS_REPORT',
    'propuestacompleta': 'PROJECTS_REPORT',
    'p21696': 'MAPA_DATOS_LEGAL',
    'ley': 'MAPA_DATOS_LEGAL',
    'ley21696': 'MAPA_DATOS_LEGAL',
    'p0000a': 'MANUAL_USUARIO',
    'manual': 'MANUAL_USUARIO',
    'ayuda': 'MANUAL_USUARIO',
    'consultadd': 'DUE_DILIGENCIA_CONSULTA',
    'duediligence': 'DUE_DILIGENCIA_CONSULTA',
    'benford': 'BENFORD_ANALYSIS',
    'p09ben': 'BENFORD_ANALYSIS',
    'ciclo': 'CICLO_VIDA',
    'ciclovida': 'CICLO_VIDA',
    'p1501cv': 'CICLO_VIDA',
    'revision': 'REVISION_PROPIEDADES',
    'p1501rv': 'REVISION_PROPIEDADES',
    'actas': 'REVISION_PROPIEDADES',
    'historialarriendos': 'HISTORIAL_ARRIENDOS',
    'p1501ha': 'HISTORIAL_ARRIENDOS',
    'comportamiento': 'HISTORIAL_ARRIENDOS',
    'pagoarrendatarios': 'HISTORIAL_ARRIENDOS',
    'f29': 'IMPUESTOS_F29_F22',
    'f22': 'IMPUESTOS_F29_F22',
    'impuestos': 'IMPUESTOS_F29_F22',
    'sii': 'IMPUESTOS_F29_F22',
    'p029f22': 'IMPUESTOS_F29_F22',
    'dte': 'FACTURACION_DTE',
    'factura': 'FACTURACION_DTE',
    'facturas': 'FACTURACION_DTE',
    'facturacion': 'FACTURACION_DTE',
    'p4210dte': 'FACTURACION_DTE',
    'exencion': 'FACTURACION_DTE',
    'dl825': 'FACTURACION_DTE',
    'marketing': 'MARKETING_CAMPAIGNS',
    'campañas': 'MARKETING_CAMPAIGNS',
    'campanas': 'MARKETING_CAMPAIGNS',
    'publicidad': 'MARKETING_CAMPAIGNS',
    'p2026m': 'MARKETING_CAMPAIGNS',
    'ads': 'MARKETING_CAMPAIGNS',
    'golive': 'SYSTEM_LAUNCH',
    'lanzamiento': 'SYSTEM_LAUNCH',
    'p98golive': 'SYSTEM_LAUNCH',
    'launch': 'SYSTEM_LAUNCH',
    'landing': 'SYSTEM_LANDING',
    'ventas': 'SYSTEM_LANDING',
    'comprar': 'SYSTEM_LANDING',
    'landingpage': 'SYSTEM_LANDING',
    'p98landing': 'SYSTEM_LANDING',
    'p09owjob': 'BUSQUEDA_EMPLEO',
    'empleo': 'BUSQUEDA_EMPLEO',
    'empleos': 'BUSQUEDA_EMPLEO',
    'trabajo': 'BUSQUEDA_EMPLEO',
    'trabajos': 'BUSQUEDA_EMPLEO',
    'matchcv': 'BUSQUEDA_EMPLEO',
    'p43008': 'RUTAS_APROBACION',
    'rutas': 'RUTAS_APROBACION',
    'p4310': 'ORDENES',
    'oc': 'ORDENES',
    'p4310sq': 'SOLICITUDES',
    'p43214': 'CONSULTAS_JDE',
    'p43081': 'APROBACIONES_JDE',
    'p43280': 'APROBACIONES_JDE',
    'f4209': 'APROBACIONES_JDE',
    'f43092': 'APROBACIONES_JDE',
    'aprobaciones': 'APROBACIONES_JDE',
    'aprobacion': 'APROBACIONES_JDE',
    'p042004': 'CONSULTAS_JDE',
    'p09200': 'CONSULTAS_JDE',
    'consultas': 'CONSULTAS_JDE',
    'consultasjde': 'CONSULTAS_JDE',
    'inquiry': 'CONSULTAS_JDE',
    'p0001ia': 'ASISTENTE_TAREAS_IA',
    'asistentetareas': 'ASISTENTE_TAREAS_IA',
    'priorizar': 'ASISTENTE_TAREAS_IA',
    'priorizacion': 'ASISTENTE_TAREAS_IA',
    'email': 'CENTRO_DESPACHO',
    'correo': 'CENTRO_DESPACHO',
    'correos': 'CENTRO_DESPACHO',
    'gmail': 'CENTRO_DESPACHO',
    'despacho': 'CENTRO_DESPACHO',
    'p0115m': 'CENTRO_DESPACHO',
    'wms': 'LOGISTICA_WMS',
    'logistica': 'LOGISTICA_WMS',
    'bodega': 'LOGISTICA_WMS',
    'bodegas': 'LOGISTICA_WMS',
    'almacen': 'LOGISTICA_WMS',
    'inventario': 'LOGISTICA_WMS',
    'stock': 'LOGISTICA_WMS',
    'lpn': 'LOGISTICA_WMS',
    'putaway': 'LOGISTICA_WMS',
    'picking': 'LOGISTICA_WMS',
    'cardex': 'LOGISTICA_WMS',
    'kardex': 'LOGISTICA_WMS',
    'despachos': 'LOGISTICA_WMS',
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

  const handleFastPathSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = fastPathInput.trim().toLowerCase();
    const dest = fastPathMap[code];

    if (userRole === 'SOLO_EMPLEO') {
      if (dest === 'BUSQUEDA_EMPLEO') {
        setActiveModule('BUSQUEDA_EMPLEO');
        setFastPathError(false);
        setFastPathInput('');
      } else {
        setFastPathError(true);
        setTimeout(() => setFastPathError(false), 2000);
      }
      return;
    }

    if (dest) {
      if (allowedModules && !allowedModules.includes(dest)) {
        setFastPathError(true);
        setTimeout(() => setFastPathError(false), 2000);
        return;
      }
      setActiveModule(dest);
      setFastPathError(false);
      setFastPathInput('');
    } else {
      setFastPathError(true);
      setTimeout(() => setFastPathError(false), 2000);
    }
  };

  const categories = React.useMemo(() => {
    if (userRole === 'SOLO_EMPLEO') {
      return [
        {
          id: 'empleo_exclusivo',
          label: 'Portal Laboral & Empleo',
          items: [
            { id: 'BUSQUEDA_EMPLEO' as ModuleType, label: 'Búsqueda de Empleo Chile & Match CV', code: 'P09OWJOB', icon: <Briefcase size={15} className="text-amber-600 font-black animate-pulse" /> }
          ]
        }
      ];
    }

    const allCategories = [
    {
      id: 'general',
      label: 'General & Sistema',
      items: [
        { id: 'DASHBOARD', label: 'Dashboard Principal', code: 'P0000', icon: <Activity size={15} className="text-indigo-600 animate-pulse font-bold" /> },
        { id: 'TAREAS', label: 'Inicio', code: 'P0001', icon: <Layout size={15} /> },
        { id: 'ASISTENTE_TAREAS_IA', label: 'Asistente de Tareas IA (Priorización)', code: 'P0001IA', icon: <Sparkles size={15} className="text-emerald-500 animate-pulse font-bold" /> },
        { id: 'CICLO_VIDA', label: 'Ciclo de Vida de Arriendos', code: 'P1501CV', icon: <GitFork size={15} className="text-indigo-600 font-bold" /> },
        { id: 'BOVEDA_DIGITAL', label: 'Bóveda de Documentos Digital', code: 'P986110D', icon: <HardDrive size={15} className="text-indigo-600 font-bold animate-pulse" /> },
        { id: 'BROCHURE', label: 'Brochure Comercial PDF', code: 'P2026B', icon: <Sparkles size={15} className="text-amber-500 animate-pulse" /> },
        { id: 'MARKETING_CAMPAIGNS', label: 'Campañas Publicitarias & ROI B2B', code: 'P2026M', icon: <Megaphone size={15} className="text-emerald-500 animate-pulse font-bold" /> },
        { id: 'MANUAL_USUARIO', label: 'Manual de Usuario / Ayuda', code: 'P0000A', icon: <BookOpen size={15} className="text-indigo-600 animate-pulse font-bold" /> },
        { id: 'BITACORA', label: 'Libro Diario / Diario General', code: 'P0911', icon: <BookOpen size={15} /> },
        { id: 'CENTRO_DESPACHO', label: 'Centro de Despacho & Gmail API', code: 'P0115M', icon: <Mail size={15} className="text-[#0B3C5D] font-bold" /> },
      ]
    },
    {
      id: 'finanzas',
      label: 'Contabilidad General (Finance)',
      items: [
        { id: 'CONTABILIDAD_JDE', label: 'Contabilidad General ERP (P0911 / P09216)', code: 'P0911', icon: <BookOpen size={15} className="text-emerald-500 font-bold" /> },
        { id: 'INGRESOS', label: 'Módulo de Ingresos & Cobros (Cuentas por Cobrar RE)', code: 'P03B11', icon: <Wallet size={15} /> },
        { id: 'FACTURACION_DTE', label: 'Facturación DTE & Exenciones DL 825 (Art. 8g)', code: 'P4210DTE', icon: <Receipt size={15} className="text-amber-500 font-black animate-pulse" /> },
        { id: 'REGISTRO_PAGOS', label: 'Registro de Pagos, Cobros & Comprobantes Arriendo', code: 'P03B20', icon: <Receipt size={15} className="text-emerald-600 font-bold" /> },
        { id: 'EGRESOS', label: 'Módulo de Egresos (Cuentas por Pagar)', code: 'P0411', icon: <Wallet size={15} /> },
        { id: 'FINANZAS', label: 'Consultas de Mayor de Cuentas', code: 'P092102', icon: <Calculator size={15} /> },
        { id: 'LIBROS_AUXILIARES', label: 'Módulo de Libros Auxiliares', code: 'P0912AUX', icon: <BookOpen size={15} className="text-amber-500 font-bold" /> },
        { id: 'CONTROLLING', label: 'Inquiry & Financial Controlling', code: 'P09210', icon: <Activity size={15} className="text-[#002D62]" /> },
        { id: 'CASH_FLOW_RUNWAY', label: 'Cash Flow Runway Consolidador', code: 'P09220', icon: <Activity size={15} className="text-emerald-600 animate-pulse font-bold" /> },
        { id: 'CAJA_CHICA', label: 'Caja Chica y Fondos Fijos', code: 'P0002M', icon: <Wallet size={15} /> },
        { id: 'CONCILIACION', label: 'Conciliación Bancaria', code: 'P09131', icon: <Calculator size={15} /> },
        { id: 'CUENTAS', label: 'Definición Plan De Cuentas', code: 'P0901', icon: <BookOpen size={15} /> },
      ]
    },
    {
      id: 'operaciones',
      label: 'Gestión Inmobiliaria & Activos',
      items: [
        { id: 'ORDENES', label: 'Mantenimiento Órdenes de Trabajo', code: 'P48201', icon: <Hammer size={15} /> },
        { id: 'APROBACIONES_JDE', label: 'Aprobaciones de OT / OC (JDE 9.11)', code: 'P43081', icon: <GitMerge size={15} className="text-emerald-600 animate-pulse font-bold" /> },
        { id: 'CONSULTAS_JDE', label: 'Consultas AssetFlow Enterprise (P43214 / P43081)', code: 'P43214', icon: <Layers size={15} className="text-amber-500 font-bold" /> },
        { id: 'RECEPCION_OT', label: 'Recepción Técnica de OTs (F4312)', code: 'P4312', icon: <PackageCheck size={15} className="text-emerald-600 animate-pulse font-bold" /> },
        { id: 'MANTENCIONES', label: 'Expedientes de Mantención Real', code: 'P13700', icon: <Wrench size={15} /> },
        { id: 'SOLICITUDES', label: 'Solicitudes de Mantención', code: 'P18500', icon: <ClipboardList size={15} className="text-rose-600" /> },
        { id: 'PROPIEDADES', label: 'Maestro de Unidades Inmobiliarias', code: 'P1501', icon: <Building2 size={15} /> },
        { id: 'REPORTE_B4', label: 'Informe B.4 CMF (Bienes Raíces & Inversiones)', code: 'R09322', icon: <Building2 size={15} className="text-emerald-500 font-black animate-pulse" /> },
        { id: 'REPORTE_B13', label: 'Informe B.13 CMF (Cartera & Morosidad)', code: 'R09321', icon: <FileSpreadsheet size={15} className="text-indigo-600 font-bold" /> },
        { id: 'CERTIFICADOS_DOMINIO', label: 'Certificados de Dominio Vigente', code: 'P1505', icon: <FileText size={15} className="text-[#002D62]" /> },
        { id: 'CARGA_INTELIGENTE', label: 'Ingesta y Auditoría de Activos (Excel)', code: 'R15011Z1I', icon: <FileSpreadsheet size={15} className="text-emerald-600 animate-pulse" /> },
        { id: 'EVALUACION_POSTULANTES', label: 'Evaluación de Postulantes', code: 'P15013', icon: <Users size={15} /> },
        { id: 'CONTRATOS_ARRIENDO', label: 'Gestión de Contratos & Emisión de Cobros (R15132)', code: 'P15012', icon: <FileSearch size={15} /> },
        { id: 'HISTORIAL_ARRIENDOS', label: 'Historial & Comportamiento de Pago Arrendatarios', code: 'P1501HA', icon: <History size={15} className="text-emerald-700 font-bold" /> },
        { id: 'REVISION_PROPIEDADES', label: 'Revisión Física de Unidades (Actas)', code: 'P1501RV', icon: <ClipboardCheck size={15} className="text-emerald-600 font-bold" /> },
        { id: 'PROPIEDADES_INVERSION', label: 'Control Auxiliares (Fin de Mes)', code: 'M0912', icon: <FileSpreadsheet size={15} className="text-emerald-600 animate-pulse font-bold" /> },
        { id: 'GARANTIAS', label: 'Liquidación de Garantías de Arriendo', code: 'P1540', icon: <ShieldCheck size={15} className="text-teal-600 animate-pulse font-bold" /> },
        { id: 'TASACIONES', label: 'Valoración y Tasaciones Activo', code: 'P15401', icon: <Calculator size={15} /> },
        { id: 'SEGUROS', label: 'Maestro Pólizas de Seguro Activo', code: 'P44H5004', icon: <ShieldCheck size={15} /> },
        { id: 'HELPDESK', label: 'Centro Atención Help Desk Soporte', code: 'P17500', icon: <LifeBuoy size={15} /> },
        { id: 'OFICIOS', label: 'Módulo Oficios y Comunicados', code: 'P0115', icon: <Mail size={15} /> },
        { id: 'BOVEDA_DIGITAL', label: 'Bóveda de Documentos Digital', code: 'P986110D', icon: <HardDrive size={15} /> },
      ]
    },
    {
      id: 'proveedores',
      label: 'Compras & Proveedores (Procurement)',
      items: [
        { id: 'PROVEEDORES', label: 'Maestro de Proveedores / Libro de Direcciones', code: 'P01012 / P04012', icon: <Users size={15} className="text-emerald-600 font-bold" /> },
        { id: 'APROBACIONES_JDE', label: 'Aprobaciones de OT / OC (JDE 9.11)', code: 'P43081 / P43280', icon: <GitMerge size={15} className="text-amber-500 font-bold" /> },
        { id: 'DUE_DILIGENCIA', label: 'Debida Diligencia Proveedores', code: 'P01012A', icon: <ShieldCheck size={15} /> },
        { id: 'DUE_DILIGENCIA_CONSULTA', label: 'Consulta General e Interconectada', code: 'P01012B', icon: <FileSearch size={15} className="text-indigo-600 font-bold" /> },
        { id: 'UAF_COMPLIANCE', label: 'Formularios Beneficiarios Finales UAF', code: 'P0115U', icon: <ShieldCheck size={15} /> },
        { id: 'REVISION_PAGOS_SEMANALES', label: 'Auditoría Semanal de Pagos', code: 'P0411A', icon: <FileSearch size={15} /> },
      ]
    },
    {
      id: 'extra_logistica_wms',
      label: 'Extra Item: Logística & WMS',
      items: [
        { id: 'LOGISTICA_WMS', label: 'Logística & Gestión de Almacenes WMS', code: 'P4600 / P4611', icon: <Warehouse size={15} className="text-[#005B94] font-bold" /> },
      ]
    },
    {
      id: 'reportes',
      label: 'Informes de Cierre & Gobierno',
      items: [
        { id: 'REPORTE_B4', label: 'Informe B.4 CMF (Bienes Raíces & Inversiones)', code: 'R09322', icon: <Building2 size={15} className="text-emerald-500 font-black animate-pulse" /> },
        { id: 'REPORTE_B13', label: 'Informe B.13 CMF (Cartera & Morosidad)', code: 'R09321', icon: <FileSpreadsheet size={15} className="text-indigo-600 font-bold" /> },
        { id: 'CISO_REPORT', label: 'Informe Ejecutivo CISO (.PDF)', code: 'R09OWSEC', icon: <ShieldCheck size={15} className="text-indigo-600 animate-pulse" /> },
        { id: 'MAPA_DATOS_LEGAL', label: 'Mapa de Datos de Ley 21696 (Personal)', code: 'R09OWDAT', icon: <ShieldCheck size={15} className="text-emerald-600 font-bold animate-pulse" /> },
        { id: 'PROJECTS_REPORT', label: 'Propuesta Completa / Beneficios de Innovación (.PDF)', code: 'R09OWPRJ', icon: <FileText size={15} className="text-emerald-600 animate-pulse" /> },
        { id: 'CURRICULUM_CV', label: 'Mi Currículum Profesional (.WORD)', code: 'R09OWCV', icon: <FileText size={15} className="text-sky-600 font-bold animate-pulse" /> },
        { id: 'BUSQUEDA_EMPLEO', label: 'Búsqueda de Empleo Chile & Match CV', code: 'P09OWJOB', icon: <Briefcase size={15} className="text-amber-600 font-black animate-pulse" /> },
        { id: 'REVISION_REPORTES', label: 'Revisión & Corrección de Lotes', code: 'P0911R', icon: <ShieldCheck size={15} /> },
        { id: 'REPORTE_MENSUAL_GASTOS', label: 'Informe Gastos Mensual Inmobiliario IA', code: 'R09325', icon: <FileSpreadsheet size={15} className="text-emerald-600 animate-pulse" /> },
        { id: 'NOTA_14', label: 'Formulación Estados Financieros N14', code: 'R09314', icon: <FileText size={15} /> },
        { id: 'IMPUESTOS_F29_F22', label: 'Módulo de Impuestos F29 / F22 SII', code: 'P029F22', icon: <FileText size={15} className="text-amber-500 font-extrabold animate-pulse" /> },
        { id: 'BENFORD_ANALYSIS', label: 'Análisis de Benford (Control Interno)', code: 'P09BEN', icon: <ShieldCheck size={15} className="text-rose-600 font-bold animate-pulse" /> },
      ]
    },
    {
      id: 'sistema',
      label: 'Seguridad & Parámetros Base',
      items: [
        { id: 'SYSTEM_LANDING', label: 'Página Explicativa & Ventas B2B', code: 'P98LANDING', icon: <Sparkles size={15} className="text-amber-400 font-bold" /> },
        { id: 'SYSTEM_LAUNCH', label: 'Centro de Lanzamiento Global (Go-Live)', code: 'P98GOLIVE', icon: <Rocket size={15} className="text-emerald-500 font-black animate-bounce" /> },
        { id: 'SALUD_SISTEMA', label: 'Estado del Servidor de Aplicaciones', code: 'P986110', icon: <Activity size={15} /> },
        { id: 'AUDITORIA', label: 'Consola & Bitácora de Auditoría (Control Interno)', code: 'P950000', icon: <ShieldCheck size={15} className="text-indigo-600 font-black animate-pulse" /> },
        { id: 'CONFIG', label: 'Seguridad Acceso Perfiles Canales', code: 'P98OWSEC', icon: <Settings size={15} /> },
        ...(userRole === 'ADMINISTRADOR' ? [
          { id: 'RUTAS_APROBACION' as ModuleType, label: 'Rutas Jerárquicas de Aprobación ERP', code: 'P43008', icon: <GitMerge size={15} className="text-amber-500 font-bold" /> }
        ] : []),
        ...(userEmail === 'samaheim@gmail.com' || currentUser === 'samaheim@gmail.com' || currentUser === 'DEVELOPER' ? [
          { id: 'DEVELOPER_CONSOLE', label: 'Consola Interactiva Developer', code: 'P980011D', icon: <Terminal size={15} /> }
        ] : [])
      ]
    }
  ];

    if (!allowedModules) return allCategories;

    return allCategories
      .map(cat => ({
        ...cat,
        items: cat.items.filter(item => allowedModules.includes(item.id))
      }))
      .filter(cat => cat.items.length > 0);
  }, [userEmail, currentUser, userRole, allowedModules]);

  // Helper to normalize strings (diacritic-insensitive, e.g. "comunicación" matches "comunicacion")
  const normalizeStr = (str: string): string => {
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  };

  // Keyboard shortcut Ctrl + K (or Meta + K) to focus search input automatically
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const input = document.getElementById('erp-sidebar-search') as HTMLInputElement | null;
        if (input) {
          input.focus();
          input.select();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Optimized search supporting multi-term keywords & accent/diacritic independence
  const filteredCategories = React.useMemo(() => {
    const query = searchQuery.trim();
    if (!query) return categories;

    const queryTokens = normalizeStr(query).split(/\s+/).filter(Boolean);

    // Contextual synonyms map to make searches like "cobro", "cobros", "facturas" discoverable
    const moduleSynonyms: Record<string, string> = {
      'REPORTE_B4': 'b4 b.4 b 4 reporte b4 informe b4 bienes raices inversiones inmobiliarias cmf circular 1835 tasaciones periciales r09322 reservas tecnicas seil',
      'REPORTE_B13': 'b13 b.13 b 13 reporte b13 informe b13 morosidad arriendos superficies cmf seil r09321',
      'INGRESOS': 'cobro cobros cobranza cobranzas recaudacion cxc cuentas por cobrar facturacion clientes pagos arriendo renta',
      'REGISTRO_PAGOS': 'cobro cobros recaudacion pagos comprobantes recibos cancelaciones abonos cheques transferencias',
      'CONTRATOS_ARRIENDO': 'cobro cobros r15132 facturacion arrendatarios emision de cobros preaviso canon arriendo renta',
      'FACTURACION_DTE': 'cobro facturas dte sii exenciones boletas impuestos',
      'HISTORIAL_ARRIENDOS': 'cobro morosidad morosos pagos comportamiento inquilinos arriendo deudas',
      'LOGISTICA_WMS': 'logistica wms warehouse almacen bodega bodegas inventario stock sku lpn lote ubicaciones rack bin putaway picking wave conteo ciclico cardex kardex despacho embarque guia p4600 p4101 p4611 p4114 p4915 p4100 f4101 f41021 f4611 f4111 f4915 extra item'
    };

    return categories.map(category => {
      const matchedItems = category.items.filter(item => {
        const extraKeywords = moduleSynonyms[item.id] || '';
        const itemText = normalizeStr(`${item.label} ${item.code} ${category.label} ${extraKeywords}`);
        return queryTokens.every(token => itemText.includes(token));
      });
      return {
        ...category,
        items: matchedItems
      };
    }).filter(category => category.items.length > 0);
  }, [searchQuery, categories]);

  // Handle Enter key inside search to select the first matched item
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim() && filteredCategories.length > 0) {
      const firstCategory = filteredCategories[0];
      if (firstCategory && firstCategory.items.length > 0) {
        const firstItem = firstCategory.items[0];
        setActiveModule(firstItem.id as ModuleType);
      }
    }
  };

  // Helper inside render to highlight matched text nicely for visual UX feedback
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return <span>{text}</span>;
    
    const normText = normalizeStr(text);
    const tokens = normalizeStr(query).split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return <span>{text}</span>;

    // Try to find the exact full query match first
    const fullNormQuery = normalizeStr(query);
    const fullIdx = normText.indexOf(fullNormQuery);
    if (fullIdx !== -1) {
      const start = text.substring(0, fullIdx);
      const match = text.substring(fullIdx, fullIdx + query.length);
      const end = text.substring(fullIdx + query.length);
      return (
        <span>
          {start}
          <mark className="bg-[#FFCC00]/45 text-slate-900 font-extrabold px-0.5 rounded-xs select-none">{match}</mark>
          {end}
        </span>
      );
    }

    // Try first word token match
    const primaryToken = tokens[0];
    const tokenIdx = normText.indexOf(primaryToken);
    if (tokenIdx !== -1) {
      const start = text.substring(0, tokenIdx);
      const match = text.substring(tokenIdx, tokenIdx + primaryToken.length);
      const end = text.substring(tokenIdx + primaryToken.length);
      return (
        <span>
          {start}
          <mark className="bg-[#FFCC00]/45 text-slate-900 font-extrabold px-0.5 rounded-xs select-none">{match}</mark>
          {end}
        </span>
      );
    }

    return <span>{text}</span>;
  };

  return (
    <div className={`bg-[#EBF0F5] h-full flex flex-col border-r border-[#9DB2C3] z-50 overflow-hidden no-print font-sans select-none transition-all duration-300 ${isCollapsed ? 'w-0 border-r-0' : 'w-80'}`}>
      
      {/* 
        ========================================================================
        ASSETFLOW ENTERPRISE NAVIGATOR HEADER (#002C5B)
        ========================================================================
      */}
      <div className="bg-[#002C5B] px-3.5 py-2.5 text-white border-b border-[#001B3B] flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[#38BDF8] font-black text-xs font-sans tracking-tight">ASSETFLOW</span>
            <span className="h-3 w-[1px] bg-white/30"></span>
            <span className="text-[11px] font-bold text-slate-100 tracking-tight font-sans">
              Enterprise Suite
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[8px] bg-[#004B7B] text-amber-300 border border-[#003B66] px-1 py-0.2 font-mono font-bold uppercase tracking-wider rounded-xs">
              PRO
            </span>
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="p-1 hover:bg-white/10 rounded-xs text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center justify-center"
                title="Contraer Navegador"
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {/* User Info Bar */}
        <div className="flex items-center justify-between bg-[#001B3B]/60 px-2 py-1 border border-white/10 text-[9.5px]">
          <div className="flex items-center gap-1.5 truncate">
            <ShieldCheck size={13} className="text-emerald-400 shrink-0" />
            <span className="text-slate-200 font-mono truncate">{currentUser}</span>
          </div>
          <span className="text-amber-400 font-mono font-bold text-[8.5px] uppercase shrink-0">
            [{userRole || '*ALL'}]
          </span>
        </div>
      </div>

      {/* 
        ========================================================================
        ERP NAVIGATOR TABS: MENÚS / FAVORITOS / RECIENTES
        ========================================================================
      */}
      <div className="bg-[#D2DFEC] px-2 pt-1 border-b border-[#9DB2C3] flex items-center gap-1 text-[10px] font-sans font-bold shrink-0">
        <button
          className="bg-white text-[#002D62] border-t border-x border-[#9DB2C3] px-2.5 py-1 -mb-[1px] rounded-t-xs shadow-3xs flex items-center gap-1"
        >
          <span>📁</span>
          <span>Navegador</span>
        </button>
        <button
          onClick={() => setActiveModule('TAREAS')}
          className="text-slate-600 hover:text-[#002D62] hover:bg-white/50 px-2 py-1 transition-colors flex items-center gap-1 cursor-pointer"
        >
          <span>⭐</span>
          <span>Favoritos</span>
        </button>
        <button
          onClick={() => setActiveModule('AUDITORIA')}
          className="text-slate-600 hover:text-[#002D62] hover:bg-white/50 px-2 py-1 transition-colors flex items-center gap-1 cursor-pointer"
        >
          <span>🕒</span>
          <span>Recientes</span>
        </button>
      </div>

      {/* 
        ========================================================================
        SEARCH & QBE FILTER FOR NAVIGATOR ITEMS
        ========================================================================
      */}
      <div className="p-2 bg-[#E1EDF7] border-b border-[#9DB2C3] flex items-center gap-1.5 shrink-0">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
            <Search size={11} className="text-[#005B94]" />
          </span>
          <input
            id="erp-sidebar-search"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Filtrar tareas o códigos (ej: P0911)..."
            className="w-full bg-white border border-[#9DB2C3] text-slate-900 text-[10.5px] pl-6 pr-12 py-1 focus:outline-none focus:border-[#005B94] focus:bg-[#FFFFE1] font-sans placeholder:text-slate-400"
          />
          {!searchQuery && (
            <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[8px] font-mono bg-slate-100 text-slate-500 border border-slate-300 px-1 py-0.2 pointer-events-none select-none">
              Ctrl+K
            </kbd>
          )}
          {searchQuery && (
            <button 
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-2 flex items-center text-slate-400 hover:text-slate-800"
            >
              <X size={11} />
            </button>
          )}
        </div>
      </div>

      {/* 
        ========================================================================
        ERP TASK INDEX TREE VIEW
        ========================================================================
      */}
      <div className="flex-1 overflow-y-auto bg-[#F4F7F9]">
        {filteredCategories.length > 0 ? (
          filteredCategories.map((category) => (
            <div key={category.id} className="border-b border-[#D2DFEC]">
              
              {/* Category Folder Header */}
              <div className="bg-gradient-to-r from-[#E2ECF5] to-[#D5E4F2] px-3 py-1.5 flex items-center justify-between border-b border-[#C8DFEE]">
                <div className="flex items-center gap-1.5">
                  <Folder size={12} className="text-amber-600 fill-[#FFCC00]/30 shrink-0" />
                  <span className="text-[10px] font-bold text-[#002D62] uppercase tracking-tight font-sans">
                    {category.label}
                  </span>
                </div>
                {searchQuery && (
                  <span className="text-[8.5px] bg-[#002D62] text-amber-300 px-1.5 py-0.2 font-mono font-bold rounded-xs shadow-3xs">
                    {category.items.length}
                  </span>
                )}
              </div>

              {/* Programs List inside Category */}
              <div className="bg-white">
                {category.items.map((item) => {
                  const isSelected = activeModule === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveModule(item.id as ModuleType)}
                      className={`w-full flex items-center justify-between px-3 py-1.5 border-b border-[#EEF2F6] text-left transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-[#CBE2F3] text-[#002D62] border-l-3 border-l-[#005B94] font-bold shadow-3xs' 
                          : 'hover:bg-[#FFFCDD] text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`shrink-0 ${isSelected ? 'text-[#005B94]' : 'text-slate-600'}`}>
                          {item.icon}
                        </span>
                        <div className="flex flex-col min-w-0 leading-tight">
                           <span className="text-[10.5px] truncate font-sans text-slate-800">{highlightText(item.label, searchQuery)}</span>
                           <span className={`text-[8.5px] font-mono tracking-wide uppercase ${
                            isSelected ? 'text-[#002D62] font-black' : 'text-slate-600 font-bold'
                          }`}>
                            [{highlightText(item.code, searchQuery)}]
                          </span>
                        </div>
                      </div>
                      <ChevronRight size={10} className={`${isSelected ? 'text-[#005B94]' : 'text-slate-500'} shrink-0`} />
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center bg-white border border-dashed border-[#C5D3E2] m-3">
            <X size={18} className="text-rose-600 mx-auto mb-2" />
            <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest">Código o tarea no encontrado</p>
          </div>
        )}
      </div>

      {/* 
        ========================================================================
        FAST PATH INPUT FORM AT BOTTOM OF NAVIGATOR
        ========================================================================
      */}
      <div className="p-2.5 bg-[#DCE7F2] border-t border-[#9DB2C3] shrink-0">
        <form onSubmit={handleFastPathSubmit} className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-[9px] font-bold text-[#002D62] uppercase tracking-wider font-mono">
            <span>Acceso Rápido (Fast Path):</span>
            {fastPathError && (
              <span className="text-rose-600 text-[8.5px] font-black animate-pulse">
                [NO ENCONTRADO]
              </span>
            )}
          </div>
          <div className="flex gap-1">
            <input
              type="text"
              value={fastPathInput}
              onChange={(e) => setFastPathInput(e.target.value)}
              placeholder="Ej: P0911, P0411, P48201..."
              className={`flex-1 bg-white border ${fastPathError ? 'border-rose-500 bg-rose-50' : 'border-[#9DB2C3]'} text-[#002D62] text-[10.5px] font-mono font-bold uppercase px-2 py-1 focus:outline-none focus:bg-[#FFFFE1] focus:border-[#005B94]`}
            />
            <button 
              type="submit" 
              className="jde-btn h-7 text-[9.5px] uppercase font-mono tracking-wider"
            >
              Ir
            </button>
          </div>
        </form>
      </div>

      {/* 
        ========================================================================
        SYSTEM STATUS FOOTNOTE
        ========================================================================
      */}
      <div className="px-2 py-1 bg-[#E1EDF7] border-t border-[#9DB2C3] text-center text-[8px] font-mono text-[#002D62] tracking-wider uppercase font-bold shrink-0">
        ASSETFLOW ENTERPRISE • AIS ACTIVE
      </div>
    </div>
  );
};

export default Sidebar;
