#!/usr/bin/env bash
# ========================================================
# Script para empaquetar AssetFlow Enterprise en Release .tar.gz
# ========================================================
set -e

echo "📦 1. Compilando aplicación..."
npm run build

echo "📁 2. Creando archivo comprimido de release corporativo..."
tar --exclude='node_modules' \
    --exclude='.git' \
    --exclude='*.tar.gz' \
    --exclude='*.zip' \
    -czf assetflow-enterprise-release.tar.gz \
    dist/ \
    server.ts \
    server/ \
    lib/ \
    types.ts \
    firebase.ts \
    firebase-applet-config.json \
    package.json \
    package-lock.json \
    tsconfig.json \
    Dockerfile \
    docker-compose.yml \
    .dockerignore \
    ecosystem.config.cjs \
    deploy.sh \
    deploy-windows.bat \
    install.sh \
    install-windows.bat \
    nginx.conf \
    .env.example \
    MANUAL_DE_DESPLIEGUE_EMPRESARIAL.md

echo "✅ Empaquetado finalizado con éxito: assetflow-enterprise-release.tar.gz"
ls -lh assetflow-enterprise-release.tar.gz
