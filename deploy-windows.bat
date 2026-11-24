@echo off
title AssetFlow Enterprise - Despliegue en Windows Server
echo ========================================================
echo   AssetFlow Enterprise - Inicio de Produccion Windows
echo ========================================================

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado en este servidor.
    echo Por favor descargue e instale Node.js 20+ LTS desde https://nodejs.org
    pause
    exit /b 1
)

echo [1/4] Verificando dependencias del proyecto...
call npm ci

echo [2/4] Compilando frontend para produccion...
call npm run build

if not exist .env (
    echo [3/4] Creando archivo .env base desde .env.example...
    copy .env.example .env
)

echo [4/4] Iniciando AssetFlow Enterprise en puerto 3000...
echo Presione Ctrl + C para detener el servidor.
call npx tsx server.ts
pause
