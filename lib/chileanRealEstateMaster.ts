/**
 * Maestro Territorial y Directorio de Servicios Básicos Estandarizados de Chile
 * Compatible con la arquitectura ERP Enterprise (Módulos Real Estate RE-15 y Address Book AB-01)
 */

import { ChileanUtilityType } from '../types';

export interface ChileRegionDef {
  code: string; // ej: 'RM', 'V', 'VIII'
  number: string; // ej: '13', '05', '08'
  name: string; // ej: 'Región Metropolitana de Santiago'
  shortName: string; // ej: 'Metropolitana'
  communes: string[];
}

export const CHILE_TERRITORY_MASTER: ChileRegionDef[] = [
  {
    code: 'RM',
    number: '13',
    name: 'Región Metropolitana de Santiago',
    shortName: 'Metropolitana',
    communes: [
      'SANTIAGO', 'LAS CONDES', 'PROVIDENCIA', 'ÑUÑOA', 'VITACURA', 'LO BARNECHEA',
      'LA REINA', 'MACUL', 'SAN MIGUEL', 'SAN JOAQUÍN', 'LA FLORIDA', 'PEÑALOLÉN',
      'MAIPÚ', 'PUDAHUEL', 'ESTACIÓN CENTRAL', 'QUINTA NORMAL', 'RECOLETA', 'INDEPENDENCIA',
      'CONCHALÍ', 'HUECHURABA', 'QUILICURA', 'RENCA', 'CERRO NAVIA', 'LO PRADO',
      'CERRILLOS', 'PEDRO AGUIRRE CERDA', 'SAN RAMÓN', 'LA CISTERNA', 'LA GRANJA', 'EL BOSQUE',
      'LA PINTANA', 'SAN BERNARDO', 'BUIN', 'PAINE', 'CALERA DE TANGO', 'MELIPILLA',
      'TALAGANTE', 'PEÑAFLOR', 'ISLA DE MAIPO', 'EL MONTE', 'PADRE HURTADO', 'COLINA',
      'LAMPA', 'TIL TIL', 'PIRQUE', 'PUENTE ALTO', 'SAN JOSÉ DE MAIPO', 'CURACAVÍ',
      'MARÍA PINTO', 'ALHUÉ', 'SAN PEDRO'
    ].sort()
  },
  {
    code: 'V',
    number: '05',
    name: 'Región de Valparaíso',
    shortName: 'Valparaíso',
    communes: [
      'VALPARAÍSO', 'VIÑA DEL MAR', 'CONCÓN', 'QUILPUÉ', 'VILLA ALEMANA', 'LIMACHE',
      'OLMUÉ', 'QUILLOTA', 'LA CALERA', 'HIJUELAS', 'LA CRUZ', 'NOGALES',
      'SAN ANTONIO', 'CARTAGENA', 'EL TABO', 'EL QUISCO', 'ALGARROBO', 'SANTO DOMINGO',
      'SAN FELIPE', 'LLAILLAY', 'CATEMU', 'PANQUEHUE', 'PUTAENDO', 'SANTA MARÍA',
      'LOS ANDES', 'CALLE LARGA', 'RINCONADA', 'SAN ESTEBAN', 'LA LIGUA', 'CABILDO',
      'PAPUDO', 'ZAPALLAR', 'PUCHUNCAVÍ', 'QUINTERO', 'CASABLANCA', 'ISLA DE PASCUA', 'JUAN FERNÁNDEZ'
    ].sort()
  },
  {
    code: 'VIII',
    number: '08',
    name: 'Región del Biobío',
    shortName: 'Biobío',
    communes: [
      'CONCEPCIÓN', 'TALCAHUANO', 'SAN PEDRO DE LA PAZ', 'CHIGUAYANTE', 'CORONEL', 'LOTA',
      'HUALPÉN', 'PENCO', 'TOMÉ', 'FLORIDA', 'SANTA JUANA', 'LOS ÁNGELES',
      'NACIMIENTO', 'NEGRETE', 'MULCHÉN', 'QUILACO', 'QUILLECO', 'ANTUCO',
      'TUCAPEL', 'CABRERO', 'YUMBEL', 'SAN ROSENDO', 'LAJA', 'LEBU',
      'ARAUCO', 'CAÑETE', 'CONTULMO', 'CURANILAHUE', 'LOS ÁLAMOS', 'TIRÚA'
    ].sort()
  },
  {
    code: 'II',
    number: '02',
    name: 'Región de Antofagasta',
    shortName: 'Antofagasta',
    communes: [
      'ANTOFAGASTA', 'MEJILLONES', 'SIERRA GORDA', 'TALTAL', 'CALAMA',
      'OLLAGÜE', 'SAN PEDRO DE ATACAMA', 'TOCOPILLA', 'MARÍA ELENA'
    ].sort()
  },
  {
    code: 'IV',
    number: '04',
    name: 'Región de Coquimbo',
    shortName: 'Coquimbo',
    communes: [
      'LA SERENA', 'COQUIMBO', 'ANDACOLLO', 'LA HIGUERA', 'PAIHUANO', 'VICUÑA',
      'ILLAPEL', 'CANELA', 'LOS VILOS', 'SALAMANCA', 'OVALLE', 'COMBARBALÁ',
      'MONTE PATRIA', 'PUNITAQUI', 'RÍO HURTADO'
    ].sort()
  },
  {
    code: 'VI',
    number: '06',
    name: 'Región del Libertador General Bernardo O’Higgins',
    shortName: 'O’Higgins',
    communes: [
      'RANCAGUA', 'MACHALÍ', 'GRANEROS', 'CODEGUA', 'MOSTAZAL', 'REQUÍNOA',
      'RENGO', 'COLTAUCO', 'DOÑIHUE', 'COINCO', 'QUINTA DE TILCOCO', 'SAN VICENTE',
      'PICHILEMU', 'NAVIDAD', 'LITUECHE', 'LA ESTRELLA', 'MARCHIGÜE', 'PAREDONES',
      'SAN FERNANDO', 'CHÉPICA', 'CHIMBARONGO', 'LOLOL', 'NANCAGUA', 'PALMILLA',
      'PERALILLO', 'PLACILLA', 'PUMANQUE', 'SANTA CRUZ'
    ].sort()
  },
  {
    code: 'VII',
    number: '07',
    name: 'Región del Maule',
    shortName: 'Maule',
    communes: [
      'TALCA', 'CONSTITUCIÓN', 'CUREPTO', 'EMPEDRADO', 'MAULE', 'PELARCO',
      'PENCAHUE', 'RÍO CLARO', 'SAN CLEMENTE', 'SAN RAFAEL', 'CAUQUENES',
      'CHANCO', 'PELLUHUE', 'CURICÓ', 'HUALAÑÉ', 'LICANTÉN', 'MOLINA',
      'RAUCO', 'ROMERAL', 'SAGRADA FAMILIA', 'TENO', 'VICHUQUÉN', 'LINARES',
      'COLBÚN', 'LONGAVÍ', 'PARRAL', 'RETIRO', 'SAN JAVIER', 'VILLA ALEGRE', 'YERBAS BUENAS'
    ].sort()
  },
  {
    code: 'IX',
    number: '09',
    name: 'Región de La Araucanía',
    shortName: 'La Araucanía',
    communes: [
      'TEMUCO', 'PADRE LAS CASAS', 'CARAHUE', 'CHOLCHOL', 'CUNCO', 'CURARREHUE',
      'FREIRE', 'GALVARINO', 'GORBEA', 'LAUTARO', 'LONCOCHE', 'MELIPEUCO',
      'NUEVA IMPERIAL', 'PERQUENCO', 'PITRUFQUÉN', 'PUCÓN', 'SAAVEDRA', 'TEODORO SCHMIDT',
      'TOLTÉN', 'VILCÚN', 'VILLARRICA', 'ANGOL', 'COLLIPULLI', 'CURACAUTÍN',
      'ERCILLA', 'LONQUIMAY', 'LOS SAUCES', 'LUMACO', 'PURÉN', 'RENAICO', 'TRAIGUÉN', 'VICTORIA'
    ].sort()
  },
  {
    code: 'X',
    number: '10',
    name: 'Región de Los Lagos',
    shortName: 'Los Lagos',
    communes: [
      'PUERTO MONTT', 'CALBUCO', 'COCHAMÓ', 'FRESIA', 'FRUTILLAR', 'LOS MUERMOS',
      'LLANQUIHUE', 'MAULLÍN', 'PUERTO VARAS', 'CASTRO', 'ANCUD', 'CHONCHI',
      'CURACO DE VÉLEZ', 'DALCAHUE', 'PUQUELDÓN', 'QUEILÉN', 'QUELLÓN', 'QUEMCHI',
      'QUINCHAO', 'OSORNO', 'PUERTO OCTAY', 'PURRANQUE', 'PUYEHUE', 'RÍO NEGRO',
      'SAN JUAN DE LA COSTA', 'SAN PABLO', 'CHAITÉN', 'FUTALEUFÚ', 'HUALAIHUÉ', 'PALENA'
    ].sort()
  },
  {
    code: 'XIV',
    number: '14',
    name: 'Región de Los Ríos',
    shortName: 'Los Ríos',
    communes: [
      'VALDIVIA', 'CORRAL', 'LANCO', 'LOS LAGOS', 'MÁFIL', 'MARIQUINA',
      'PAILLACO', 'PANGUIPULLI', 'LA UNIÓN', 'FUTRONO', 'LAGO RANCO', 'RÍO BUENO'
    ].sort()
  },
  {
    code: 'XV',
    number: '15',
    name: 'Región de Arica y Parinacota',
    shortName: 'Arica y Parinacota',
    communes: ['ARICA', 'CAMARONES', 'PUTRE', 'GENERAL LAGOS'].sort()
  },
  {
    code: 'I',
    number: '01',
    name: 'Región de Tarapacá',
    shortName: 'Tarapacá',
    communes: ['IQUIQUE', 'ALTO HOSPICIO', 'POZO ALMONTE', 'CAMIÑA', 'COLCHANE', 'HUARA', 'PICA'].sort()
  },
  {
    code: 'III',
    number: '03',
    name: 'Región de Atacama',
    shortName: 'Atacama',
    communes: ['COPIAPÓ', 'CALDERA', 'TIERRA AMARILLA', 'CHAÑARAL', 'DIEGO DE ALMAGRO', 'VALLENAR', 'ALTO DEL CARMEN', 'FREIRINA', 'HUASCO'].sort()
  },
  {
    code: 'XVI',
    number: '16',
    name: 'Región de Ñuble',
    shortName: 'Ñuble',
    communes: [
      'CHILLÁN', 'CHILLÁN VIEJO', 'BULNES', 'COIHUECO', 'COELEMU', 'EL CARMEN',
      'NINHUE', 'ÑIQUÉN', 'PEMUCO', 'PINTO', 'PORTEZUELO', 'QUILLÓN', 'QUIRIHUE',
      'RÁNQUIL', 'SAN CARLOS', 'SAN FABIÁN', 'SAN IGNACIO', 'SAN NICOLÁS', 'TREHUACO', 'YUNGAY'
    ].sort()
  },
  {
    code: 'XI',
    number: '11',
    name: 'Región de Aysén del General Carlos Ibáñez del Campo',
    shortName: 'Aysén',
    communes: ['COYHAIQUE', 'LAGO VERDE', 'AYSÉN', 'CISNES', 'GUAITECAS', 'COCHRANE', 'O’HIGGINS', 'TORTEL', 'CHILE CHICO', 'RÍO IBÁÑEZ'].sort()
  },
  {
    code: 'XII',
    number: '12',
    name: 'Región de Magallanes y de la Antártica Chilena',
    shortName: 'Magallanes',
    communes: ['PUNTA ARENAS', 'LAGUNA BLANCA', 'RÍO VERDE', 'SAN GREGORIO', 'CABO DE HORNOS', 'ANTÁRTICA', 'PORVENIR', 'PRIMAVERA', 'TIMAUKEL', 'NATALES', 'TORRES DEL PAINE'].sort()
  }
];

export interface UtilityServiceMeta {
  type: ChileanUtilityType;
  label: string;
  iconName: string;
  placeholderClient: string;
  hasMeter: boolean;
  description: string;
}

export const UTILITY_SERVICES_CATALOG: UtilityServiceMeta[] = [
  {
    type: 'LUZ',
    label: 'Electricidad / Luz',
    iconName: 'Zap',
    placeholderClient: 'Ej: N° de Cliente / N° Suministro (ej: 1234567-8)',
    hasMeter: true,
    description: 'Distribución eléctrica domiciliaria o comercial'
  },
  {
    type: 'AGUA',
    label: 'Agua Potable & Alcantarillado',
    iconName: 'Droplets',
    placeholderClient: 'Ej: N° de Cuenta / Servicio (ej: 98765432-1)',
    hasMeter: true,
    description: 'Servicio sanitario y alcantarillado'
  },
  {
    type: 'GAS',
    label: 'Gas de Red / Cañería / Granel',
    iconName: 'Flame',
    placeholderClient: 'Ej: N° de Póliza / ID Cliente (ej: 456789-0)',
    hasMeter: true,
    description: 'Gas natural canalizado o gas licuado en estanque'
  },
  {
    type: 'INTERNET',
    label: 'Telecomunicaciones / Internet / TV',
    iconName: 'Wifi',
    placeholderClient: 'Ej: N° de Rut Contrato / Cuenta Enlace',
    hasMeter: false,
    description: 'Fibra óptica, conectividad corporativa o enlaces'
  },
  {
    type: 'GASTO_COMUN',
    label: 'Gasto Común / Administración Copropiedad',
    iconName: 'Building',
    placeholderClient: 'Ej: ID Unidad / Código Portal ComunidadFeliz / Kastor',
    hasMeter: false,
    description: 'Administración del condominio o edificio (Ley 21.442)'
  },
  {
    type: 'SEGURIDAD',
    label: 'Seguridad / Monitoreo Alarma & CCTV',
    iconName: 'Shield',
    placeholderClient: 'Ej: Código de Abonado / Clave Central',
    hasMeter: false,
    description: 'Central de monitoreo 24/7 y respuesta móvil'
  },
  {
    type: 'OTRO',
    label: 'Otro Servicio Especial',
    iconName: 'Sliders',
    placeholderClient: 'Ej: Identificador de Contrato / Folio',
    hasMeter: false,
    description: 'Servicios auxiliares, climatización central o bodegaje'
  }
];

/**
 * Catálogo Maestro de Empresas Proveedoras de Servicios Básicos según Región de Chile.
 * Mapeo oficial y exhaustivo con listas dependientes.
 */
export const UTILITY_PROVIDERS_BY_REGION: Record<string, Partial<Record<ChileanUtilityType, string[]>>> = {
  RM: {
    LUZ: ['ENEL DISTRIBUCIÓN CHILE', 'CGE DISTRIBUCIÓN', 'COLINA ENERGÍA', 'OTRA DISTRIBUIDORA'],
    AGUA: ['AGUAS ANDINAS', 'SMAPA (MAIPÚ / CERRILLOS)', 'AGUAS CORDILLERA', 'AGUAS MANQUEHUE', 'COOPERATIVA DE AGUA POTABLE RURAL (APR)', 'OTRA SANITARIA'],
    GAS: ['METROGAS', 'LIPIGAS (GAS RED / GRANEL)', 'ABASTIBLE', 'GASCO GLP', 'OTRO PROVEEDOR GAS'],
    INTERNET: ['MOVISTAR FIBRA (TELEFÓNICA)', 'ENTEL CHILE', 'VTR TELECOMUNICACIONES', 'MUNDO PACÍFICO', 'CLARO-VTR', 'GTD MANQUEHUE', 'WOM FIBRA', 'OTRO ISP'],
    GASTO_COMUN: ['ADMINISTRACIÓN CONDOMINIO / EDIFICIO', 'COMITÉ DE COPROPIEDAD', 'COMUNIDADFELIZ RECAUDACIÓN', 'KASTOR SOFTWARE', 'OTRO ADMINISTRADOR'],
    SEGURIDAD: ['VERISURE CHILE', 'ADT SECURITY SERVICES', 'FEDERAL SEGURIDAD PRIVADA', 'PROSEGUR ALARMAS', 'SOS ALERTA COMUNAL', 'OTRO']
  },
  V: {
    LUZ: ['CHILQUINTA ENERGÍA', 'CGE DISTRIBUCIÓN', 'LITORAL ENERGÍA', 'OTRA DISTRIBUIDORA'],
    AGUA: ['ESVAL (SERVICIOS SANITARIOS VALPARAÍSO)', 'COOP. AGUA POTABLE LITORAL', 'AGUA POTABLE RURAL (APR)', 'OTRA SANITARIA'],
    GAS: ['GASVALPO', 'METROGAS (QUILPUÉ/VIÑA)', 'LIPIGAS', 'ABASTIBLE', 'GASCO', 'OTRO PROVEEDOR GAS'],
    INTERNET: ['VTR TELECOMUNICACIONES', 'MOVISTAR FIBRA', 'ENTEL', 'MUNDO', 'CLARO-VTR', 'WOM', 'OTRO ISP'],
    GASTO_COMUN: ['ADMINISTRACIÓN CONDOMINIO / EDIFICIO', 'COMITÉ DE COPROPIEDAD', 'COMUNIDADFELIZ', 'OTRO ADMINISTRADOR'],
    SEGURIDAD: ['VERISURE CHILE', 'ADT SECURITY SERVICES', 'PROSEGUR', 'FEDERAL SEGURIDAD', 'OTRO']
  },
  VIII: {
    LUZ: ['CGE DISTRIBUCIÓN', 'COOPERATIVA ELÉCTRICA COELCHA', 'FRONTEL (GRUPO SAESA)', 'OTRA DISTRIBUIDORA'],
    AGUA: ['ESSBIO (SERVICIOS SANITARIOS BIOBÍO)', 'AGUAS SAN PEDRO', 'AGUA POTABLE RURAL (APR)', 'OTRA SANITARIA'],
    GAS: ['GASSUR', 'LIPIGAS', 'ABASTIBLE', 'GASCO', 'OTRO PROVEEDOR GAS'],
    INTERNET: ['MUNDO PACÍFICO', 'MOVISTAR FIBRA', 'ENTEL', 'VTR', 'CLARO-VTR', 'OTRO ISP'],
    GASTO_COMUN: ['ADMINISTRACIÓN CONDOMINIO / EDIFICIO', 'COMITÉ DE COPROPIEDAD', 'COMUNIDADFELIZ', 'OTRO ADMINISTRADOR'],
    SEGURIDAD: ['VERISURE CHILE', 'ADT SECURITY SERVICES', 'PROSEGUR', 'OTRO']
  },
  II: {
    LUZ: ['CGE DISTRIBUCIÓN', 'ELECDA (GRUPO CGE)', 'OTRA DISTRIBUIDORA'],
    AGUA: ['AGUAS ANTOFAGASTA', 'AGUAS DE CALAMA', 'AGUA POTABLE RURAL (APR)', 'OTRA SANITARIA'],
    GAS: ['LIPIGAS GRANEL', 'ABASTIBLE', 'GASCO', 'METROGAS NORTE', 'OTRO PROVEEDOR GAS'],
    INTERNET: ['ENTEL FIBRA', 'MOVISTAR', 'VTR', 'CLARO-VTR', 'MUNDO', 'OTRO ISP'],
    GASTO_COMUN: ['ADMINISTRACIÓN CONDOMINIO / EDIFICIO', 'COMITÉ DE COPROPIEDAD', 'OTRO ADMINISTRADOR'],
    SEGURIDAD: ['VERISURE CHILE', 'ADT SECURITY SERVICES', 'PROSEGUR', 'OTRO']
  },
  IV: {
    LUZ: ['CGE DISTRIBUCIÓN', 'CONAFE', 'OTRA DISTRIBUIDORA'],
    AGUA: ['AGUAS DEL VALLE', 'AGUA POTABLE RURAL (APR)', 'OTRA SANITARIA'],
    GAS: ['METROGAS LA SERENA / COQUIMBO', 'LIPIGAS', 'ABASTIBLE', 'GASCO', 'OTRO PROVEEDOR GAS'],
    INTERNET: ['MOVISTAR', 'ENTEL', 'CLARO-VTR', 'VTR', 'MUNDO', 'OTRO ISP'],
    GASTO_COMUN: ['ADMINISTRACIÓN CONDOMINIO / EDIFICIO', 'COMITÉ DE COPROPIEDAD', 'OTRO ADMINISTRADOR'],
    SEGURIDAD: ['VERISURE CHILE', 'ADT SECURITY SERVICES', 'PROSEGUR', 'OTRO']
  },
  VI: {
    LUZ: ['CGE DISTRIBUCIÓN', 'COOP. ELÉCTRICA CHÉPICA', 'OTRA DISTRIBUIDORA'],
    AGUA: ['ESSBIO', 'AGUA POTABLE RURAL (APR)', 'OTRA SANITARIA'],
    GAS: ['METROGAS RANCAGUA', 'LIPIGAS', 'ABASTIBLE', 'GASCO', 'OTRO PROVEEDOR GAS'],
    INTERNET: ['MUNDO', 'ENTEL', 'MOVISTAR', 'VTR', 'OTRO ISP'],
    GASTO_COMUN: ['ADMINISTRACIÓN CONDOMINIO / EDIFICIO', 'COMITÉ DE COPROPIEDAD', 'OTRO ADMINISTRADOR'],
    SEGURIDAD: ['VERISURE CHILE', 'ADT SECURITY SERVICES', 'PROSEGUR', 'OTRO']
  },
  VII: {
    LUZ: ['CGE DISTRIBUCIÓN', 'COOPERATIVA LUZ LINARES', 'LUZ PARRAL', 'OTRA DISTRIBUIDORA'],
    AGUA: ['NUEVOSUR', 'AGUA POTABLE RURAL (APR)', 'OTRA SANITARIA'],
    GAS: ['LIPIGAS', 'ABASTIBLE', 'GASCO', 'OTRO PROVEEDOR GAS'],
    INTERNET: ['MUNDO', 'ENTEL', 'MOVISTAR', 'CLARO-VTR', 'OTRO ISP'],
    GASTO_COMUN: ['ADMINISTRACIÓN CONDOMINIO / EDIFICIO', 'COMITÉ DE COPROPIEDAD', 'OTRO ADMINISTRADOR'],
    SEGURIDAD: ['VERISURE CHILE', 'ADT SECURITY SERVICES', 'PROSEGUR', 'OTRO']
  },
  IX: {
    LUZ: ['FRONTEL (GRUPO SAESA)', 'CGE DISTRIBUCIÓN', 'COOP. CURICÓ/LAUTARO', 'OTRA DISTRIBUIDORA'],
    AGUA: ['AGUAS ARAUCANÍA', 'AGUAS SAN PEDRO TEMUCO', 'AGUA POTABLE RURAL (APR)', 'OTRA SANITARIA'],
    GAS: ['LIPIGAS', 'ABASTIBLE', 'GASCO', 'OTRO PROVEEDOR GAS'],
    INTERNET: ['TELSUR (GRUPO GTD)', 'MOVISTAR FIBRA', 'ENTEL', 'MUNDO', 'VTR', 'OTRO ISP'],
    GASTO_COMUN: ['ADMINISTRACIÓN CONDOMINIO / EDIFICIO', 'COMITÉ DE COPROPIEDAD', 'OTRO ADMINISTRADOR'],
    SEGURIDAD: ['VERISURE CHILE', 'ADT SECURITY SERVICES', 'PROSEGUR', 'OTRO']
  },
  X: {
    LUZ: ['SAESA (SOCIEDAD AUSTRAL DE ELECTRICIDAD)', 'CRELL (COOPERATIVA RURAL)', 'OTRA DISTRIBUIDORA'],
    AGUA: ['SURALIS (EX ESSAL)', 'AGUAS DÉCIMA', 'AGUA POTABLE RURAL (APR)', 'OTRA SANITARIA'],
    GAS: ['LIPIGAS', 'ABASTIBLE', 'GASCO', 'OTRO PROVEEDOR GAS'],
    INTERNET: ['TELSUR (GRUPO GTD)', 'TELEFÓNICA DEL SUR', 'MOVISTAR', 'ENTEL', 'VTR', 'MUNDO', 'OTRO ISP'],
    GASTO_COMUN: ['ADMINISTRACIÓN CONDOMINIO / EDIFICIO', 'COMITÉ DE COPROPIEDAD', 'OTRO ADMINISTRADOR'],
    SEGURIDAD: ['VERISURE CHILE', 'ADT SECURITY SERVICES', 'PROSEGUR', 'OTRO']
  },
  XIV: {
    LUZ: ['SAESA', 'SOCOEPA', 'OTRA DISTRIBUIDORA'],
    AGUA: ['AGUAS DÉCIMA (VALDIVIA)', 'SURALIS', 'AGUA POTABLE RURAL (APR)', 'OTRA SANITARIA'],
    GAS: ['LIPIGAS', 'ABASTIBLE', 'GASCO', 'OTRO PROVEEDOR GAS'],
    INTERNET: ['TELSUR', 'MOVISTAR', 'ENTEL', 'VTR', 'OTRO ISP'],
    GASTO_COMUN: ['ADMINISTRACIÓN CONDOMINIO / EDIFICIO', 'COMITÉ DE COPROPIEDAD', 'OTRO ADMINISTRADOR'],
    SEGURIDAD: ['VERISURE CHILE', 'ADT SECURITY SERVICES', 'PROSEGUR', 'OTRO']
  },
  XV: {
    LUZ: ['EMELARI (GRUPO CGE)', 'OTRA DISTRIBUIDORA'],
    AGUA: ['AGUAS DEL ALTIPLANO', 'AGUA POTABLE RURAL (APR)', 'OTRA SANITARIA'],
    GAS: ['LIPIGAS', 'ABASTIBLE', 'GASCO', 'OTRO PROVEEDOR GAS'],
    INTERNET: ['ENTEL', 'MOVISTAR', 'CLARO-VTR', 'MUNDO', 'OTRO ISP'],
    GASTO_COMUN: ['ADMINISTRACIÓN CONDOMINIO / EDIFICIO', 'COMITÉ DE COPROPIEDAD', 'OTRO ADMINISTRADOR'],
    SEGURIDAD: ['VERISURE CHILE', 'ADT SECURITY SERVICES', 'PROSEGUR', 'OTRO']
  },
  I: {
    LUZ: ['ELIQSA (GRUPO CGE)', 'OTRA DISTRIBUIDORA'],
    AGUA: ['AGUAS DEL ALTIPLANO', 'AGUA POTABLE RURAL (APR)', 'OTRA SANITARIA'],
    GAS: ['LIPIGAS', 'ABASTIBLE', 'GASCO', 'OTRO PROVEEDOR GAS'],
    INTERNET: ['ENTEL', 'MOVISTAR', 'CLARO-VTR', 'VTR', 'MUNDO', 'OTRO ISP'],
    GASTO_COMUN: ['ADMINISTRACIÓN CONDOMINIO / EDIFICIO', 'COMITÉ DE COPROPIEDAD', 'OTRO ADMINISTRADOR'],
    SEGURIDAD: ['VERISURE CHILE', 'ADT SECURITY SERVICES', 'PROSEGUR', 'OTRO']
  },
  III: {
    LUZ: ['EMELAT (GRUPO CGE)', 'OTRA DISTRIBUIDORA'],
    AGUA: ['NUEVA ATACAMA (AGUAS CHAÑAR)', 'AGUA POTABLE RURAL (APR)', 'OTRA SANITARIA'],
    GAS: ['LIPIGAS', 'ABASTIBLE', 'GASCO', 'OTRO PROVEEDOR GAS'],
    INTERNET: ['ENTEL', 'MOVISTAR', 'CLARO-VTR', 'MUNDO', 'OTRO ISP'],
    GASTO_COMUN: ['ADMINISTRACIÓN CONDOMINIO / EDIFICIO', 'COMITÉ DE COPROPIEDAD', 'OTRO ADMINISTRADOR'],
    SEGURIDAD: ['VERISURE CHILE', 'ADT SECURITY SERVICES', 'PROSEGUR', 'OTRO']
  },
  XVI: {
    LUZ: ['CGE DISTRIBUCIÓN', 'COPELEC', 'OTRA DISTRIBUIDORA'],
    AGUA: ['ESSBIO', 'AGUA POTABLE RURAL (APR)', 'OTRA SANITARIA'],
    GAS: ['LIPIGAS', 'ABASTIBLE', 'GASCO', 'OTRO PROVEEDOR GAS'],
    INTERNET: ['MUNDO', 'ENTEL', 'MOVISTAR', 'CLARO-VTR', 'OTRO ISP'],
    GASTO_COMUN: ['ADMINISTRACIÓN CONDOMINIO / EDIFICIO', 'COMITÉ DE COPROPIEDAD', 'OTRO ADMINISTRADOR'],
    SEGURIDAD: ['VERISURE CHILE', 'ADT SECURITY SERVICES', 'PROSEGUR', 'OTRO']
  },
  XI: {
    LUZ: ['EDELAYSEN (GRUPO SAESA)', 'OTRA DISTRIBUIDORA'],
    AGUA: ['AGUAS PATAGONIA DE AYSÉN', 'AGUA POTABLE RURAL (APR)', 'OTRA SANITARIA'],
    GAS: ['LIPIGAS', 'ABASTIBLE', 'GASCO', 'OTRO PROVEEDOR GAS'],
    INTERNET: ['ENTEL', 'MOVISTAR', 'TELSUR', 'OTRO ISP'],
    GASTO_COMUN: ['ADMINISTRACIÓN CONDOMINIO / EDIFICIO', 'COMITÉ DE COPROPIEDAD', 'OTRO ADMINISTRADOR'],
    SEGURIDAD: ['VERISURE CHILE', 'ADT SECURITY SERVICES', 'PROSEGUR', 'OTRO']
  },
  XII: {
    LUZ: ['EDELMAG (EMPRESA ELÉCTRICA DE MAGALLANES)', 'OTRA DISTRIBUIDORA'],
    AGUA: ['AGUAS MAGALLANES', 'AGUA POTABLE RURAL (APR)', 'OTRA SANITARIA'],
    GAS: ['GASCO MAGALLANES', 'ENAP MAGALLANES', 'LIPIGAS', 'OTRO PROVEEDOR GAS'],
    INTERNET: ['ENTEL', 'MOVISTAR', 'CLARO-VTR', 'TV RED MAGALLANES', 'OTRO ISP'],
    GASTO_COMUN: ['ADMINISTRACIÓN CONDOMINIO / EDIFICIO', 'COMITÉ DE COPROPIEDAD', 'OTRO ADMINISTRADOR'],
    SEGURIDAD: ['VERISURE CHILE', 'ADT SECURITY SERVICES', 'PROSEGUR', 'OTRO']
  }
};

/**
 * Retorna la lista de comunas asociadas a una región seleccionada
 */
export function getCommunesByRegionCode(regionCode: string): string[] {
  if (!regionCode) return [];
  const found = CHILE_TERRITORY_MASTER.find(r => r.code === regionCode.toUpperCase());
  return found ? found.communes : [];
}

/**
 * Retorna los proveedores de servicios básicos estandarizados según región y tipo de servicio
 */
export function getUtilityProvidersByRegionAndType(regionCode: string, serviceType: ChileanUtilityType): string[] {
  const code = (regionCode || 'RM').toUpperCase();
  const regionProviders = UTILITY_PROVIDERS_BY_REGION[code] || UTILITY_PROVIDERS_BY_REGION['RM'];
  const list = regionProviders[serviceType] || [];
  
  if (list.length > 0) return list;

  // Fallbacks genéricos nacionales
  if (serviceType === 'LUZ') return ['CGE DISTRIBUCIÓN', 'ENEL DISTRIBUCIÓN', 'CHILQUINTA ENERGÍA', 'SAESA', 'OTRO'];
  if (serviceType === 'AGUA') return ['AGUAS ANDINAS', 'ESVAL', 'ESSBIO', 'NUEVOSUR', 'SURALIS', 'OTRO'];
  if (serviceType === 'GAS') return ['METROGAS', 'LIPIGAS', 'ABASTIBLE', 'GASCO', 'OTRO'];
  if (serviceType === 'INTERNET') return ['MOVISTAR FIBRA', 'ENTEL FIBRA', 'VTR', 'MUNDO PACÍFICO', 'CLARO-VTR', 'WOM', 'OTRO'];
  if (serviceType === 'GASTO_COMUN') return ['ADMINISTRACIÓN CONDOMINIO / EDIFICIO', 'COMITÉ DE COPROPIEDAD', 'COMUNIDADFELIZ', 'OTRO'];
  if (serviceType === 'SEGURIDAD') return ['VERISURE CHILE', 'ADT SECURITY SERVICES', 'PROSEGUR', 'FEDERAL SEGURIDAD', 'OTRO'];
  return ['PROVEEDOR GENERAL / PARTICULAR'];
}

/**
 * Formatea y estandariza el ROL de avalúo fiscal chileno (ej: 1234-56 o 01234-00056)
 */
export function formatChileanPropertyRole(rawRole: string): string {
  if (!rawRole) return '';
  const cleaned = rawRole.replace(/[^0-9-]/g, '').trim();
  return cleaned;
}

/**
 * Busca y retorna la región a la cual pertenece una comuna chilena
 */
export function getRegionByCommune(communeName: string): ChileRegionDef | undefined {
  if (!communeName) return undefined;
  const clean = communeName.trim().toUpperCase();
  return CHILE_TERRITORY_MASTER.find(r => 
    r.communes.some(c => c.toUpperCase() === clean)
  );
}

