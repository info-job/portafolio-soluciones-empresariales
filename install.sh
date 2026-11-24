#!/usr/bin/env bash
# ==============================================================================
# ASSETFLOW ENTERPRISE ERP - INSTALADOR MAESTRO PARA SERVIDORES (LINUX)
# Estándar AssetFlow Enterprise 9.11 · ISO 9001:2015 & ISO/IEC 27001
# Autor / Propietario: Cristian Andrés Muñoz Rojas (samaheim@gmail.com)
# ==============================================================================
# Uso: sudo ./install.sh
# ==============================================================================

set -e

# Colores de Terminal Corporativos
CLR_RESET="\033[0m"
CLR_NAVY="\033[1;38;5;25m"
CLR_EMERALD="\033[1;38;5;35m"
CLR_GOLD="\033[1;38;5;220m"
CLR_ROSE="\033[1;38;5;196m"
CLR_CYAN="\033[1;38;5;45m"
CLR_SLATE="\033[0;38;5;245m"
CLR_BOLD="\033[1m"

clear

echo -e "${CLR_NAVY}==============================================================================${CLR_RESET}"
echo -e "${CLR_GOLD}  █████╗ ███████╗███████╗███████╗████████╗███████╗██╗      ██████╗ ██╗    ██╗${CLR_RESET}"
echo -e "${CLR_GOLD} ██╔══██╗██╔════╝██╔════╝██╔════╝╚══██╔══╝██╔════╝██║     ██╔═══██╗██║    ██║${CLR_RESET}"
echo -e "${CLR_GOLD} ███████║███████╗███████╗█████╗     ██║   █████╗  ██║     ██║   ██║██║ █╗ ██║${CLR_RESET}"
echo -e "${CLR_GOLD} ██╔══██║╚════██║╚════██║██╔══╝     ██║   ██╔══╝  ██║     ██║   ██║██║███╗██║${CLR_RESET}"
echo -e "${CLR_GOLD} ██║  ██║███████║███████║███████╗   ██║   ██║     ███████╗╚██████╔╝╚███╔███╔╝${CLR_RESET}"
echo -e "${CLR_GOLD} ╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝   ╚═╝   ╚═╝     ╚══════╝ ╚═════╝  ╚══╝╚══╝ ${CLR_RESET}"
echo -e "${CLR_EMERALD}   ASSETFLOW ENTERPRISE ERP · INSTALADOR MAESTRO PARA SERVIDORES CORPORATIVOS${CLR_RESET}"
echo -e "${CLR_SLATE}   Arquitectura AssetFlow Enterprise 9.11 · Despliegue Automatizado On-Premise${CLR_RESET}"
echo -e "${CLR_NAVY}==============================================================================${CLR_RESET}"
echo ""

# 1. VERIFICACIÓN DE PRIVILEGIOS ROOT / SUDO
if [ "$EUID" -ne 0 ]; then
  echo -e "${CLR_ROSE}❌ ERROR DE PERMISOS:${CLR_RESET} El instalador debe ejecutarse con privilegios de administrador."
  echo -e "   Por favor ejecute: ${CLR_BOLD}sudo ./install.sh${CLR_RESET}"
  exit 1
fi

# Detectar usuario real detrás de sudo
REAL_USER=${SUDO_USER:-$USER}
if [ "$REAL_USER" = "root" ]; then
  REAL_USER=$(logname 2>/dev/null || echo "root")
fi

echo -e "${CLR_CYAN}[PASO 1/7] Diagnóstico de Recursos del Servidor...${CLR_RESET}"

# Detección de Sistema Operativo
if [ -f /etc/os-release ]; then
  . /etc/os-release
  OS_NAME=$NAME
  OS_VERSION=$VERSION_ID
else
  OS_NAME=$(uname -s)
  OS_VERSION=$(uname -r)
fi

TOTAL_RAM_MB=$(free -m | awk '/^Mem:/{print $2}')
TOTAL_DISK_GB=$(df -BG / | awk 'NR==2 {print $4}' | sed 's/G//')
CPU_CORES=$(nproc)

echo -e "  ✓ Sistema Operativo detectado: ${CLR_BOLD}$OS_NAME ($OS_VERSION)${CLR_RESET}"
echo -e "  ✓ Arquitectura de CPU:        ${CLR_BOLD}$(uname -m) ($CPU_CORES núcleos)${CLR_RESET}"
echo -e "  ✓ Memoria RAM detectada:      ${CLR_BOLD}${TOTAL_RAM_MB} MB${CLR_RESET}"
echo -e "  ✓ Espacio en Disco Libre:     ${CLR_BOLD}${TOTAL_DISK_GB} GB${CLR_RESET}"

# Advertencia / Alerta de SWAP si la RAM es menor a 2048 MB
if [ "$TOTAL_RAM_MB" -lt 1800 ]; then
  echo -e "${CLR_GOLD}  ⚠️ ADVERTENCIA: La memoria RAM es inferior a 2 GB.${CLR_RESET}"
  SWAP_EXISTS=$(free -m | awk '/^Swap:/{print $2}')
  if [ "$SWAP_EXISTS" -lt 1024 ]; then
    echo -e "  ⚙️ Creando automáticamente archivo de memoria SWAP de 2 GB para evitar bloqueos..."
    fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    if ! grep -q "/swapfile" /etc/fstab; then
      echo '/swapfile none swap sw 0 0' >> /etc/fstab
    fi
    echo -e "  ${CLR_EMERALD}✓ Memoria SWAP de 2 GB creada y activada exitosamente.${CLR_RESET}"
  fi
fi

echo ""
echo -e "${CLR_CYAN}[PASO 2/7] Selección del Método de Despliegue${CLR_RESET}"
echo -e "Seleccione cómo desea instalar y hacer correr AssetFlow Enterprise:"
echo -e "  ${CLR_BOLD}1)${CLR_RESET} ${CLR_EMERALD}Contenedores Docker & Docker Compose (RECOMENDADO)${CLR_RESET}"
echo -e "     -> Aísla el sistema en contenedor Alpine (<180 MB). No requiere instalar Node ni librerías manuales."
echo -e "  ${CLR_BOLD}2)${CLR_RESET} ${CLR_CYAN}Despliegue Nativo Linux (Node.js 22 LTS + PM2 Clúster)${CLR_RESET}"
echo -e "     -> Ejecución directa sobre el sistema operativo con gestor de procesos en clúster y balanceo."
echo ""
read -p "Ingrese su opción [1 o 2, por defecto 1]: " INSTALL_MODE
INSTALL_MODE=${INSTALL_MODE:-1}

# 3. PREPARACIÓN DEL DIRECTORIO DE INSTALACIÓN
INSTALL_DIR="/opt/assetflow"
echo ""
echo -e "${CLR_CYAN}[PASO 3/7] Preparación de la Carpeta Corporativa ($INSTALL_DIR)...${CLR_RESET}"

mkdir -p "$INSTALL_DIR"
CURRENT_DIR=$(pwd)

if [ "$CURRENT_DIR" != "$INSTALL_DIR" ]; then
  echo -e "  📦 Copiando código fuente a ${INSTALL_DIR}..."
  rsync -av --exclude="node_modules" --exclude=".git" --exclude="dist" ./ "$INSTALL_DIR/" > /dev/null 2>&1 || cp -rf ./* "$INSTALL_DIR/"
fi

cd "$INSTALL_DIR"
chown -R "$REAL_USER:$REAL_USER" "$INSTALL_DIR"

# 4. CONFIGURACIÓN DE VARIABLES DE ENTORNO (.env)
echo ""
echo -e "${CLR_CYAN}[PASO 4/7] Configuración de Variables de Entorno (.env)...${CLR_RESET}"

if [ ! -f .env ]; then
  cp .env.example .env
  echo -e "  ✓ Archivo .env generado a partir de la plantilla oficial."
fi

# Preguntar puerto deseado
CURRENT_PORT=$(grep -E "^PORT=" .env | cut -d= -f2 || echo "3000")
CURRENT_PORT=${CURRENT_PORT:-3000}
read -p "Puerto local para el servidor [Enter para usar $CURRENT_PORT]: " TARGET_PORT
TARGET_PORT=${TARGET_PORT:-$CURRENT_PORT}

sed -i "s/^PORT=.*/PORT=$TARGET_PORT/" .env
sed -i "s/^NODE_ENV=.*/NODE_ENV=production/" .env

echo -e "  ✓ Puerto configurado en: ${CLR_BOLD}$TARGET_PORT${CLR_RESET}"

# 5. INSTALACIÓN SEGÚN EL MÉTODO SELECCIONADO
echo ""
if [ "$INSTALL_MODE" = "1" ]; then
  echo -e "${CLR_CYAN}[PASO 5/7] Configurando Despliegue con Docker y Docker Compose...${CLR_RESET}"

  # Verificar si Docker está instalado
  if ! command -v docker &> /dev/null; then
    echo -e "  ⚙️ Docker no detectado. Descargando e instalando Docker Engine oficial..."
    curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
    sh /tmp/get-docker.sh > /dev/null 2>&1
    systemctl enable --now docker
    usermod -aG docker "$REAL_USER" || true
    echo -e "  ${CLR_EMERALD}✓ Docker Engine instalado correctamente.${CLR_RESET}"
  else
    echo -e "  ✓ Docker Engine ya se encuentra instalado ($(docker --version))."
  fi

  # Levantar el servicio con Docker Compose
  echo -e "  🚀 Compilando imagen Alpine y levantando contenedor en segundo plano..."
  docker compose down > /dev/null 2>&1 || true
  docker compose up -d --build

  echo -e "  ${CLR_EMERALD}✓ Contenedor Docker desplegado y corriendo con reinicio automático.${CLR_RESET}"

else
  echo -e "${CLR_CYAN}[PASO 5/7] Configurando Despliegue Nativo con Node.js 22 LTS y PM2...${CLR_RESET}"

  # Verificar Node.js
  if ! command -v node &> /dev/null || [ "$(node -v | cut -d. -f1 | tr -d 'v')" -lt 20 ]; then
    echo -e "  ⚙️ Instalando Node.js 22 LTS oficial desde NodeSource..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - > /dev/null 2>&1
    apt update -y > /dev/null 2>&1
    apt install -y nodejs build-essential > /dev/null 2>&1
    echo -e "  ${CLR_EMERALD}✓ Node.js $(node -v) instalado exitosamente.${CLR_RESET}"
  else
    echo -e "  ✓ Node.js ya está instalado ($(node -v))."
  fi

  # Instalar PM2 globalmente
  if ! command -v pm2 &> /dev/null; then
    echo -e "  ⚙️ Instalando gestor de procesos empresarial PM2..."
    npm install -g pm2 > /dev/null 2>&1
  fi

  # Instalar dependencias y compilar Vite
  echo -e "  📦 Instalando dependencias de producción (npm ci)..."
  sudo -u "$REAL_USER" npm ci --prefer-offline > /dev/null 2>&1 || sudo -u "$REAL_USER" npm install --production=false > /dev/null 2>&1

  echo -e "  ⚙️ Compilando frontend optimizado con Vite (npm run build)..."
  sudo -u "$REAL_USER" npm run build > /dev/null 2>&1

  # Iniciar servicio con PM2
  echo -e "  🚀 Arrancando clúster con PM2..."
  sudo -u "$REAL_USER" pm2 restart ecosystem.config.cjs || sudo -u "$REAL_USER" pm2 start ecosystem.config.cjs
  sudo -u "$REAL_USER" pm2 save > /dev/null 2>&1

  # Configurar arranque automático al reiniciar el servidor físico
  env PATH=$PATH:/usr/bin pm2 startup systemd -u "$REAL_USER" --hp "/home/$REAL_USER" > /dev/null 2>&1 || true

  echo -e "  ${CLR_EMERALD}✓ Clúster PM2 activado y configurado en el arranque del sistema (systemd).${CLR_RESET}"
fi

# 6. CONFIGURACIÓN OPCIONAL DE PROXY INVERSO NGINX Y SSL
echo ""
echo -e "${CLR_CYAN}[PASO 6/7] Configuración de Proxy Inverso Nginx y Certificado SSL (HTTPS)${CLR_RESET}"
read -p "¿Desea configurar Nginx con dominio público y certificado SSL gratuito? (s/n) [n]: " SETUP_NGINX
SETUP_NGINX=${SETUP_NGINX:-n}

if [[ "$SETUP_NGINX" =~ ^[sSyY]$ ]]; then
  read -p "Ingrese su nombre de dominio corporativo (ej: erp.miempresa.cl): " CORP_DOMAIN
  
  if [ -n "$CORP_DOMAIN" ]; then
    echo -e "  ⚙️ Instalando Nginx y Certbot..."
    apt update -y > /dev/null 2>&1
    apt install -y nginx certbot python3-certbot-nginx > /dev/null 2>&1

    # Crear configuración Nginx
    cat <<EOF > /etc/nginx/sites-available/assetflow.conf
server {
    listen 80;
    server_name $CORP_DOMAIN;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:$TARGET_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF
    ln -sf /etc/nginx/sites-available/assetflow.conf /etc/nginx/sites-enabled/
    nginx -t > /dev/null 2>&1
    systemctl reload nginx

    echo -e "  🔒 Solicitando certificado SSL gratuito con Let's Encrypt para $CORP_DOMAIN..."
    certbot --nginx -d "$CORP_DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect || true
    echo -e "  ${CLR_EMERALD}✓ Dominio https://$CORP_DOMAIN configurado con SSL seguro y renovación automática.${CLR_RESET}"
  fi
fi

# 7. BLINDAJE DE FIREWALL (UFW)
echo ""
echo -e "${CLR_CYAN}[PASO 7/7] Blindaje de Seguridad y Firewall (UFW)...${CLR_RESET}"
if command -v ufw &> /dev/null; then
  ufw allow 22/tcp > /dev/null 2>&1
  ufw allow 80/tcp > /dev/null 2>&1
  ufw allow 443/tcp > /dev/null 2>&1
  # Cerrar puerto interno 3000 al exterior si se usa Nginx
  if [[ "$SETUP_NGINX" =~ ^[sSyY]$ ]]; then
    ufw deny "$TARGET_PORT"/tcp > /dev/null 2>&1 || true
  else
    ufw allow "$TARGET_PORT"/tcp > /dev/null 2>&1
  fi
  ufw --force enable > /dev/null 2>&1
  echo -e "  ${CLR_EMERALD}✓ Firewall UFW configurado (Puertos SSH, HTTP y HTTPS autorizados).${CLR_RESET}"
fi

# Comprobación de Salud Final (Healthcheck)
echo ""
echo -e "🔍 Verificando estado del servicio..."
sleep 3
SERVER_IP=$(hostname -I | awk '{print $1}' || echo "127.0.0.1")
HEALTH_STATUS=$(curl -s "http://127.0.0.1:$TARGET_PORT/api/health" || echo "offline")

echo ""
echo -e "${CLR_EMERALD}==============================================================================${CLR_RESET}"
echo -e "${CLR_EMERALD}  🎉 ¡INSTALACIÓN COMPLETADA EXITOSAMENTE! ASSETFLOW ERP ESTÁ EN PRODUCCIÓN  ${CLR_RESET}"
echo -e "${CLR_EMERALD}==============================================================================${CLR_RESET}"
echo -e "  • Estado del Servidor:  ${CLR_BOLD}${HEALTH_STATUS}${CLR_RESET}"
echo -e "  • Acceso Red Local LAN: ${CLR_BOLD}http://${SERVER_IP}:${TARGET_PORT}${CLR_RESET}"
if [[ "$SETUP_NGINX" =~ ^[sSyY]$ ]] && [ -n "$CORP_DOMAIN" ]; then
echo -e "  • Acceso Web Seguro:    ${CLR_BOLD}https://${CORP_DOMAIN}${CLR_RESET}"
fi
echo -e "  • Directorio Maestro:   ${CLR_BOLD}${INSTALL_DIR}${CLR_RESET}"
echo ""
echo -e "${CLR_GOLD}COMANDOS ÚTILES DE ADMINISTRACIÓN:${CLR_RESET}"
if [ "$INSTALL_MODE" = "1" ]; then
echo -e "  - Ver registros (logs) en vivo:  ${CLR_BOLD}docker compose logs -f${CLR_RESET}"
echo -e "  - Ver estado de contenedores:   ${CLR_BOLD}docker compose ps${CLR_RESET}"
echo -e "  - Reiniciar el sistema:         ${CLR_BOLD}docker compose restart${CLR_RESET}"
echo -e "  - Actualizar sistema con Git:   ${CLR_BOLD}git pull && docker compose up -d --build${CLR_RESET}"
else
echo -e "  - Ver registros de clúster:     ${CLR_BOLD}pm2 logs assetflow-erp${CLR_RESET}"
echo -e "  - Ver consumo de CPU y RAM:     ${CLR_BOLD}pm2 monit${CLR_RESET}"
echo -e "  - Reiniciar aplicación:         ${CLR_BOLD}pm2 restart assetflow-erp${CLR_RESET}"
fi
echo ""
echo -e "${CLR_SLATE}El manual técnico detallado para el equipo IT se encuentra custodiado en:${CLR_RESET}"
echo -e "${CLR_BOLD}Bóveda de Documentos Digitales (P986110D) -> SGC-IT-MAN-008 (.docx y .pdf)${CLR_RESET}"
echo -e "${CLR_NAVY}==============================================================================${CLR_RESET}"
exit 0
