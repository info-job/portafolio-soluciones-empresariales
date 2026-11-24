import JSZip from 'jszip';

export interface ThesisSection {
  id: string;
  number: string;
  title: string;
  subtitle?: string;
  paragraphs: string[];
  subsections?: {
    number: string;
    title: string;
    paragraphs: string[];
    callout?: {
      title: string;
      text: string;
    };
    table?: {
      headers: string[];
      rows: string[][];
      caption?: string;
    };
  }[];
}

export interface MagisterThesisContent {
  title: string;
  subtitle: string;
  program: string;
  author: string;
  date: string;
  abstractEs: string[];
  keywordsEs: string[];
  abstractEn: string[];
  keywordsEn: string[];
  sections: ThesisSection[];
  bibliography: string[];
}

export const MAGISTER_THESIS_CONTENT: MagisterThesisContent = {
  title: 'ARQUITECTURA EMPRESARIAL COGNITIVA, CUMPLIMIENTO NORMATIVO POR DISEÑO Y TRAZABILIDAD CRIPTOGRÁFICA EN LA GESTIÓN PATRIMONIAL',
  subtitle: 'Diseño, desarrollo y validación empírica del ecosistema ERP AssetFlow Enterprise (inspirado en la disciplina de arquitectura Enterprise ERP 9.11) bajo los paradigmas de la Inteligencia Artificial Generativa, el Derecho Digital y la Inmutabilidad Blockchain',
  program: 'Trabajo Final para Optar al Grado de Magíster en Inteligencia Artificial, Derecho Digital y Blockchain • EBIS Business Tech School',
  author: 'Cristian Andrés Muñoz Rojas — Ingeniero Civil Industrial (samaheim@gmail.com)',
  date: new Date().toLocaleDateString('es-CL', { year: 'numeric', month: 'long', day: 'numeric' }),
  abstractEs: [
    'El presente Trabajo Final para optar al grado de Magíster en Inteligencia Artificial, Derecho Digital y Blockchain (presentado ante el tribunal académico de EBIS Business Tech School) nace de la imperiosa necesidad de concentrar la gran cantidad de datos que existe en el Departamento Inmobiliario de Mutucar, con la finalidad de llevar un control efectivo y facilitar mi trabajo diario como Control Interno del departamento. Antes de esta iniciativa, la información operativa, contractual y de mantenciones se encontraba dispersa en múltiples planillas Excel independientes, dificultando el seguimiento preventivo y exponiendo al área a incumplimientos frente a revisiones normativas.',
    'Para dar una respuesta concreta a esta realidad construí AssetFlow Enterprise, un sistema integral de administración patrimonial, control de obras y tesorería modelado sobre la estructura transaccional Enterprise ERP (Release 9.11) que, por su propio diseño, obliga a los usuarios a cumplir con los requisitos mínimos antes de cursar cualquier operación para enfrentar con respaldo tanto las auditorías internas como las externas. Cabe señalar que la implementación de este sistema nos ayudó directamente en la empresa a subsanar 4 observaciones de auditoría y a levantar una suspensión por parte del ente fiscalizador, la Comisión para el Mercado Financiero (CMF).',
    'El proyecto articula modelos de Inteligencia Artificial Generativa bajo supervisión humana obligatoria, automatización de normas chilenas y europeas (cálculo exacto de IVA e impuestos de segunda categoría en boletas de honorarios, debida diligencia antilavado UAF, protección de datos personales y firma electrónica) y un libro mayor de aprobaciones protegido con encadenamiento de hashes SHA-256 en modalidad estricta de solo adición (Append-Only) junto al cálculo en vivo de su Raíz de Merkle mediante Web Crypto API. Todo ello se complementa con una política rigurosa de credenciales sin exposición de claves y una hoja de ruta donde Firebase opera como entorno ágil de pre-producción antes de la migración obligatoria a servidores propios de la compañía.'
  ],
  keywordsEs: [
    'Inteligencia Artificial Generativa',
    'Derecho Digital',
    'Trazabilidad Criptográfica y Blockchain',
    'Compliance by Design',
    'Control Interno Inmobiliario (Mutucar / CMF)',
    'Arquitectura Enterprise ERP 9.11',
    'Auditoría Forense SHA-256 (Web Crypto API)',
    'Soberanía de Datos On-Premise y Control de Privilegios'
  ],
  abstractEn: [
    'This Master’s Thesis Capstone Report (EBIS Business Tech School) stems from the pressing need to centralize the vast volume of data handled by the Real Estate Department at Mutucar, with the direct purpose of establishing rigorous oversight and facilitating my daily work in Internal Control. By consolidating scattered spreadsheets into a unified platform, the system compels users to meet minimum compliance requirements to successfully face both internal and external audits. Notably, implementing this system directly helped our company resolve 4 audit findings and lift a regulatory suspension imposed by Chile’s Financial Market Commission (CMF).',
    'To achieve this, I designed and built AssetFlow Enterprise, a management platform modeled after Enterprise ERP architecture (Release 9.11) that brings together Generative AI under human supervision, automated Chilean and European regulatory compliance, and an append-only SHA-256 hash-chained approval ledger with live Merkle Root verification, alongside a strict credential policy and a planned transition from cloud staging (Firebase) to corporate on-premise servers.'
  ],
  keywordsEn: [
    'Generative AI',
    'Digital Law',
    'Cryptographic Audit Trails',
    'Internal Control & CMF Compliance',
    'Enterprise Resource Planning (ERP)',
    'On-Premise Data Sovereignty',
    'Append-Only Digital Evidence'
  ],
  sections: [
    {
      id: 'cap-1',
      number: 'CAPÍTULO I',
      title: 'INTRODUCCIÓN, MOTIVACIÓN Y JUSTIFICACIÓN DEL SISTEMA',
      subtitle: 'De la dispersión de datos en el Departamento Inmobiliario de Mutucar al control interno preventivo y levantamiento de observaciones ante la CMF',
      paragraphs: [
        'Quiero partir este informe explicando con total sinceridad el punto de partida real del que nace este proyecto. En mi experiencia diaria trabajando como Control Interno del Departamento Inmobiliario de Mutucar, me tocaba lidiar permanentemente con una dificultad de base: la gran cantidad de datos que maneja el departamento —propiedades, contratos de arriendo, garantías, tasaciones, presupuestos y órdenes de trabajo— se llevaba repartida en múltiples planillas Excel independientes mantenidas a pulso por distintas personas, además de correos y carpetas sueltas. Como ya nos había ocurrido en más de una ocasión en la práctica, trabajar con los datos así de dispersos no solo hacía sumamente engorroso cruzar información o reconstruir la historia de un gasto, sino que nos dejaba expuestos a errores humanos de digitación, celdas sobrescritas por accidente o fórmulas que dejaban de cuadrar sin que nadie lo advirtiera a tiempo.',
        'Este sistema nace precisamente de la imperiosa necesidad de concentrar toda esa gran cantidad de datos que existe en el Departamento Inmobiliario de Mutucar dentro de una sola plataforma estructurada, con la finalidad de llevar un control efectivo y facilitar mi trabajo de Control Interno del departamento inmobiliario. A mi parecer, para solucionar el problema de fondo no bastaba con juntar las planillas en un repositorio común; era indispensable implementar un sistema que, a su vez, obligue a los usuarios en cada paso a cumplir con los requisitos mínimos normativos, tributarios y documentales para enfrentar de buena forma tanto las auditorías internas como las auditorías externas.',
        'Por esa razón, cada módulo fue diseñado poniendo candados preventivos exactamente donde antes teníamos brechas operativas y observaciones de auditoría. A modo de ejemplo concreto sobre en qué consistían las observaciones de auditoría que este sistema ayudó a subsanar: primero que todo, el cobro de arriendo de propiedades antes se hacía de forma manual y era muy propenso a errores de digitación; en cambio ahora, en el sistema cada cobro de arriendo el sistema lo contrasta automáticamente con su respectivo contrato, fechas, montos, etcétera. Además, el sistema tiene la funcionalidad de enviar por correo a cada arrendatario un correo de cobro individual adjuntando un comprobante en PDF, el cual es revisado y contrastado por el ejecutivo de arriendos contra una base de datos que el propio sistema emite en Excel; así se verifica manualmente que los cobros sean realizados correctamente por el sistema.',
        'Junto con ese control sobre los cobros de arriendo, el sistema conectó los demás datos que antes no conversaban entre sí: ningún proveedor puede pasar a pago sin contar con su debida diligencia al día; ninguna orden de trabajo se aprueba si no tiene debidamente registrada su categoría, su especialidad y su factura o boleta de honorarios asociada; y ninguna propiedad restituida vuelve al estado de disponibilidad para un nuevo arriendo si no tiene firmada conforme su respectiva acta de check-out. De este modo, el control interno deja de depender de perseguir papeles a fin de mes y pasa a ser una condición obligatoria del propio flujo de trabajo.',
        'Cabe señalar que la implementación de este sistema no se quedó en una propuesta teórica para el Máster, sino que nos dio resultados concretos y decisivos en la empresa: nos ayudó directamente a subsanar 4 observaciones de auditoría que arrastrábamos en el departamento y fue fundamental para lograr levantar una suspensión por parte del ente fiscalizador, la Comisión para el Mercado Financiero (CMF). A mi juicio, haber superado esas revisiones y revertido dicha medida ante el regulador es la mejor demostración práctica de que concentrar los datos y estandarizar las exigencias de control transforma por completo la seguridad operativa de la organización.'
      ],
      subsections: [
        {
          number: '1.1',
          title: 'Alcance Funcional y Objetivos del Proyecto de Graduación',
          paragraphs: [
            'Sobre esa base real de control interno, el objetivo académico y técnico de este Trabajo Final para optar al grado de Magíster en Inteligencia Artificial, Derecho Digital y Blockchain (EBIS Business Tech School) fue dotar a la plataforma —denominada AssetFlow Enterprise y modelada bajo la disciplina transaccional Enterprise ERP 9.11— de tres pilares tecnológicos avanzados que trabajan de manera coordinada: Inteligencia Artificial Generativa (concebida como una herramienta de apoyo y no como una entidad operadora), Derecho Digital por diseño y trazabilidad criptográfica inspirada en Blockchain.',
            'En términos concretos, el desarrollo abarcó la construcción de los módulos equivalentes al estándar Enterprise ERP (Libro de Direcciones F0101, Cuentas por Pagar F0411, Libro Mayor F0911, Órdenes de Trabajo F4801, Detalle F4311, Reportes Normados CMF B13, B4 y Nota 14, y el circuito jerárquico de Aprobaciones P43008, P43081 y P43280); la incorporación de un motor cognitivo basado en Google Gemini bajo supervisión humana (incluyendo el módulo Asistente de Tareas IA P0001IA, excluyendo el cálculo de impuestos para minimizar errores de punto flotante); la automatización de las reglas tributarias, laborales y de prevención de delitos económicos en los propios formularios; el sellado criptográfico SHA-256 (Web Crypto API) en modalidad estricta Append-Only sobre la bitácora F4209; y una gobernanza de seguridad con privilegios limitados por función que impiden modificar la lógica interna del sistema incluso con accesos de administrador.'
          ],
          callout: {
            title: 'Hito Empírico de Validación en Mutucar ante Auditoría y CMF',
            text: 'La concentración de los datos del Departamento Inmobiliario de Mutucar —incluyendo el contraste automático de cada cobro de arriendo con su contrato, comprobante PDF individual por correo y cuadratura del ejecutivo contra base Excel— permitió en la práctica subsanar 4 observaciones de auditoría y levantar una suspensión por parte del ente fiscalizador (CMF).'
          }
        },
        {
          number: '1.2',
          title: 'Evaluación Económica, Retorno de Inversión (ROI) y Justificación Financiera ante el Directorio',
          paragraphs: [
            'Para que un proyecto de esta envergadura sea aprobado y respaldado por el Directorio y los socios de la compañía, no basta con demostrar su solidez técnica o su apego normativo; es indispensable acreditar con números sobre la mesa que el sistema no constituye un "freno burocrático que asfixia el negocio", sino un habilitador financiero directo con un Retorno de Inversión (ROI) cuantificable y un ahorro medible en pérdidas operacionales. En mi calidad de Control Interno, me propuse modelar esta evaluación económica con total realismo, considerando la dotación real del equipo y los costos efectivos de la infraestructura en la nube.',
            'El punto de partida de este análisis considera la dotación directa del Departamento Inmobiliario, compuesta por 9 profesionales (jefatura de departamento, jefes de oficina, analistas de operaciones y ejecutivos de arriendos) con sueldos líquidos promedio superiores al millón de pesos, lo que representa un costo empresa mensual estimado de $1.650.000 CLP por persona (incluyendo leyes sociales, seguros y beneficios). Esto se traduce en que la organización invierte mensualmente $14.850.000 CLP en su equipo humano ($178.200.000 CLP al año). Frente a este gasto laboral, la infraestructura tecnológica requerida para soportar el sistema en producción —basada en Google Cloud Platform, base de datos transaccional Firestore, almacenamiento de contratos y fotos en Cloud Storage y tráfico de red— demanda un costo operativo sumamente eficiente de aproximadamente $120.000 CLP mensuales ($1.440.000 CLP anuales), eliminando los costosos servidores físicos y licencias tradicionales on-premise que exigían desembolsos de decenas de miles de dólares.',
            'El retorno económico del sistema se sustenta en tres fuentes directas de ahorro y protección de caja: primero, la recuperación de horas-hombre productivas, donde el sistema elimina las tareas manuales repetitivas de digitación, búsqueda de contratos en carpetas sueltas y cuadratura manual de cartolas, liberando un 25% del tiempo del equipo (equivalente a 2,25 sueldos anuales o $44.550.000 CLP al año) para abocarse a la gestión comercial, mantención y reducción de vacancia; segundo, la cobranza oportuna y disminución de la morosidad oculta sobre una cartera de 1.843 propiedades que factura cerca de $829.000.000 CLP mensuales, donde la conciliación en tiempo real y la imputación automática rescatan un 0,4% de pagos que antes quedaban desfasados o prescribían sin cobro ($39.792.000 CLP anuales en liquidez recuperada); y tercero, el control preventivo de compras y mantenciones (OT) mediante validación de tres vías, junto a la prevención de sanciones y multas fatales de la CMF (que parten desde las 250 UF por atrasos o inconsistencias en los reportes B4 y B13), aportando un ahorro preventivo de al menos $8.000.000 CLP al año.',
            'Al confrontar el beneficio neto anual consolidado ($90.902.000 CLP) contra el costo anual de la tecnología cloud ($1.440.000 CLP), el proyecto arroja un Retorno de Inversión (ROI) extraordinario de un 6.312% anual. En términos prácticos para la toma de decisiones, esto demuestra que el costo tecnológico anual de la plataforma se amortiza en menos de seis días de operación regular del departamento, transformando el control interno en una palanca de rentabilidad que cuida el patrimonio de la corporación.'
          ],
          callout: {
            title: 'Indicador Clave de Desempeño Financiero (ROI: 6.312%)',
            text: 'Con una inversión en infraestructura cloud de $120.000 CLP mensuales frente a una nómina de 9 profesionales de $14.850.000 CLP/mes, el sistema genera un beneficio neto anual de $90.902.000 CLP por ahorro de horas-hombre, recuperación de arriendos en 1.843 propiedades y control de mantenciones, alcanzando un Retorno de Inversión (ROI) del 6.312% con recuperación de costos en menos de 6 días.'
          },
          table: {
            caption: 'Tabla 1: Evaluación Económica, Estructura de Costos y Cálculo del ROI en el Departamento Inmobiliario',
            headers: ['Componente Financiero', 'Detalle Operacional / Base de Cálculo', 'Impacto Mensual (CLP)', 'Impacto Anual (CLP)'],
            rows: [
              ['Costo Equipo Humano (9 Personas)', '9 profesionales con rentas superiores a $1.000.000 (Costo empresa prom. $1.650.000 c/u)', '$14.850.000', '$178.200.000'],
              ['Costo Infraestructura Google Cloud & Firestore', 'Cloud Run, base de datos Firestore, Storage de documentos y tráfico de red en producción', '-$120.000', '-$1.440.000'],
              ['Ahorro en Horas-Hombre y Reprocesos', 'Recuperación del 25% de la jornada laboral al suprimir la digitación en planillas Access/Excel', '+$3.712.500', '+$44.550.000'],
              ['Recuperación y Cobranza de Arriendos', 'Disminución de morosidad y cobro oportuno (0,4% de cartera sobre 1.843 propiedades)', '+$3.316.000', '+$39.792.000'],
              ['Control de OTs y Prevención Multas CMF', 'Control de tres vías en mantenciones y eliminación de multas CMF por plazos fatales en B4/B13', '+$666.667', '+$8.000.000'],
              ['BENEFICIO NETO CONSOLIDADO', 'Total ahorros operacionales y caja rescatada menos costo cloud', '+$7.575.167', '+$90.902.000'],
              ['RETORNO DE INVERSIÓN (ROI)', 'Beneficio Neto Anual ($90.902.000) / Costo Cloud Anual ($1.440.000)', '-', '6.312% Anual (Payback: 5,8 días)']
            ]
          }
        }
      ]
    },
    {
      id: 'cap-2',
      number: 'CAPÍTULO II',
      title: 'INTELIGENCIA ARTIFICIAL GENERATIVA: INGENIERÍA ASISTIDA Y GOBERNANZA ALGORÍTMICA',
      subtitle: 'Frontera entre cálculo determinista y asistencia cognitiva, control de alucinaciones y principio Human-in-the-Loop',
      paragraphs: [
        'Una vez concentrados los datos del departamento en una estructura transaccional única, el siguiente desafío del proyecto consistió en definir qué rol debía cumplir la Inteligencia Artificial Generativa dentro de un entorno tan estricto como el control interno financiero e inmobiliario. Para abordar este punto conviene partir de una premisa de honestidad profesional: bajo ningún concepto considero que este sistema ni sus componentes de IA sean infalibles. Ninguna herramienta informática lo es, y menos aún cuando incorpora modelos de lenguaje que no razonan como un auditor humano, sino que operan por probabilidad y aproximación estadística.',
        'Por eso mismo, para que la incorporación de IA ayudara a fortalecer el control interno en lugar de introducir nuevas incertidumbres, establecí en la arquitectura una frontera tajante entre el cálculo duro y la asistencia cognitiva. En AssetFlow Enterprise los modelos generativos (Google Gemini) jamás calculan impuestos, ni reajustes en UF, ni cuadraturas de los reportes CMF, ni saldos contables: toda la aritmética financiera y las tasas tributarias corren sobre código tradicional determinista, donde el resultado es exacto y no admite interpretaciones creativas. La inteligencia artificial se reserva exclusivamente para aquellas tareas donde aporta velocidad de análisis —como extraer datos preliminares desde documentos no estructurados, priorizar tareas críticas según vencimiento en el Asistente de Tareas IA (P0001IA) o advertir anomalías documentales—, funcionando siempre como un apoyo sujeto a revisión y nunca como un reemplazo del criterio profesional.'
      ],
      subsections: [
        {
          number: '2.1',
          title: 'El Protocolo de Blindaje Arquitectónico (Developer Lock) en el Co-Diseño Humano-IA',
          paragraphs: [
            'Uno de los aportes metodológicos más interesantes de este trabajo fue experimentar en carne propia los riesgos de la ingeniería de software asistida por agentes de IA. Durante el desarrollo de sistemas complejos, los modelos de lenguaje tienden a sufrir lo que en ingeniería de prompts avanzada se denomina deriva contextual o refactorización destructiva: al pedirles una nueva funcionalidad, pueden alterar inadvertidamente estructuras de datos críticas o eliminar campos de negocio previamente consolidados.',
            'Para mitigar este fenómeno, se diseñó e implementó un protocolo formal de gobernanza de código denominado "Protocolo de Integridad y Blindaje del Código (AGENTS.md)". Este instrumento opera como una verdadera constitución técnica para el agente de IA: establece la titularidad exclusiva del proyecto, prohíbe refactorizaciones masivas no autorizadas y protege explícitamente la persistencia de atributos críticos del negocio (tales como category, specialty y associatedInvoice) tanto en la base de datos como en la interfaz visual y en los reportes de exportación. Esta experiencia demuestra que el futuro del desarrollo con IA Generativa no reside en la delegación ciega, sino en el establecimiento de marcos normativos técnicos que acoten el espacio de acción del modelo.'
          ],
          callout: {
            title: 'Principio de Gobernanza en Ingeniería con IA Generativa',
            text: 'La velocidad generativa de un modelo fundacional debe ser siempre contenida por invariantes de dominio definidos por el arquitecto humano. Sin reglas de integridad explícitas, la automatización del código erosiona la trazabilidad del negocio.'
          }
        },
        {
          number: '2.2',
          title: 'Control de Alucinaciones, Supervisión Humana (Art. 14 EU AI Act) y Responsabilidad frente a Delitos Económicos',
          paragraphs: [
            'No niego en absoluto la probabilidad de que un modelo generativo pueda alucinar al interpretar una cláusula o clasificar un antecedente complejo; es un riesgo inherente a esta tecnología que sería irresponsable ocultar. Precisamente por eso, la arquitectura se concibió bajo la regla de que el software propone, pero siempre necesita validación humana antes de producir efectos patrimoniales. En línea con el Artículo 14 del Reglamento Europeo de Inteligencia Artificial (Reglamento UE 2024/1689, EU AI Act) sobre supervisión humana efectiva, ningún asistente cognitivo dentro de AssetFlow tiene atribuciones para liberar un pago, adjudicar un contratista o dar curso autónomo a una orden de trabajo.',
            'Esta exigencia de validación humana es el cortafuegos donde mitigo el riesgo real de cursar operaciones defectuosas o que pudieran llegar a configurar un ilícito bajo la Ley N° 21.595 de Delitos Económicos en Chile. Aun cuando el motor cognitivo sugiera una clasificación o pre-llene datos desde una factura mediante RAG acotado a los maestros del sistema, la transacción queda retenida en la bandeja P43081 hasta que un apoderado humano revise el Checklist de 7 puntos de control en el inspector W43081C y decida aprobarla o rechazarla. En consecuencia, la responsabilidad jurídica y administrativa final jamás se diluye en el algoritmo: recae íntegramente en el ejecutivo facultado que valida el acto y estampa su firma nominal en el bloque SHA-256 de la tabla F4209.'
          ],
          table: {
            caption: 'Tabla 2: Matriz de Gobernanza de IA Generativa implementada en el Sistema',
            headers: ['Dimensión de Riesgo IA', 'Amenaza Identificada', 'Mecanismo Técnico-Jurídico en AssetFlow Enterprise', 'Estándar Normativo de Referencia'],
            rows: [
              ['Separación entre Aritmética e Inferencia', 'Riesgo de que un modelo probabilístico altere montos contables, impuestos o reportes normados', 'Motor determinista TypeScript para cálculos de IVA (19%), Retenciones BH, UF y cuadraturas CMF; la IA jamás ejecuta aritmética contable', 'Principio de Exactitud y Robustez (Art. 15 EU AI Act)'],
              ['Alucinación y Riesgo Penal Corporativo', 'Curso accidental a una operación irregular o delito económico por confiar ciegamente en la IA', 'Validación humana obligatoria en P43081 (Checklist W43081C de 7 puntos); responsabilidad jurídica recae en el apoderado firmante en F4209', 'Supervisión Humana (Art. 14 EU AI Act / Ley Chilena N° 21.595)'],
              ['Fuga de Datos Confidenciales', 'Exposición de datos sensibles en prompts externos', 'Minimización de atributos y sanitización de payloads antes de consulta al modelo cognitivo', 'Privacy by Design (RGPD Art. 25 / Ley Chilena N° 21.719)'],
              ['Deriva de Código en Mantenimiento', 'Pérdida de columnas críticas de auditoría durante actualizaciones', 'Protocolo Developer Lock (AGENTS.md) con validación obligatoria de compilación y esquemas', 'ISO/IEC 42001 (Sistema de Gestión de IA)']
            ]
          }
        }
      ]
    },
    {
      id: 'cap-3',
      number: 'CAPÍTULO III',
      title: 'DERECHO DIGITAL Y CUMPLIMIENTO NORMATIVO POR DISEÑO (COMPLIANCE BY DESIGN)',
      subtitle: 'Automatización tributaria, prevención de delitos económicos, firma electrónica y protección de datos',
      paragraphs: [
        'Uno de los aprendizajes más valiosos del Máster es comprender que el Derecho Digital no se limita a regular internet o las redes sociales; su impacto más profundo ocurre cuando las normas jurídicas se codifican directamente en la arquitectura de los sistemas de información que gobiernan la economía real. Lo que la doctrina denomina "Compliance by Design" (cumplimiento desde el diseño) o "RegTech" consiste precisamente en transformar obligaciones legales abstractas en restricciones lógicas dentro del software, de modo que incumplir la norma resulte operativamente imposible o deje una alerta inmediata e indeleble.',
        'En el desarrollo de este sistema se abordaron cuatro frentes normativos concretos del ordenamiento jurídico chileno y comparado: la legislación tributaria sobre documentos electrónicos, la prevención de delitos económicos y lavado de activos (Due Diligence de terceros), el régimen legal de la firma electrónica y las nuevas exigencias de protección de datos personales.'
      ],
      subsections: [
        {
          number: '3.1',
          title: 'Derecho Tributario Automatizado: IVA en Facturas y Retención en Boletas de Honorarios',
          paragraphs: [
            'En la práctica empresarial chilena, un error recurrente en los módulos de mantención y órdenes de trabajo (OT) es tratar los presupuestos como cifras planas, ignorando la naturaleza jurídica y tributaria del documento con el que se facturará el servicio. Desde el punto de vista legal, no es lo mismo contratar una reparación estructural con una empresa constructora afecta al Impuesto al Valor Agregado (D.L. N° 825 sobre Impuesto a las Ventas y Servicios, tasa general del 19%) que contratar a un profesional independiente o especialista técnico mediante una Boleta de Honorarios Electrónica, regida por el artículo 42 N° 2 de la Ley sobre Impuesto a la Renta (D.L. N° 824 y Ley N° 21.133), la cual exige practicar una retención de impuesto de segunda categoría.',
            'Para reflejar con rigor esta realidad jurídico-tributaria, se rediseñó el motor financiero de las Órdenes de Trabajo (programa P48201 / tabla F4801), la bandeja de aprobaciones P43081, el voucher oficial PDF y el motor de exportación a planillas de auditoría Excel (formateando además las marcas de tiempo en formato de hora corta HH:mm para eliminar ambigüedades de notación científica en peritajes contables). El sistema identifica automáticamente el tipo de documento tributario asociado a la orden (associatedInvoice) y desglosa en tiempo real la base imponible (Monto Neto o Honorario Bruto), el tributo específico aplicable —sumando el +19% de IVA cuando se trata de Factura Afecta, o deduciendo explícitamente la Retención de Boleta de Honorarios cuando corresponde a servicios profesionales de segunda categoría— y el Monto Total Líquido exigible para tesorería.'
          ]
        },
        {
          number: '3.2',
          title: 'Ley de Delitos Económicos (Ley N° 21.595), UAF (Ley N° 19.913) y Auditoría Pre-Firma de 7 Puntos',
          paragraphs: [
            'La entrada en vigencia en Chile de la Ley N° 21.595 sobre Delitos Económicos, que reformó profundamente el catálogo de delitos y el régimen de responsabilidad penal de las personas jurídicas (Ley N° 20.393), junto con las obligaciones de prevención de lavado de activos de la Ley N° 19.913 (Unidad de Análisis Financiero - UAF), ha vuelto indispensable que las empresas acrediten que sus Modelos de Prevención de Delitos (MPD) no son simples manuales en papel, sino controles vivos que impiden pagos irregulares o contrataciones con contrapartes riesgosas.',
            'En AssetFlow Enterprise, este mandato legal se materializó mediante la integración directa entre el Maestro de Proveedores (F0101/F0401), el módulo de Debida Diligencia (Due Diligence / Compliance UAF) y la Central de Aprobaciones de Órdenes (P43081). Antes de que un ejecutivo pueda estampar su firma aprobatoria en el Inspector Jerárquico (W43081C), el sistema ejecuta una "Lista de Chequeo Automática Pre-Aprobación de 7 Puntos": (1) Proveedor activo en F0101; (2) Ausencia de bloqueo de pago en F0401; (3) Evaluación de Debida Diligencia y riesgo UAF aceptable; (4) Referencia de cotización formal registrada; (5) Clasificación técnica completa de categoría y especialidad; (6) Documento tributario asociado identificado; y (7) Encuadramiento dentro del marco presupuestario operativo de la unidad (F0902).'
          ]
        },
        {
          number: '3.3',
          title: 'Rutas Jerárquicas (P43008), Aprobación por Línea (W43081B), Subrogancias (P43280) y Ley N° 19.799',
          paragraphs: [
            'En el derecho societario y administrativo, la validez de un acto de disposición patrimonial depende de la competencia y personería de quien lo autoriza. Inspirándose fielmente en el módulo de Procurement & Subcontract Management del estándar Enterprise ERP 9.11, se implementaron cuatro componentes interconectados: el Configurador de Rutas Jerárquicas de Aprobación (P43008 / tabla F43008), la Bandeja de Liberación de Órdenes (W43081A / P43081) con Menú Contextual Empresarial (Clic Derecho / F4 / [⋮]), el Modal de Aprobación por Línea Individual de Detalle (W43081B / tabla F4311) y el Maestro de Delegación de Autoridad y Subrogancias (P43280 / tabla F43092).',
            'Cuando una orden supera determinados umbrales económicos o presenta observaciones preventivas, el sistema le asigna un código de retención administrativa de la tabla UDC 42/HC (tales como "2W - En Espera de Firma", "2H - Retenida en Observación", "B1 - Hold Presupuestario", "C1 - Hold Compliance UAF", "Q1 - Hold Cotizaciones Comparativas", "T1 - Hold Revisión Técnica", "2A - Aprobada/Liberada" o "2R - Rechazada"). En caso de ausencia temporal del titular por vacaciones, licencia médica o comisión de servicio, el módulo P43280 permite registrar subrogancias formales en F43092 con vigencia acotada y tope monetario máximo delegado, cumpliendo con los principios de atribución, integridad y no repudio de la Ley N° 19.799.'
          ]
        },
        {
          number: '3.4',
          title: 'Política Estricta de Credenciales, Administración de Privilegios y Protección de Datos (Ley N° 21.719)',
          paragraphs: [
            'En mi experiencia liderando procesos de control interno y auditoría operativa, he comprobado que la gran mayoría de las brechas de integridad en las empresas no ocurren por ataques criptográficos sofisticados desde el exterior, sino por algo mucho más cotidiano: el desorden en la entrega de permisos y el uso de cuentas con privilegios excesivos. Cuando en una organización cualquiera puede editar maestros sensibles o compartir contraseñas sin trazabilidad nominal, ningún candado posterior sirve de mucho. Por esa razón, la entrada en vigor en Chile de la Ley N° 21.719 sobre Protección de Datos Personales —que eleva la exigencia al nivel del RGPD europeo— se tradujo dentro de este proyecto en una política sumamente estricta de administración de credenciales y privilegios de acceso.',
            'En el sistema nadie entra con llaves maestras genéricas. Cada sesión exige autenticación nominal asociada al RUT y cargo del funcionario, aplicando un esquema de privilegio mínimo donde cada perfil ve y ejecuta únicamente lo que su función requiere. Quien solicita una orden de trabajo en terreno no tiene facultades para liberarla en la bandeja P43081, y quien cuenta con atribuciones gerenciales para firmar la liberación tampoco tiene acceso de escritura directa sobre las tablas de auditoría F4209 o F980011D. Incluso a nivel técnico se estableció una muralla clara: el personal encargado de administrar la infraestructura informática mantiene el servicio operativo, pero carece de credenciales funcionales para autorizar pagos o emitir contra-asientos contables.'
          ]
        },
        {
          number: '3.5',
          title: 'Supervisión de la CMF (Circular N° 1.835 y NCG 316), Conciliación B.4 vs. Nota 14 y Puente Tributario NIC 12 / D.L. 825',
          paragraphs: [
            'En el sector asegurador e inmobiliario chileno, el cumplimiento normativo frente a la Comisión para el Mercado Financiero (CMF) no admite márgenes de ambigüedad. Como Control Interno del Departamento Inmobiliario de Mutucar, viví en carne propia lo que significa responder ante los requerimientos de la CMF cuando los antecedentes patrimoniales se encuentran fragmentados o cuando las tasaciones periciales que respaldan las reservas técnicas superan los plazos reglamentarios. De hecho, uno de los hitos fundacionales de AssetFlow Enterprise fue precisamente levantar una suspensión y subsanar 4 observaciones graves formuladas por el ente fiscalizador.',
            'Para erradicar de raíz cualquier riesgo de sanción, codifiqué en el sistema tres mecanismos de blindaje automático: en primer lugar, el motor del Informe B.4 (programa R09322) da cumplimiento estricto a la Norma de Carácter General N° 316 (NCG 316 CMF), la cual exige separar de manera tajante el valor del Terreno del valor de la Construcción. Los terrenos poseen vida útil indefinida y, por mandato expreso del regulador, no están afectos a depreciación ($0), aplicándose la amortización acumulada única y exclusivamente sobre las construcciones. En segundo lugar, implementé el Semáforo de Antigüedad de Tasaciones CMF bajo la Circular N° 1.835, el cual monitorea en tiempo real los 24 meses de vigencia máxima de los peritajes con alertas tempranas escalonadas (verde < 18m, amarillo 18-21m, naranja 22-24m y rojo > 24m), impidiendo que un bien raíz quede desprotegido ante una fiscalización.',
            'En tercer lugar, construí la Matriz de Conciliación Trimestral B.4 vs. Nota 14 (R09323 / NIC 40 §76) y el Puente Financiero-Tributario NIC 12. La regla de oro exigida por los auditores externos y peritos de la CMF es que al cierre de cada trimestre (marzo, junio, septiembre y diciembre), el informe mensual B.4 debe cuadrar al peso ($0 de discrepancia) con la revelación de la Nota 14 en sus 7 dimensiones clave: valor razonable, costo terreno, construcciones, m² de terreno, m² construidos, cánones devengados y unidades declaradas, generando un Hash SHA-256 de certificación automática. Paralelamente, el puente NIC 12 concilia la ganancia no realizada por revalorización —la cual no tributa en el Formulario 22 (RLI Art. 31 LIR) hasta la enajenación del activo, generando un Pasivo por Impuesto Diferido del 27% bajo Régimen 14A— y controla el Expediente Digital del Artículo 17 inciso 2° del D.L. N° 825, deduciendo el 11% anual del avalúo fiscal en arriendos amoblados afectos a IVA.'
          ],
          table: {
            caption: 'Tabla 3: Mecanismos de Supervisión CMF y Cumplimiento Tributario implementados',
            headers: ['Marco Regulatorio', 'Obligación Legal / Técnica', 'Solución en AssetFlow Enterprise', 'Efecto de Control Interno'],
            rows: [
              ['NCG N° 316 CMF', 'Desglose obligatorio Terreno vs. Construcción; terrenos no afectos a depreciación', 'Cálculo segregado en R09322 con Dep. Terreno = $0 y vida útil acotada a construcción', 'Elimina reparos del regulador por sobre-depreciación de activos inmuebles'],
              ['Circular CMF N° 1.835', 'Tasaciones periciales de respaldo no pueden superar 24 meses de antigüedad', 'Semáforo de 4 estados (<18m, 18-21m, 22-24m, >24m) con alerta temprana de cotización', 'Evita la descalificación de inmuebles que garantizan reservas técnicas'],
              ['NIC 40 / Circular 1.835', 'Cuadratura exacta al cierre de trimestre entre el archivo B.4 y la Nota 14', 'Matriz determinista de 7 puntos con certificación de diferencia $0 y Hash SHA-256', 'Garantiza consistencia absoluta entre reportes mensuales y balances auditados'],
              ['NIC 12 / D.L. 824 / D.L. 825', 'Impuesto diferido al 27% (RLI) y deducción del 11% avalúo fiscal en arriendos amoblados', 'Puente tributario automático hacia F22 y control del expediente digital Art. 17 inc. 2', 'Optimización legal de carga tributaria y provisión contable de pasivos por revalorización']
            ]
          }
        }
      ]
    },
    {
      id: 'cap-4',
      number: 'CAPÍTULO IV',
      title: 'INMUTABILIDAD CRIPTOGRÁFICA E INSPIRACIÓN BLOCKCHAIN EN REGISTROS ERP',
      subtitle: 'Funciones Hash SHA-256, gobernanza Append-Only, anclaje de Raíz de Merkle y transición a infraestructura propia',
      paragraphs: [
        'Cuando se habla de Blockchain en el ámbito académico o empresarial, suele cometerse el error de reducir el concepto al uso de criptomonedas o redes públicas con altos costos de transacción y latencia. Sin embargo, desde la perspectiva de la ingeniería criptográfica y del Derecho Probatorio Digital, el verdadero aporte revolucionario de la tecnología Blockchain reside en la estructura misma con que protege los datos: el uso de funciones hash unidireccionales y el encadenamiento secuencial Append-Only de bloques de información que vuelve matemáticamente evidente cualquier intento de alteración retroactiva.',
        'En un ERP donde se administran contratos de arriendo y órdenes de mantención por montos elevados, la amenaza más delicada es la modificación silenciosa de un registro histórico. Para neutralizar ese escenario sin depender de la buena fe de los operadores, AssetFlow Enterprise articula el sellado criptográfico en la tabla F4209 bajo el estándar NIST FIPS 180-4 junto con una estrategia realista de soberanía de infraestructura.'
      ],
      subsections: [
        {
          number: '4.1',
          title: 'Encadenamiento Criptográfico SHA-256 (Web Crypto API) y Gobernanza Estricta Append-Only',
          paragraphs: [
            'Un dilema clásico al aplicar Blockchain en sistemas ERP corporativos es la colisión entre la inmutabilidad absoluta de una cadena pública y el deber de confidencialidad de los datos personales y tributarios consagrado en el Artículo 17 del RGPD europeo y en la Ley N° 21.719 chilena. Exponer RUTs de contratistas o montos de honorarios en una red abierta vulneraría el secreto del negocio. Por ello, AssetFlow Enterprise adopta una arquitectura de evidencia criptográfica híbrida utilizando la API nativa del navegador (window.crypto.subtle.digest("SHA-256")).',
            'Cada vez que un ejecutivo aprueba, retiene o rechaza una orden en el módulo P43081, el motor construye una pre-imagen canónica determinista con los campos transaccionales clave y calcula su resumen SHA-256 de 64 caracteres hexadecimales (Payload Hash). Enseguida, encadena ese resultado con el hash del bloque inmediatamente anterior partiendo desde el Bloque Génesis #0 para obtener el sello definitivo del eslabón: BlockHash = SHA-256(BlockIndex | PreviousBlockHash | PayloadHash). Todos los bloques se consolidan además mediante un árbol binario para calcular en vivo la Raíz de Merkle (Merkle Root SHA-256).',
            'Por coherencia con el principio contable de inmutabilidad, el "Verificador en Vivo de Integridad de la Cadena de Bloques (SHA-256)" fue construido como una herramienta de inspección forense estrictamente de solo lectura. Decidí eliminar de raíz cualquier botón o rutina que permitiera "restaurar" o "re-sellar" una cadena alterada desde la interfaz de auditoría, porque otorgar una función que reescriba hashes pasados destruiría precisamente el principio de no repudio que buscamos defender. Si un dato histórico se corrompe en la base de datos, el recálculo en vivo mediante crypto.subtle acusa de inmediato el quiebre en cascada de los bloques siguientes; y si hubo un error humano legítimo al aprobar una orden, la única vía admisible es agregar un nuevo bloque de contra-asiento al final de la cadena.'
          ],
          callout: {
            title: 'Principio de Inmutabilidad y Prohibición de Re-Sellado Histórico',
            text: 'Un verificador criptográfico forense jamás debe incluir funciones que permitan re-sellar o reescribir bloques históricos. La integridad del libro F4209 es estrictamente Append-Only: cualquier rectificación operativa posterior debe materializarse mediante un nuevo bloque transaccional (N+1) de contra-asiento.'
          }
        },
        {
          number: '4.2',
          title: 'Defensa frente al Administrador Interno y Anclaje Externo de la Raíz de Merkle',
          paragraphs: [
            'En cualquier defensa rigurosa de arquitectura surge una duda legítima: qué impide que alguien con acceso directo al motor de base de datos borre la tabla F4209 completa y genere una cadena nueva recalculando todos los hashes desde el primer bloque. La primera barrera frente a esto es organizacional y responde a la política estricta de credenciales ya descrita, donde los privilegios de administración del servidor están separados de los roles de negocio y las tablas de bitácora operan únicamente con permisos de adición (Append-Only).',
            'Como resguardo matemático adicional frente a una eventual colusión interna, la arquitectura contempla el anclaje externo de la Raíz de Merkle que el verificador calcula en pantalla. Mientras los antecedentes privados de la operación quedan resguardados dentro de la empresa, ese código resumen de 64 caracteres hexadecimales no revela absolutamente nada sobre proveedores ni montos, por lo que puede timbrarse al cierre del día ante un servicio externo de sellado de tiempo o en una red pública. De ese modo, aunque alguien lograra reescribir la base de datos entera desde adentro, la nueva Raíz de Merkle jamás coincidiría con el sello externo registrado en la fecha original.'
          ]
        },
        {
          number: '4.3',
          title: 'Transición de Firebase en Pre-Producción hacia Servidores Corporativos Propios (On-Premise) y Resiliencia DORA',
          paragraphs: [
            'Conviene transparentar aquí una definición pragmática de ingeniería respecto de dónde residen las bases de datos según la etapa del proyecto. Durante el desarrollo y validación funcional de este sistema, opté por alojar la persistencia en la nube utilizando Firebase (Google Cloud Firestore) apoyado por un motor local en el navegador (IndexedDB). Trabajar sobre Firebase en esta fase de laboratorio y pre-producción nos dio la agilidad necesaria para probar en tiempo real la sincronización documental, calibrar el arranque rápido del sistema sin burocracia de infraestructura y demostrar el funcionamiento completo del prototipo frente al tribunal académico.',
            'No obstante, tratándose de información patrimonial, tributaria y contractual de una corporación inmobiliaria y aseguradora, el paso a producción exige otro estándar de custodia. Por política interna de seguridad y soberanía de los datos, antes de que el sistema entre en producción definitiva todas las bases de datos deben migrar desde Firebase hacia servidores propios de la empresa (infraestructura On-Premise controlada directamente por la organización). Esta migración previa a la salida en vivo responde tanto a las exigencias chilenas de protección de datos (Ley N° 21.719) y supervisión financiera como a los criterios del Reglamento Europeo DORA (UE 2022/2554) sobre control de activos críticos. Al llevar la base de datos a servidores corporativos propios bajo almacenamiento de escritura única (WORM) y mantener el respaldo local cifrado, la empresa conserva el dominio físico total sobre su patrimonio informativo sin quedar atada a la nube de un proveedor externo.'
          ],
          table: {
            caption: 'Tabla 3: Equivalencia entre Principios Criptográficos, Gobierno de Infraestructura y Marco Legal',
            headers: ['Pilar de Seguridad', 'Implementación en AssetFlow Enterprise', 'Módulos / Infraestructura', 'Efecto Jurídico-Probatorio'],
            rows: [
              ['Política de Credenciales y Privilegios', 'Autenticación nominal, mínimo privilegio (RBAC) y separación entre TI y aprobadores de negocio', 'Seguridad Global / P43081 / P43280', 'Trazabilidad de autoría y prevención de fraude interno (Ley 21.595 / Ley 20.393)'],
              ['Migración a Servidores Propios (On-Premise)', 'Uso de Firebase acotado a pre-producción; migración obligatoria a servidores propios antes de producción', 'StorageEngine / Base de Datos Corporativa', 'Soberanía de datos patrimoniales y cumplimiento de Ley 21.719 y Reglamento DORA'],
              ['Hash-Chaining SHA-256 (Web Crypto API)', 'Encadenamiento secuencial Append-Only: BlockHash = SHA256(Idx | PrevHash | PayloadHash) desde Génesis #0', 'F4209 (P43081) y Bóveda Digital', 'Detección inmediata de alteraciones por Efecto Avalancha (Ley 19.799 / eIDAS 2)'],
              ['Anclaje de Raíz de Merkle y Contra-Asiento', 'Prohibición de re-sellado histórico; errores se corrigen con nuevo bloque y el Merkle Root se timbra externamente', 'Verificador Criptográfico F4209', 'Inmunidad frente a reemplazo de cadena y preservación íntegra de la evidencia']
            ]
          }
        },
        {
          number: '4.4',
          title: 'Empaquetado Empresarial (Docker Multi-Stage & PM2 Native), Despliegue On-Premise y Manual Técnico IT (SGC-IT-MAN-008)',
          paragraphs: [
            'Para que la soberanía de datos y la migración a servidores propios no queden como una mera aspiración documental, diseñé e implementé el empaquetado integral del sistema listo para producción corporativa. La solución fue estructurada bajo dos modalidades complementarias: en primer lugar, el empaquetado en contenedores ligeros mediante un Dockerfile multi-etapa basado en Node.js 22 Alpine, el cual optimiza el bundle compilado de Vite y monta el servidor Express SSR en el puerto 3000 con un tamaño final inferior a 180 MB, orquestado mediante un archivo docker-compose.yml que permite encender el servicio en un solo comando (docker compose up -d --build) con reinicio automático ante caídas del servidor y monitoreo de salud (healthcheck).',
            'En segundo lugar, para facilitar una implementación inmediata y desatendida ("Zero-Touch"), se programaron instaladores maestros automatizados: install.sh para servidores Linux (Ubuntu/Debian/RedHat/Rocky) y install-windows.bat para entornos Windows Server 2016/2019/2022/2025, acompañados de los scripts de arranque deploy.sh y deploy-windows.bat. Estos instaladores autodiagnostican la memoria RAM, crean espacio SWAP dinámico ante recursos acotados, configuran automáticamente las reglas de Firewall (puerto 3000), gestionan clústeres mediante PM2 (ecosystem.config.cjs) o contenedores Docker Compose, y se integran con un Proxy Inverso Nginx (nginx.conf) con certificados SSL Let\'s Encrypt (Certbot).',
            'Con el objetivo de garantizar que el personal de Infraestructura y Soporte de la compañía —incluso asumiendo profesionales con poca experiencia en contenedores modernos— pueda poner en marcha el sistema sin fricciones ni dependencias externas, elaboré el Manual Técnico de Instalación, Despliegue y Operación en Servidores Empresariales (Código SGC-IT-MAN-008). Este documento normado bajo estándares ISO 9001 e ISO 27001 fue incorporado de forma permanente en la Bóveda de Documentos Digitales (programa P986110D) con descarga directa en Microsoft Word (.docx) y PDF vectorial, asegurando la continuidad operacional del patrimonio tecnológico de la empresa.'
          ],
          callout: {
            title: 'Independencia Tecnológica y Despliegue On-Premise Garantizado',
            text: 'El empaquetado multi-etapa en Docker Alpine (<180 MB) y los scripts automatizados PM2/Nginx SSL, junto al Manual Técnico IT (SGC-IT-MAN-008) custodiado en la Bóveda Digital, garantizan la soberanía de los datos y la puesta en marcha en servidores propios sin requerir servicios en la nube de terceros.'
          }
        },
        {
          number: '4.5',
          title: 'Resiliencia Operacional ante Caída de Enlace Externo (Offline-First LAN) y Auto-Aprovisionamiento de Tablas',
          paragraphs: [
            'Una preocupación fundamental en la auditoría de continuidad de negocio (BCP / DR) bajo la norma ISO 22301 y el Reglamento DORA es determinar qué ocurre cuando la empresa experimenta un corte total en su conexión a Internet. En la arquitectura de AssetFlow Enterprise, la operación interna está completamente blindada frente a este incidente: dado que el servidor físico o máquina virtual reside en las dependencias de la empresa, la red de área local (LAN / Intranet corporativa) mantiene comunicadas las estaciones de trabajo de los 9 profesionales del departamento con el servidor en el puerto 3000 sin depender de enlaces externos.',
            'Asimismo, el diseño de persistencia "Offline-First" canalizado a través de StorageEngine e IndexedDB asegura que las consultas catastrales, el registro de órdenes de trabajo (P48201), el cálculo de retenciones tributarias, la verificación jerárquica de 7 puntos en P43081 y el sellado criptográfico SHA-256 en F4209 se ejecuten íntegramente de manera local sin congelamiento ni pantallas de error. Únicamente las funciones que requieren acceso a la red pública —como el despacho de correos electrónicos a inquilinos y las consultas a APIs de inteligencia artificial externa— se encolan de forma contingente hasta que el enlace a Internet sea restablecido por la compañía de telecomunicaciones.',
            'Por último, la arquitectura resuelve el riesgo de despliegue mediante el auto-aprovisionamiento automático de su esquema de datos: al arrancar el sistema en una instalación limpia, el código valida e inicializa de manera autónoma las 32 tablas maestras y auxiliares del estándar Enterprise (F0101, F0401, F0116, F0111, F0030, F4801, F4209, F15012, F0911, entre otras) y siembra el catastro de propiedades y plan de cuentas sin requerir que el personal de TI elabore scripts SQL manuales, eliminando de raíz cualquier error humano en la creación de tipos de datos o índices de base de datos.'
          ],
          callout: {
            title: 'Continuidad Operacional Blindada (ISO 22301 & Reglamento DORA)',
            text: 'La topología On-Premise en red LAN combinada con la persistencia local IndexedDB y el auto-aprovisionamiento de las 32 tablas Enterprise permite mantener la operación comercial, los pagos y el control interno al 100% aun cuando la empresa sufra un corte total de su conexión a Internet.'
          }
        }
      ]
    },
    {
      id: 'cap-5',
      number: 'CAPÍTULO V',
      title: 'ARQUITECTURA TÉCNICA, OPTIMIZACIÓN DE RENDIMIENTO Y PLAN DE IMPLEMENTACIÓN EN TERRENO',
      subtitle: 'Fidelidad Enterprise ERP 9.11, arranque JAS FastBoot, Protocolo Sombra, Protocolo de Empoderamiento y Manuales ISO 9001',
      paragraphs: [
        'Para que un sistema de cumplimiento legal e inteligencia artificial sea adoptado con éxito en una organización real, no basta con que su diseño sea teóricamente sólido; debe responder con agilidad en pantalla y contar con una estrategia realista de adopción humana frente a usuarios acostumbrados durante años a sus propias planillas. Por ello, este capítulo aborda tanto la ingeniería de rendimiento aplicada sobre la interfaz estilo Enterprise ERP de alta densidad (JAS 9.2) como el plan práctico de puesta en marcha y acompañamiento en los puestos de trabajo.',
        'En el plano técnico, la carga simultánea de todas las colecciones históricas (órdenes, facturas, asientos contables, contratos y bitácoras de auditoría) generaba inicialmente una espera innecesaria antes de desplegar la pantalla principal, lo que motivó el rediseño del arranque bajo el esquema "JDE JAS FastBoot & Two-Tier Hydration".'
      ],
      subsections: [
        {
          number: '5.1',
          title: 'Hidratación en Dos Fases (Two-Tier Hydration) y Ergonomía Enterprise de Alta Densidad',
          paragraphs: [
            'En primer lugar, se desacopló la verificación de permisos de archivos locales del flujo crítico de apertura de IndexedDB, eliminando bloqueos de entrada/salida. En segundo lugar, se dividió la carga de datos en dos niveles de prioridad: un Nivel 1 (Core Transaccional: propiedades, órdenes de trabajo activas, proveedores, cuentas por pagar y rutas de aprobación) que hidrata la interfaz en menos de un ciclo de renderizado, y un Nivel 2 (Archivos Históricos: bóveda documental, bitácoras extensas y conciliaciones pasadas) que se carga de manera asíncrona durante los periodos de inactividad del procesador mediante la API requestIdleCallback.',
            'Asimismo, todas las grillas del módulo de aprobaciones (W43081A, P43280 y F4209) fueron dotadas de columnas y filas redimensionables en vivo, filtros Query-By-Example (QBE), menús contextuales forenses (Clic Derecho / tecla F4 / botón [⋮]) y exportación estructurada a Excel con formato nativo de hora corta (HH:mm), logrando la ergonomía y velocidad propias de una estación de trabajo Enterprise ERP 9.11.'
          ],
          table: {
            caption: 'Tabla 4: Mapa de Arquitectura Funcional del Sistema (Estándar Enterprise ERP 9.11)',
            headers: ['Código JDE', 'Tabla Base', 'Nombre del Módulo en el Sistema', 'Aporte en IA, Derecho Digital o Blockchain'],
            rows: [
              ['P01012', 'F0101 / F0401', 'Maestro de Proveedores y Libro de Direcciones', 'Validación de RUT, clasificación de rubro y enlace directo con matriz de riesgo legal'],
              ['P48201', 'F4801', 'Centro de Órdenes de Trabajo (OT) y Mantención', 'Cálculo determinista de IVA (19% Factura) y Retención (Boleta de Honorarios) + Categoría/Especialidad'],
              ['P43008', 'F43008', 'Rutas Jerárquicas de Aprobación ERP', 'Definición de umbrales monetarios de autorización societaria por tipo de orden'],
              ['P43081', 'F4209 / F4311', 'Central de Aprobaciones OT/OC (W43081A/B/C)', 'Auditoría pre-firma de 7 puntos, aprobación por línea F4311, Hold Codes 42/HC y cadena SHA-256 Append-Only'],
              ['P43280', 'F43092', 'Delegación de Autoridad y Subrogancias', 'Trazabilidad jurídica de poderes temporales con vigencia y tope monetario máximo'],
              ['P0411 / P0911', 'F0411 / F0911', 'Cuentas por Pagar y Libro Mayor Contable', 'Integración de devengos, conciliación bancaria e integridad de partida doble'],
              ['P980011', 'F980011D', 'Auditoría Forense y Bóveda Digital Legal', 'Capturas inmutables BEFORE/AFTER, custodia documental y verificador de bloques SHA-256']
            ]
          }
        },
        {
          number: '5.2',
          title: 'Gestión del Cambio en Terreno: Protocolo Sombra, Protocolo de Empoderamiento y Ecosistema de 8 Manuales ISO 9001',
          paragraphs: [
            'Un aspecto que suele pasarse por alto en los proyectos tecnológicos es qué ocurre el día lunes por la mañana cuando el sistema se entrega a personas que llevan años trabajando en sus propias hojas de cálculo. Pretender prohibir por decreto que los operadores sigan anotando en sus planillas durante la transición no solo es imposible de fiscalizar en la práctica, sino que genera resistencia inmediata. Lejos de ver esa "contabilidad en paralelo" inicial como una amenaza, decidí aprovecharla a favor del proyecto: permitir que durante la marcha blanca el usuario contraste sus registros habituales con los reportes exportados del sistema sirve precisamente para cuadrar las operaciones con datos reales y demostrar en los hechos la exactitud de la plataforma.',
            'Para conducir esta adopción sin fricciones ni boicots internos, diseñé un plan de implementación gradual dividido en dos etapas de terreno. La primera etapa corresponde a lo que denomino el "Protocolo Sombra": consiste en sentarme junto a los usuarios del sistema en su puesto de trabajo, acompañándolos, haciendo y aprendiendo de su rutina diaria. Ese trabajo codo a codo permite observar in situ dónde se producen los errores o cuellos de botella en los procesos reales y corregirlos directamente en el sistema a partir de información obtenida de primera fuente, en vez de imponer flujos teóricos diseñados desde un escritorio.',
            'Superada esa fase de ajuste en terreno, se pasa a una segunda etapa de interiorización que llamo el "Protocolo de Empoderamiento". En esta instancia me detengo a explicarle a cada usuario cuál es la importancia real de su labor dentro del engranaje completo del sistema y cuáles son las implicancias patrimoniales, tributarias y legales que conlleva para la empresa el que un dato no se registre bien o se omita un control preventivo. Para respaldar de forma permanente este aprendizaje y no dejar a nadie a la deriva, el sistema incorpora dentro de su propia interfaz un ecosistema completo de 8 Manuales de Uso bajo formato de calidad ISO 9001:2015 descargables en Microsoft Word (.docx binario nativo) y PDF vectorial: el Manual General del ERP (SGC-MAN-ERP-001 v7.0), el Portal de Arrendatarios (SGC-INS-POR-002), el procedimiento de Due Diligence UAF (SGC-PRO-UAF-003), la custodia de Garantías (SGC-PRO-GAR-004), el motor de Aprobaciones y Blockchain (SGC-PRO-APR-005), el Manual CMF de Informe B.4 y Nota 14 (SGC-MAN-CMF-007), el Manual Técnico de Instalación, Despliegue y Operación en Servidores Empresariales (SGC-IT-MAN-008) y el Informe Pericial de Evaluación Psicolaboral & Competencias Directivas (SGC-RRHH-PSI-009), acompañados de un Manual Interactivo en pantalla (P0000A) con recorridos guiados paso a paso y un diccionario de resolución de errores.'
          ]
        },
        {
          number: '5.3',
          title: 'Automatización del Reajuste Anual de Cánones (R15130), Mitigación Aritmética de Punto Flotante y Consolidación CMF B.13',
          paragraphs: [
            'En mi experiencia práctica en el Departamento Inmobiliario de Mutucar, otro de los procesos que arrastraba una gran carga de trabajo manual y un riesgo latente de descuadraturas frente a la CMF era el reajuste anual de los cánones de arriendo por IPC. Como la información de los contratos se llevaba dispersa en planillas Excel independientes, cada mes un ejecutivo debía revisar manualmente cuáles contratos cumplían su ciclo de 12 meses de vigencia, consultar en la web del Instituto Nacional de Estadísticas (INE) el porcentaje oficial acumulado y recalcular los valores celda por celda. Esto provocaba dos problemas severos: primero, omisiones de contratos que no se reajustaban a tiempo dejando de percibir ingresos legítimos de la corporación; y segundo, los errores de redondeo y de representación binaria de punto flotante informático (estándar IEEE-754) que producían diferencias de centavos o pesos en las sumatorias globales de cartera.',
            'Para erradicar esta vulnerabilidad, diseñé e integré el programa por lote R15130 (Batch Indexation) dentro del ecosistema AssetFlow Enterprise. El sistema opera bajo una modalidad semi-automática asistida: detecta los contratos vigentes en su hito de aniversario, precarga la tasa oficial de variación del IPC sugerida, presenta una grilla de auditoría previa y ejecuta el reajuste masivo con un solo clic. A nivel algorítmico, introduje una regla estricta de precisión matemática para la moneda nacional ($ CLP): todos los cánones recalculados se procesan mediante funciones enteras (Math.round), descartando decimales flotantes y expresando cada monto estrictamente en enteros sin fracciones.',
            'Al completar la ejecución, el sistema gatilla dos acciones fundamentales de control interno: primero, emite y descarga automáticamente una planilla Excel (.xlsx) oficial tabulada que contiene el detalle de cada propiedad afectada, folio de contrato, RUT y nombre del arrendatario, moneda, canon inicial antes del reajuste, porcentaje de IPC aplicado, incremento absoluto y canon final reajustado; y segundo, actualiza en tiempo real tanto la ficha del contrato (LeaseContract) como el maestro de activos inmobiliarios (Property). De esta manera, el Reporte CMF B.13 de Cartera y Morosidad refleja inmediatamente los nuevos cánones en todas sus columnas de metros cuadrados y tramos de mora sin requerir doble digitación, garantizando que el fiscalizador y la gerencia cuenten en todo momento con información fidedigna, cuadrada al peso y respaldada documentalmente.'
          ],
          callout: {
            title: 'Exactitud Matemática y Cumplimiento Normativo CMF B.13',
            text: 'La parametrización del reajuste en lote R15130 con redondeo entero Math.round sin decimales flotantes elimina las discrepancias aritméticas del estándar IEEE-754 y sincroniza instantáneamente el Catastro de Arriendos CMF B.13 con emisión obligatoria de planilla Excel (.xlsx) de auditoría.'
          }
        },
        {
          number: '5.4',
          title: 'Arquitectura de Consulta Masiva y Asistente Jerárquico Drill-Down en Catastro de Inmuebles (P1501)',
          paragraphs: [
            'La escala real de la cartera inmobiliaria de Mutucar comprende más de 22.000 unidades catastrales concentradas en 19 grandes condominios y conjuntos habitacionales (destacando por ejemplo Montesol II con 6.546 unidades y Jardines Norte V con 3.095 unidades). Inicialmente, la inspección de estas carteras en pantalla presentaba un desafío ergonómico severo: si el sistema cargaba todas las unidades en una tabla plana, el árbol DOM se saturaba generando retrasos de varios segundos e imposibilitando la búsqueda ágil; por otra parte, si solo se mostraban los condominios consolidados, el operador perdía la capacidad de auditar departamentos individuales o requerimientos de mantención puntuales.',
            'Para superar esta disyuntiva, diseñé el Asistente de Consulta con Navegación Jerárquica Drill-Down (P1501), implementando una arquitectura de dos niveles de exploración: en primer lugar, el modo Acordeón In-line, que permite al usuario hacer clic sobre el contador de unidades de cualquier condominio para expandir en la misma fila un panel interactivo con las primeras unidades y accesos rápidos de selección; y en segundo lugar, el modo Vista Completa Focalizada (Deep Drill-Down), que aísla el universo del condominio seleccionado mediante una interfaz limpia dotada de migas de pan (← Volver a Condominios), ficha geográfica de comuna y región oficial, contador formal de unidades y un buscador contextual dinámico que filtra instantáneamente por código de unidad, tipo de inmueble o dirección física.',
            'A nivel de integración transaccional, el asistente se comunica bidireccionalmente con la barra Query-By-Example (QBE) del Centro de Solicitudes y Órdenes de Trabajo (P48201): al presionar [Elegir Unidad], el sistema aplica de inmediato el filtro del conjunto y la dirección a la grilla de requerimientos sin recargar la página, permitiendo a los 9 profesionales del departamento reconstruir la historia de mantenciones de cualquier vivienda en un solo clic. Asimismo, la incorporación de un modal de edición en caliente permite a los inspectores corregir datos catastrales en terreno sin abandonar la consulta, asegurando que la base de datos se mantenga permanentemente cuadrada y homologada ante futuras auditorías de la CMF.'
          ],
          callout: {
            title: 'Ergonomía de Alta Densidad y Navegación Jerárquica (P1501)',
            text: 'El asistente con doble modalidad de Drill-Down (Acordeón In-line y Vista Focalizada con paginación protectora) permite explorar más de 22.000 unidades en 19 condominios sin latencia en el navegador, vinculando cada departamento directamente con los filtros QBE de órdenes de trabajo y edición de parámetros catastrales en caliente.'
          }
        },
        {
          number: '5.5',
          title: 'Viabilidad Comercial B2B, Escalabilidad Multitenant y Transferencia Tecnológica al Mercado Inmobiliario y Previsión',
          paragraphs: [
            'El valor empírico validado en el Departamento Inmobiliario de Mutucar demostró que los problemas abordados —dispersión en hojas de cálculo, colusión o sobreprecio en presupuestos de contratistas, falta de debida diligencia UAF y retrasos en la rendición de cuentas ante la CMF— no son exclusivos de una entidad particular, sino que constituyen una falla estructural en la gestión de activos inmobiliarios corporativos en Chile y América Latina.',
            'Para transformar este desarrollo en un producto de software comercializable de escala B2B, se formuló un modelo de arquitectura multitenant y una estrategia de empaquetamiento comercial sustentada en dos modalidades complementarias: (a) Modalidad Cloud SaaS Multi-Tenant, orientada a Fondos de Inversión Inmobiliaria de Renta Residencial / Multifamily fiscalizados por la CMF (tales como LarrainVial Asset Management, SURA AGF, Ameris Capital, FYNSA y Link Capital Partners) y grandes operadores de Property Management (Assetplan, Eurocorp), incorporando aislamiento lógico de datos por esquemas independientes, cuotas FinOps de consumo de tokens IA y facturación recurrente por volumen de inmuebles administrados; y (b) Modalidad Sovereign On-Premise Air-Gapped, diseñada para corporaciones de previsión y defensa (Mutualidad del Ejército y Aviación - Mutae, Capredena, Dipreca, Divisiones de Bienestar de las FF.AA. y Cajas de Compensación), donde las directivas de seguridad nacional prohíben alojar información estratégica en nubes compartidas.',
            'El diferencial competitivo intransferible de AssetFlow Enterprise frente al software convencional radica en que el sistema no fue concebido como un portal comercial liviano, sino como un escudo de defensa jurídica y probatoria bajo la Ley N° 21.595 de Delitos Económicos y la Ley N° 21.719 de Protección de Datos Personales: cada aprobación de gasto en F4209, cada debido proceso de cotizaciones y cada cálculo normativo de la CMF (B.13 y Nota 14) cuenta con trazabilidad inalterable y supervisión humana obligatoria (Art. 14 EU AI Act), dotando a directores, comités de auditoría y contralores de un medio de prueba fehaciente ante cualquier eventual persecución civil, penal o regulatoria.',
            'Para materializar la transferencia tecnológica hacia el mercado corporativo y legalizar las relaciones contractuales B2B con fondos de inversión, se estructuró el proyecto de formalización societaria de la entidad desarrolladora bajo la razón social "AssetFlow Technologies SpA", formalizado a través del Formulario Oficial de Postulación y Plan de Negocio Capital Semilla SERCOTEC 2026 (Código SERCOTEC-SEM-2026-01, custodiado en la Bóveda Digital). Dicho financiamiento estatal no reembolsable ($3.500.000 CLP más $175.000 CLP de aporte del postulante) cubre la constitución en "Tu Empresa en un Día", inicio de actividades en 1ª Categoría SII, registro de propiedad industrial en INAPI (Clases 9 y 42), implementación de un laboratorio local con mini-workstation de alta densidad para pruebas de carga y penetración, certificados criptográficos SSL EV y prospección B2B a comités de inversión con punto de equilibrio operativo alcanzado en el quinto mes.'
          ],
          callout: {
            title: 'Potencial de Transferencia, Vehículo SpA y Ventaja Competitiva B2B',
            text: 'La constitución de AssetFlow Technologies SpA apalancada por Capital Semilla SERCOTEC 2026 (SERCOTEC-SEM-2026-01), combinada con partida doble F0911, control forense y sellado SHA-256, transforma este TFM en una empresa de base tecnológica (LegalTech / PropTech) con tracción comercial comprobada y formalización societaria inmediata.'
          }
        },
        {
          number: '5.6',
          title: 'Arquitectura Relacional Particionada (PostgreSQL 16), Streaming HTTP y Paginación Server-Side para Escala Industrial (>36 Millones de Transacciones)',
          paragraphs: [
            'Para garantizar la resiliencia y estabilidad del sistema ante volúmenes transaccionales masivos (10.000 operaciones diarias a régimen continuo, totalizando 3,65 millones anuales y más de 36 millones en una década), la arquitectura fue evolucionada desde un modelo de memoria cliente hacia un desacoplamiento transaccional server-side respaldado por PostgreSQL 16 Enterprise.',
            'La clave de esta evolución reside en tres mecanismos: (a) Paginación Server-Side y Ventana Activa de Trabajo: el navegador deja de cargar arrays monolíticos y solicita únicamente bloques de 25 a 200 filas mediante cursores, manteniendo el consumo de memoria del cliente acotado a menos de 40 MB de RAM y blindando a LocalStorage mediante un búfer protector contra QuotaExceededError; (b) Particionamiento Físico Mensual de la Tabla F0911: la tabla f0911_transactions se particiona por rangos de fechas (PARTITION BY RANGE (date)), permitiendo al motor ejecutar Partition Pruning y responder a consultas analíticas complejas en menos de 15 milisegundos mediante índices B-Tree compuestos; y (c) Descarga Masiva por Flujo Directo (Streaming HTTP): el endpoint /api/transactions/export canaliza libros contables completos hacia Excel/CSV en tiempo real sin saturar el heap de memoria.',
            'Esta adaptación de ingeniería civil informática eleva el horizonte operativo del ERP de 10 días a más de 10 años ininterrumpidos, consolidando a AssetFlow Enterprise como una plataforma apta para su comercialización B2B ante Administradoras Generales de Fondos (AGF), aseguradoras de vida y corporaciones previsionales de gran escala.'
          ],
          callout: {
            title: 'Escalabilidad Industrial y Continuidad Operacional ISO 22301',
            text: 'El particionamiento mensual F0911 y el streaming HTTP garantizan tiempos de respuesta sub-segundo (<150 ms) y consumo de memoria constante en terminales cliente ante bases históricas de más de 36 millones de registros contables con firma SHA-256 inmutable.'
          }
        }
      ]
    },
    {
      id: 'cap-6',
      number: 'CAPÍTULO VI',
      title: 'REFLEXIONES FINALES Y CONCLUSIONES DEL TRABAJO DE MAGÍSTER',
      subtitle: 'Hacia una síntesis humanista entre automatización algorítmica, certeza jurídica y ética profesional',
      paragraphs: [
        'Al mirar en retrospectiva el desarrollo de este sistema para el Máster en EBIS Business Tech School, la conclusión más profunda que emerge trasciende las líneas de código y las tablas de bases de datos: la tecnología, por sofisticada que sea, nunca es jurídicamente neutra. Cada vez que diseñamos un formulario, definimos qué campos son obligatorios o decidimos si un algoritmo puede aprobar un gasto por sí solo o requiere la firma de un responsable humano, estamos tomando decisiones de filosofía jurídica y de ética corporativa.',
        'Este proyecto de graduación demuestra que la convergencia entre la Inteligencia Artificial Generativa, el Derecho Digital y la criptografía Blockchain no es una utopía académica ni una suma forzada de tendencias de moda. Por el contrario, estas tres disciplinas se necesitan mutuamente para corregir sus propias limitaciones: la Inteligencia Artificial Generativa aporta la capacidad cognitiva para interpretar documentos complejos y asistir en la gestión y el desarrollo, pero carece por sí sola de certeza normativa; el Derecho Digital aporta el marco de legitimidad, protección de derechos fundamentales, exactitud tributaria y responsabilidad legal; y la arquitectura criptográfica inspirada en Blockchain aporta la garantía técnica de que las reglas del derecho y las decisiones humanas quedarán registradas de forma íntegra, transparente e inalterable en el tiempo.',
        'Construir AssetFlow Enterprise bajo el estándar de rigor de Enterprise ERP me permitió comprobar que los sistemas empresariales del futuro próximo ya no serán simples calculadoras contables, sino verdaderos ecosistemas de gobernanza preventiva. Sin embargo, el sistema también deja una enseñanza humilde pero firme: ninguna firma criptográfica SHA-256 ni ningún modelo generativo de última generación puede reemplazar el juicio ético, la prudencia directiva y la responsabilidad indelegable del ser humano que toma la decisión final. La tecnología debe iluminar la decisión y resguardar su prueba, pero la justicia y la probidad siguen siendo, hoy y siempre, una tarea eminentemente humana.'
      ]
    }
  ],
  bibliography: [
    'Congreso Nacional de Chile (2002). Ley N° 19.799 sobre Documentos Electrónicos, Firma Electrónica y Servicios de Certificación de dicha Firma. Diario Oficial de la República de Chile.',
    'Congreso Nacional de Chile (2003). Ley N° 19.913 que crea la Unidad de Análisis Financiero y modifica diversas disposiciones en materia de Lavado y Blanqueo de Activos.',
    'Congreso Nacional de Chile (2009). Ley N° 20.393 que establece la Responsabilidad Penal de las Personas Jurídicas en los delitos que indica.',
    'Congreso Nacional de Chile (2019). Ley N° 21.133 que modifica las normas para la incorporación de los trabajadores independientes a los regímenes de Protección Social (Retención gradual en Boletas de Honorarios).',
    'Congreso Nacional de Chile (2023). Ley N° 21.595 sobre Delitos Económicos y Atentados contra el Medio Ambiente.',
    'Congreso Nacional de Chile (2024). Ley N° 21.719 que regula la Protección y el Tratamiento de los Datos Personales y crea la Agencia de Protección de Datos Personales.',
    'Ministerio de Hacienda de Chile (1974). Decreto Ley N° 824 sobre Ley de Impuesto a la Renta (Artículo 42 N° 2 sobre rentas de segunda categoría y retenciones de honorarios) y Decreto Ley N° 825 sobre Impuesto a las Ventas y Servicios (IVA 19%).',
    'Parlamento Europeo y Consejo de la Unión Europea (2016). Reglamento (UE) 2016/679 relativo a la protección de las personas físicas en lo que respecta al tratamiento de datos personales (RGPD).',
    'Parlamento Europeo y Consejo de la Unión Europea (2022). Reglamento (UE) 2022/2554 sobre la resiliencia operativa digital del sector financiero (DORA).',
    'Parlamento Europeo y Consejo de la Unión Europea (2024). Reglamento (UE) 2024/1689 por el que se establecen normas armonizadas en materia de Inteligencia Artificial (EU AI Act).',
    'International Organization for Standardization - ISO (2015/2022). ISO 9001:2015 (Quality Management Systems) & ISO/IEC 27001:2022 (Information Security, Cybersecurity and Privacy Protection).',
    'Nakamoto, S. (2008). Bitcoin: A Peer-to-Peer Electronic Cash System. (Fundamentos de encadenamiento criptográfico de bloques de tiempo y árboles de Merkle).',
    'National Institute of Standards and Technology - NIST (2015). Secure Hash Standard (SHS), FIPS PUB 180-4 (Especificación técnica del estándar criptográfico SHA-256 y Web Crypto API).',
    'Enterprise Systems Architecture Standards (2023). Procurement and Subcontract Management Implementation Guide (Release 9.11) — Order Hold & Approval Management (P43008, P43081, P43280, F4209, F4311, F43092).',
    'Organización para la Cooperación y el Desarrollo Económicos - OCDE (2019/2024). Recomendación del Consejo sobre Inteligencia Artificial (Principios de transparencia, explicabilidad, robustez y supervisión humana).'
  ]
};

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function createParagraphXml(
  text: string,
  options?: {
    style?: string;
    bold?: boolean;
    italic?: boolean;
    color?: string;
    sizeHalfPt?: number;
    align?: 'left' | 'center' | 'right' | 'both';
    spaceBefore?: number;
    spaceAfter?: number;
    firstLineIndent?: number;
    leftIndent?: number;
    shadingFill?: string;
    borderLeftColor?: string;
    pageBreakBefore?: boolean;
  }
): string {
  const align = options?.align || 'both';
  const spaceBefore = options?.spaceBefore ?? 120;
  const spaceAfter = options?.spaceAfter ?? 160;
  const size = options?.sizeHalfPt ?? 23; // 11.5pt default academic size
  const color = options?.color || '1E293B';

  const pPrParts: string[] = [];
  if (options?.style) pPrParts.push(`<w:pStyle w:val="${options.style}"/>`);
  if (options?.pageBreakBefore) pPrParts.push(`<w:pageBreakBefore/>`);
  pPrParts.push(`<w:jc w:val="${align}"/>`);
  pPrParts.push(`<w:spacing w:before="${spaceBefore}" w:after="${spaceAfter}" w:line="312" w:lineRule="auto"/>`);

  if (options?.firstLineIndent || options?.leftIndent) {
    const firstLine = options?.firstLineIndent ? ` w:firstLine="${options.firstLineIndent}"` : '';
    const left = options?.leftIndent ? ` w:left="${options.leftIndent}"` : '';
    const right = options?.leftIndent ? ` w:right="240"` : '';
    pPrParts.push(`<w:ind${left}${right}${firstLine}/>`);
  }

  if (options?.shadingFill) {
    pPrParts.push(`<w:shd w:val="clear" w:color="auto" w:fill="${options.shadingFill}"/>`);
  }

  if (options?.borderLeftColor) {
    pPrParts.push(
      `<w:pBdr><w:left w:val="single" w:sz="24" w:space="12" w:color="${options.borderLeftColor}"/><w:top w:val="single" w:sz="4" w:space="8" w:color="CBD5E1"/><w:right w:val="single" w:sz="4" w:space="8" w:color="CBD5E1"/><w:bottom w:val="single" w:sz="4" w:space="8" w:color="CBD5E1"/></w:pBdr>`
    );
  }

  const rPrParts: string[] = [
    `<w:rFonts w:ascii="Georgia" w:hAnsi="Georgia" w:cs="Georgia"/>`,
    `<w:sz w:val="${size}"/>`,
    `<w:szCs w:val="${size}"/>`,
    `<w:color w:val="${color}"/>`
  ];
  if (options?.bold) rPrParts.push(`<w:b/>`);
  if (options?.italic) rPrParts.push(`<w:i/>`);

  return `<w:p><w:pPr>${pPrParts.join('')}</w:pPr><w:r><w:rPr>${rPrParts.join('')}</w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
}

function createTableXml(headers: string[], rows: string[][], caption?: string): string {
  let xml = '';
  if (caption) {
    xml += createParagraphXml(caption, {
      bold: true,
      italic: true,
      sizeHalfPt: 20,
      color: '0F172A',
      align: 'left',
      spaceBefore: 240,
      spaceAfter: 80
    });
  }

  const colCount = headers.length;
  const colWidth = Math.floor(9000 / colCount);
  const gridCols = Array.from({ length: colCount })
    .map(() => `<w:gridCol w:w="${colWidth}"/>`)
    .join('');

  const headerCells = headers
    .map(
      (h) => `
      <w:tc>
        <w:tcPr>
          <w:tcW w:w="${colWidth}" w:type="dxa"/>
          <w:shd w:val="clear" w:color="auto" w:fill="0F172A"/>
          <w:tcMar>
            <w:top w:w="100" w:type="dxa"/>
            <w:bottom w:w="100" w:type="dxa"/>
            <w:left w:w="120" w:type="dxa"/>
            <w:right w:w="120" w:type="dxa"/>
          </w:tcMar>
        </w:tcPr>
        <w:p>
          <w:pPr><w:jc w:val="left"/><w:spacing w:before="40" w:after="40"/></w:pPr>
          <w:r>
            <w:rPr>
              <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
              <w:b/>
              <w:color w:val="FFFFFF"/>
              <w:sz w:val="19"/>
            </w:rPr>
            <w:t xml:space="preserve">${escapeXml(h)}</w:t>
          </w:r>
        </w:p>
      </w:tc>`
    )
    .join('');

  const bodyRows = rows
    .map((row, rowIdx) => {
      const fill = rowIdx % 2 === 0 ? 'FFFFFF' : 'F8FAFC';
      const cells = row
        .map(
          (cellText, cellIdx) => `
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="${colWidth}" w:type="dxa"/>
            <w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>
            <w:tcMar>
              <w:top w:w="90" w:type="dxa"/>
              <w:bottom w:w="90" w:type="dxa"/>
              <w:left w:w="120" w:type="dxa"/>
              <w:right w:w="120" w:type="dxa"/>
            </w:tcMar>
          </w:tcPr>
          <w:p>
            <w:pPr><w:jc w:val="left"/><w:spacing w:before="40" w:after="40"/></w:pPr>
            <w:r>
              <w:rPr>
                <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                ${cellIdx === 0 ? '<w:b/>' : ''}
                <w:color w:val="1E293B"/>
                <w:sz w:val="19"/>
              </w:rPr>
              <w:t xml:space="preserve">${escapeXml(cellText)}</w:t>
            </w:r>
          </w:p>
        </w:tc>`
        )
        .join('');
      return `<w:tr>${cells}</w:tr>`;
    })
    .join('');

  xml += `
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="9000" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/>
          <w:left w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/>
          <w:bottom w:val="single" w:sz="8" w:space="0" w:color="0F172A"/>
          <w:right w:val="single" w:sz="6" w:space="0" w:color="94A3B8"/>
          <w:insideH w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
          <w:insideV w:val="single" w:sz="4" w:space="0" w:color="CBD5E1"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tblGrid>${gridCols}</w:tblGrid>
      <w:tr>${headerCells}</w:tr>
      ${bodyRows}
    </w:tbl>
  `;

  xml += createParagraphXml('', { spaceBefore: 40, spaceAfter: 120 });
  return xml;
}

/**
 * Generates a 100% genuine OpenXML (.docx) binary file using JSZip and triggers download.
 */
export async function downloadMagisterThesisDocx(): Promise<void> {
  const c = MAGISTER_THESIS_CONTENT;
  const zip = new JSZip();

  // 1. [Content_Types].xml
  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;

  // 2. _rels/.rels
  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

  // 3. word/_rels/document.xml.rels
  const docRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  // 4. word/styles.xml
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr>
        <w:rFonts w:ascii="Georgia" w:hAnsi="Georgia" w:cs="Georgia"/>
        <w:sz w:val="23"/>
        <w:szCs w:val="23"/>
        <w:lang w:val="es-CL"/>
      </w:rPr>
    </w:rPrDefault>
  </w:docDefaults>
</w:styles>`;

  // 5. Build word/document.xml body
  const bodyParts: string[] = [];

  // COVER PAGE
  bodyParts.push(
    createParagraphXml('EBIS BUSINESS TECH SCHOOL • ESCUELA DE NEGOCIOS Y TECNOLOGÍA', {
      bold: true,
      sizeHalfPt: 22,
      color: '1E3A8A',
      align: 'center',
      spaceBefore: 360,
      spaceAfter: 60
    })
  );
  bodyParts.push(
    createParagraphXml('TRABAJO FINAL PARA OPTAR AL GRADO DE MAGÍSTER EN INTELIGENCIA ARTIFICIAL, DERECHO DIGITAL Y BLOCKCHAIN', {
      bold: true,
      sizeHalfPt: 24,
      color: '047857',
      align: 'center',
      spaceBefore: 60,
      spaceAfter: 120
    })
  );
  bodyParts.push(
    createParagraphXml('PROGRAMA EXECUTIVE DE POSTGRADO • TÍTULO DE MÁSTER PROFESIONAL', {
      bold: true,
      sizeHalfPt: 20,
      color: '0F172A',
      align: 'center',
      spaceBefore: 20,
      spaceAfter: 420
    })
  );
  bodyParts.push(
    createParagraphXml('────────────────────────────────────────────────────────', {
      color: '94A3B8',
      align: 'center',
      spaceBefore: 120,
      spaceAfter: 360
    })
  );
  bodyParts.push(
    createParagraphXml(c.title, {
      bold: true,
      sizeHalfPt: 34,
      color: '0F172A',
      align: 'center',
      spaceBefore: 240,
      spaceAfter: 240
    })
  );
  bodyParts.push(
    createParagraphXml(c.subtitle, {
      italic: true,
      sizeHalfPt: 23,
      color: '334155',
      align: 'center',
      spaceBefore: 120,
      spaceAfter: 600
    })
  );
  bodyParts.push(
    createParagraphXml('────────────────────────────────────────────────────────', {
      color: '94A3B8',
      align: 'center',
      spaceBefore: 240,
      spaceAfter: 480
    })
  );
  bodyParts.push(
    createParagraphXml(`Autor y Arquitecto del Proyecto: ${c.author}`, {
      bold: true,
      sizeHalfPt: 22,
      color: '1E293B',
      align: 'center',
      spaceBefore: 240,
      spaceAfter: 80
    })
  );
  bodyParts.push(
    createParagraphXml('Caso de Estudio Empírico: Plataforma ERP AssetFlow Enterprise (Arquitectura Enterprise ERP 9.11)', {
      sizeHalfPt: 20,
      color: '475569',
      align: 'center',
      spaceBefore: 40,
      spaceAfter: 80
    })
  );
  bodyParts.push(
    createParagraphXml(`Fecha de Presentación: ${c.date}`, {
      sizeHalfPt: 20,
      color: '475569',
      align: 'center',
      spaceBefore: 40,
      spaceAfter: 240
    })
  );

  // ABSTRACT / RESUMEN EJECUTIVO (NEW PAGE)
  bodyParts.push(
    createParagraphXml('RESUMEN EJECUTIVO (ABSTRACT)', {
      bold: true,
      sizeHalfPt: 28,
      color: '0F172A',
      align: 'left',
      spaceBefore: 240,
      spaceAfter: 200,
      pageBreakBefore: true
    })
  );
  for (const p of c.abstractEs) {
    bodyParts.push(
      createParagraphXml(p, {
        sizeHalfPt: 22,
        align: 'both',
        firstLineIndent: 420,
        spaceBefore: 80,
        spaceAfter: 160
      })
    );
  }
  bodyParts.push(
    createParagraphXml(`Palabras Clave: ${c.keywordsEs.join(' • ')}.`, {
      bold: true,
      italic: true,
      sizeHalfPt: 21,
      color: '047857',
      align: 'both',
      spaceBefore: 120,
      spaceAfter: 320
    })
  );

  bodyParts.push(
    createParagraphXml('EXECUTIVE SUMMARY (ENGLISH)', {
      bold: true,
      sizeHalfPt: 24,
      color: '0F172A',
      align: 'left',
      spaceBefore: 200,
      spaceAfter: 160
    })
  );
  for (const p of c.abstractEn) {
    bodyParts.push(
      createParagraphXml(p, {
        italic: true,
        sizeHalfPt: 21,
        color: '334155',
        align: 'both',
        firstLineIndent: 420,
        spaceBefore: 80,
        spaceAfter: 140
      })
    );
  }
  bodyParts.push(
    createParagraphXml(`Keywords: ${c.keywordsEn.join(' • ')}.`, {
      bold: true,
      italic: true,
      sizeHalfPt: 20,
      color: '1E40AF',
      align: 'both',
      spaceBefore: 80,
      spaceAfter: 240
    })
  );

  // ÍNDICE GENERAL DE CONTENIDOS (TABLE OF CONTENTS)
  bodyParts.push(
    createParagraphXml('ÍNDICE GENERAL DE CONTENIDOS', {
      bold: true,
      sizeHalfPt: 28,
      color: '0F172A',
      align: 'left',
      spaceBefore: 360,
      spaceAfter: 100,
      pageBreakBefore: true
    })
  );
  bodyParts.push(
    createParagraphXml('ESTRUCTURA CAPITULAR, SUBSECCIONES Y CUADROS TÉCNICOS DEL TRABAJO FINAL DE MÁSTER', {
      italic: true,
      bold: true,
      sizeHalfPt: 20,
      color: '047857',
      align: 'left',
      spaceBefore: 20,
      spaceAfter: 200
    })
  );

  const tocHeaders = ['Capítulo / Sección', 'Materia / Descripción Analítica', 'Pilar Tecnológico / Normativo'];
  const tocRows: string[][] = [
    [
      'RESUMEN EJECUTIVO (ABSTRACT)',
      'Justificación operativa, levantamiento de suspensión CMF y subsanación de 4 observaciones de auditoría en Mutucar.',
      'Control Interno Inmobiliario'
    ],
    [
      'EXECUTIVE SUMMARY (ENGLISH)',
      'Capstoning enterprise architecture, Oracle JDE 9.11 model, AI governance and append-only cryptographic ledger.',
      'Academic Standard (EBIS)'
    ]
  ];

  for (const s of c.sections) {
    let capPillar = 'Análisis Técnico';
    if (s.number === 'CAPÍTULO I') capPillar = 'Económico / ROI 6.312%';
    else if (s.number === 'CAPÍTULO II') capPillar = 'IA Generativa / Developer Lock';
    else if (s.number === 'CAPÍTULO III') capPillar = 'Derecho Digital & Compliance';
    else if (s.number === 'CAPÍTULO IV') capPillar = 'Blockchain & SHA-256';
    else if (s.number === 'CAPÍTULO V') capPillar = 'JDE 9.11 & Despliegue On-Premise';
    else if (s.number === 'CAPÍTULO VI') capPillar = 'Conclusiones y Trabajo Futuro';

    tocRows.push([
      `${s.number}: ${s.title}`,
      s.subtitle || 'Desarrollo analítico y metodológico del capítulo.',
      capPillar
    ]);

    if (s.subsections) {
      for (const sub of s.subsections) {
        let tag = 'Análisis Técnico';
        if (sub.number === '1.1') tag = 'Alcance & Auditoría';
        else if (sub.number === '1.2') tag = 'Tabla 1: ROI 6.312% y Payback';
        else if (sub.number === '2.1') tag = 'Tabla 2: Protocolo Developer Lock';
        else if (sub.number === '2.2') tag = 'Módulo P0001IA & Gemini';
        else if (sub.number === '3.1') tag = 'Ley 21.595 & Compliance';
        else if (sub.number === '3.2') tag = 'Circular 2.192 CMF & Nota 14';
        else if (sub.number === '3.3') tag = 'UAF, FATF & Ley 21.521 FinTech';
        else if (sub.number === '4.1') tag = 'Tabla 3: Criptografía vs Blockchain';
        else if (sub.number === '4.2') tag = 'F4209 & Web Crypto API';
        else if (sub.number === '4.3') tag = 'Merkle Tree & Raíz en Vivo';
        else if (sub.number === '4.4') tag = 'Inmutabilidad & Cero Edición';
        else if (sub.number === '4.5') tag = 'Soberanía de Datos & On-Premise';
        else if (sub.number === '5.1') tag = 'React 19 + TypeScript + Node';
        else if (sub.number === '5.2') tag = 'Tabla 4: Módulos JDE 9.11';
        else if (sub.number === '5.3') tag = 'Latencia sub-100ms & Cache';
        else if (sub.number === '5.4') tag = 'Fases de Despliegue Mutucar';
        else if (sub.number === '6.1') tag = 'Balance Metodológico';
        else if (sub.number === '6.2') tag = 'Líneas Futuras & Smart Contracts';

        tocRows.push([
          `   • ${sub.number} ${sub.title}`,
          `Subsección analítica y cuadro de evidencias aplicadas en terreno.`,
          tag
        ]);
      }
    }
  }

  tocRows.push([
    'BIBLIOGRAFÍA Y FUENTES NORMATIVAS',
    'Compendio de leyes chilenas (21.595, 21.521, 19.628, 19.880), circulares CMF, normas ISO y literatura académica.',
    'Marco Regulatorio Oficial'
  ]);

  bodyParts.push(createTableXml(tocHeaders, tocRows));

  // CHAPTERS
  for (const section of c.sections) {
    bodyParts.push(
      createParagraphXml(`${section.number}: ${section.title}`, {
        bold: true,
        sizeHalfPt: 28,
        color: '0F172A',
        align: 'left',
        spaceBefore: 360,
        spaceAfter: 80,
        pageBreakBefore: true
      })
    );
    if (section.subtitle) {
      bodyParts.push(
        createParagraphXml(section.subtitle, {
          italic: true,
          bold: true,
          sizeHalfPt: 22,
          color: '047857',
          align: 'left',
          spaceBefore: 20,
          spaceAfter: 220
        })
      );
    }

    for (const p of section.paragraphs) {
      bodyParts.push(
        createParagraphXml(p, {
          sizeHalfPt: 23,
          align: 'both',
          firstLineIndent: 420,
          spaceBefore: 80,
          spaceAfter: 160
        })
      );
    }

    if (section.subsections) {
      for (const sub of section.subsections) {
        bodyParts.push(
          createParagraphXml(`${sub.number} ${sub.title}`, {
            bold: true,
            sizeHalfPt: 25,
            color: '1E3A8A',
            align: 'left',
            spaceBefore: 280,
            spaceAfter: 140
          })
        );
        for (const sp of sub.paragraphs) {
          bodyParts.push(
            createParagraphXml(sp, {
              sizeHalfPt: 23,
              align: 'both',
              firstLineIndent: 420,
              spaceBefore: 80,
              spaceAfter: 160
            })
          );
        }
        if (sub.callout) {
          bodyParts.push(
            createParagraphXml(`${sub.callout.title}: ${sub.callout.text}`, {
              italic: true,
              sizeHalfPt: 21,
              color: '0F172A',
              align: 'both',
              leftIndent: 360,
              shadingFill: 'F1F5F9',
              borderLeftColor: '047857',
              spaceBefore: 160,
              spaceAfter: 200
            })
          );
        }
        if (sub.table) {
          bodyParts.push(createTableXml(sub.table.headers, sub.table.rows, sub.table.caption));
        }
      }
    }
  }

  // BIBLIOGRAPHY
  bodyParts.push(
    createParagraphXml('REFERENCIAS BIBLIOGRÁFICAS Y MARCO NORMATIVO', {
      bold: true,
      sizeHalfPt: 28,
      color: '0F172A',
      align: 'left',
      spaceBefore: 360,
      spaceAfter: 200,
      pageBreakBefore: true
    })
  );
  for (const ref of c.bibliography) {
    bodyParts.push(
      createParagraphXml(`• ${ref}`, {
        sizeHalfPt: 21,
        color: '1E293B',
        align: 'both',
        leftIndent: 360,
        spaceBefore: 60,
        spaceAfter: 120
      })
    );
  }

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${bodyParts.join('\n')}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1700" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  // 6. docProps/core.xml & app.xml
  const nowIso = new Date().toISOString();
  const coreXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${escapeXml(c.title)}</dc:title>
  <dc:subject>Trabajo Final para Optar al Grado de Magíster en Inteligencia Artificial, Derecho Digital y Blockchain — EBIS Business Tech School</dc:subject>
  <dc:creator>${escapeXml(c.author)}</dc:creator>
  <cp:keywords>IA Generativa, Derecho Digital, Blockchain, SHA-256, Merkle Root, Enterprise ERP, EBIS Business Tech School, Compliance</cp:keywords>
  <dc:description>${escapeXml(c.subtitle)}</dc:description>
  <dcterms:created xsi:type="dcterms:W3CDTF">${nowIso}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${nowIso}</dcterms:modified>
</cp:coreProperties>`;

  const appXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>AssetFlow Enterprise 9.11 Academic Publisher</Application>
  <Company>EBIS Business Tech School — Magíster en Inteligencia Artificial, Derecho Digital y Blockchain</Company>
</Properties>`;

  zip.file('[Content_Types].xml', contentTypesXml);
  zip.folder('_rels')?.file('.rels', relsXml);
  zip.folder('docProps')?.file('core.xml', coreXml);
  zip.folder('docProps')?.file('app.xml', appXml);
  const wordFolder = zip.folder('word');
  wordFolder?.file('document.xml', documentXml);
  wordFolder?.file('styles.xml', stylesXml);
  wordFolder?.folder('_rels')?.file('document.xml.rels', docRelsXml);

  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'Trabajo_Final_Para_Optar_Al_Grado_De_Magister_IA_Derecho_Digital_Blockchain.docx';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
