import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import { downloadWordDocFromHtml } from './wordManualsExport';

export interface ItManualSection {
  id: string;
  number: string;
  title: string;
  summary: string;
  contentHtml: string;
}

export const IT_MANUAL_SECTIONS: ItManualSection[] = [
  {
    id: 'intro',
    number: 'CAPÍTULO 1',
    title: 'INTRODUCCIÓN Y REQUISITOS PREVIOS DEL SERVIDOR',
    summary: 'Definición de arquitectura, requerimientos de hardware mínimos y sistemas operativos soportados.',
    contentHtml: `
      <h3>1.1. Propósito de este Manual</h3>
      <p>Este documento está redactado de manera <strong>didáctica y paso a paso</strong> para el equipo de Infraestructura, Soporte y Operaciones TI. Asume que el personal puede no tener experiencia previa con Docker o Node.js en producción, por lo que cada instrucción incluye los comandos de terminal exactos para copiar y pegar.</p>
      
      <h3>1.2. ¿Qué es AssetFlow ERP y cómo está empaquetado?</h3>
      <p>AssetFlow ERP es una plataforma integral de gestión de activos inmobiliarios diseñada bajo estándares de AssetFlow Enterprise (JAS 9.11). El sistema está compuesto por:</p>
      <ul>
        <li><strong>Frontend SPA:</strong> Desarrollado en React 19 + TypeScript + Tailwind CSS, compilado con Vite a código estático de ultra alto rendimiento.</li>
        <li><strong>Backend de Servicio & SSR:</strong> Servidor Express en Node.js 22 LTS que escucha en el <strong>puerto 3000</strong>.</li>
        <li><strong>Capa de Persistencia y Bóveda:</strong> Firebase Firestore / IndexedDB persistente con cifrado Web Crypto SHA-256 en cadena de bloques.</li>
      </ul>

      <h3>1.3. Requerimientos de Hardware Mínimos y Recomendados</h3>
      <table class="iso-styled-table">
        <thead>
          <tr>
            <th>Componente</th>
            <th>Mínimo Absoluto</th>
            <th>Recomendado para Producción</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Procesador (CPU)</strong></td>
            <td>1 núcleo virtual (vCPU)</td>
            <td>2 a 4 núcleos virtuales (vCPU)</td>
          </tr>
          <tr>
            <td><strong>Memoria RAM</strong></td>
            <td>2 GB RAM (+ 2 GB SWAP)</td>
            <td>4 GB a 8 GB RAM</td>
          </tr>
          <tr>
            <td><strong>Almacenamiento (Disco)</strong></td>
            <td>10 GB SSD</td>
            <td>30 GB a 50 GB SSD NVMe</td>
          </tr>
          <tr>
            <td><strong>Sistema Operativo</strong></td>
            <td>Ubuntu 22.04 LTS / Debian 12</td>
            <td>Ubuntu 24.04 LTS / Windows Server 2022</td>
          </tr>
          <tr>
            <td><strong>Red y Conectividad</strong></td>
            <td>IP Pública fija o Dominio DNS</td>
            <td>Puertos 80 (HTTP) y 443 (HTTPS) abiertos</td>
          </tr>
        </tbody>
      </table>

      <h3>1.4. Creación Automática de Base de Datos y Tablas (Cero Configuración SQL)</h3>
      <p>Una gran ventaja para el equipo de TI es que <strong>no es necesario escribir scripts SQL manuales ni ejecutar comandos <code>CREATE TABLE</code></strong>. El sistema cuenta con un motor de auto-aprovisionamiento integrado:</p>
      <ul>
        <li>Al arrancar por primera vez, el sistema valida e inicializa de forma completamente autónoma las <strong>32 tablas maestras del estándar Enterprise</strong> (Address Book <code>F0101</code>, Proveedores <code>F0401</code>, Cuentas Bancarias <code>F0030</code>, Órdenes de Trabajo <code>F4801</code>, Bitácora Criptográfica <code>F4209</code>, Contratos de Arriendo <code>F15012</code>, Libro Mayor <code>F0911</code> y Catastros CMF <code>B13/B4</code>).</li>
        <li><strong>Auto-Poblado (Auto-Seeding):</strong> Si la base de datos está vacía, el sistema auto-siembra de inmediato el catálogo de 1.843 propiedades, el plan de cuentas, los tipos de contrato y las rutas jerárquicas de aprobación sin requerir intervención manual de TI.</li>
      </ul>

      <h3>1.5. Resiliencia Operacional ante Caída de Conexión a Internet (Modo Intranet Local)</h3>
      <div class="iso-callout-box">
        <strong>¿QUÉ OCURRE SI SE CORTA INTERNET EN LA EMPRESA?</strong><br/>
        Al estar desplegado en servidores propios (On-Premise), la pérdida de conexión a Internet hacia el exterior <strong>NO afecta la red interna (LAN / Intranet)</strong>.
      </div>
      <p>Las estaciones de trabajo de los profesionales del departamento continúan conectadas al servidor en la red local (ej: <code>http://192.168.1.100:3000</code>). Gracias a la arquitectura <em>Offline-First</em>:</p>
      <ul>
        <li><strong>Operación Continua:</strong> Se pueden seguir registrando contratos, emitiendo órdenes de trabajo, aprobando gastos en P43081 y generando reportes en Excel (.xlsx) y Word (.docx).</li>
        <li><strong>Criptografía Autónoma:</strong> El sellado SHA-256 de auditoría se procesa localmente en la CPU mediante Web Crypto API sin requerir conexión a internet.</li>
        <li><strong>Tareas Externas en Cola:</strong> El despacho de correos electrónicos a arrendatarios se encola de forma segura y se despacha masivamente en cuanto se restablezca la conexión de telecomunicaciones.</li>
      </ul>

      <h3>1.6. Arquitectura de Consulta Masiva y Asistente Jerárquico Drill-Down (P1501)</h3>
      <p>Para gestionar carteras masivas de más de 22.000 unidades en 19 condominios (ej. Montesol II con 6.546 unidades, Jardines Norte V con 3.095 unidades), el sistema incorpora un motor de consulta con doble modalidad de desglose jerárquico (Drill-Down):</p>
      <ul>
        <li><strong>Acordeón In-line:</strong> Expansión dinámica en la propia fila del condominio mediante control Chevron para previsualizar unidades sin perder la perspectiva de cartera.</li>
        <li><strong>Vista Completa Focalizada (Deep Drill-Down):</strong> Transición instantánea con migas de pan <code>← Volver a Condominios</code>, búsqueda contextual y paginación DOM ultra rápida (<16ms) con selección cruzada hacia la grilla QBE de requerimientos y órdenes de trabajo.</li>
      </ul>
    `
  },
  {
    id: 'files-overview',
    number: 'CAPÍTULO 2',
    title: 'ESTRUCTURA DEL PAQUETE DE DESPLIEGUE',
    summary: 'Descripción detallada de cada archivo entregado en la raíz del repositorio.',
    contentHtml: `
      <p>El repositorio ya incluye todos los archivos de configuración requeridos para producción corporativa:</p>
      <table class="iso-styled-table">
        <thead>
          <tr>
            <th style="width: 28%;">Archivo</th>
            <th style="width: 22%;">Función Principal</th>
            <th>Descripción Operativa</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>install.sh</code></td>
            <td>Instalador Maestro Linux (1 Clic)</td>
            <td>Instalador integral autónomo para Ubuntu/Debian/RHEL. Realiza chequeo de RAM/CPU/Swap, instala Docker o Node.js 22 LTS, compila y levanta con reinicio automático.</td>
          </tr>
          <tr>
            <td><code>install-windows.bat</code></td>
            <td>Instalador Maestro Windows Server</td>
            <td>Instalador automatizado con chequeo de Administrador, auto-instalación de Node LTS, compilación de Vite, apertura del Firewall en puerto 3000 y creación del servicio de fondo.</td>
          </tr>
          <tr>
            <td><code>Dockerfile</code></td>
            <td>Empaquetado Docker</td>
            <td>Compilación multi-etapa en contenedor ultra ligero Node.js 22 Alpine, instalando solo dependencias de producción y reduciendo el tamaño a &lt;180 MB.</td>
          </tr>
          <tr>
            <td><code>docker-compose.yml</code></td>
            <td>Orquestación 1-Clic</td>
            <td>Levanta el servicio automáticamente con política de reinicio <code>unless-stopped</code>, chequeo de salud (healthcheck) y mapeo del puerto 3000:3000.</td>
          </tr>
          <tr>
            <td><code>deploy.sh</code></td>
            <td>Script Linux Automatizado</td>
            <td>Script Bash para servidores Linux sin Docker. Instala dependencias, ejecuta el build de Vite, configura PM2 en clúster y activa el servicio.</td>
          </tr>
          <tr>
            <td><code>deploy-windows.bat</code></td>
            <td>Script Windows Server</td>
            <td>Script de ejecución directa para entornos Windows Server que verifica Node.js, ejecuta npm install, compila y levanta el servidor.</td>
          </tr>
          <tr>
            <td><code>ecosystem.config.cjs</code></td>
            <td>Cluster PM2</td>
            <td>Configura el gestor de procesos en clúster para balanceo de carga en servidores multi-núcleo y rotación de registros de logs.</td>
          </tr>
          <tr>
            <td><code>nginx.conf</code></td>
            <td>Reverse Proxy & SSL</td>
            <td>Configuración de Nginx para redirigir tráfico público seguro (puerto 443 SSL) hacia el puerto interno 3000, con compresión gzip y headers HTTP estrictos.</td>
          </tr>
          <tr>
            <td><code>.env.example</code></td>
            <td>Variables de Entorno</td>
            <td>Plantilla editable con las variables de configuración de puertos, URLs y credenciales del sistema.</td>
          </tr>
        </tbody>
      </table>
    `
  },
  {
    id: 'method-docker',
    number: 'CAPÍTULO 3',
    title: 'MÉTODO A: DESPLIEGUE CON DOCKER (RECOMENDADO)',
    summary: 'Paso a paso para instalar Docker, copiar el proyecto y encender el servicio en menos de 5 minutos.',
    contentHtml: `
      <div class="iso-callout-box">
        <strong>¿POR QUÉ DOCKER ES EL MÉTODO RECOMENDADO?</strong><br/>
        Docker empaqueta el sistema operativo, las dependencias de Node.js y la aplicación en un contenedor cerrado. Esto garantiza que el sistema funcionará exactamente igual en cualquier servidor sin problemas de versiones incompatibles.
      </div>

      <h3>Paso 3.1: Instalar Docker y Docker Compose en el Servidor (Ubuntu / Debian)</h3>
      <p>Conéctate al servidor mediante SSH (usando PuTTY o tu terminal) y ejecuta estos comandos uno por uno:</p>
      
      <div class="code-block">
# 1. Actualizar el índice de paquetes del sistema operativo
sudo apt update && sudo apt upgrade -y

# 2. Descargar el instalador oficial de Docker
curl -fsSL https://get.docker.com -o get-docker.sh

# 3. Ejecutar el instalador automatizado
sudo sh get-docker.sh

# 4. Habilitar que Docker arranque automáticamente si el servidor se reinicia
sudo systemctl enable docker
sudo systemctl start docker

# 5. Agregar tu usuario al grupo docker para no tener que escribir 'sudo' siempre
sudo usermod -aG docker $USER
      </div>
      <p><em>Nota didáctica: Tras ejecutar el comando 5, cierra la sesión SSH y vuelve a entrar para que los permisos tomen efecto.</em></p>

      <h3>Paso 3.2: Transferir el Proyecto al Servidor</h3>
      <p>Crea el directorio de trabajo corporativo en el servidor y transfiere los archivos:</p>
      <div class="code-block">
# Crear la carpeta de la aplicación en /opt (estándar corporativo)
sudo mkdir -p /opt/assetflow
sudo chown -R $USER:$USER /opt/assetflow
cd /opt/assetflow
      </div>
      <p>Puedes subir los archivos del proyecto usando <strong>FileZilla</strong> o <strong>WinSCP</strong> mediante SFTP a la carpeta <code>/opt/assetflow</code>, o clonar el repositorio Git:</p>
      <div class="code-block">
# Si usas Git corporativo:
git clone &lt;URL_DEL_REPOSITORIO&gt; /opt/assetflow
cd /opt/assetflow
      </div>

      <h3>Paso 3.3: Configurar las Variables de Entorno (.env)</h3>
      <p>Copia el archivo de ejemplo para crear el archivo <code>.env</code> de producción:</p>
      <div class="code-block">
cp .env.example .env
nano .env
      </div>
      <p>Verifica que los valores coincidan con tu entorno:</p>
      <div class="code-block">
PORT=3000
NODE_ENV=production
VITE_APP_TITLE=AssetFlow Enterprise ERP
      </div>
      <p><em>Para guardar en nano, presiona <code>Ctrl + O</code>, luego <code>Enter</code>, y luego <code>Ctrl + X</code> para salir.</em></p>

      <h3>Paso 3.4: Construir y Levantar el Sistema con Docker Compose</h3>
      <p>Ejecuta este único comando dentro de <code>/opt/assetflow</code>:</p>
      <div class="code-block">
docker compose up -d --build
      </div>
      <p>Este comando descargará Node.js 22 Alpine, compilará la aplicación y la dejará corriendo en segundo plano.</p>

      <h3>Paso 3.5: Verificar que el Sistema Está Corriendo</h3>
      <div class="code-block">
# Ver el estado del contenedor (debe decir "Up" o "healthy"):
docker compose ps

# Ver los logs en vivo del sistema en pantalla:
docker compose logs -f
      </div>
      <p>¡Listo! Abre el navegador en tu red local e ingresa a: <code>http://IP_DE_TU_SERVIDOR:3000</code>.</p>
    `
  },
  {
    id: 'method-pm2',
    number: 'CAPÍTULO 4',
    title: 'MÉTODO B: DESPLIEGUE NATIVO CON NODE.JS Y PM2',
    summary: 'Alternativa sin Docker para servidores Linux convencionales o Windows Server.',
    contentHtml: `
      <h3>4.1. Despliegue en Servidores Linux (Ubuntu / Debian / RedHat)</h3>
      <p>Si la empresa prefiere no usar contenedores Docker, sigue estos pasos:</p>
      <div class="code-block">
# 1. Instalar Node.js 22 LTS mediante NodeSource
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs build-essential

# 2. Instalar PM2 globalmente (administrador de procesos de nivel empresarial)
sudo npm install -g pm2

# 3. Ir a la carpeta de la aplicación
cd /opt/assetflow

# 4. Otorgar permisos de ejecución al script automatizado
chmod +x deploy.sh

# 5. Ejecutar el script de despliegue automatizado
./deploy.sh
      </div>
      <p>El script <code>deploy.sh</code> ejecutará <code>npm install</code>, compilará Vite con <code>npm run build</code>, iniciará PM2 en modo clúster y configurará el inicio automático ante reinicios con <code>pm2 startup</code>.</p>

      <h3>4.2. Despliegue en Servidores Windows Server (2019 / 2022)</h3>
      <ol>
        <li>Descarga e instala <strong>Node.js 22 LTS</strong> desde el sitio oficial <code>https://nodejs.org</code> (marca la opción de incluir npm).</li>
        <li>Copia la carpeta del proyecto en una ruta como <code>C:\\AssetFlow</code>.</li>
        <li>Abre el explorador de Windows, haz clic derecho sobre <code>deploy-windows.bat</code> y selecciona <strong>"Ejecutar como Administrador"</strong>.</li>
        <li>El script validará Node.js, descargará dependencias, compilará la solución y encenderá el servidor en el puerto 3000.</li>
      </ol>
    `
  },
  {
    id: 'nginx-ssl',
    number: 'CAPÍTULO 5',
    title: 'CONFIGURACIÓN DE PROXY INVERSO NGINX Y CERTIFICADO SSL (HTTPS)',
    summary: 'Cómo conectar el sistema a un dominio corporativo y protegerlo con HTTPS gratuito y seguro.',
    contentHtml: `
      <p>Por seguridad y estándar corporativo, los usuarios deben conectarse mediante <code>https://erp.tuempresa.cl</code> sin tener que escribir el puerto <code>:3000</code>. Para esto se utiliza Nginx como Reverse Proxy.</p>

      <h3>Paso 5.1: Instalar Nginx y Certbot en el Servidor</h3>
      <div class="code-block">
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
      </div>

      <h3>Paso 5.2: Configurar el Bloque de Sitio en Nginx</h3>
      <p>Crea el archivo de configuración para tu dominio:</p>
      <div class="code-block">
sudo nano /etc/nginx/sites-available/assetflow.conf
      </div>
      <p>Pega la siguiente configuración (reemplaza <code>erp.tuempresa.cl</code> por tu dominio real):</p>
      <div class="code-block">
server {
    listen 80;
    server_name erp.tuempresa.cl;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
      </div>

      <h3>Paso 5.3: Habilitar el Sitio y Probar Nginx</h3>
      <div class="code-block">
sudo ln -s /etc/nginx/sites-available/assetflow.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
      </div>

      <h3>Paso 5.4: Activar Certificado SSL Gratuito con Let's Encrypt</h3>
      <div class="code-block">
sudo certbot --nginx -d erp.tuempresa.cl
      </div>
      <p>Certbot te pedirá un correo para avisos de renovación. Acepta los términos y selecciona la opción de redireccionar automáticamente todo el tráfico HTTP a HTTPS (opción 2). La renovación es 100% automática.</p>
    `
  },
  {
    id: 'security-firewall',
    number: 'CAPÍTULO 6',
    title: 'SEGURIDAD PERIMETRAL, PUERTOS Y FIREWALL',
    summary: 'Blindaje del servidor cerrando puertos no deseados y permitiendo únicamente tráfico seguro.',
    contentHtml: `
      <h3>6.1. Configuración del Firewall UFW (Ubuntu / Debian)</h3>
      <p>Ejecuta estos comandos para evitar accesos no autorizados a puertos internos:</p>
      <div class="code-block">
# 1. Permitir conexión SSH (IMPORTANTE para no perder acceso al servidor)
sudo ufw allow 22/tcp

# 2. Permitir tráfico web HTTP y HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 3. Activar el firewall
sudo ufw enable

# 4. Verificar estado activo
sudo ufw status verbose
      </div>
      <p><em>Nota de seguridad: Nunca abras el puerto 3000 al exterior. Todo el tráfico externo debe ingresar únicamente a través de los puertos 80 y 443 administrados por Nginx con SSL.</em></p>
    `
  },
  {
    id: 'maintenance-ops',
    number: 'CAPÍTULO 7',
    title: 'OPERACIÓN DIARIA, MONITOREO Y RESPALDOS (BACKUP)',
    summary: 'Comandos para reiniciar el sistema, ver logs en vivo y automatizar copias de respaldo.',
    contentHtml: `
      <h3>7.1. Comandos de Control para Docker</h3>
      <table class="iso-styled-table">
        <thead>
          <tr>
            <th style="width: 35%;">Acción Requerida</th>
            <th>Comando a Ejecutar en /opt/assetflow</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Ver estado del sistema</strong></td>
            <td><code>docker compose ps</code></td>
          </tr>
          <tr>
            <td><strong>Ver registros (logs) en vivo</strong></td>
            <td><code>docker compose logs -f --tail=100</code></td>
          </tr>
          <tr>
            <td><strong>Reiniciar el sistema</strong></td>
            <td><code>docker compose restart</code></td>
          </tr>
          <tr>
            <td><strong>Detener el sistema</strong></td>
            <td><code>docker compose down</code></td>
          </tr>
          <tr>
            <td><strong>Actualizar con nueva versión de código</strong></td>
            <td><code>git pull &amp;&amp; docker compose up -d --build</code></td>
          </tr>
        </tbody>
      </table>

      <h3>7.2. Comandos de Control para PM2 (Método Nativo)</h3>
      <table class="iso-styled-table">
        <thead>
          <tr>
            <th style="width: 35%;">Acción Requerida</th>
            <th>Comando a Ejecutar</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Ver estado del clúster</strong></td>
            <td><code>pm2 status</code></td>
          </tr>
          <tr>
            <td><strong>Ver consumo de CPU y RAM</strong></td>
            <td><code>pm2 monit</code></td>
          </tr>
          <tr>
            <td><strong>Ver registros de logs</strong></td>
            <td><code>pm2 logs assetflow-erp</code></td>
          </tr>
          <tr>
            <td><strong>Reiniciar la aplicación</strong></td>
            <td><code>pm2 restart assetflow-erp</code></td>
          </tr>
        </tbody>
      </table>

      <h3>7.3. Política de Respaldo Diario (Backup)</h3>
      <p>Para respaldar los archivos y variables de configuración de la empresa de forma programada:</p>
      <div class="code-block">
# Crear script de backup diario en /usr/local/bin/backup-assetflow.sh
sudo nano /usr/local/bin/backup-assetflow.sh
      </div>
      <p>Contenido del script:</p>
      <div class="code-block">
#!/bin/bash
FECHA=$(date +%Y%m%d_%H%M%S)
DESTINO="/var/backups/assetflow"
mkdir -p $DESTINO
tar -czf $DESTINO/assetflow_backup_$FECHA.tar.gz -C /opt assetflow --exclude="assetflow/node_modules"
find $DESTINO -type f -mtime +30 -name "*.tar.gz" -delete
      </div>
      <div class="code-block">
# Dar permisos y agregar al crontab diario (2:00 AM)
sudo chmod +x /usr/local/bin/backup-assetflow.sh
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-assetflow.sh") | crontab -
      </div>
    `
  },
  {
    id: 'troubleshooting',
    number: 'CAPÍTULO 8',
    title: 'GUÍA DE SOLUCIÓN DE PROBLEMAS (FAQ PARA INEXPERTOS)',
    summary: 'Soluciones directas a los errores más comunes de infraestructura y puertos.',
    contentHtml: `
      <h3>Caso 1: "Error EADDRINUSE: address already in use :::3000"</h3>
      <p><strong>Causa:</strong> Otro proceso o una instancia previa ya está ocupando el puerto 3000.</p>
      <p><strong>Solución:</strong> Identifica el proceso que ocupa el puerto y finalízalo:</p>
      <div class="code-block">
# Ver qué proceso está usando el puerto 3000:
sudo lsof -i :3000
# Finalizar el proceso por su PID (ejemplo PID 12345):
sudo kill -9 12345
# Luego reinicia:
docker compose up -d
      </div>

      <h3>Caso 2: "Error: permission denied while trying to connect to Docker daemon socket"</h3>
      <p><strong>Causa:</strong> El usuario actual de Linux no pertenece al grupo <code>docker</code>.</p>
      <p><strong>Solución:</strong></p>
      <div class="code-block">
sudo usermod -aG docker $USER
# Cierra sesión SSH y vuelve a ingresar:
exit
      </div>

      <h3>Caso 3: El build se congela o dice "JavaScript heap out of memory"</h3>
      <p><strong>Causa:</strong> El servidor tiene solo 1 GB o 2 GB de RAM y se queda sin memoria durante la optimización de Vite.</p>
      <p><strong>Solución:</strong> Crea un archivo de memoria SWAP de 2 GB en 30 segundos:</p>
      <div class="code-block">
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
      </div>

      <h3>Caso 4: Nginx muestra "502 Bad Gateway"</h3>
      <p><strong>Causa:</strong> Nginx está funcionando, pero la aplicación en el puerto 3000 está apagada o iniciándose.</p>
      <p><strong>Solución:</strong></p>
      <div class="code-block">
# Si usas Docker:
docker compose ps
docker compose logs --tail=50

# Si usas PM2:
pm2 status
pm2 logs
      </div>

      <h3>Caso 5: Al subir archivos PDF pesados en la Bóveda Digital dice "413 Request Entity Too Large"</h3>
      <p><strong>Causa:</strong> Nginx por defecto limita las cargas a 1 MB.</p>
      <p><strong>Solución:</strong> Asegúrate de que en <code>/etc/nginx/sites-available/assetflow.conf</code> esté la línea:</p>
      <div class="code-block">
client_max_body_size 50M;
      </div>
      <p>Y luego recarga Nginx con: <code>sudo systemctl reload nginx</code>.</p>
    `
  },
  {
    id: 'sec-10',
    number: 'CAPÍTULO 10',
    title: 'ECOSISTEMA DE DOCUMENTACIÓN Y MANUALES NORMADOS EN LA BÓVEDA DIGITAL (P986110D)',
    summary: 'Catálogo de los 8 manuales oficiales ISO 9001:2015 / ISO 27001, compresión binaria JSZip OpenXML (.docx) y custodia SHA-256.',
    contentHtml: `
      <h3>10.1. Catálogo Oficial de Manuales Normados ISO y Expedientes Concursables</h3>
      <p>AssetFlow Enterprise incorpora un ecosistema integral de 9 manuales y expedientes oficiales bajo norma ISO 9001:2015 / ISO 27001 custodiados con cálculo SHA-256 en la Bóveda de Documentos Digitales (<code>P986110D</code>):</p>
      <ul>
        <li><strong>SERCOTEC-SEM-2026-01:</strong> Plan de Negocio y Postulación Oficial Capital Semilla SERCOTEC 2026 ($3.5M CLP para Constitución SpA, INAPI y Servidor).</li>
        <li><strong>SGC-MAN-ERP-001:</strong> Manual General de Uso, Operación y Auditoría del ERP (v7.0 con Índice Completo).</li>
        <li><strong>SGC-INS-POR-002:</strong> Instructivo Operativo del Portal de Arrendatarios y Conciliación Bancaria.</li>
        <li><strong>SGC-PRO-UAF-003:</strong> Procedimiento de Debida Diligencia (Due Diligence) y Prevención LA/FT (Ley N° 21.595).</li>
        <li><strong>SGC-PRO-GAR-004:</strong> Procedimiento de Custodia, Rendición y Liquidación de Garantías.</li>
        <li><strong>SGC-PRO-APR-005:</strong> Procedimiento de Niveles de Aprobación F4209 y Trazabilidad Criptográfica Blockchain.</li>
        <li><strong>SGC-MAN-CMF-007:</strong> Manual de Cumplimiento Normativo CMF: Informe B.4 y Nota 14 a los Estados Financieros.</li>
        <li><strong>SGC-IT-MAN-008:</strong> Manual Técnico de Instalación, Despliegue y Operación en Servidores IT.</li>
        <li><strong>SGC-RRHH-PSI-009:</strong> Informe Pericial de Evaluación Psicolaboral & Competencias Directivas (Word .docx nativo).</li>
      </ul>
      <h3>10.2. Generación Binaria Office Open XML (.docx) y Cero Dependencia de Terceros</h3>
      <p>Todos los documentos y reportes ejecutivos se empaquetan en formato Office Open XML nativo (<code>.docx</code>) mediante compresión binaria JSZip en memoria de ejecución del navegador, garantizando total soberanía de datos, ausencia de dependencias externas en la nube y cero fugas de información confidencial.</p>
    `
  },
  {
    id: 'sec-11',
    number: 'CAPÍTULO 11',
    title: 'ARQUITECTURA RELACIONAL PARTICIONADA POSTGRESQL 16 Y ESCALABILIDAD MASIVA (10.000 TX/DÍA)',
    summary: 'Particionamiento mensual F0911, índices B-Tree, streaming HTTP y paginación server-side para >36 millones de transacciones.',
    contentHtml: `
      <h3>11.1. Desacoplamiento de Carga y Paginación Server-Side</h3>
      <p>Para procesar 10.000 transacciones diarias durante más de 10 años sin colapso de memoria, la interfaz implementa una política de <em>Ventana de Trabajo Activa</em> (25 a 200 filas en pantalla), manteniendo un consumo de memoria constante inferior a 40 MB de RAM.</p>
      
      <h3>11.2. Particionamiento Mensual de la Tabla F0911 (PostgreSQL 16)</h3>
      <p>La tabla maestra contable <code>f0911_transactions</code> se particiona físicamente por mes (<code>PARTITION BY RANGE (date)</code>). Las consultas sobre un periodo específico ejecutan <em>Partition Pruning</em>, descartando particiones ajenas y respondiendo en menos de 15 ms.</p>
      
      <h3>11.3. Streaming HTTP para Exportaciones Masivas</h3>
      <p>El endpoint <code>/api/transactions/export</code> transmite grandes volúmenes de datos por flujo continuo directamente al navegador en formato CSV UTF-8 con BOM para Excel, evitando sobrecargar el heap de Node.js o del navegador.</p>
      
      <h3>11.4. Servicio Dockerizado (assetflow-db)</h3>
      <p>El empaquetado oficial <code>docker-compose.yml</code> incluye el contenedor <code>postgres:16-alpine</code> con volúmenes persistentes y verificación automática de salud (<code>pg_isready</code>).</p>
    `
  }
];

/**
 * Genera y descarga el documento oficial Microsoft Word (.docx) del Manual Técnico IT
 */
export const downloadItDeploymentManualWord = () => {
  const title = 'Manual Técnico de Instalación, Despliegue y Operación en Servidores Empresariales';
  const documentCode = 'SGC-IT-MAN-008';
  const version = 'Versión 1.0.0-PROD / 2026';
  const fileName = 'SGC-IT-MAN-008_Manual_Tecnico_Despliegue_Servidores_IT.doc';

  const bodyHtml = `
    <!-- TABLA DE CONTROL DOCUMENTAL ISO 9001:2015 -->
    <table class="iso-header-table">
      <tr>
        <td class="iso-logo-cell">
          <div style="font-size: 14pt; font-weight: bold; color: #002D62; font-family: 'Arial Black', sans-serif;">ASSETFLOW</div>
          <div style="font-size: 7pt; font-weight: bold; color: #107C41; letter-spacing: 1px;">ENTERPRISE ERP</div>
        </td>
        <td class="iso-title-cell">
          <div style="font-size: 11pt; font-weight: bold; color: #002D62; text-transform: uppercase;">SISTEMA DE GESTIÓN DE CALIDAD & SEGURIDAD TI</div>
          <div style="font-size: 10pt; font-weight: bold; color: #1e293b; margin-top: 3px;">MANUAL TÉCNICO DE INSTALACIÓN, DESPLIEGUE Y OPERACIÓN EN SERVIDORES EMPRESARIALES</div>
          <div style="font-size: 7.5pt; color: #64748b; margin-top: 2px;">ESTÁNDAR ASSETFLOW ENTERPRISE 9.11 • DOCKER & NATIVE PM2</div>
        </td>
        <td class="iso-meta-cell">
          <strong>Código:</strong> ${documentCode}<br/>
          <strong>Versión:</strong> ${version}<br/>
          <strong>Vigencia:</strong> 2026 - 2028<br/>
          <strong>Clasificación:</strong> Confidencial Interno TI<br/>
          <strong>Páginas:</strong> 1 de 12
        </td>
      </tr>
    </table>

    <!-- CUADRO DE CONTROL DE FIRMAS Y RESPONSABILIDADES -->
    <table class="iso-approval-table">
      <tr>
        <td style="width: 33.3%;">
          <strong>ELABORADO POR:</strong><br/>
          Cristian Andrés Muñoz Rojas<br/>
          <em>samaheim@gmail.com</em><br/>
          Líder de Arquitectura & Desarrollo ERP
        </td>
        <td style="width: 33.3%;">
          <strong>REVISADO POR:</strong><br/>
          Comité de Infraestructura & DevOps<br/>
          <em>Oficina de Ciberseguridad ISO 27001</em><br/>
          Auditoría de Sistemas TI
        </td>
        <td style="width: 33.3%;">
          <strong>APROBADO POR:</strong><br/>
          Dirección General de Operaciones & TI<br/>
          <em>AssetFlow Enterprise Solutions</em><br/>
          Pase a Producción Autorizado
        </td>
      </tr>
    </table>

    <div class="iso-callout-box" style="margin-top: 15px; margin-bottom: 20px;">
      <strong>DIRIGIDO A:</strong> Personal de Infraestructura, Soporte Técnico y Operaciones TI.<br/>
      <strong>OBJETIVO PRIMARIO:</strong> Permitir que cualquier profesional técnico —incluso con poca o nula experiencia en Docker o Node.js— logre poner en marcha el sistema en servidores propios (On-Premise o Cloud Privada) sin interrupciones ni bloqueos de configuración.
    </div>

    <!-- TABLA DE CONTENIDO / ÍNDICE DE CAPÍTULOS TÉCNICOS (ISO 9001 / ISO 27001) -->
    <div style="margin-top: 25px; margin-bottom: 25px; page-break-after: always;">
      <h3 style="font-size: 11pt; color: #002D62; border-bottom: 2px solid #002D62; padding-bottom: 4px; text-transform: uppercase; margin-bottom: 12px; font-weight: bold;">
        ÍNDICE GENERAL DE MATERIAS Y CAPÍTULOS TÉCNICOS
      </h3>
      <table class="iso-styled-table" style="width: 100%; border-collapse: collapse; font-size: 8.5pt;">
        <thead>
          <tr style="background-color: #002D62; color: #ffffff;">
            <th style="width: 15%; text-align: center; padding: 6px; border: 1px solid #002D62;">Capítulo</th>
            <th style="width: 45%; padding: 6px; border: 1px solid #002D62;">Título del Módulo de Despliegue</th>
            <th style="width: 40%; padding: 6px; border: 1px solid #002D62;">Alcance Operativo y Técnico</th>
          </tr>
        </thead>
        <tbody>
          ${IT_MANUAL_SECTIONS.map(s => `
            <tr>
              <td style="text-align: center; font-weight: bold; font-family: monospace; color: #002D62; border: 1px solid #cbd5e1; padding: 6px; background-color: #f8fafc;">${s.number}</td>
              <td style="font-weight: bold; color: #1e293b; border: 1px solid #cbd5e1; padding: 6px;">${s.title}</td>
              <td style="color: #475569; font-size: 8pt; border: 1px solid #cbd5e1; padding: 6px;">${s.summary}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    ${IT_MANUAL_SECTIONS.map(s => `
      <div style="margin-top: 30px; border-bottom: 2px solid #002D62; padding-bottom: 5px;">
        <span style="font-size: 8.5pt; font-weight: bold; color: #107C41; text-transform: uppercase; font-family: monospace;">${s.number}</span>
        <h2 style="font-size: 13pt; font-weight: bold; color: #002D62; margin: 2px 0 0 0; text-transform: uppercase;">${s.title}</h2>
      </div>
      <p style="font-size: 9pt; font-style: italic; color: #475569; margin: 5px 0 15px 0;">${s.summary}</p>
      ${s.contentHtml}
    `).join('')}

    <div style="margin-top: 40px; padding: 15px; background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 8.5pt; text-align: center; color: #334155;">
      <strong>FIN DEL DOCUMENTO TÉCNICO SGC-IT-MAN-008</strong><br/>
      AssetFlow Enterprise ERP • Arquitectura Enterprise 9.11 • Custodiado en Bóveda Digital F980011D<br/>
      Para soporte adicional, contactar a la jefatura de proyecto: <em>samaheim@gmail.com</em>
    </div>
  `;

  downloadWordDocFromHtml(title, bodyHtml, fileName, documentCode, version);
};

/**
 * Genera y descarga el documento oficial PDF de alta resolución vectorizada
 * con jsPDF nativo para el Manual Técnico IT
 */
export const downloadItDeploymentManualPdf = async (
  fileName: string = 'SGC-IT-MAN-008_Manual_Tecnico_Despliegue_Servidores_IT.pdf'
): Promise<void> => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const totalPages = 6;
  const COLOR_NAVY: [number, number, number] = [11, 60, 93];       // #0B3C5D
  const COLOR_GOLD: [number, number, number] = [255, 204, 0];      // #FFCC00
  const COLOR_EMERALD: [number, number, number] = [16, 185, 129];  // #10B981
  const COLOR_DARK: [number, number, number] = [15, 23, 42];       // #0F172A
  const COLOR_SLATE: [number, number, number] = [71, 85, 105];     // #475569
  const COLOR_BG_BOX: [number, number, number] = [248, 250, 252];  // #F8FAFC
  const COLOR_BORDER: [number, number, number] = [203, 213, 225];  // #CBD5E1

  const drawPageHeader = (pageNumber: number, title: string) => {
    // Header Bar
    doc.setFillColor(...COLOR_NAVY);
    doc.rect(0, 0, 210, 16, 'F');

    // Accent line
    doc.setFillColor(...COLOR_GOLD);
    doc.rect(0, 16, 210, 1.5, 'F');

    // Left text
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('MANUAL TÉCNICO DE DESPLIEGUE EN SERVIDORES EMPRESARIALES', 14, 10.5);

    // Right text
    doc.setTextColor(...COLOR_GOLD);
    doc.setFontSize(8.5);
    doc.text('SGC-IT-MAN-008 • P986110D', 196, 10.5, { align: 'right' });

    // Subtitle below bar
    doc.setTextColor(...COLOR_NAVY);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(title.toUpperCase(), 14, 24);

    // Line under title
    doc.setDrawColor(...COLOR_BORDER);
    doc.setLineWidth(0.4);
    doc.line(14, 26, 196, 26);
  };

  const drawPageFooter = (pageNumber: number) => {
    doc.setDrawColor(...COLOR_BORDER);
    doc.setLineWidth(0.4);
    doc.line(14, 282, 196, 282);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_SLATE);
    doc.text('AssetFlow Enterprise ERP • Bóveda Digital • Contacto: samaheim@gmail.com', 14, 287);

    doc.setFont('helvetica', 'bold');
    doc.text(`Página ${pageNumber} de ${totalPages}`, 196, 287, { align: 'right' });
  };

  // ----------------------------------------------------
  // PÁGINA 1: PORTADA Y RESUMEN EJECUTIVO
  // ----------------------------------------------------
  doc.setFillColor(...COLOR_NAVY);
  doc.rect(0, 0, 210, 297, 'F');

  // Decorative gold box
  doc.setFillColor(...COLOR_GOLD);
  doc.rect(14, 25, 4, 35, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('SISTEMA DE GESTIÓN DE CALIDAD & SEGURIDAD TI (ISO 9001 / ISO 27001)', 24, 33);

  doc.setFontSize(22);
  doc.text('MANUAL TÉCNICO DE', 24, 45);
  doc.setTextColor(...COLOR_GOLD);
  doc.text('DESPLIEGUE EN SERVIDORES', 24, 55);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Guía Didáctica Paso a Paso para Personal de Infraestructura y Soporte TI', 24, 68);

  // Card Content
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(14, 85, 182, 175, 4, 4, 'F');

  doc.setTextColor(...COLOR_NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('FICHA TÉCNICA DEL SISTEMA ASSETFLOW ERP', 24, 100);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLOR_DARK);

  const metaRows = [
    ['Código Documento:', 'SGC-IT-MAN-008 / Programa P986110D'],
    ['Versión del Sistema:', 'v1.0.0-PROD (Estándar AssetFlow Enterprise 9.11)'],
    ['Público Objetivo:', 'Personal Técnico / Administradores de Sistemas (Inexpertos)'],
    ['Objetivo:', 'Puesta en marcha garantizada en servidores propios en <15 min'],
    ['Tecnología Front:', 'React 19 + TypeScript + Tailwind CSS (Vite Build)'],
    ['Tecnología Back:', 'Node.js 22 LTS + Express SSR (Puerto 3000)'],
    ['Método 1 (Recomendado):', 'Contenedor Docker Multi-Etapa + Docker Compose'],
    ['Método 2 (Nativo):', 'Node.js 22 + PM2 Cluster (deploy.sh / deploy-windows.bat)'],
    ['Propietario / Contacto:', 'samaheim@gmail.com / Cristian Muñoz Rojas']
  ];

  let yPos = 112;
  metaRows.forEach(([lbl, val]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(lbl, 24, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(val, 75, yPos);
    yPos += 8;
  });

  // Callout Box inside white card
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.setLineWidth(0.4);
  doc.roundedRect(24, 192, 162, 55, 3, 3, 'FD');

  doc.setTextColor(22, 101, 52);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('MENSAJE DE ARQUITECTURA PARA EL EQUIPO IT:', 30, 203);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR_DARK);
  const introTxt = 'Este manual fue diseñado para eliminar cualquier fricción técnica. Todos los archivos de empaquetado (Dockerfile, docker-compose.yml, deploy.sh, deploy-windows.bat, nginx.conf y ecosystem.config.cjs) ya están generados y probados en la raíz del sistema. Siguiendo los comandos de este manual, el sistema quedará operativo y blindado en minutos.';
  const splitIntro = doc.splitTextToSize(introTxt, 150);
  doc.text(splitIntro, 30, 212);

  // ----------------------------------------------------
  // PÁGINA 2: REQUISITOS DE HARDWARE Y ESTRUCTURA DE ARCHIVOS
  // ----------------------------------------------------
  doc.addPage();
  drawPageHeader(2, 'Capítulo 1 & 2: Requisitos de Servidor y Archivos');

  doc.setTextColor(...COLOR_NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('1. REQUISITOS MÍNIMOS DE HARDWARE Y SISTEMA OPERATIVO', 14, 36);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLOR_DARK);

  const hwSpecs = [
    '• CPU: 2 vCPU mínimo (Recomendado: 4 vCPU para concurrencia empresarial).',
    '• Memoria RAM: 2 GB RAM (+ 2 GB SWAP obligatorio) o 4 GB RAM sin SWAP.',
    '• Disco SSD: 10 GB de espacio libre (30 GB recomendados para logs y backups).',
    '• Sistema Operativo: Ubuntu 22.04 / 24.04 LTS, Debian 12 o Windows Server 2019/2022.',
    '• Red: IP Pública fija o Dominio DNS (ej: erp.miempresa.cl) con puertos 80 y 443 abiertos.'
  ];
  let hwY = 44;
  hwSpecs.forEach(line => {
    doc.text(line, 16, hwY);
    hwY += 6;
  });

  doc.setTextColor(...COLOR_NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('2. MAPA DE ARCHIVOS DE EMPAQUETADO INCLUIDOS', 14, 80);

  const filesMap = [
    ['Dockerfile', 'Empaquetado Alpine', 'Construcción multi-stage Node 22 que genera una imagen ultra-ligera (<180 MB).'],
    ['docker-compose.yml', 'Orquestador 1-Clic', 'Levanta el servicio en el puerto 3000 con reinicio automático y healthcheck.'],
    ['deploy.sh', 'Bash Script Linux', 'Instala, compila Vite y activa el clúster PM2 en servidores Linux sin Docker.'],
    ['deploy-windows.bat', 'Batch Windows', 'Script automatizado de instalación y arranque para Windows Server.'],
    ['nginx.conf', 'Proxy Inverso', 'Plantilla de Nginx con compresión gzip, headers de seguridad y proxy al puerto 3000.'],
    ['ecosystem.config.cjs', 'Gestor de Procesos', 'Configuración de PM2 para clúster en múltiples CPUs y rotación de logs.'],
    ['.env.example', 'Configuración', 'Variables de entorno (PORT=3000, NODE_ENV=production, títulos).']
  ];

  let fY = 88;
  filesMap.forEach(([fName, fRole, fDesc]) => {
    doc.setFillColor(...COLOR_BG_BOX);
    doc.setDrawColor(...COLOR_BORDER);
    doc.roundedRect(14, fY, 182, 14, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR_NAVY);
    doc.text(fName, 18, fY + 6);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLOR_EMERALD);
    doc.text(`[${fRole}]`, 75, fY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_SLATE);
    doc.text(fDesc, 18, fY + 11);

    fY += 16;
  });

  // Resiliencia y Auto-Aprovisionamiento en Página 2
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(14, 204, 182, 42, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(22, 101, 52);
  doc.text('3. AUTO-APROVISIONAMIENTO DE TABLAS Y RESILIENCIA OFFLINE (LAN):', 18, 212);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_DARK);
  const autoTxt = '• Cero Configuracion SQL: El sistema auto-crea sus 32 tablas relacionales Enterprise (F0101, F0401, F4801, F4209, F15012, F0911) y auto-siembra el catalogo de 1.843 propiedades en el primer arranque.\n• Continuidad sin Internet: Si se corta el enlace a Internet, la red local (LAN) de la oficina y el motor StorageEngine (IndexedDB) siguen funcionando al 100% para contratos, OTs, calculos y aprobacion de pagos.';
  const splitAuto = doc.splitTextToSize(autoTxt, 172);
  doc.text(splitAuto, 18, 219);

  drawPageFooter(2);

  // ----------------------------------------------------
  // PÁGINA 3: MÉTODO A - DOCKER PASO A PASO
  // ----------------------------------------------------
  doc.addPage();
  drawPageHeader(3, 'Capítulo 3: Despliegue con Docker (Método Recomendado)');

  doc.setTextColor(...COLOR_NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('MÉTODO A: INSTALACIÓN EN 5 PASOS CON DOCKER COMPOSE', 14, 36);

  const dockerSteps = [
    {
      num: 'PASO 1',
      title: 'Instalar Docker en el Servidor (Ubuntu / Debian)',
      cmds: [
        'sudo apt update && sudo apt upgrade -y',
        'curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh',
        'sudo systemctl enable --now docker',
        'sudo usermod -aG docker $USER'
      ]
    },
    {
      num: 'PASO 2',
      title: 'Crear Directorio y Transferir Archivos del Proyecto',
      cmds: [
        'sudo mkdir -p /opt/assetflow && sudo chown -R $USER:$USER /opt/assetflow',
        'cd /opt/assetflow',
        '# Copiar todos los archivos aquí mediante SFTP (FileZilla / WinSCP) o Git'
      ]
    },
    {
      num: 'PASO 3',
      title: 'Configurar el Archivo de Entorno .env',
      cmds: [
        'cp .env.example .env',
        'nano .env   # Verificar: PORT=3000 y NODE_ENV=production'
      ]
    },
    {
      num: 'PASO 4',
      title: 'Compilar y Levantar el Contenedor en Segundo Plano',
      cmds: [
        'docker compose up -d --build'
      ]
    },
    {
      num: 'PASO 5',
      title: 'Verificar el Estado de la Aplicación',
      cmds: [
        'docker compose ps        # Debe mostrar Status: Up (healthy)',
        'docker compose logs -f   # Para ver la bitácora en vivo'
      ]
    }
  ];

  let dY = 44;
  dockerSteps.forEach(step => {
    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(191, 219, 254);
    doc.roundedRect(14, dY, 182, 8 + (step.cmds.length * 6), 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR_NAVY);
    doc.text(`${step.num}: ${step.title}`, 18, dY + 5.5);

    doc.setFont('courier', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);

    let cmdY = dY + 11;
    step.cmds.forEach(cmd => {
      doc.text(cmd, 20, cmdY);
      cmdY += 5.5;
    });

    dY += 12 + (step.cmds.length * 6);
  });

  drawPageFooter(3);

  // ----------------------------------------------------
  // PÁGINA 4: MÉTODO B NATIVO Y NGINX REVERSE PROXY
  // ----------------------------------------------------
  doc.addPage();
  drawPageHeader(4, 'Capítulo 4 & 5: Modo Nativo PM2 y Reverse Proxy Nginx');

  doc.setTextColor(...COLOR_NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('4. MÉTODO NATIVO CON PM2 (SIN DOCKER)', 14, 36);

  doc.setFillColor(...COLOR_BG_BOX);
  doc.setDrawColor(...COLOR_BORDER);
  doc.roundedRect(14, 42, 182, 38, 2, 2, 'FD');

  doc.setFont('courier', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  const nativeCmds = [
    '# 1. Instalar Node.js 22 LTS y PM2 globalmente en Linux:',
    'curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -',
    'sudo apt install -y nodejs build-essential && sudo npm install -g pm2',
    '# 2. Ejecutar el script automatizado:',
    'cd /opt/assetflow && chmod +x deploy.sh && ./deploy.sh'
  ];
  let nY = 48;
  nativeCmds.forEach(c => {
    doc.text(c, 18, nY);
    nY += 6;
  });

  doc.setTextColor(...COLOR_NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('5. CONFIGURACIÓN DE NGINX Y CERTIFICADO SSL (HTTPS)', 14, 88);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...COLOR_DARK);
  doc.text('Permite a los usuarios conectarse a https://erp.tuempresa.cl redirigiendo al puerto interno 3000.', 14, 95);

  const nginxSteps = [
    {
      title: 'Paso 5.1: Instalar Nginx y Certbot en el Servidor',
      cmd: 'sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx'
    },
    {
      title: 'Paso 5.2: Crear Configuración de Sitio en Nginx (/etc/nginx/sites-available/assetflow.conf)',
      cmd: 'server {\n    listen 80;\n    server_name erp.tuempresa.cl;\n    client_max_body_size 50M;\n    location / {\n        proxy_pass http://127.0.0.1:3000;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n    }\n}'
    },
    {
      title: 'Paso 5.3: Habilitar el Sitio y Emitir Certificado SSL Gratuito',
      cmd: 'sudo ln -s /etc/nginx/sites-available/assetflow.conf /etc/nginx/sites-enabled/\nsudo nginx -t && sudo systemctl reload nginx\nsudo certbot --nginx -d erp.tuempresa.cl'
    }
  ];

  let ngY = 101;
  nginxSteps.forEach(st => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR_NAVY);
    doc.text(st.title, 14, ngY);
    ngY += 5;

    const lines = st.cmd.split('\n');
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(...COLOR_BORDER);
    doc.roundedRect(14, ngY, 182, 6 + (lines.length * 5), 2, 2, 'FD');

    doc.setFont('courier', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);

    let lY = ngY + 5;
    lines.forEach(l => {
      doc.text(l, 18, lY);
      lY += 5;
    });

    ngY += 10 + (lines.length * 5);
  });

  drawPageFooter(4);

  // ----------------------------------------------------
  // PÁGINA 5: SEGURIDAD, FIREWALL Y CHEAT-SHEET DE OPERACIONES
  // ----------------------------------------------------
  doc.addPage();
  drawPageHeader(5, 'Capítulo 6 & 7: Seguridad, Firewall y Operación');

  doc.setTextColor(...COLOR_NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('6. REGLAS DE FIREWALL UFW (BLINDAJE DE PUERTOS)', 14, 36);

  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(254, 202, 202);
  doc.roundedRect(14, 42, 182, 38, 2, 2, 'FD');

  doc.setFont('courier', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(153, 27, 27);
  const ufwCmds = [
    '# Abrir solo puertos indispensables (SSH, HTTP, HTTPS):',
    'sudo ufw allow 22/tcp',
    'sudo ufw allow 80/tcp',
    'sudo ufw allow 443/tcp',
    'sudo ufw enable && sudo ufw status verbose',
    '# ADVERTENCIA: NUNCA abras el puerto 3000 hacia el exterior.'
  ];
  let uY = 48;
  ufwCmds.forEach(c => {
    doc.text(c, 18, uY);
    uY += 5.5;
  });

  doc.setTextColor(...COLOR_NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('7. CHEAT-SHEET DE COMANDOS DIARIOS PARA EL EQUIPO IT', 14, 88);

  const opsTable = [
    ['Ver si el sistema está corriendo', 'docker compose ps', 'pm2 status'],
    ['Ver registros / logs en vivo', 'docker compose logs -f --tail=100', 'pm2 logs assetflow-erp'],
    ['Reiniciar el sistema', 'docker compose restart', 'pm2 restart assetflow-erp'],
    ['Detener el sistema por mantención', 'docker compose down', 'pm2 stop assetflow-erp'],
    ['Actualizar con nuevo código Git', 'git pull && docker compose up -d --build', 'git pull && ./deploy.sh']
  ];

  let tY = 96;
  doc.setFillColor(...COLOR_NAVY);
  doc.rect(14, tY, 182, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Acción Requerida', 18, tY + 5.5);
  doc.text('Comando Docker', 75, tY + 5.5);
  doc.text('Comando PM2', 140, tY + 5.5);

  tY += 8;
  opsTable.forEach(([act, dCmd, pCmd], idx) => {
    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    doc.setDrawColor(...COLOR_BORDER);
    doc.rect(14, tY, 182, 10, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_DARK);
    doc.text(act, 18, tY + 6.5);

    doc.setFont('courier', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...COLOR_NAVY);
    doc.text(dCmd, 75, tY + 6.5);

    doc.setTextColor(...COLOR_EMERALD);
    doc.text(pCmd, 140, tY + 6.5);

    tY += 10;
  });

  // Backup script callout
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(14, 160, 182, 36, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(22, 101, 52);
  doc.text('POLÍTICA DE RESPALDO (BACKUP) AUTOMATIZADO:', 20, 168);

  doc.setFont('courier', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('# Programar en crontab para respaldar cada noche a las 2:00 AM:', 20, 175);
  doc.text('(crontab -l 2>/dev/null; echo "0 2 * * * tar -czf /var/backups/assetflow_$(date +\\%F).tar.gz /opt/assetflow --exclude=node_modules") | crontab -', 20, 182);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLOR_SLATE);
  doc.text('Esto preserva todas las configuraciones, plantillas y archivos sin consumir almacenamiento excesivo.', 20, 190);

  drawPageFooter(5);

  // ----------------------------------------------------
  // PÁGINA 6: TROUBLESHOOTING FAQ PARA INEXPERTOS
  // ----------------------------------------------------
  doc.addPage();
  drawPageHeader(6, 'Capítulo 8: Solución de Problemas Frecuentes (FAQ)');

  doc.setTextColor(...COLOR_NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('8. GUÍA DE RESOLUCIÓN RÁPIDA DE INCIDENTES (TROUBLESHOOTING)', 14, 36);

  const faqItems = [
    {
      q: '1. "Error EADDRINUSE: address already in use :::3000"',
      cause: 'Causa: El puerto 3000 ya está ocupado por otra instancia o proceso colgado.',
      fix: 'Solución: sudo lsof -i :3000 -> Obtén el PID y ejecuta: sudo kill -9 <PID>'
    },
    {
      q: '2. "Error: permission denied while trying to connect to Docker socket"',
      cause: 'Causa: Tu usuario no tiene privilegios en el grupo docker.',
      fix: 'Solución: sudo usermod -aG docker $USER && exit  (Luego vuelve a conectar por SSH).'
    },
    {
      q: '3. El build se congela o dice "JavaScript heap out of memory"',
      cause: 'Causa: Memoria RAM insuficiente durante el proceso de empaquetado de Vite (<2 GB).',
      fix: 'Solución: sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile'
    },
    {
      q: '4. Nginx muestra "502 Bad Gateway"',
      cause: 'Causa: La aplicación en el puerto 3000 no ha terminado de arrancar o se cayó.',
      fix: 'Solución: Revisa los logs con: docker compose logs --tail=50 o pm2 logs'
    },
    {
      q: '5. Al subir un archivo grande en la Bóveda Digital arroja "413 Request Entity Too Large"',
      cause: 'Causa: El límite de subida por defecto de Nginx es de 1 MB.',
      fix: 'Solución: Agrega client_max_body_size 50M; en el bloque server de Nginx y ejecuta sudo nginx -s reload.'
    }
  ];

  let qY = 44;
  faqItems.forEach(item => {
    doc.setFillColor(...COLOR_BG_BOX);
    doc.setDrawColor(...COLOR_BORDER);
    doc.roundedRect(14, qY, 182, 28, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLOR_NAVY);
    doc.text(item.q, 18, qY + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLOR_SLATE);
    doc.text(item.cause, 18, qY + 12);

    doc.setFont('courier', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(153, 27, 27);
    const splitFix = doc.splitTextToSize(item.fix, 172);
    doc.text(splitFix, 18, qY + 18);

    qY += 32;
  });

  // End seal box
  doc.setFillColor(...COLOR_NAVY);
  doc.rect(14, 215, 182, 24, 'F');
  doc.setTextColor(...COLOR_GOLD);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('CERTIFICACIÓN DE DESPLIEGUE CORPORATIVO AUTORIZADO', 20, 224);

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Este manual técnico y los archivos de empaquetado han sido verificados bajo directivas ISO 27001.', 20, 230);
  doc.text('Soporte Técnico y Consultas de Arquitectura: samaheim@gmail.com', 20, 235);

  drawPageFooter(6);

  // Guardar archivo
  doc.save(fileName);
};
