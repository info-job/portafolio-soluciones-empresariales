# Bitácora de Desarrollo - Sistema de Gestión Inmobiliaria AssetFlow

Este documento registra los módulos y funcionalidades desarrolladas para asegurar la continuidad y evitar la pérdida de características en futuras actualizaciones.

## Módulos Implementados

### 1. Centro de Tareas (Inicio)
- **Funcionalidad**: Panel de control con resumen de tareas pendientes.
- **Características**: Validación de proveedores (VoBo Jefatura), alertas de contratos por vencer, gastos de alto valor.

### 2. Gestión de Oficios
- **Funcionalidad**: Registro y seguimiento de documentos normados (Entrantes/Salientes).
- **Características**: Filtros por tipo, estados dinámicos, carga de archivos, exportación a Excel.

### 3. Gestión Financiera (Planillas)
- **Funcionalidad**: Control de ingresos y egresos.
- **Características**: Categorización, asociación a proveedores/propiedades, exportación a Excel.

### 4. Órdenes de Trabajo (OT)
- **Funcionalidad**: Generación y seguimiento de órdenes de reparación/mantenimiento.
- **Características**: Selección de proveedores y propiedades, desglose de ítems, estados de recepción, exportación a Excel.

### 5. Maestro de Proveedores
- **Funcionalidad**: Directorio central de prestadores de servicios.
- **Características**: Formulario DI-01 (Alta), validación de compliance, niveles de riesgo, exportación a Excel.

### 6. Pool de Propiedades
- **Funcionalidad**: Inventario maestro de activos inmobiliarios.
- **Características**: Vista por edificio/planta, catastro de unidades, exportación a Excel.

### 7. Help Desk TI
- **Funcionalidad**: Soporte técnico interno.
- **Características**: Sistema de tickets, prioridades, categorías, seguimiento de resolución, exportación a Excel.

### 8. Seguridad y Configuración (Usuarios)
- **Funcionalidad**: Gestión de acceso y personalización.
- **Características**: Alta/Baja de usuarios, asignación de roles (ADMIN, JEFE, EJECUTIVO), gestión de logo corporativo, respaldos totales del sistema.

### 9. Búsqueda Laboral & Auditoría de Vigencia de Enlaces
- **Funcionalidad**: Rastreo de ofertas laborales públicas y privadas con match cognitivo de CV en PDF.
- **Características**: Registro de fecha y hora exacta de última inspección del sistema en cada oferta, detección de enlaces rotos o convocatorias cerradas, botón de re-inspección en vivo (HTTP 200 OK), y enlaces de rescate hacia Google Jobs y portales corporativos ("Trabaja con Nosotros").

### 10. Informe B.4 CMF (Bienes Raíces & Inversiones Inmobiliarias)
- **Funcionalidad**: Declaración mensual obligatoria a la Comisión para el Mercado Financiero (Circular N° 1.835) para carteras inmobiliarias de compañías de seguros.
- **Características**: 
  - Separación obligatoria de Terreno (No Afecto a Depreciación) y Construcción (Depreciable) conforme a la Norma de Carácter General N° 316 (NCG 316).
  - Paginación FDA optimizada (25, 50, 100 y Ver Todas) con reducción del 74% en la huella de memoria del DOM y prevención de bloqueo de ventana ("Página no responde").
  - Arquitectura Single-Pass $O(N)$ y cálculo diferido Map-indexed para comparativos interanuales e indicadores de tendencia.
  - Exportación de planilla Excel (.xlsx) estructurada según la taxonomía oficial de la CMF.

### 11. Nota 14: Propiedades de Inversión (NIC 40 / NIIF 13 / CMF)
- **Funcionalidad**: Emisión trimestral de las revelaciones oficiales de balance para los Estados Financieros auditados.
- **Características**:
  - **Cuadro 1 (Roll-Forward Matrix):** Conciliación de movimientos de 2 ejercicios comparativos (Saldo Inicial, Adquisiciones, CAPEX, Enajenaciones, Ajuste a Valor Razonable y Saldo Final) desglosada por Terrenos, Edificios, Obras en Curso y Total.
  - **Cuadro 2 (NOI):** Ingresos por arrendamiento y gastos directos de operación diferenciados entre inmuebles ocupados y vacantes (NIC 40 §75f) con cálculo del Margen Operacional Neto.
  - **Cuadro 3 (Nómina Analítica):** Detalle exhaustivo bien raíz por bien raíz con Rol SII, Comuna, Superficies, Costo Terreno NCG 316, Valor Libro, Valor Razonable y Arrendatario.
  - **Cuadro 4 (Gravámenes):** Control de hipotecas, prohibiciones y reservas técnicas de seguros (Circular 1.835).
  - **Emisión Excel Multicapa:** Generación de libro Excel (.xlsx) corporativo con 5 pestañas formuladas, autofiltros y estilos ejecutivos.
  - **Regla de Oro de Cuadre:** Conciliación matemática al peso entre el B.4 del mes de cierre de cada trimestre (Marzo, Junio, Septiembre y Diciembre) y la Nota 14.

### 12. Manuales del Sistema Estandarizados (ISO 9001:2015 & Word .doc/.docx)
- **Funcionalidad**: Centro documental con manuales operativos en formato editable Word bajo estándar ISO 9001:2015 (Cláusula 7.5).
- **Características**:
  - Incorporación del **Manual Regulatorio CMF (SGC-MAN-CMF-007)**: Procedimiento integral para el Informe B.4 mensual y la Nota 14 trimestral con tablas de control, cuadros de firmas y marcadores para capturas de pantalla.
  - Actualización del **Manual General del ERP (SGC-MAN-ERP-001)** con los programas R09322 y R09323 en la tabla de programas JDE, matriz RACI y desarrollo de procedimientos.
  - Centro de Entrenamiento Interactivo con visualizador de capturas activas (Captura 11 para B.4 y Captura 12 para Nota 14).

### 13. Módulo de Fiscalización CMF & Puente Tributario NIC 12 (Auditoría Regulatoria)
- **Funcionalidad**: Blindaje integral frente a requerimientos y auditorías de la Comisión para el Mercado Financiero (CMF), SII y auditores externos.
- **Características**:
  - **Matriz de Conciliación B.4 vs. Nota 14 (Subpestaña 5 & Hoja 6 Excel):** Validación obligatoria de 7 puntos de cuadratura exacta ($0 de discrepancia) entre el informe B.4 mensual y la Nota 14 trimestral con emisión de Hash criptográfico SHA-256 de conformidad.
  - **Semáforo Regulatorio de Tasaciones CMF (Circular N° 1.835):** Monitor en tiempo real de la vigencia legal de 24 meses de las tasaciones periciales con 4 estados preventivos (🟢 Vigente < 18m, 🟡 Alerta Preventiva 18-21m, 🟠 Alerta Crítica 22-24m, 🔴 Vencida > 24m) y filtros rápidos de cartera.
  - **Puente Tributario NIC 12 & Formulario 22 SII (Subpestaña 6):** Determinación automática del Pasivo por Impuesto Diferido al 27% IDPC (Régimen 14A) sobre el superávit de valor razonable no realizado (Art. 31 LIR).
  - **Expediente Digital Art. 17 inc. 2 D.L. 825:** Control y deducción del 11% anual del avalúo fiscal vigente en arriendos amoblados afectos a IVA con ahorro mensual cuantificado.
  - **Prevención de Bloqueo de Ventana ("Página no responde"):** Aislamiento de límites `Suspense` dedicados para R09322 y R09323 e importación asíncrona bajo demanda (Dynamic Code Splitting) de motores pesados de datos (`exceljs`), garantizando arranque instantáneo en menos de 10ms.

### 14. Asistente de Consulta Catastral: Maestro de Condominios y Propiedades con Drill-Down Jerárquico (P1501)
- **Funcionalidad**: Navegación y auditoría relacional para carteras inmobiliarias masivas (>22.000 unidades y 19 grandes condominios).
- **Características**:
  - **Doble Modalidad de Desglose Jerárquico (Drill-Down):**
    - *Modo Acordeón In-line:* Expansión instantánea en la misma fila con indicador chevron y previsualización de unidades sin perder el contexto de cartera.
    - *Modo Vista Completa Focalizada (Deep Drill-Down):* Aislamiento visual del condominio con migas de pan `← Volver a Condominios`, contador de unidades, ficha territorial y paginación protectora de 150 unidades (<16ms).
  - **Buscador Contextual Dinámico:** El campo de búsqueda superior se adapta automáticamente al condominio activo (`BUSCAR UNIDAD EN [CONDOMINIO]...`), permitiendo filtrar por código, dirección o tipo en milisegundos.
  - **Integración Bidireccional con Grilla QBE:** Al presionar `[Elegir Unidad]`, se inyectan automáticamente el conjunto y la dirección en la barra Query-By-Example de requerimientos y órdenes de trabajo (`P48201`).
  - **Edición Catastral en Caliente:** Botón `[Editar]` directo por unidad para ajustar parámetros normativos sin abandonar el flujo de trabajo.

### 15. Empaquetado Autónomo, Resiliencia Operacional Offline y Auto-Aprovisionamiento en Servidores Empresariales
- **Funcionalidad**: Despliegue corporativo On-Premise con cero dependencias externas y alta disponibilidad local.
- **Características**:
  - **Instaladores Maestros Automatizados:**
    - `install.sh`: Instalador desatendido para Linux (Ubuntu/Debian/RHEL/Rocky) con chequeo de hardware, auto-creación de SWAP (2 GB), Docker Compose / PM2 clúster, reglas UFW y Nginx SSL con Let's Encrypt.
    - `install-windows.bat`: Instalador interactivo para Windows Server / Windows 10/11 con auto-instalación de Node LTS, compilación de Vite, apertura del Firewall en puerto 3000 y script de servicio permanente.
  - **Resiliencia Operacional Offline en Red LAN:** Continuidad operativa al 100% ante cortes de Internet exterior. Consulta de propiedades, órdenes de trabajo, cálculo de retenciones tributarias, libro de aprobaciones y sellado SHA-256 local (Web Crypto API) continúan operando sin interrupción; correos masivos y OCR se encolan para despacho diferido.
  - **Auto-Aprovisionamiento de Base de Datos en Frío (Cold Start):** Detección automática e inicialización autónoma de las 32 tablas Enterprise (`F0101`, `F0401`, `F0030`, `F4801`, `F4209`, `F15012`, `F0911`) y auto-seeding maestro (`lib/masterDataSeed.ts`) sin requerir scripts SQL manuales ni intervención de DBA.
  - **Actualización Documental Normada:** Emisión del Manual Técnico IT (SGC-IT-MAN-008) en Word/PDF y actualización a Versión 7.0 del Manual General del ERP (SGC-MAN-ERP-001).

## Funcionalidades Transversales
- **Optimización de Arranque Enterprise ERP (JAS FastBoot)**: Dynamic code-splitting con `manualChunks` de Vite en capas enterprise (`jde-core`, `jde-data`, `jde-docs`, `jde-firebase`), carga diferida con `lazy`/`Suspense` para formularios pesados (`P4310`, `WSJ Reports`), eliminación de render-cascades en la hidratación y pantalla de bienvenida de alta fidelidad FastBoot 9.11.
- **Sincronización en la Nube**: Integración con OneDrive/Dropbox mediante archivos JSON compartidos.
- **Exportación Universal**: Todos los módulos cuentan con botón de exportación a Excel (.xlsx).
- **Auditoría Inmutable**: Registro de todos los cambios realizados por los usuarios.
- **Reportes de Coherencia**: Auditoría técnica de integridad de datos.
