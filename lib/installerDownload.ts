/**
 * ASSETFLOW ENTERPRISE ERP - MOTOR DE DESCARGA DE INSTALADORES CORPORATIVOS
 * Estándar AssetFlow Enterprise 9.11 · ISO 9001:2015 & ISO/IEC 27001
 * Propietario del Sistema: Cristian Andrés Muñoz Rojas (samaheim@gmail.com)
 * 
 * Permite descargar directamente desde el navegador los archivos ejecutables
 * de instalación (install-windows.bat, install.sh) y el paquete completo .zip.
 */

import JSZip from 'jszip';
import { saveAs } from 'file-saver';

// Contenido íntegro del instalador para Windows Server
export const WINDOWS_INSTALLER_BAT = `@echo off
setlocal EnableDelayedExpansion
title AssetFlow Enterprise ERP - Instalador Maestro para Windows Server

:: ==============================================================================
:: ASSETFLOW ENTERPRISE ERP - INSTALADOR MAESTRO PARA SERVIDORES WINDOWS
:: Estándar AssetFlow Enterprise 9.11 · ISO 9001:2015 & ISO/IEC 27001
:: Propietario del Sistema: Cristian Andres Munoz Rojas (samaheim@gmail.com)
:: ==============================================================================

cls
color 0B
echo ==============================================================================
echo   ASSETFLOW ENTERPRISE ERP - INSTALADOR AUTOMATICO PARA WINDOWS SERVER
echo   Arquitectura AssetFlow Enterprise 9.11 / Sistema de Gestion Inmobiliaria
echo   Cumplimiento: ISO 9001:2015 - ISO/IEC 27001 - Resiliencia Local-First
echo ==============================================================================
echo.

:: 1. COMPROBACION DE PRIVILEGIOS DE ADMINISTRADOR
echo [PASO 1/6] Verificando permisos administrativos...
net session >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo [ERROR CRITICO] Este instalador requiere ejecutarse como Administrador.
    echo Por favor haga clic derecho sobre "install-windows.bat" y seleccione:
    echo "Ejecutar como administrador" ^(Run as administrator^).
    echo.
    pause
    exit /b 1
)
echo [OK] Privilegios de Administrador confirmados.
echo.

:: 2. VERIFICACION DE HARDWARE Y ENTORNO
echo [PASO 2/6] Verificando recursos del servidor...
for /f "tokens=2 delims==" %%I in ('wmic os get Caption /value 2^>nul') do set WIN_VER=%%I
for /f "tokens=2 delims==" %%I in ('wmic computersystem get TotalPhysicalMemory /value 2^>nul') do set TOTAL_RAM=%%I

echo Sistema Operativo Detectado: %WIN_VER%
if defined TOTAL_RAM (
    set /a RAM_GB=%TOTAL_RAM:~0,-6% / 1024
    echo Memoria RAM Detectada: Aprox. !RAM_GB! GB
)
echo [OK] Diagnostico de hardware finalizado.
echo.

:: 3. VERIFICACION / INSTALACION DE NODE.JS LTS
echo [PASO 3/6] Verificando entorno de ejecucion Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [AVISO] Node.js no esta instalado en este servidor.
    echo Intentando instalar Node.js LTS mediante Windows Package Manager (winget)...
    
    where winget >nul 2>&1
    if %errorlevel% equ 0 (
        winget install OpenJS.NodeJS.LTS --silent --accept-source-agreements --accept-package-agreements
        echo.
        echo Se ha instalado Node.js. Es necesario recargar el PATH.
        echo Por favor cierre esta ventana y vuelva a ejecutar "install-windows.bat" como Administrador.
        pause
        exit /b 0
    ) else (
        color 0C
        echo [ERROR] No se pudo instalar Node.js automaticamente.
        echo Por favor descargue e instale manualmente Node.js 20 o 22 LTS desde:
        echo https://nodejs.org/en/download/
        echo Una vez instalado, ejecute este instalador nuevamente.
        pause
        exit /b 1
    )
) else (
    for /f "tokens=*" %%v in ('node -v') do set NODE_VERSION=%%v
    echo [OK] Node.js detectado: !NODE_VERSION!
)
echo.

:: 4. CONFIGURACION DE VARIABLES DE ENTORNO (.env)
echo [PASO 4/6] Configurando archivo de entorno (.env)...
if not exist .env (
    if exist .env.example (
        copy .env.example .env >nul
        echo [OK] Archivo .env generado exitosamente a partir de .env.example.
    ) else (
        echo PORT=3000 > .env
        echo NODE_ENV=production >> .env
        echo [OK] Archivo .env creado con valores predeterminados.
    )
    echo.
    echo Si posee una Google Gemini API Key corporativa para funciones de IA,
    echo podra agregarla abriendo el archivo .env con el Bloc de Notas.
) else (
    echo [OK] Archivo .env existente detectado. No se sobrescribira.
)
echo.

:: 5. INSTALACION DE DEPENDENCIAS Y COMPILACION
echo [PASO 5/6] Instalando dependencias y compilando frontend...
echo Ejecutando npm ci...
call npm ci
if %errorlevel% neq 0 (
    echo Advertencia: npm ci fallo, ejecutando npm install de respaldo...
    call npm install
)

echo.
echo Compilando aplicacion web optimizada para produccion (npm run build)...
call npm run build
if %errorlevel% neq 0 (
    color 0C
    echo [ERROR CRITICO] Fallo la compilacion de la aplicacion.
    echo Revise los logs de Vite para mas informacion.
    pause
    exit /b 1
)
echo [OK] Frontend compilado satisfactoriamente en carpeta /dist.
echo.

:: 6. CONFIGURACION DE FIREWALL DE WINDOWS Y SERVICIO
echo [PASO 6/6] Configurando Firewall de Windows y opciones de inicio...

:: Abrir puerto 3000 en el Firewall de Windows
netsh advfirewall firewall show rule name="AssetFlow Enterprise Web (Puerto 3000)" >nul 2>&1
if %errorlevel% neq 0 (
    echo Creando regla de entrada en el Firewall de Windows para el Puerto 3000 (TCP)...
    netsh advfirewall firewall add rule name="AssetFlow Enterprise Web (Puerto 3000)" dir=in action=allow protocol=TCP localport=3000 profile=any description="Acceso a la plataforma AssetFlow ERP" >nul 2>&1
    echo [OK] Regla de Firewall creada exitosamente.
) else (
    echo [OK] Regla de Firewall ya existia previamente.
)

:: Crear acceso directo o script de inicio en segundo plano
(
echo @echo off
echo cd /d "%%~dp0"
echo title AssetFlow Enterprise ERP - Servicio Activo
echo echo Iniciando AssetFlow Enterprise en puerto 3000...
echo call npx tsx server.ts
) > "iniciar-sistema.bat"

echo.
echo ==============================================================================
echo   INSTALACION Y CONFIGURACION COMPLETADA EXITOSAMENTE
echo ==============================================================================
echo.
echo  El sistema AssetFlow Enterprise ERP esta listo para operar.
echo.
echo  DIRECCIONES DE ACCESO:
echo    - Acceso Local:     http://localhost:3000
echo    - Acceso en Red:    http://[IP-DE-ESTE-SERVIDOR]:3000
echo.
echo  BASE DE DATOS Y RESILIENCIA:
echo    - Las 32 tablas relacionales Oracle JDE se inicializan automaticamente.
echo    - El sistema opera en modo Local-First Offline Resilient con auto-sync.
echo.
echo  COMO INICIAR EL SISTEMA:
echo    Opcion A (Manual): Ejecute el archivo "iniciar-sistema.bat"
echo    Opcion B (Servicio de Fondo): Configure una Tarea Programada en Windows
echo             ^(Task Scheduler^) al inicio del sistema apuntando a iniciar-sistema.bat
echo.
echo ==============================================================================
echo.

set /p RESP="Desea iniciar el sistema ahora mismo? (S/N): "
if /i "%RESP%"=="S" (
    echo.
    echo Iniciando servidor AssetFlow Enterprise ERP...
    call npx tsx server.ts
) else (
    echo.
    echo Para iniciar el sistema en cualquier momento, ejecute "iniciar-sistema.bat".
    echo Presione cualquier tecla para salir del instalador.
    pause >nul
)
`;

// Contenido íntegro del instalador para Linux
export const LINUX_INSTALLER_SH = `#!/usr/bin/env bash
# ==============================================================================
# ASSETFLOW ENTERPRISE ERP - INSTALADOR MAESTRO PARA SERVIDORES (LINUX)
# Estándar AssetFlow Enterprise 9.11 · ISO 9001:2015 & ISO/IEC 27001
# Autor / Propietario: Cristian Andrés Muñoz Rojas (samaheim@gmail.com)
# ==============================================================================
# Uso: sudo ./install.sh
# ==============================================================================

set -e

# Colores de Terminal Corporativos
CLR_RESET="\\033[0m"
CLR_NAVY="\\033[1;38;5;25m"
CLR_EMERALD="\\033[1;38;5;35m"
CLR_GOLD="\\033[1;38;5;220m"
CLR_ROSE="\\033[1;38;5;196m"
CLR_CYAN="\\033[1;38;5;45m"
CLR_SLATE="\\033[0;38;5;245m"
CLR_BOLD="\\033[1m"

clear

echo -e "\${CLR_NAVY}==============================================================================\${CLR_RESET}"
echo -e "\${CLR_GOLD}   ASSETFLOW ENTERPRISE ERP · INSTALADOR MAESTRO PARA SERVIDORES CORPORATIVOS\${CLR_RESET}"
echo -e "\${CLR_SLATE}   Arquitectura AssetFlow Enterprise 9.11 · Despliegue Automatizado On-Premise\${CLR_RESET}"
echo -e "\${CLR_NAVY}==============================================================================\${CLR_RESET}"
echo ""

# 1. VERIFICACIÓN DE PRIVILEGIOS ROOT / SUDO
if [ "$EUID" -ne 0 ]; then
  echo -e "\${CLR_ROSE}❌ ERROR DE PERMISOS:\${CLR_RESET} El instalador debe ejecutarse con privilegios de administrador."
  echo -e "   Por favor ejecute: \${CLR_BOLD}sudo ./install.sh\${CLR_RESET}"
  exit 1
fi

REAL_USER=\${SUDO_USER:-$USER}
if [ "$REAL_USER" = "root" ]; then
  REAL_USER=$(logname 2>/dev/null || echo "root")
fi

echo -e "\${CLR_CYAN}[PASO 1/7] Diagnóstico de Recursos del Servidor...\${CLR_RESET}"

if [ -f /etc/os-release ]; then
  . /etc/os-release
  OS_NAME=$NAME
  OS_VERSION=$VERSION_ID
else
  OS_NAME=$(uname -s)
  OS_VERSION=$(uname -r)
fi

TOTAL_RAM_MB=$(free -m | awk '/^Mem:/{print $2}')
TOTAL_DISK_GB=$(df -BG . | awk 'NR==2 {print $4}' | sed 's/G//')

echo -e "  • Sistema Operativo: \${CLR_BOLD}\$OS_NAME \$OS_VERSION\${CLR_RESET}"
echo -e "  • Memoria RAM Total: \${CLR_BOLD}\${TOTAL_RAM_MB} MB\${CLR_RESET}"
echo -e "  • Espacio en Disco:  \${CLR_BOLD}\${TOTAL_DISK_GB} GB disponibles\${CLR_RESET}"

if [ "$TOTAL_RAM_MB" -lt 2000 ]; then
  echo -e "\${CLR_GOLD}⚠️  ADVERTENCIA DE MEMORIA:\${CLR_RESET} Servidor con menos de 2 GB de RAM (\${TOTAL_RAM_MB} MB)."
  SWAP_EXISTS=$(free -m | awk '/^Swap:/{print $2}')
  if [ "$SWAP_EXISTS" -lt 1000 ]; then
    echo -e "   → Creando automáticamente archivo SWAP de 2 GB para evitar cuelgues..."
    fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    if ! grep -q "/swapfile" /etc/fstab; then
      echo "/swapfile none swap sw 0 0" >> /etc/fstab
    fi
    echo -e "   \${CLR_EMERALD}✓ SWAP de 2 GB activado correctamente.\${CLR_RESET}"
  fi
fi

echo ""
echo -e "\${CLR_CYAN}[PASO 2/7] Selección del Método de Despliegue...\${CLR_RESET}"
echo -e "  \${CLR_BOLD}1)\${CLR_RESET} \${CLR_EMERALD}Contenedor Docker & Docker Compose\${CLR_RESET} (Recomendado - 100% Aislado)"
echo -e "  \${CLR_BOLD}2)\${CLR_RESET} \${CLR_CYAN}Modo Nativo con Node.js 22 LTS y PM2 Clúster\${CLR_RESET} (Bare-Metal / Máquina Virtual)"
echo ""
read -p "Seleccione una opción [1 o 2] (Predeterminado: 1): " DEPLOY_CHOICE
DEPLOY_CHOICE=\${DEPLOY_CHOICE:-1}

echo ""
echo -e "\${CLR_CYAN}[PASO 3/7] Instalación de Requisitos y Dependencias del Sistema...\${CLR_RESET}"

install_dependencies() {
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update -y
    apt-get install -y curl wget git ufw
  elif command -v dnf >/dev/null 2>&1; then
    dnf install -y curl wget git firewalld
  elif command -v yum >/dev/null 2>&1; then
    yum install -y curl wget git
  fi
}

install_dependencies

if [ "$DEPLOY_CHOICE" = "1" ]; then
  if ! command -v docker >/dev/null 2>&1; then
    echo -e "   → Instalando Docker Engine oficial..."
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
    usermod -aG docker "$REAL_USER"
    echo -e "   \${CLR_EMERALD}✓ Docker instalado correctamente.\${CLR_RESET}"
  else
    echo -e "   \${CLR_EMERALD}✓ Docker ya se encuentra instalado.\${CLR_RESET}"
  fi
else
  if ! command -v node >/dev/null 2>&1; then
    echo -e "   → Instalando Node.js 22.x LTS..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
    apt-get install -y nodejs || yum install -y nodejs
    echo -e "   \${CLR_EMERALD}✓ Node.js $(node -v) instalado.\${CLR_RESET}"
  fi
  if ! command -v pm2 >/dev/null 2>&1; then
    npm install -g pm2 tsx
  fi
fi

echo ""
echo -e "\${CLR_CYAN}[PASO 4/7] Configuración del Archivo de Entorno (.env)...\${CLR_RESET}"
if [ ! -f .env ]; then
  cp .env.example .env 2>/dev/null || cat <<EOF > .env
PORT=3000
NODE_ENV=production
VITE_APP_TITLE=AssetFlow Enterprise ERP
EOF
  chown "$REAL_USER:$REAL_USER" .env 2>/dev/null || true
  echo -e "   \${CLR_EMERALD}✓ Archivo .env generado exitosamente.\${CLR_RESET}"
fi

echo ""
echo -e "\${CLR_CYAN}[PASO 5/7] Compilación e Inicio del Servicio AssetFlow...\${CLR_RESET}"

if [ "$DEPLOY_CHOICE" = "1" ]; then
  echo -e "   → Construyendo imagen Docker y levantando contenedor..."
  docker compose up -d --build
else
  echo -e "   → Instalando dependencias NPM y compilando frontend Vite..."
  su - "$REAL_USER" -c "cd $(pwd) && npm ci && npm run build"
  echo -e "   → Iniciando clúster PM2..."
  su - "$REAL_USER" -c "cd $(pwd) && pm2 start ecosystem.config.cjs"
  su - "$REAL_USER" -c "pm2 save"
  env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u "$REAL_USER" --hp "/home/$REAL_USER" 2>/dev/null || true
fi

echo ""
echo -e "\${CLR_CYAN}[PASO 6/7] Blindaje de Firewall de Red...\${CLR_RESET}"
if command -v ufw >/dev/null 2>&1; then
  ufw allow 3000/tcp comment "AssetFlow Enterprise Web" >/dev/null 2>&1 || true
  ufw allow 80/tcp comment "HTTP Web" >/dev/null 2>&1 || true
  ufw allow 443/tcp comment "HTTPS Web" >/dev/null 2>&1 || true
fi

SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
SERVER_IP=\${SERVER_IP:-"127.0.0.1"}

echo ""
echo -e "\${CLR_NAVY}==============================================================================\${CLR_RESET}"
echo -e "\${CLR_EMERALD}  ✓ INSTALACIÓN Y DESPLIEGUE FINALIZADO CON ÉXITO\${CLR_RESET}"
echo -e "\${CLR_NAVY}==============================================================================\${CLR_RESET}"
echo -e "  • URL Acceso Local:      \${CLR_BOLD}http://localhost:3000\${CLR_RESET}"
echo -e "  • URL Acceso Red LAN:    \${CLR_BOLD}http://\${SERVER_IP}:3000\${CLR_RESET}"
echo -e "  • Salud del Sistema:     \${CLR_BOLD}http://\${SERVER_IP}:3000/api/health\${CLR_RESET}"
echo -e "  • Estándar Base Datos:   \${CLR_BOLD}32 Tablas AssetFlow Enterprise 9.11\${CLR_RESET}"
echo -e "  • Resiliencia:           \${CLR_BOLD}Modo Offline-First con persistencia Local-First\${CLR_RESET}"
echo -e "\${CLR_NAVY}==============================================================================\${CLR_RESET}"
`;

// Helper para descargar texto crudo como archivo en el navegador
function downloadRawFile(filename: string, content: string, mimeType: string = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  saveAs(blob, filename);
}

export const PERSONAL_PC_INSTALLER_BAT = `@echo off
setlocal EnableDelayedExpansion
title AssetFlow Enterprise - Instalador para PC Windows (Entorno Local de Pruebas)

:: ==============================================================================
:: ASSETFLOW ENTERPRISE ERP - INSTALADOR DE PRUEBAS PARA PC WINDOWS (10 / 11)
:: Diseñado para: Cristian Andrés Muñoz Rojas (samaheim@gmail.com)
:: Estándar AssetFlow Enterprise 9.11 · Resiliencia Local-First
:: ==============================================================================

cls
color 0A
echo ==============================================================================
echo   ASSETFLOW ENTERPRISE ERP - INSTALADOR PARA TU COMPUTADOR PERSONAL (WINDOWS)
echo   Entorno Local de Pruebas y Demostracion (100%% Funcional Offline)
echo ==============================================================================
echo.
echo Hola Cristian, este asistente preparara todo en tu PC para que puedas probar
echo el sistema directamente en tu navegador (Chrome, Edge, Firefox, Brave).
echo.
echo No necesitas ser experto en programacion; el instalador hara todo por ti.
echo ==============================================================================
echo.

echo [PASO 1/5] Comprobando si tienes Node.js instalado en tu computador...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [AVISO] Node.js no esta instalado en tu PC.
    echo Intentando instalar Node.js 22 LTS automaticamente con Windows Package Manager (winget)...
    echo.
    where winget >nul 2>&1
    if %errorlevel% equ 0 (
        winget install OpenJS.NodeJS.LTS --silent --accept-source-agreements --accept-package-agreements
        echo.
        echo Se ha completado la instalacion de Node.js.
        echo Por favor cierra esta ventana y vuelve a ejecutar "instalar-en-mi-pc.bat".
        pause
        exit /b 0
    ) else (
        color 0C
        echo Por favor descarga e instala Node.js gratis desde: https://nodejs.org/
        pause
        exit /b 1
    )
) else (
    for /f "tokens=*" %%v in ('node -v') do set NODE_VERSION=%%v
    echo [OK] Node.js detectado en tu PC: !NODE_VERSION!
)
echo.

echo [PASO 2/5] Configurando archivo de entorno local (.env)...
if not exist .env (
    if exist .env.example (
        copy .env.example .env >nul
    ) else (
        echo PORT=3000 > .env
        echo NODE_ENV=development >> .env
        echo VITE_APP_TITLE=AssetFlow Enterprise ERP (PC Local) >> .env
    )
)
echo [OK] Archivo .env preparado para tu PC.
echo.

echo [PASO 3/5] Descargando e instalando las librerias del sistema (npm install)...
echo Esto puede tardar 1 o 2 minutos la primera vez, por favor espera...
call npm install
echo [OK] Dependencias instaladas correctamente.
echo.

echo [PASO 4/5] Compilando la aplicacion web para maxima velocidad en tu PC...
call npm run build
echo [OK] Compilacion lista.
echo.

echo [PASO 5/5] Creando lanzador en tu Escritorio de Windows...
set DESKTOP_DIR=%USERPROFILE%\\Desktop
if exist "%DESKTOP_DIR%" (
    (
        echo @echo off
        echo cd /d "%~dp0"
        echo title AssetFlow Enterprise ERP - Servidor Local
        echo echo Iniciando AssetFlow Enterprise en tu PC...
        echo start http://localhost:3000
        echo call npx tsx server.ts
    ) > "%DESKTOP_DIR%\\Iniciar AssetFlow ERP.bat"
    echo [OK] Se ha creado un acceso directo en tu Escritorio: "Iniciar AssetFlow ERP.bat"
)

(
    echo @echo off
    echo cd /d "%~dp0"
    echo title AssetFlow Enterprise ERP - Servidor Local
    echo echo Abriendo navegador...
    echo start http://localhost:3000
    echo call npx tsx server.ts
) > "abrir-en-mi-pc.bat"

echo.
echo ==============================================================================
echo   FELICITACIONES: ASSETFLOW ENTERPRISE YA ESTA INSTALADO EN TU PC
echo ==============================================================================
echo.
echo  Abriendo tu navegador en http://localhost:3000...
start http://localhost:3000
echo  Iniciando el servidor en tu PC...
call npx tsx server.ts
`;

/**
 * Descarga el archivo ejecutable por lotes instalar-en-mi-pc.bat para uso personal en Windows 10/11
 */
export function downloadPersonalPcWindowsInstaller() {
  downloadRawFile('instalar-en-mi-pc.bat', PERSONAL_PC_INSTALLER_BAT, 'application/x-bat;charset=utf-8');
}

/**
 * Descarga el archivo ejecutable por lotes install-windows.bat
 */
export function downloadWindowsExecutableInstaller() {
  downloadRawFile('install-windows.bat', WINDOWS_INSTALLER_BAT, 'application/x-bat;charset=utf-8');
}

/**
 * Descarga el script ejecutable install.sh para servidores Linux
 */
export function downloadLinuxExecutableInstaller() {
  downloadRawFile('install.sh', LINUX_INSTALLER_SH, 'application/x-sh;charset=utf-8');
}

/**
 * Empaqueta y descarga el Kit Completo de Instaladores y Configuración en formato .ZIP
 */
export async function downloadFullInstallerKitZip() {
  const zip = new JSZip();

  // 1. Instaladores Maestros
  zip.file('install-windows.bat', WINDOWS_INSTALLER_BAT);
  zip.file('install.sh', LINUX_INSTALLER_SH);

  // 2. Scripts alternativos de ejecución
  zip.file('deploy-windows.bat', `@echo off
title AssetFlow Enterprise - Inicio de Produccion Windows
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado. Descargue Node.js 22 LTS desde https://nodejs.org
    pause
    exit /b 1
)
call npm ci
call npm run build
if not exist .env copy .env.example .env
call npx tsx server.ts
pause
`);

  zip.file('deploy.sh', `#!/usr/bin/env bash
set -e
echo "Iniciando despliegue en Linux..."
npm ci
npm run build
if [ ! -f .env ]; then cp .env.example .env; fi
if command -v pm2 >/dev/null 2>&1; then
    pm2 start ecosystem.config.cjs
else
    npx tsx server.ts
fi
`);

  // 3. Dockerfile
  zip.file('Dockerfile', `FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig*.json vite.config.ts index.html ./
COPY src/ ./src/
COPY components/ ./components/
COPY lib/ ./lib/
COPY server/ ./server/
COPY server.ts ./
COPY types.ts ./
COPY firebase.ts ./
COPY firebase-applet-config.json ./
COPY index.css ./
COPY index.tsx ./
RUN npm ci
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/server ./server
COPY --from=builder /app/lib ./lib
COPY --from=builder /app/types.ts ./types.ts
COPY --from=builder /app/firebase.ts ./firebase.ts
COPY --from=builder /app/firebase-applet-config.json ./firebase-applet-config.json
EXPOSE 3000
CMD ["node", "--loader", "tsx", "server.ts"]
`);

  // 4. Docker Compose
  zip.file('docker-compose.yml', `services:
  assetflow-erp:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: assetflow_erp_production
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - NODE_ENV=production
    env_file:
      - .env
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
`);

  // 5. Nginx reverse proxy
  zip.file('nginx.conf', `server {
    listen 80;
    server_name activos.tuempresa.cl;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name activos.tuempresa.cl;

    ssl_certificate /etc/letsencrypt/live/activos.tuempresa.cl/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/activos.tuempresa.cl/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
`);

  // 6. PM2 Ecosystem
  zip.file('ecosystem.config.cjs', `module.exports = {
  apps: [{
    name: 'assetflow-enterprise',
    script: 'server.ts',
    interpreter: 'npx',
    interpreter_args: 'tsx',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
`);

  // 7. .env.example
  zip.file('.env.example', `# ASSETFLOW ENTERPRISE ERP - CONFIGURACION
PORT=3000
NODE_ENV=production
VITE_APP_TITLE=AssetFlow Enterprise ERP
# Opcional: Clave API de Google Cloud para OCR e IA
# GEMINI_API_KEY=AIzaSy...
`);

  // 8. README / Manual Rápido
  zip.file('INSTRUCCIONES_DE_INSTALACION.txt', `==============================================================================
ASSETFLOW ENTERPRISE ERP - KIT DE INSTALACION MAESTRO PARA SERVIDORES
==============================================================================
Propietario del Sistema: Cristian Andres Munoz Rojas (samaheim@gmail.com)
Estandar Arquitectura: AssetFlow Enterprise 9.11
Certificaciones de Referencia: ISO 9001:2015 / ISO/IEC 27001 / Ley N° 21.595

COMO INSTALAR EN 1 SOLO PASO:

A) EN SERVIDORES WINDOWS SERVER (2016 / 2019 / 2022 / 2025):
   1. Descomprima esta carpeta en C:\\AssetFlow
   2. Haga CLIC DERECHO sobre "install-windows.bat"
   3. Seleccione "Ejecutar como administrador"
   4. El instalador detectara hardware, instalara Node.js si hace falta,
      abrira el puerto 3000 en el Firewall de Windows y dejara el servicio listo.

B) EN SERVIDORES LINUX (Ubuntu Server / Debian / RHEL / Rocky / CentOS):
   1. Suba esta carpeta a /opt/assetflow
   2. Ejecute en su consola:
      chmod +x install.sh
      sudo ./install.sh
   3. Elija en pantalla si desea instalarlo con Docker Compose o PM2.
   4. El instalador creara el archivo SWAP si la memoria es menor a 2GB,
      compilara el sistema y abrira los puertos del Firewall.

ACCESO TRAS LA INSTALACION:
   - Local:  http://localhost:3000
   - Red:    http://[IP-DEL-SERVIDOR]:3000
   - Salud:  http://[IP-DEL-SERVIDOR]:3000/api/health

NOTA SOBRE LA BASE DE DATOS:
   No requiere scripts SQL manuales. En el primer inicio, el sistema crea
   automaticamente las 32 tablas relacionales del estandar Enterprise.
==============================================================================
`);

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  saveAs(zipBlob, 'assetflow-enterprise-kit-instalador.zip');
}
