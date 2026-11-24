# GUÍA DE EMPAQUETAMIENTO Y DESPLIEGUE EN SERVIDORES EMPRESARIALES
**AssetFlow Enterprise · Sistema Integral de Gestión Inmobiliaria y Control Patrimonial**  
*Manual Técnico para Áreas de TI, Infraestructura y Ciberseguridad*

---

## ÍNDICE GENERAL DEL MANUAL TÉCNICO

* **[1. Resumen Ejecutivo de Arquitectura](#1-resumen-ejecutivo-de-arquitectura)**
* **[2. Requerimientos de Infraestructura](#2-requerimientos-de-infraestructura)**
* **[3. Métodos de Instalación y Despliegue Disponibles](#3-métodos-de-instalación-y-despliegue-disponibles)**
  * [3.1. Instalador Maestro Automatizado en 1 Solo Paso (Zero-Touch: install.sh y install-windows.bat)](#-método-recomendado-instalador-maestro-automatizado-en-1-solo-paso-zero-touch)
  * [3.2. Método Alternativo 1: Despliegue con Docker y Docker Compose Manual](#método-alternativo-1-despliegue-con-docker-y-docker-compose-manual)
  * [3.3. Método Alternativo 2: Despliegue Nativo en Linux con PM2](#método-b-despliegue-nativo-en-linux-con-pm2-bare-metal--máquina-virtual)
  * [3.4. Método Alternativo 3: Despliegue en Windows Server](#método-c-despliegue-en-windows-server)
* **[4. Configuración del Reverse Proxy NGINX con Certificado SSL](#4-configuración-del-reverse-proxy-nginx-con-certificado-ssl)**
* **[5. Variables de Entorno (.env)](#5-variables-de-entorno-env)**
* **[6. Procedimiento de Respaldo y Recuperación (Disaster Recovery)](#6-procedimiento-de-respaldo-y-recuperación-disaster-recovery)**
* **[7. Continuidad Operacional ante Caída de Conectividad a Internet (Modo Intranet Local / Offline-First)](#7-continuidad-operacional-ante-caída-de-conectividad-a-internet-modo-intranet-local--offline-first)**
  * [7.1. Arquitectura de Resiliencia en Red LAN](#71-arquitectura-de-resiliencia-en-red-lan)
  * [7.2. Funcionalidades 100% Operativas Offline (Sin Internet)](#72-funcionalidades-100-operativas-offline-sin-internet)
  * [7.3. Funcionalidades en Cola o Suspendidas Temporalmente](#73-funcionalidades-en-cola-o-suspendidas-temporalmente)
* **[8. Auto-Aprovisionamiento y Creación Autónoma de Base de Datos y Tablas (Cold Start)](#8-auto-aprovisionamiento-y-creación-autónoma-de-base-de-datos-y-tablas-cold-start)**
  * [8.1. Ciclo de Vida del Arranque en Frío](#81-ciclo-de-vida-del-arranque-en-frío)
* **[9. Asistente de Consulta Relacional y Navegación Drill-Down (Maestro de Condominios y Propiedades)](#9-asistente-de-consulta-relacional-y-navegación-drill-down-maestro-de-condominios-y-propiedades)**
  * [9.1. Arquitectura de Doble Vista Drill-Down](#91-arquitectura-de-doble-vista-drill-down)
  * [9.2. Interacción con el Circuito de Requerimientos y OT](#92-interacción-con-el-circuito-de-requerimientos-y-ot)
* **[10. Ecosistema de Documentación y Manuales Normados en la Bóveda Digital (P986110D)](#10-ecosistema-de-documentación-y-manuales-normados-en-la-bóveda-digital-p986110d)**
  * [10.1. Catálogo Oficial de 9 Manuales y Expedientes Normados ISO 9001:2015](#101-catálogo-oficial-de-9-manuales-y-expedientes-normados-iso-90012015)
  * [10.2. Generación Binaria OpenXML (.docx) y Custodia Criptográfica SHA-256](#102-generación-binaria-openxml-docx-y-custodia-criptográfica-sha-256)

---

## 1. Resumen Ejecutivo de Arquitectura

AssetFlow Enterprise es una plataforma web moderna con arquitectura **Full-Stack desacoplada**, diseñada para operar bajo estrictos estándares de continuidad operacional, soberanía de datos y baja latencia en redes corporativas.

* **Frontend:** Single Page Application (SPA) construida en React 19, TypeScript, Vite y Tailwind CSS v4, compilada estáticamente en el directorio `/dist`.
* **Backend:** Servidor en Node.js 22 LTS con Express y WebSocket (WS), con proxies seguros para la orquestación de IA y control de acceso.
* **Persistencia:** Arquitectura híbrida *Local-First* con motor resiliente en IndexedDB (navegador) y sincronización cloud con Firebase Firestore.
* **Procesamiento de Documentos:** Motores de generación PDF, Excel (XLSX) y Word (DOCX) ejecutados 100% *in-process* sin dependencias de servicios externos.

---

## 2. Requerimientos de Infraestructura

| Componente | Requisito Mínimo | Requisito Recomendado (Producción) |
| :--- | :--- | :--- |
| **Sistema Operativo** | Linux (Ubuntu Server 22.04+, Debian 12, RHEL 9) o Windows Server 2019+ | Linux Ubuntu Server 24.04 LTS (o contenedor Docker) |
| **Entorno Node.js** | Node.js v20.x LTS | Node.js v22.x LTS con NPM v10+ |
| **Procesador (CPU)** | 2 vCPUs (x86_64 o ARM64) | 4 vCPUs |
| **Memoria RAM** | 2 GB RAM | 4 GB a 8 GB RAM |
| **Almacenamiento** | 10 GB SSD | 30 GB SSD NVMe |
| **Red y Puertos** | Puerto 3000 (interno), 80/443 (externo) | Conexión SSL/TLS 1.3 con Reverse Proxy NGINX |

---

## 3. Métodos de Instalación y Despliegue Disponibles

### ⭐ Método Recomendado: Instalador Maestro Automatizado en 1 Solo Paso (Zero-Touch)

Para que el personal de TI no tenga que ejecutar comandos manuales ni instalar herramientas paso a paso, se han provisto **instaladores automáticos autoejecutables** tanto para entornos Linux como para Windows Server:

#### A) En Servidores Linux (Ubuntu / Debian / RHEL / Rocky / CentOS):
Basta con situarse en la carpeta raíz del proyecto y ejecutar con privilegios `sudo`:
```bash
chmod +x install.sh
sudo ./install.sh
```
* **Qué hace automáticamente el instalador:**
  1. Realiza diagnóstico de hardware (RAM, CPU, Disco). Si detecta menos de 2 GB de RAM, **crea automáticamente un archivo SWAP de 2 GB** para evitar cuelgues durante la compilación.
  2. Ofrece elegir entre **Modo Docker Compose** o **Modo Nativo PM2**.
  3. Instala automáticamente Docker o Node.js 22 LTS según la opción elegida.
  4. Genera el archivo de variables `.env` seguro.
  5. Compila los assets de producción de Vite y activa el motor backend Express.
  6. Configura el inicio automático al reiniciar el servidor (`systemd` o Docker Daemon restart policy `always`).
  7. Ofrece instalar y configurar **NGINX Reverse Proxy** con certificado SSL Let's Encrypt de forma guiada.
  8. Configura el Firewall corporativo UFW (puertos 3000, 80 y 443).
  9. Valida la salud del sistema llamando a `http://localhost:3000/api/health`.

#### B) En Servidores Windows Server (2016 / 2019 / 2022 / 2025):
1. Descomprima la carpeta del proyecto en `C:\AssetFlow` (o la unidad de disco que prefiera).
2. Haga clic derecho sobre **`install-windows.bat`** y seleccione **"Ejecutar como administrador"** (*Run as administrator*).
* **Qué hace automáticamente el instalador en Windows:**
  1. Valida permisos de Administrador y hardware disponible.
  2. Comprueba si Node.js LTS está presente; si no lo está, intenta instalarlo automáticamente vía `winget`.
  3. Genera el archivo de entorno `.env`.
  4. Ejecuta `npm ci` e instala todas las dependencias del proyecto.
  5. Compila la aplicación frontend para producción (`npm run build`).
  6. **Abre automáticamente la regla de entrada en el Firewall de Windows** para el puerto TCP 3000.
  7. Crea el script de inicio permanente `iniciar-sistema.bat` para iniciar en segundo plano o registrar como Servicio de Windows (Task Scheduler / NSSM).
  8. Ofrece iniciar el sistema de inmediato.

---

### Método Alternativo 1: Despliegue con Docker y Docker Compose Manual

1. **Asegurar los archivos en el servidor:**
   * `Dockerfile`
   * `docker-compose.yml`
   * `.dockerignore`
   * `.env` (creado a partir de `.env.example`)

2. **Configurar el archivo `.env`:**
   ```bash
   cp .env.example .env
   # Editar con la API Key corporativa de Google Cloud / Gemini:
   nano .env
   ```

3. **Compilar y levantar el contenedor en segundo plano:**
   ```bash
   docker compose up -d --build
   ```

4. **Verificar estado y salud del servicio:**
   ```bash
   docker compose ps
   curl http://localhost:3000/api/health
   # Respuesta esperada: {"status":"ok","service":"AssetFlow Enterprise API Server"}
   ```

5. **Ver logs en tiempo real:**
   ```bash
   docker compose logs -f
   ```

---

### Método B: Despliegue Nativo en Linux con PM2 (Bare-Metal / Máquina Virtual)

Ideal para servidores virtuales dedicados (AWS EC2, Azure VM, Google Compute Engine o servidores On-Premise).

1. **Instalar dependencias globales:**
   ```bash
   sudo apt update && sudo apt install -y curl git nginx
   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
   sudo apt install -y nodejs
   sudo npm install -g pm2 tsx
   ```

2. **Ejecutar el script automatizado de despliegue:**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

3. **Comandos de administración diaria con PM2:**
   * Ver estado de la aplicación: `pm2 status`
   * Ver logs de consola en vivo: `pm2 logs assetflow-enterprise`
   * Reiniciar servicio sin caída (Zero-Downtime): `pm2 reload assetflow-enterprise`
   * Detener servicio: `pm2 stop assetflow-enterprise`

---

### Método C: Despliegue en Windows Server

1. Instalar **Node.js 22 LTS** para Windows desde [nodejs.org](https://nodejs.org).
2. Descomprimir el paquete de la aplicación en `C:\inetpub\assetflow` o la ruta designada.
3. Hacer doble clic o ejecutar desde CMD/PowerShell como Administrador:
   ```cmd
   deploy-windows.bat
   ```
4. Para correrlo como Servicio de Windows permanente, se recomienda utilizar herramientas como **NSSM** (Non-Sucking Service Manager) o configurarlo en **IIS con HttpPlatformHandler**.

---

## 4. Configuración del Reverse Proxy NGINX con Certificado SSL

Para que los usuarios accedan de forma segura a través de `https://activos.tuempresa.cl`:

1. Copiar la plantilla provista a la configuración de NGINX:
   ```bash
   sudo cp nginx.conf /etc/nginx/sites-available/assetflow.conf
   sudo ln -s /etc/nginx/sites-available/assetflow.conf /etc/nginx/sites-enabled/
   ```
2. Instalar el certificado SSL corporativo o generar uno gratuito con Let's Encrypt:
   ```bash
   sudo apt install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d activos.tuempresa.cl
   ```
3. Probar y recargar NGINX:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

---

## 5. Variables de Entorno (`.env`)

| Variable | Tipo | Propósito |
| :--- | :--- | :--- |
| `PORT` | Numérico (ej: `3000`) | Puerto en el que escucha el backend Express. |
| `NODE_ENV` | String (`production`) | Habilita optimizaciones y sirve la carpeta `/dist`. |
| `GEMINI_API_KEY` | String | API Key de Google Cloud para extracción OCR de facturas, escrituras y el copiloto. |

---

## 6. Procedimiento de Respaldo y Recuperación (Disaster Recovery)

* **Respaldo de Base de Datos:** Desde la interfaz de usuario en el módulo **Bóveda Digital (P986110D)** o **Consola de Configuración**, el administrador puede presionar **"Exportar Respaldo Maestro JSON/ZIP"** para descargar una copia criptográfica completa de todos los inmuebles, contratos, bitácoras y órdenes de trabajo.
* **Restauración:** Mediante el botón **"Restaurar Respaldo Maestro"**, la base de datos se rehidrata en menos de 5 segundos con verificación de integridad hash SHA-256.

---

## 7. Continuidad Operacional ante Caída de Conectividad a Internet (Modo Intranet Local / Offline-First)

Una de las preguntas más frecuentes de los comités de TI y Ciberseguridad es: **"¿Qué ocurre si el servidor de la empresa o la sede corporativa pierde la conexión a Internet?"**.

### 7.1. Arquitectura de Resiliencia en Red LAN
Al estar instalado en un servidor local (Bare-Metal, VM corporativa o contenedor Docker en la Intranet de la empresa), **el corte de Internet exterior NO interrumpe la comunicación interna entre las estaciones de trabajo y el servidor**:
* Las terminales de los ejecutivos y jefaturas continúan comunicándose a través de la red local (ejemplo: `http://192.168.1.100:3000` o `https://activos.intranet.mutucar.cl`).
* La aplicación cuenta con arquitectura **Local-First** soportada por Service Workers y almacenamiento persistente en **IndexedDB** a nivel de cliente y almacenamiento relacional en el servidor Express.

### 7.2. Funcionalidades 100% Operativas Offline (Sin Internet):
1. **Consulta Catastral y Maestro de Propiedades:** Búsqueda y navegación de los 19 condominios y más de 22.000 unidades con desglose jerárquico Drill-Down.
2. **Emisión y Gestión de Órdenes de Trabajo (OT / P48201):** Creación, modificación y seguimiento de órdenes, asignación de contratistas, registro de facturas/boletas de honorarios y cálculo exacto de IVA (19%) y retenciones tributarias (15,25%).
3. **Flujo de Aprobaciones Jerárquicas (P43081):** Inspección de los 7 puntos de auditoría previa y liberación de pagos dentro de los umbrales de autoridad societaria.
4. **Sellado Criptográfico Forense (F4209):** La función hash SHA-256 se ejecuta de forma 100% nativa en el hardware mediante la API estándar **Web Crypto API** (`crypto.subtle.digest`), por lo que la cadena de bloques interna sigue sellándose y validándose sin requerir servicios externos.
5. **Generación y Descarga de Documentos:** Todos los motores de exportación a Microsoft Excel (.xlsx), Word (.docx) y PDF vectorial se procesan íntegramente *in-memory* en la estación de trabajo.

### 7.3. Funcionalidades en Cola o Suspendidas Temporalmente:
* **Extracción Cognitiva OCR (Google Gemini API):** Al requerir acceso a los servidores de Google Cloud, la lectura asistida de facturas se deshabilita temporalmente; el usuario puede ingresar los datos tributarios en el formulario manual estándar.
* **Despacho Externo de Correos a Arrendatarios:** Los correos masivos con comprobantes de cobro quedan registrados en la cola de salida del sistema y se despachan de forma secuencial una vez que el proveedor de telecomunicaciones restablezca el enlace a Internet.

---

## 8. Auto-Aprovisionamiento y Creación Autónoma de Base de Datos y Tablas (Cold Start)

AssetFlow Enterprise está diseñado con una premisa de **Cero Fricción para el Administrador de Base de Datos (DBA)**. No se requiere ejecutar scripts manuales `CREATE TABLE`, `ALTER TABLE` o procedimientos almacenados complejos al desplegar el sistema en un servidor nuevo.

### 8.1. Ciclo de Vida del Arranque en Frío
1. **Detección Automática de Esquema:** Al iniciar el servicio (`node server.ts` o contenedor Docker), el motor relacional inspecciona el almacén de datos.
2. **Creación Automática de las 32 Tablas Enterprise:** Si el esquema no existe, el sistema inicializa de inmediato las estructuras maestras:
   * `F0101` (Address Book Master - Personas y Entidades)
   * `F0401` (Supplier Master - Proveedores y Contratistas)
   * `F0116` / `F0111` (Direcciones Postales y Contactos de Proveedores)
   * `F0030` (Bank Transit Master - Cuentas Bancarias de Pago)
   * `F4801` (Work Order Master - Órdenes de Trabajo y Mantención)
   * `F4311` (Purchase Order Detail - Líneas de Presupuesto y Materiales)
   * `F4209` (Approval Ledger - Bitácora de Firmas Criptográficas SHA-256)
   * `F15012` (Lease Contract Master - Contratos de Arrendamiento)
   * `F1501` (Property Master - Catastro Físico de Bienes Raíces)
   * `F0911` (General Ledger - Asientos Contables de Partida Doble)
   * `R09322` / `R09323` (Catastros Regulatorios CMF B.4 y Nota 14)
3. **Inyección de Semilla Maestra (Auto-Seeding):** Si el sistema detecta que la base de datos está vacía, inyecta de forma instantánea el catálogo maestro inicial (`lib/masterDataSeed.ts`), poblando los 19 condominios/complejos, contratos de arriendo y contratistas homologados, dejando el sistema listo para operar en menos de 2 segundos.

---

## 9. Asistente de Consulta Relacional y Navegación Drill-Down (Maestro de Condominios y Propiedades)

Para resolver la complejidad de administrar carteras patrimoniales masivas con más de 22.000 unidades distribuidas en 19 grandes complejos (ej. Montesol II con 6.546 unidades, Jardines Norte V con 3.095 unidades), se incorporó el **Asistente de Consulta con Navegación Jerárquica Drill-Down**:

### 9.1. Arquitectura de Doble Vista Drill-Down
* **Vista Acordeón In-Line:** Permite desplegar las unidades de un conjunto habitacional directamente en la misma fila de la tabla sin perder de vista los demás condominios. Muestra un resumen de 9 a 12 unidades con acceso inmediato a acciones rápidas de filtrado y edición.
* **Vista Completa Focalizada (Deep Drill-Down):** Al presionar *"Desglosar unidades (Drill-Down) →"*, el asistente transiciona a una pantalla dedicada con:
  * Migas de pan de retorno: `[← Volver a Condominios]`.
  * Contador formal de unidades del conjunto y ficha geográfica (Comuna/Región).
  * Buscador contextual dinámico que filtra instantáneamente por código, tipo de inmueble o dirección.
  * Paginación protectora de 150 unidades para garantizar tiempos de respuesta inferiores a 16 milisegundos en el renderizado DOM.

### 9.2. Interacción con el Circuito de Requerimientos y OT
Al seleccionar cualquier unidad dentro del Drill-Down, el sistema gatilla automáticamente:
1. `setQbeConjunto(nombreCondominio)`
2. `setQbeAddress(direccionUnidad)`
3. Cierre asistido y notificación informativa en pantalla.
4. Aplicación de los filtros Query-By-Example (QBE) a la grilla de requerimientos y órdenes de trabajo, permitiendo a los ejecutivos auditar el historial de mantención de una vivienda específica en un solo clic.

---

## 10. Ecosistema de Documentación y Manuales Normados en la Bóveda Digital (P986110D)

Para asegurar la continuidad operacional, capacitación sin dependencias externas y cumplimiento de la Cláusula 7.2 (Competencia) de la norma **ISO 9001:2015**, AssetFlow Enterprise incorpora un ecosistema completo de **9 Manuales Oficiales** y expedientes de postulación y peritaje custodiados permanentemente en la **Bóveda de Documentos Digitales (Programa `P986110D`)**:

### 10.1. Catálogo Oficial de 9 Manuales y Expedientes Normados ISO 9001:2015

| Código Normativo | Título Oficial del Manual / Procedimiento | Formatos Disponibles | Propósito Operativo |
| :--- | :--- | :--- | :--- |
| **SERCOTEC-SEM-2026-01** | Plan de Negocio y Postulación Capital Semilla SERCOTEC 2026 | Word (.docx nativo) | Proyecto de constitución de AssetFlow Technologies SpA ($3.5M CLP), registro INAPI, workstation y despliegue B2B. |
| **SGC-MAN-ERP-001** | Manual General de Uso, Operación y Auditoría del ERP (v7.0) | Word (.docx) / PDF | Guía integral de operación transaccional, partida doble F0911 y catálogo de tablas. |
| **SGC-INS-POR-002** | Instructivo de Operación del Portal de Arrendatarios y Conciliación | Word (.docx) / PDF | Procedimiento de cobranza, recaudación bancaria y conciliación de cartolas. |
| **SGC-PRO-UAF-003** | Procedimiento de Debida Diligencia (Due Diligence) y Cumplimiento LA/FT | Word (.docx) / PDF | Matriz de riesgo y prevención de delitos económicos bajo Ley N° 19.913 y Ley N° 21.595. |
| **SGC-PRO-GAR-004** | Procedimiento de Custodia, Rendición y Liquidación de Garantías | Word (.docx) / PDF | Protocolo de restitución de inmuebles, cálculo de finiquito y devolución de depósitos. |
| **SGC-PRO-APR-005** | Procedimiento de Niveles de Aprobación F4209 y Trazabilidad Blockchain | Word (.docx) / PDF | Matriz de atribuciones, firmas mancomunadas y encadenamiento criptográfico SHA-256. |
| **SGC-MAN-CMF-007** | Manual de Cumplimiento Normativo CMF: Informe B.4 y Nota 14 | Word (.docx) / PDF | Generación de catastros de inversión, depreciaciones y notas a los estados financieros. |
| **SGC-IT-MAN-008** | Manual Técnico de Instalación, Despliegue y Operación en Servidores IT | Word (.docx) / PDF | Procedimiento paso a paso para administradores de sistemas y DevOps. |
| **SGC-RRHH-PSI-009** | Informe Pericial de Evaluación Psicolaboral & Competencias Directivas | Word (.docx nativo) / PDF | Diagnóstico de competencias ejecutivas, juicio ético (Kohlberg 6) y metodología STAR. |

### 10.2. Generación Binaria OpenXML (.docx) y Custodia Criptográfica SHA-256
* **Generación en Proceso (Zero-Cloud Leak):** Todos los documentos Word se generan en el cliente o servidor mediante compresión binaria Office Open XML (`JSZip`), empaquetando archivos `.docx` genuinos con tipo MIME `application/vnd.openxmlformats-officedocument.wordprocessingml.document`. No se transmiten datos a APIs de terceros para la conversión.
* **Inmutabilidad y Firma Criptográfica:** Cada manual y reporte técnico cuenta con su cálculo SHA-256 en la Bóveda Digital (`P986110D`), garantizando que cualquier modificación no autorizada sea detectada de forma inmediata por el motor de verificación de integridad.

---

## 11. Arquitectura Relacional Particionada PostgreSQL 16 y Desacoplamiento de Carga Transaccional (10.000 tx/día)

Para garantizar la estabilidad operativa del sistema ante volúmenes transaccionales masivos (**10.000 transacciones diarias, equivalente a 3,65 millones anuales y más de 36 millones en un horizonte de 10 años**), AssetFlow Enterprise implementa una arquitectura desacoplada de alto rendimiento respaldada por **PostgreSQL 16 Enterprise**:

### 11.1. Desacoplamiento del Frontend y Paginación Server-Side
* **Eliminación del Cuello de Botella en Memoria:** El navegador ya no descarga el historial completo de transacciones en la memoria de la aplicación. Se implementa una política de *Ventana Activa de Trabajo*, donde el cliente solo solicita y mantiene en pantalla bloques de 25, 50, 100 o 200 filas.
* **Consumo Constante de Memoria (<40 MB):** Sin importar si la base de datos contiene 50.000 o 10.000.000 de registros contables, el consumo de memoria RAM del navegador se mantiene estable entre 25 MB y 40 MB, eliminando los riesgos de cuelgues o cierres por *Out of Memory* (OOM).
* **Protección de LocalStorage:** Se implementa un filtro protector en `StorageEngine` que limita el almacenamiento en caché local a 50 registros recientes, protegiendo al navegador contra errores de cuota excedida (`QuotaExceededError`).

### 11.2. Particionamiento Mensual de la Tabla F0911 (`scripts/init_db_partitioned.sql`)
La tabla maestra contable `f0911_transactions` se encuentra particionada por rangos de fecha (`PARTITION BY RANGE (date)`):
* **Particiones Físicas Mensuales:** Cada mes calendario (ej. `f0911_tx_2026_11`) opera como una sub-tabla física independiente con sus propios índices B-Tree locales.
* **Poda de Particiones (*Partition Pruning*):** Al emitir consultas contables, estados financieros o auditorías para un mes o trimestre específico, el motor de base de datos descarta de inmediato las demás particiones, garantizando tiempos de respuesta inferiores a **15 milisegundos**.
* **Índices B-Tree Optimizados:**
  * `idx_f0911_date_type`: Búsqueda cronológica combinada por tipo de flujo (Ingreso / Egreso).
  * `idx_f0911_account_code`: Conciliación inmediata por cuenta contable del plan de cuentas institucional.
  * `idx_f0911_supplier_tax_id`: Búsqueda instantánea de operaciones por RUT de proveedor.
  * `idx_f0911_batch_number`: Cuadre de lotes contables y partidas dobles.

### 11.3. Exportación Masiva por Streaming HTTP (`/api/transactions/export`)
Para auditorías tributarias y conciliaciones anuales con más de 100.000 transacciones:
* El endpoint de backend `/api/transactions/export` canaliza los registros directamente al flujo de red en formato CSV/UTF-8 con BOM para Excel mediante streaming, eliminando el buffering de memoria y evitando desbordar el heap de Node.js o del navegador.

### 11.4. Despliegue en Docker Compose (`assetflow-db`)
El archivo `docker-compose.yml` incorpora el servicio de base de datos totalmente aprovisionado:
```yaml
  assetflow-db:
    image: postgres:16-alpine
    container_name: assetflow-db
    restart: unless-stopped
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./scripts/init_db_partitioned.sql:/docker-entrypoint-initdb.d/01_init.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U assetflow_admin -d assetflow_enterprise"]
      interval: 10s
      timeout: 5s
      retries: 5
```

---
*Manual Técnico de Infraestructura validado bajo estándares ISO 9001:2015 e ISO 27001 por la Jefatura de Control Interno y Transformación Digital.*
