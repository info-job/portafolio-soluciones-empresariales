#!/usr/bin/env bash
# ========================================================
# Script Automatizado de Despliegue - AssetFlow Enterprise
# ========================================================
set -e

echo "=========================================================="
echo " 🚀 Iniciando despliegue de AssetFlow Enterprise"
echo "=========================================================="

# 1. Verificar versión de Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js no está instalado. Se requiere Node.js 20+ LTS."
    exit 1
fi

echo "✓ Node.js detectado: $(node -v)"
echo "✓ NPM detectado: $(npm -v)"

# 2. Instalar dependencias limpias de producción
echo "📦 Instalando dependencias del proyecto..."
npm ci

# 3. Compilar aplicación frontend (Vite)
echo "⚙️ Compilando frontend para producción..."
npm run build

# 4. Asegurar archivo .env
if [ ! -f .env ]; then
    echo "⚠️ Archivo .env no encontrado. Creando a partir de .env.example..."
    cp .env.example .env
    echo "ℹ️ Recuerde configurar su GEMINI_API_KEY en .env si usará funciones de IA."
fi

# 5. Iniciar o reiniciar servidor con PM2 (o fallback directo)
if command -v pm2 &> /dev/null; then
    echo "🔄 Registrando e iniciando servicio con PM2..."
    pm2 restart ecosystem.config.cjs || pm2 start ecosystem.config.cjs
    pm2 save
    echo ""
    echo "=========================================================="
    echo " ✅ AssetFlow Enterprise está corriendo con PM2 en el puerto 3000."
    echo "    Monitoreo: pm2 status | Logs: pm2 logs assetflow-enterprise"
    echo "=========================================================="
else
    echo "ℹ️ PM2 no está instalado globalmente. Instalando tsx local y lanzando servidor..."
    npx tsx server.ts
fi
