@echo off
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
