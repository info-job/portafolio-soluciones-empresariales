import { ModuleType, UserAccount, UserRole } from '../types';

export interface ModuleDefinition {
  id: ModuleType;
  label: string;
  code: string;
  category: string;
  description: string;
}

export interface ModuleCategoryGroup {
  id: string;
  label: string;
  description: string;
  modules: ModuleDefinition[];
}

export const SYSTEM_MODULE_GROUPS: ModuleCategoryGroup[] = [
  {
    id: 'general',
    label: 'General & Sistema',
    description: 'Tableros de mando, ciclo de vida, bóveda digital y manuales del sistema',
    modules: [
      { id: 'DASHBOARD', label: 'Dashboard Principal de Activos', code: 'P0000', category: 'general', description: 'Visión consolidada ejecutiva de activos, KPIs y alertas' },
      { id: 'TAREAS', label: 'Inicio y Flujos Operativos', code: 'P0001', category: 'general', description: 'Bandeja de tareas pendientes, autorizaciones y workflows' },
      { id: 'ASISTENTE_TAREAS_IA', label: 'Asistente de Tareas IA (Gemini)', code: 'P0001IA', category: 'general', description: 'Priorización automática de tareas del TaskCenter según vencimientos y criticidad de Órdenes de Trabajo pendientes' },
      { id: 'CICLO_VIDA', label: 'Ciclo de Vida de Arriendos', code: 'P1501CV', category: 'general', description: 'Trazabilidad integral de ocupación, contratos y renovaciones' },
      { id: 'BOVEDA_DIGITAL', label: 'Bóveda de Documentos Digital', code: 'P986110D', category: 'general', description: 'Almacén documental centralizado de contratos, escrituras y pólizas' },
      { id: 'BROCHURE', label: 'Brochure Comercial PDF Generador', code: 'P2026B', category: 'general', description: 'Generador de fichas y catálogos comerciales para clientes' },
      { id: 'MARKETING_CAMPAIGNS', label: 'Campañas Publicitarias & ROI B2B', code: 'P2026M', category: 'general', description: 'Gestión y retorno de inversión de campañas de captación B2B' },
      { id: 'MANUAL_USUARIO', label: 'Manual de Usuario / Ayuda del Sistema', code: 'P0000A', category: 'general', description: 'Guías paso a paso, glosario de errores y manuales interactivos' },
      { id: 'BITACORA', label: 'Libro Diario / Diario General', code: 'P0911', category: 'general', description: 'Registro cronológico e inmutable de movimientos contables' },
      { id: 'CENTRO_DESPACHO', label: 'Centro de Despacho & Correos Automatizados Gmail', code: 'P0115M', category: 'general', description: 'Despacho automatizado de reportes, propuestas y balances vía Google Workspace Gmail API' }
    ]
  },
  {
    id: 'finanzas',
    label: 'Contabilidad General & Finanzas',
    description: 'Cuentas por cobrar, cuentas por pagar, mayor, libros auxiliares y caja chica',
    modules: [
      { id: 'INGRESOS', label: 'Módulo de Ingresos & Cobros (Cuentas por Cobrar RE)', code: 'P03B11', category: 'finanzas', description: 'Cobranza de cánones de arriendo, liquidación de siniestros, emisión de cobros y facturación' },
      { id: 'FACTURACION_DTE', label: 'Facturación Electrónica DTE & Exenciones DL 825 (Art. 8g)', code: 'P4210DTE', category: 'finanzas', description: 'Emisión de facturas electrónicas (DTE 33/34), banco de pruebas y cumplimiento tributario DL 825 Art. 8g' },
      { id: 'REGISTRO_PAGOS', label: 'Registro de Pagos, Cobros & Comprobantes Arriendo', code: 'P03B20', category: 'finanzas', description: 'Comprobantes de recaudación y cobros, depósitos bancarios y conciliación de arriendos' },
      { id: 'EGRESOS', label: 'Módulo de Egresos (Cuentas por Pagar AP)', code: 'P0411', category: 'finanzas', description: 'Pagos a proveedores, nóminas, servicios básicos y gastos operativos' },
      { id: 'FINANZAS', label: 'Consultas de Mayor de Cuentas', code: 'P092102', category: 'finanzas', description: 'Consulta de saldos de mayor, balances y movimientos contables F0911' },
      { id: 'LIBROS_AUXILIARES', label: 'Módulo de Libros Auxiliares', code: 'P0912AUX', category: 'finanzas', description: 'Libros de compras, ventas y auxiliares de retenciones tributarias' },
      { id: 'CONTROLLING', label: 'Inquiry & Financial Controlling', code: 'P09210', category: 'finanzas', description: 'Control de gestión financiera, desviaciones presupuestarias y márgenes' },
      { id: 'CASH_FLOW_RUNWAY', label: 'Cash Flow Runway Consolidador', code: 'P09220', category: 'finanzas', description: 'Proyección de flujo de caja, meses de pista financiera y liquidez' },
      { id: 'CAJA_CHICA', label: 'Caja Chica y Fondos Fijos', code: 'P0002M', category: 'finanzas', description: 'Rendiciones de gastos menores, reposiciones y control de comprobantes' },
      { id: 'CONCILIACION', label: 'Conciliación Bancaria Automática', code: 'P09131', category: 'finanzas', description: 'Cruce automático de cartolas bancarias vs registros del mayor contable' },
      { id: 'CUENTAS', label: 'Definición Plan De Cuentas', code: 'P0901', category: 'finanzas', description: 'Estructura analítica del catálogo de cuentas contables empresariales' },
      { id: 'CONTABILIDAD_JDE', label: 'Contabilidad General ERP (P0911 / P09216 / P09801)', code: 'P0911', category: 'finanzas', description: 'Módulo integral de contabilidad general al estilo AssetFlow Enterprise: Asientos de diario F0911, control de lotes F0011, mayor interactivo P09200, balance de 8 columnas P09216 y posteo R09801' }
    ]
  },
  {
    id: 'operaciones',
    label: 'Gestión Inmobiliaria & Activos',
    description: 'Órdenes de trabajo, contratos de arriendo, propiedades, tasaciones y garantías',
    modules: [
      { id: 'ORDENES', label: 'Mantenimiento Órdenes de Trabajo (OT)', code: 'P48201', category: 'operaciones', description: 'Creación, costeo y autorización de órdenes de trabajo de mantenimiento' },
      { id: 'APROBACIONES_JDE', label: 'Aprobaciones de OT / OC (JDE P43081)', code: 'P43081', category: 'operaciones', description: 'Bandeja multinivel de aprobación de órdenes de trabajo y compra, motor de auditoría pre-firma, subrogancias F43092 y bitácora F4209' },
      { id: 'CONSULTAS_JDE', label: 'Consultas AssetFlow Enterprise (P43214 / P43081 / P042004)', code: 'P43214', category: 'operaciones', description: 'Centro integral de consultas interconectadas: Órdenes y líneas F4311, bandeja de aprobación P43081, mayor de proveedores P042004 y cruce 3-vías P4312Q' },
      { id: 'RECEPCION_OT', label: 'Recepción Técnica de OTs (F4312)', code: 'P4312', category: 'operaciones', description: 'Recepción conforme en terreno, registro fotográfico y cotejo de facturas' },
      { id: 'MANTENCIONES', label: 'Expedientes de Mantención Real', code: 'P13700', category: 'operaciones', description: 'Historial técnico de reparaciones preventivas y correctivas por unidad' },
      { id: 'SOLICITUDES', label: 'Solicitudes de Mantención Inquilinos', code: 'P18500', category: 'operaciones', description: 'Tickets y requerimientos canalizados por arrendatarios residenciales/comerciales' },
      { id: 'PROPIEDADES', label: 'Maestro de Unidades Inmobiliarias', code: 'P1501', category: 'operaciones', description: 'Padrón de activos, direcciones, roles SII, avalúos y destinos' },
      { id: 'CERTIFICADOS_DOMINIO', label: 'Certificados de Dominio Vigente', code: 'P1505', category: 'operaciones', description: 'Custodia digital de certificados CBR, fojas, números y años de inscripción' },
      { id: 'CARGA_INTELIGENTE', label: 'Ingesta y Auditoría de Activos (Excel)', code: 'R15011Z1I', category: 'operaciones', description: 'Carga masiva inteligente de planillas Excel con homologación automática' },
      { id: 'EVALUACION_POSTULANTES', label: 'Evaluación de Postulantes a Arriendo', code: 'P15013', category: 'operaciones', description: 'Scoring crediticio, verificación de ingresos y scoring de candidatos' },
      { id: 'CONTRATOS_ARRIENDO', label: 'Gestión de Contratos de Arriendo', code: 'P15012', category: 'operaciones', description: 'Generación, cláusulas legales, reajustes en UF y seguimiento contractual' },
      { id: 'HISTORIAL_ARRIENDOS', label: 'Historial & Morosidad Arrendatarios', code: 'P1501HA', category: 'operaciones', description: 'Comportamiento histórico de pago y scoring de riesgo del inquilino' },
      { id: 'REVISION_PROPIEDADES', label: 'Revisión Física de Unidades (Actas)', code: 'P1501RV', category: 'operaciones', description: 'Actas de entrega, inspecciones de salida y registro de estados de conservación' },
      { id: 'PROPIEDADES_INVERSION', label: 'Control Auxiliares (Fin de Mes)', code: 'M0912', category: 'operaciones', description: 'Cálculo de depreciación contable acumulada y valor residual según NIIF' },
      { id: 'GARANTIAS', label: 'Liquidación de Garantías de Arriendo', code: 'P1540', category: 'operaciones', description: 'Custodia, deducciones por daños/servicios y finiquitos de garantía' },
      { id: 'TASACIONES', label: 'Valoración y Tasaciones de Activos', code: 'P15401', category: 'operaciones', description: 'Estudios de mercado, valores UF/m2 y vigencia de informes periciales' },
      { id: 'SEGUROS', label: 'Maestro Pólizas de Seguro de Activos', code: 'P44H5004', category: 'operaciones', description: 'Pólizas de incendio, sismo y responsabilidad civil con coberturas y vigencias' },
      { id: 'HELPDESK', label: 'Centro de Atención Help Desk Soporte', code: 'P17500', category: 'operaciones', description: 'Mesa de ayuda y soporte técnico a usuarios del sistema ERP' },
      { id: 'OFICIOS', label: 'Módulo Oficios y Comunicados', code: 'P0115', category: 'operaciones', description: 'Comunicaciones formales a copropietarios, arrendatarios y administraciones' }
    ]
  },
  {
    id: 'proveedores',
    label: 'Compras & Proveedores (Procurement)',
    description: 'Directorio de contratistas, debida diligencia, UAF y auditoría de pagos semanales',
    modules: [
      { id: 'PROVEEDORES', label: 'Directorio Maestro de Proveedores', code: 'P04012', category: 'proveedores', description: 'Registro de empresas contratistas, datos bancarios y categorización' },
      { id: 'DUE_DILIGENCIA', label: 'Debida Diligencia de Proveedores', code: 'P01012A', category: 'proveedores', description: 'Investigación de antecedentes legales, comerciales y riesgos éticos' },
      { id: 'DUE_DILIGENCIA_CONSULTA', label: 'Consulta General e Interconectada', code: 'P01012B', category: 'proveedores', description: 'Matriz cruzada de contratistas, solvencia y cumplimiento documental' },
      { id: 'UAF_COMPLIANCE', label: 'Formularios Beneficiarios Finales UAF', code: 'P0115U', category: 'proveedores', description: 'Declaraciones juradas Ley 19.913, personas expuestas políticamente (PEP)' },
      { id: 'REVISION_PAGOS_SEMANALES', label: 'Auditoría Semanal de Pagos', code: 'P0411A', category: 'proveedores', description: 'Revisión y V°B° previo a nóminas de transferencia masiva a proveedores' }
    ]
  },
  {
    id: 'reportes',
    label: 'Informes de Cierre & Gobierno',
    description: 'Reportes regulados CMF, impuestos SII, auditoría forense y portal laboral',
    modules: [
      { id: 'REPORTE_B4', label: 'Informe B.4 CMF (Bienes Raíces & Inversiones)', code: 'R09322', category: 'reportes', description: 'Declaración mensual CMF Circular 1.835 de bienes raíces, tasaciones periciales, superficies y reservas técnicas' },
      { id: 'REPORTE_B13', label: 'Informe B.13 CMF (Cartera & Morosidad)', code: 'R09321', category: 'reportes', description: 'Consolidado oficial de morosidad, tramos de mora (M$), superficies y valor por m²' },
      { id: 'NOTA_14', label: 'Formulación Estados Financieros N14', code: 'R09314', category: 'reportes', description: 'Nota explicativa N° 14 de propiedades de inversión bajo IFRS' },
      { id: 'IMPUESTOS_F29_F22', label: 'Módulo de Impuestos F29 / F22 SII', code: 'P029F22', category: 'reportes', description: 'Declaración mensual IVA/PPM y balance para Operación Renta anual F22' },
      { id: 'BENFORD_ANALYSIS', label: 'Análisis de Benford (Control Interno)', code: 'P09BEN', category: 'reportes', description: 'Auditoría forense matemática para detección temprana de fraude en montos' },
      { id: 'REVISION_REPORTES', label: 'Revisión & Corrección de Lotes', code: 'P0911R', category: 'reportes', description: 'Cotejo y corrección de inconsistencias antes de despachos regulatorios' },
      { id: 'REPORTE_MENSUAL_GASTOS', label: 'Informe Gastos Mensual Inmobiliario IA', code: 'R09325', category: 'reportes', description: 'Resumen ejecutivo con análisis cognitivo de tendencias de costo' },
      { id: 'CISO_REPORT', label: 'Informe Ejecutivo CISO (.PDF)', code: 'R09OWSEC', category: 'reportes', description: 'Evaluación técnica de ciberseguridad, ISO 27001 y blindaje perimetral' },
      { id: 'MAPA_DATOS_LEGAL', label: 'Mapa de Datos de Ley 21696 (Personal)', code: 'R09OWDAT', category: 'reportes', description: 'Cumplimiento normativo de protección de datos personales de usuarios' },
      { id: 'PROJECTS_REPORT', label: 'Propuesta Completa de Innovación (.PDF)', code: 'R09OWPRJ', category: 'reportes', description: 'Documento técnico de justificación económica y ROI de innovación' },
      { id: 'BUSQUEDA_EMPLEO', label: 'Búsqueda de Empleo Chile & Match CV', code: 'P09OWJOB', category: 'reportes', description: 'Consolidador de ofertas laborales chilenas, match de competencias y cartas' }
    ]
  },
  {
    id: 'extra_logistica',
    label: 'Extra Item: Logística & WMS (Independiente)',
    description: 'Módulo independiente Supply Chain Management & Warehouse Management System al estilo JD Edwards (F4101 / F41021 / F4611 / F4111 / F4915)',
    modules: [
      {
        id: 'LOGISTICA_WMS',
        label: 'Logística & Gestión de Almacenes WMS (P4600 / P4101 / F4611)',
        code: 'P4600',
        category: 'extra_logistica',
        description: 'Sistema integral de Logística y WMS independiente del rubro inmobiliario: Maestro F4101, Ubicaciones F4100/F4602, Saldos LPN/Lote F41021, Putaway/Picking/Conteo F4611, Cardex F4111 y Embarques F4915'
      }
    ]
  },
  {
    id: 'sistema',
    label: 'Seguridad & Parámetros Base',
    description: 'Gestión de perfiles de acceso, bitácoras de auditoría y salud del servidor',
    modules: [
      { id: 'CONFIG', label: 'Seguridad Acceso Perfiles Canales', code: 'P98OWSEC', category: 'sistema', description: 'Administración de usuarios, asignación granular de módulos y auditorías ISO' },
      { id: 'AUDITORIA', label: 'Consola & Bitácora de Auditoría', code: 'P950000', category: 'sistema', description: 'Trazabilidad estricta de cambios, accesos y transacciones en el sistema' },
      { id: 'SALUD_SISTEMA', label: 'Estado del Servidor de Aplicaciones', code: 'P986110', category: 'sistema', description: 'Monitoreo de latencia, almacenamiento y estado de servicios en la nube' },
      { id: 'RUTAS_APROBACION', label: 'Rutas Jerárquicas de Aprobación ERP', code: 'P43008', category: 'sistema', description: 'Configuración y jerarquías de autorizaciones para órdenes y solicitudes (Solo Administrador)' },
      { id: 'SYSTEM_LAUNCH', label: 'Centro de Lanzamiento Global (Go-Live)', code: 'P98GOLIVE', category: 'sistema', description: 'Consola de despliegue y puesta en marcha corporativa' },
      { id: 'SYSTEM_LANDING', label: 'Página Explicativa & Ventas B2B', code: 'P98LANDING', category: 'sistema', description: 'Portal introductorio institucional y presentación del ecosistema' },
      { id: 'DEVELOPER_CONSOLE', label: 'Consola Interactiva Developer', code: 'P980011D', category: 'sistema', description: 'Herramienta técnica para desarrolladores y superadministradores' }
    ]
  }
];

// Flat list of all module definitions
export const ALL_SYSTEM_MODULES: ModuleDefinition[] = SYSTEM_MODULE_GROUPS.flatMap(g => g.modules);

// Set of all module IDs
export const ALL_MODULE_IDS: ModuleType[] = ALL_SYSTEM_MODULES.map(m => m.id);

/**
 * Returns the default recommended modules for each predefined user role.
 */
export const getDefaultModulesForRole = (role?: UserRole | string): ModuleType[] => {
  if (!role) return ['DASHBOARD', 'TAREAS', 'MANUAL_USUARIO'];
  if (role === 'SOLO_EMPLEO') {
    return ['BUSQUEDA_EMPLEO'];
  }

  if (role === 'ADMINISTRADOR') {
    return [...ALL_MODULE_IDS];
  }

  if (role === 'JEFE') {
    return [
      'DASHBOARD', 'TAREAS', 'CENTRO_DESPACHO', 'CICLO_VIDA', 'BOVEDA_DIGITAL', 'BROCHURE', 'MARKETING_CAMPAIGNS', 'MANUAL_USUARIO', 'BITACORA',
      'INGRESOS', 'FACTURACION_DTE', 'REGISTRO_PAGOS', 'EGRESOS', 'FINANZAS', 'LIBROS_AUXILIARES', 'CONTROLLING', 'CASH_FLOW_RUNWAY', 'CAJA_CHICA', 'CONCILIACION', 'CUENTAS', 'CONTABILIDAD_JDE',
      'ORDENES', 'APROBACIONES_JDE', 'CONSULTAS_JDE', 'RECEPCION_OT', 'MANTENCIONES', 'SOLICITUDES', 'PROPIEDADES', 'CERTIFICADOS_DOMINIO', 'CARGA_INTELIGENTE', 'EVALUACION_POSTULANTES', 'CONTRATOS_ARRIENDO', 'HISTORIAL_ARRIENDOS', 'REVISION_PROPIEDADES', 'PROPIEDADES_INVERSION', 'GARANTIAS', 'TASACIONES', 'SEGUROS', 'HELPDESK', 'OFICIOS',
      'PROVEEDORES', 'DUE_DILIGENCIA', 'DUE_DILIGENCIA_CONSULTA', 'UAF_COMPLIANCE', 'REVISION_PAGOS_SEMANALES',
      'REPORTE_B13', 'REPORTE_B4', 'CISO_REPORT', 'MAPA_DATOS_LEGAL', 'PROJECTS_REPORT', 'BUSQUEDA_EMPLEO', 'REVISION_REPORTES', 'REPORTE_MENSUAL_GASTOS', 'NOTA_14', 'IMPUESTOS_F29_F22', 'BENFORD_ANALYSIS',
      'LOGISTICA_WMS',
      'AUDITORIA', 'SALUD_SISTEMA'
    ];
  }

  if (role === 'EJECUTIVO') {
    return [
      'DASHBOARD', 'TAREAS', 'CENTRO_DESPACHO', 'CICLO_VIDA', 'BOVEDA_DIGITAL', 'MANUAL_USUARIO',
      'INGRESOS', 'FACTURACION_DTE', 'REGISTRO_PAGOS', 'EGRESOS', 'CAJA_CHICA', 'CONTABILIDAD_JDE',
      'ORDENES', 'APROBACIONES_JDE', 'CONSULTAS_JDE', 'RECEPCION_OT', 'MANTENCIONES', 'SOLICITUDES', 'PROPIEDADES', 'CERTIFICADOS_DOMINIO', 'CONTRATOS_ARRIENDO', 'HISTORIAL_ARRIENDOS', 'REVISION_PROPIEDADES', 'GARANTIAS', 'TASACIONES', 'SEGUROS', 'HELPDESK', 'OFICIOS',
      'PROVEEDORES',
      'REPORTE_B4', 'REPORTE_B13',
      'LOGISTICA_WMS',
      'BUSQUEDA_EMPLEO'
    ];
  }

  if (role === 'CLIENTE_DEMO') {
    return [
      'SYSTEM_LANDING',
      'DASHBOARD',
      'PROPIEDADES',
      'CONTRATOS_ARRIENDO',
      'ORDENES',
      'SOLICITUDES',
      'LOGISTICA_WMS',
      'TAREAS',
      'BROCHURE',
      'MANUAL_USUARIO'
    ];
  }

  if (role === 'ARRENDATARIO') {
    return ['DASHBOARD', 'SOLICITUDES', 'MANUAL_USUARIO'];
  }

  return ['DASHBOARD', 'TAREAS', 'MANUAL_USUARIO', 'BUSQUEDA_EMPLEO'];
};

/**
 * Returns the effective list of allowed modules for a given user account.
 * If user has explicitly configured allowedModules, returns those.
 * Otherwise, falls back to the default modules for their role.
 */
export const getUserEffectiveAllowedModules = (userAccount?: UserAccount | null, userEmail?: string, userName?: string): ModuleType[] => {
  // Developer or project owner has full bypass
  if (userEmail === 'samaheim@gmail.com' || userName === 'DEVELOPER' || userName === 'samaheim@gmail.com') {
    return [...ALL_MODULE_IDS];
  }

  // Basic client demo role is strictly locked to safe showcase modules (checked before !userAccount fallback)
  if (userAccount?.role === 'CLIENTE_DEMO' || userName === 'CLIENTE DEMO') {
    return getDefaultModulesForRole('CLIENTE_DEMO');
  }

  // Restricted SOLO_EMPLEO role is strictly locked to BUSQUEDA_EMPLEO
  if (userAccount?.role === 'SOLO_EMPLEO' || (userName && (userName.includes('PIÑA') || userName.includes('PINA')))) {
    return ['BUSQUEDA_EMPLEO'];
  }

  if (!userAccount) {
    return ['SYSTEM_LANDING', 'DASHBOARD', 'TAREAS', 'MANUAL_USUARIO'];
  }

  // If the user has custom configured allowed modules, respect them
  if (Array.isArray(userAccount.allowedModules) && userAccount.allowedModules.length > 0) {
    return userAccount.allowedModules;
  }

  // Fallback to role-based defaults
  return getDefaultModulesForRole(userAccount.role);
};

/**
 * Checks whether a user account has permission to access a specific module.
 */
export const isModuleAllowed = (
  module: ModuleType,
  userAccount?: UserAccount | null,
  userEmail?: string,
  userName?: string
): boolean => {
  // Developer or project owner has full bypass
  if (userEmail === 'samaheim@gmail.com' || userName === 'DEVELOPER' || userName === 'samaheim@gmail.com') {
    return true;
  }

  if (userAccount?.role === 'CLIENTE_DEMO' || userName === 'CLIENTE DEMO') {
    return getDefaultModulesForRole('CLIENTE_DEMO').includes(module);
  }

  if (userAccount?.role === 'SOLO_EMPLEO' || (userName && (userName.includes('PIÑA') || userName.includes('PINA')))) {
    return module === 'BUSQUEDA_EMPLEO';
  }

  if (!userAccount) return false;

  const effectiveModules = getUserEffectiveAllowedModules(userAccount, userEmail, userName);
  return effectiveModules.includes(module);
};
