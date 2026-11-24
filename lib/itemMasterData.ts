// AssetFlow Enterprise - Item Master (F4101 / P4101)
// Catálogo Maestro Estandarizado de Artículos y Servicios

export interface MasterItem {
  itemCode: string;             // LITM (ej. TECH-001)
  description: string;          // DSC1 (Descripción Estandarizada)
  secondDescription?: string;   // DSC2
  unitOfMeasure: string;        // UOM (UN, M2, GL, ML, CJ, KG, HR)
  standardCost: number;         // Costo Unitario de Referencia CLP
  suggestedAccountCode: string; // Cuenta Contable / G/L Class
  category: string;             // Categoría Principal
  specialty: string;            // Especialidad / Rubro
  stockStatus: 'ACTIVO' | 'OBSOLETO' | 'BAJO_PEDIDO';
  searchTokens: string;
}

export interface ItemCreationRequest {
  id: string;
  requestedBy: string;
  requestedAt: string;
  proposedCode?: string;
  proposedDescription: string;
  category: string;
  specialty: string;
  unitOfMeasure: string;
  estimatedCost: number;
  justification: string;
  status: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';
  reviewerNotes?: string;
}

export const INITIAL_ITEM_MASTER: MasterItem[] = [
  // 1. TECHUMBRES Y CUBIERTAS
  {
    itemCode: 'TECH-001',
    description: 'MEMBRANA ASFÁLTICA GRAVILLADA 4MM (ROLLO 10M2)',
    secondDescription: 'Impermeabilización pesada para losas y techumbres',
    unitOfMeasure: 'UN',
    standardCost: 48500,
    suggestedAccountCode: '5.1.04.01.001',
    category: 'MANTENCIÓN PREVENTIVA',
    specialty: 'TECHUMBRES',
    stockStatus: 'ACTIVO',
    searchTokens: 'MEMBRANA ASFALTICA GRAVILLADA ROLLO IMPERMEABILIZACION TECHUMBRE'
  },
  {
    itemCode: 'TECH-002',
    description: 'PINTURA HIDRÓFUGA ELASTOMÉRICA IMPERMEABILIZANTE (TINETA 5 GAL)',
    secondDescription: 'Sellador elastómero alta elasticidad para cubiertas',
    unitOfMeasure: 'GL',
    standardCost: 72900,
    suggestedAccountCode: '5.1.04.01.001',
    category: 'MANTENCIÓN PREVENTIVA',
    specialty: 'TECHUMBRES',
    stockStatus: 'ACTIVO',
    searchTokens: 'PINTURA HIDROFUGA ELASTOMERICA TINETA GALON IMPERMEABILIZANTE TECHO'
  },
  {
    itemCode: 'TECH-003',
    description: 'PLANCHA ZINC-ALUM ONDULADA 0.35MM X 3.66M',
    secondDescription: 'Cubierta metálica galvanizada anticorrosión',
    unitOfMeasure: 'UN',
    standardCost: 18900,
    suggestedAccountCode: '5.1.04.01.002',
    category: 'MANTENCIÓN CORRECTIVA',
    specialty: 'TECHUMBRES',
    stockStatus: 'ACTIVO',
    searchTokens: 'PLANCHA ZINC ALUM ONDULADA TECHUMBRE METALICA CUBIERTA'
  },
  {
    itemCode: 'TECH-004',
    description: 'SERVICIO MANTENCIÓN, LIMPIEZA Y SELLADO SELLOTEX CUBIERTAS',
    secondDescription: 'Servicio técnico especializado por metro cuadrado',
    unitOfMeasure: 'M2',
    standardCost: 12500,
    suggestedAccountCode: '5.1.04.02.001',
    category: 'MANTENCIÓN PREVENTIVA',
    specialty: 'TECHUMBRES',
    stockStatus: 'ACTIVO',
    searchTokens: 'SERVICIO LIMPIEZA SELLADO CUBIERTA SELLOTEX HOJALATERIA CANALETA'
  },
  {
    itemCode: 'TECH-005',
    description: 'CANALETA AGUAS LLUVIAS ZINC 0.4MM DESARROLLO 33CM (TIRA 3M)',
    secondDescription: 'Hojalatería perimetral desagüe pluvial',
    unitOfMeasure: 'ML',
    standardCost: 15400,
    suggestedAccountCode: '5.1.04.01.002',
    category: 'MANTENCIÓN CORRECTIVA',
    specialty: 'TECHUMBRES',
    stockStatus: 'ACTIVO',
    searchTokens: 'CANALETA ZINC HOJALATERIA AGUAS LLUVIAS DESAGUE'
  },

  // 2. PLOMERÍA Y GASFITERÍA
  {
    itemCode: 'PLOM-001',
    description: 'VÁLVULA CORTE BOLA BRONCE PASO TOTAL 3/4" HE-HI',
    secondDescription: 'Grifería de control matriz hidráulica alta presión',
    unitOfMeasure: 'UN',
    standardCost: 14200,
    suggestedAccountCode: '5.1.04.01.003',
    category: 'MANTENCIÓN CORRECTIVA',
    specialty: 'PLOMERÍA',
    stockStatus: 'ACTIVO',
    searchTokens: 'VALVULA CORTE BOLA BRONCE PASO TOTAL LLAVE PASO AGUA'
  },
  {
    itemCode: 'PLOM-002',
    description: 'TUBERÍA COBRE TIPO L 3/4" (TIRA 6 METROS)',
    secondDescription: 'Matriz agua potable norma chilena NCh',
    unitOfMeasure: 'ML',
    standardCost: 38900,
    suggestedAccountCode: '5.1.04.01.003',
    category: 'MANTENCIÓN CORRECTIVA',
    specialty: 'PLOMERÍA',
    stockStatus: 'ACTIVO',
    searchTokens: 'TUBERIA COBRE TIPO L MATRIZ AGUA GASFITERIA CAÑERIA'
  },
  {
    itemCode: 'PLOM-003',
    description: 'SIFÓN DESAGÜE LAVAPLATOS DOBLE PVC BLANCO 1 1/2"',
    secondDescription: 'Kit de conexión sifónica sanitaria',
    unitOfMeasure: 'UN',
    standardCost: 11800,
    suggestedAccountCode: '5.1.04.01.003',
    category: 'MANTENCIÓN CORRECTIVA',
    specialty: 'PLOMERÍA',
    stockStatus: 'ACTIVO',
    searchTokens: 'SIFON DESAGUE LAVAPLATOS PVC SANITARIO'
  },
  {
    itemCode: 'PLOM-004',
    description: 'BOMBA ELEVADORA AGUA LIMPIA 1.5 HP MONOFÁSICA PEDROLLO',
    secondDescription: 'Equipo impulsor de presión para estanque acumulador',
    unitOfMeasure: 'UN',
    standardCost: 345000,
    suggestedAccountCode: '5.1.04.01.003',
    category: 'MEJORAS Y PROYECTOS',
    specialty: 'PLOMERÍA',
    stockStatus: 'ACTIVO',
    searchTokens: 'BOMBA ELEVADORA AGUA PRESION HIDRAULICA PEDROLLO MOTOR'
  },
  {
    itemCode: 'PLOM-005',
    description: 'SERVICIO DETECCIÓN FUGAS AGUA POR ULTRASONIDO & TERMO-VISIÓN',
    secondDescription: 'Diagnóstico no invasivo de redes ocultas',
    unitOfMeasure: 'GL',
    standardCost: 120000,
    suggestedAccountCode: '5.1.04.02.002',
    category: 'EMERGENCIA OPERACIONAL',
    specialty: 'PLOMERÍA',
    stockStatus: 'ACTIVO',
    searchTokens: 'SERVICIO DETECCION FUGA AGUA ULTRASONIDO GASFITERIA DIAGNOSTICO'
  },

  // 3. ELECTRICIDAD E ILUMINACIÓN
  {
    itemCode: 'ELEC-001',
    description: 'PANEL LED EMBUTIDO CIRCULAR 18W 6500K LUZ FRÍA',
    secondDescription: 'Luminaria de bajo consumo para pasillos y oficinas',
    unitOfMeasure: 'UN',
    standardCost: 9900,
    suggestedAccountCode: '5.1.04.01.004',
    category: 'MANTENCIÓN PREVENTIVA',
    specialty: 'ELECTRICIDAD',
    stockStatus: 'ACTIVO',
    searchTokens: 'PANEL LED CIRCULAR 18W LUZ FRIA ILUMINACION FOCO'
  },
  {
    itemCode: 'ELEC-002',
    description: 'AUTOMÁTICO MAGNETOTÉRMICO BIPOLAR 16A CURVA C LEGRAND',
    secondDescription: 'Disyuntor de protección tableros eléctricos',
    unitOfMeasure: 'UN',
    standardCost: 13500,
    suggestedAccountCode: '5.1.04.01.004',
    category: 'MANTENCIÓN CORRECTIVA',
    specialty: 'ELECTRICIDAD',
    stockStatus: 'ACTIVO',
    searchTokens: 'AUTOMATICO MAGNETOTERMICO DISYUNTOR BIPOLAR LEGRAND 16A TABLERO'
  },
  {
    itemCode: 'ELEC-003',
    description: 'PROTECTOR DIFERENCIAL 2X25A 30MA LEGRAND',
    secondDescription: 'Protección para personas norma SEC',
    unitOfMeasure: 'UN',
    standardCost: 24900,
    suggestedAccountCode: '5.1.04.01.004',
    category: 'MANTENCIÓN PREVENTIVA',
    specialty: 'ELECTRICIDAD',
    stockStatus: 'ACTIVO',
    searchTokens: 'DIFERENCIAL LEGRAND PROTECTOR ELECTRICO SEC'
  },
  {
    itemCode: 'ELEC-004',
    description: 'CABLE LIBRE HALÓGENO H07Z1-K 2.5 MM² ROJO (ROLLO 100M)',
    secondDescription: 'Conductor retardante fuego para recintos de alta afluencia',
    unitOfMeasure: 'UN',
    standardCost: 46800,
    suggestedAccountCode: '5.1.04.01.004',
    category: 'MANTENCIÓN CORRECTIVA',
    specialty: 'ELECTRICIDAD',
    stockStatus: 'ACTIVO',
    searchTokens: 'CABLE LIBRE HALOGENO ROLLO ELECTRICO ROJO CONDUCTOR'
  },
  {
    itemCode: 'ELEC-005',
    description: 'SERVICIO NORMALIZACIÓN TABLERO ELÉCTRICO SEC & ROTULACIÓN',
    secondDescription: 'Peinado, balance de fases y certificación TE1',
    unitOfMeasure: 'GL',
    standardCost: 280000,
    suggestedAccountCode: '5.1.04.02.003',
    category: 'MANTENCIÓN PREVENTIVA',
    specialty: 'ELECTRICIDAD',
    stockStatus: 'ACTIVO',
    searchTokens: 'SERVICIO NORMALIZACION TABLERO ELECTRICO SEC TE1 CERTIFICACION'
  },

  // 4. PINTURA Y REVESTIMIENTOS
  {
    itemCode: 'PINT-001',
    description: 'ESMALTE AL AGUA SATINADO LAVABLE BLANCO (TINETA 5 GAL)',
    secondDescription: 'Pintura antimicrobiana alto tráfico para interiores',
    unitOfMeasure: 'GL',
    standardCost: 68500,
    suggestedAccountCode: '5.1.04.01.005',
    category: 'MANTENCIÓN PREVENTIVA',
    specialty: 'PINTURA',
    stockStatus: 'ACTIVO',
    searchTokens: 'ESMALTE AL AGUA SATINADO LAVABLE BLANCO TINETA PINTURA'
  },
  {
    itemCode: 'PINT-002',
    description: 'LÁTEX ACRÍLICO EXTRA PROFESIONAL INTERIOR/EXTERIOR (TINETA 5 GAL)',
    secondDescription: 'Recubrimiento acrílico antihongos de alto poder cubriente',
    unitOfMeasure: 'GL',
    standardCost: 54900,
    suggestedAccountCode: '5.1.04.01.005',
    category: 'MANTENCIÓN PREVENTIVA',
    specialty: 'PINTURA',
    stockStatus: 'ACTIVO',
    searchTokens: 'LATEX ACRILICO TINETA PINTURA PARED MURO'
  },
  {
    itemCode: 'PINT-003',
    description: 'PASTA MURO INTERIOR ALTA ADHERENCIA (BALDE 15L)',
    secondDescription: 'Empaste y nivelación de tabiques y losas',
    unitOfMeasure: 'UN',
    standardCost: 19800,
    suggestedAccountCode: '5.1.04.01.005',
    category: 'MANTENCIÓN CORRECTIVA',
    specialty: 'PINTURA',
    stockStatus: 'ACTIVO',
    searchTokens: 'PASTA MURO EMPASTE ENLUCIDO TABIQUE PINTURA'
  },
  {
    itemCode: 'PINT-004',
    description: 'SERVICIO PINTURA FACHADAS & MUROS EXTERIORES CON ANDAMIO',
    secondDescription: 'Incluye hidrolavado, rasqueteo y dos manos de esmalte',
    unitOfMeasure: 'M2',
    standardCost: 9500,
    suggestedAccountCode: '5.1.04.02.004',
    category: 'MANTENCIÓN PREVENTIVA',
    specialty: 'PINTURA',
    stockStatus: 'ACTIVO',
    searchTokens: 'SERVICIO PINTURA FACHADA ANDAMIO MURO EXTERIOR'
  },

  // 5. CLIMATIZACIÓN Y AIRE ACONDICIONADO
  {
    itemCode: 'CLIM-001',
    description: 'FILTRO AIRE SINTÉTICO ALTA EFICIENCIA 20X20X1 (UN)',
    secondDescription: 'Filtración de partículas para fan-coils y manejadoras',
    unitOfMeasure: 'UN',
    standardCost: 8900,
    suggestedAccountCode: '5.1.04.01.006',
    category: 'MANTENCIÓN PREVENTIVA',
    specialty: 'CLIMATIZACIÓN',
    stockStatus: 'ACTIVO',
    searchTokens: 'FILTRO AIRE ACONDICIONADO SINTETICO CLIMATIZACION'
  },
  {
    itemCode: 'CLIM-002',
    description: 'CARGA GAS REFRIGERANTE ECOLÓGICO R410A (KG)',
    secondDescription: 'Recarga y presurización circuito de enfriamiento',
    unitOfMeasure: 'KG',
    standardCost: 28500,
    suggestedAccountCode: '5.1.04.01.006',
    category: 'MANTENCIÓN CORRECTIVA',
    specialty: 'CLIMATIZACIÓN',
    stockStatus: 'ACTIVO',
    searchTokens: 'GAS REFRIGERANTE R410A CARGA AIRE ACONDICIONADO'
  },
  {
    itemCode: 'CLIM-003',
    description: 'SERVICIO MANTENCIÓN PREVENTIVA SPLIT INVERTER 12.000 BTU',
    secondDescription: 'Limpieza de turbinas, desinfección serpentín y chequeo eléctrico',
    unitOfMeasure: 'UN',
    standardCost: 45000,
    suggestedAccountCode: '5.1.04.02.005',
    category: 'MANTENCIÓN PREVENTIVA',
    specialty: 'CLIMATIZACIÓN',
    stockStatus: 'ACTIVO',
    searchTokens: 'SERVICIO MANTENCION AIRE SPLIT INVERTER CLIMATIZACION'
  },

  // 6. CERRAJERÍA Y SEGURIDAD
  {
    itemCode: 'CERR-001',
    description: 'CERRADURA EMBUTIR MULTIPUNTO SEGURIDAD CILINDRO EUROPERFIL',
    secondDescription: 'Cerradura de acero alta resistencia para accesos',
    unitOfMeasure: 'UN',
    standardCost: 42900,
    suggestedAccountCode: '5.1.04.01.007',
    category: 'MANTENCIÓN CORRECTIVA',
    specialty: 'CERRAJERÍA',
    stockStatus: 'ACTIVO',
    searchTokens: 'CERRADURA EMBUTIR MULTIPUNTO CILINDRO SEGURIDAD PUERTA'
  },
  {
    itemCode: 'CERR-002',
    description: 'CIERRAPUERTAS HIDRÁULICO BRAZO RETÉN DORMA 65-85KG',
    secondDescription: 'Controlador de cierre suave para puertas de alto flujo',
    unitOfMeasure: 'UN',
    standardCost: 38500,
    suggestedAccountCode: '5.1.04.01.007',
    category: 'MANTENCIÓN PREVENTIVA',
    specialty: 'CERRAJERÍA',
    stockStatus: 'ACTIVO',
    searchTokens: 'CIERRAPUERTAS HIDRAULICO BRAZO RETEN DORMA PUERTA'
  },
  {
    itemCode: 'CERR-003',
    description: 'SERVICIO CAMBIO COMBINACIÓN & AMAESTRAMIENTO DE CILINDROS',
    secondDescription: 'Generación de llave maestra de edificio y copias codificadas',
    unitOfMeasure: 'GL',
    standardCost: 85000,
    suggestedAccountCode: '5.1.04.02.006',
    category: 'MANTENCIÓN CORRECTIVA',
    specialty: 'CERRAJERÍA',
    stockStatus: 'ACTIVO',
    searchTokens: 'SERVICIO CAMBIO COMBINACION LLAVE MAESTRA CERRAJERIA AMAESTRAMIENTO'
  },

  // 7. ALFOMBRAS, PISOS Y TERMINACIONES
  {
    itemCode: 'ALFO-001',
    description: 'PALMETA ALFOMBRA ALTO TRÁFICO MODULAR 50X50CM (M2)',
    secondDescription: 'Fibra polipropileno base bitumen ignífuga',
    unitOfMeasure: 'M2',
    standardCost: 19900,
    suggestedAccountCode: '5.1.04.01.008',
    category: 'MANTENCIÓN CORRECTIVA',
    specialty: 'ALFOMBRAS',
    stockStatus: 'ACTIVO',
    searchTokens: 'PALMETA ALFOMBRA MODULAR ALTO TRAFICO PISO'
  },
  {
    itemCode: 'ALFO-002',
    description: 'PISO VINÍLICO SPC CLICK 5MM CON MANTA ACÚSTICA IXPE (M2)',
    secondDescription: 'Piso impermeable imitación madera natural',
    unitOfMeasure: 'M2',
    standardCost: 17800,
    suggestedAccountCode: '5.1.04.01.008',
    category: 'MEJORAS Y PROYECTOS',
    specialty: 'ALFOMBRAS',
    stockStatus: 'ACTIVO',
    searchTokens: 'PISO VINILICO SPC CLICK MANTA ACUSTICA FLOTANTE'
  },
  {
    itemCode: 'ALFO-003',
    description: 'SERVICIO LAVADO PROFUNDO INYECCIÓN-EXTRACCIÓN ALFOMBRAS',
    secondDescription: 'Sanitización a vapor y aspirado industrial de alfombras',
    unitOfMeasure: 'M2',
    standardCost: 3200,
    suggestedAccountCode: '5.1.04.02.007',
    category: 'MANTENCIÓN PREVENTIVA',
    specialty: 'ALFOMBRAS',
    stockStatus: 'ACTIVO',
    searchTokens: 'SERVICIO LAVADO ALFOMBRA INYECCION EXTRACCION ASEO'
  },

  // 8. SERVICIOS GENERALES, ASEO Y MANTENCIÓN EDIFICIO
  {
    itemCode: 'SERV-001',
    description: 'SERVICIO SANITIZACIÓN, DESINSECTACIÓN Y DESRATIZACIÓN CON CERTIFICADO',
    secondDescription: 'Control integral de plagas con resolución Seremi de Salud',
    unitOfMeasure: 'GL',
    standardCost: 95000,
    suggestedAccountCode: '5.1.04.02.008',
    category: 'MANTENCIÓN PREVENTIVA',
    specialty: 'SERVICIOS GENERALES',
    stockStatus: 'ACTIVO',
    searchTokens: 'SERVICIO SANITIZACION FUMIGACION PLAGAS DESRATIZACION SEREMI'
  },
  {
    itemCode: 'SERV-002',
    description: 'LIMPIEZA VIDRIOS EN ALTURA POR CUERDAS CERTIFICADAS (M2)',
    secondDescription: 'Operadores con certificación IRATA y seguro de accidentes',
    unitOfMeasure: 'M2',
    standardCost: 2800,
    suggestedAccountCode: '5.1.04.02.008',
    category: 'MANTENCIÓN PREVENTIVA',
    specialty: 'SERVICIOS GENERALES',
    stockStatus: 'ACTIVO',
    searchTokens: 'LIMPIEZA VIDRIOS ALTURA CUERDA FACHADA IRATA'
  },
  {
    itemCode: 'SERV-003',
    description: 'SERVICIO DESTAPE HIDROJET ALTA PRESIÓN COLECTORES VERTICALES',
    secondDescription: 'Sondeo y despeje mecánico de grasa y sedimentos',
    unitOfMeasure: 'GL',
    standardCost: 180000,
    suggestedAccountCode: '5.1.04.02.008',
    category: 'EMERGENCIA OPERACIONAL',
    specialty: 'SERVICIOS GENERALES',
    stockStatus: 'ACTIVO',
    searchTokens: 'SERVICIO DESTAPE HIDROJET ALCANTARILLADO COLECTOR VERTICAL'
  },
  {
    itemCode: 'SERV-004',
    description: 'RETIRO DE ESCOMBROS Y RESIDUOS CAMIÓN TOLVA 8M3 (VIAJE)',
    secondDescription: 'Disposición final en vertedero autorizado con guía',
    unitOfMeasure: 'GL',
    standardCost: 140000,
    suggestedAccountCode: '5.1.04.02.008',
    category: 'MANTENCIÓN CORRECTIVA',
    specialty: 'SERVICIOS GENERALES',
    stockStatus: 'ACTIVO',
    searchTokens: 'RETIRO ESCOMBROS CAMION TOLVA RESIDUOS FLETE VERTEDERO'
  }
];

const STORAGE_KEY_ITEMS = 'jde_item_master_f4101';
const STORAGE_KEY_REQUESTS = 'jde_item_creation_requests';

// Get current master items (from localStorage or default seed)
export function getMasterItems(): MasterItem[] {
  if (typeof window === 'undefined') return INITIAL_ITEM_MASTER;
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ITEMS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading master items:', e);
  }
  return INITIAL_ITEM_MASTER;
}

// Save or add a new master item (Master Data Steward / Admin only)
export function saveMasterItem(item: MasterItem): MasterItem[] {
  const current = getMasterItems();
  const index = current.findIndex(i => i.itemCode.toUpperCase() === item.itemCode.toUpperCase());
  let updated: MasterItem[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = item;
  } else {
    updated = [item, ...current];
  }
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(updated));
    } catch (e) {}
  }
  return updated;
}

// Find item by code
export function findMasterItemByCode(code: string): MasterItem | undefined {
  if (!code) return undefined;
  const items = getMasterItems();
  const clean = code.trim().toUpperCase();
  return items.find(i => i.itemCode.toUpperCase() === clean);
}

// Get item creation requests (pending requests from normal users)
export function getItemCreationRequests(): ItemCreationRequest[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY_REQUESTS);
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return [];
}

// Save an item creation request
export function submitItemCreationRequest(req: Omit<ItemCreationRequest, 'id' | 'requestedAt' | 'status'>): ItemCreationRequest {
  const newReq: ItemCreationRequest = {
    ...req,
    id: `REQ-${Date.now().toString(36).toUpperCase()}`,
    requestedAt: new Date().toISOString(),
    status: 'PENDIENTE'
  };
  const list = getItemCreationRequests();
  const updated = [newReq, ...list];
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_REQUESTS, JSON.stringify(updated));
    } catch (e) {}
  }
  return newReq;
}
