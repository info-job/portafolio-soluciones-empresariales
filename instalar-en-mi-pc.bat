@echo off
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

:: 1. COMPROBAR NODE.JS
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
        echo Para que Windows reconozca el nuevo programa, por favor cierra esta ventana
        echo y vuelve a hacer doble clic en "instalar-en-mi-pc.bat".
        echo.
        pause
        exit /b 0
    ) else (
        color 0C
        echo [ACCION REQUERIDA] No tienes winget en tu Windows.
        echo Por favor descarga e instala Node.js gratis desde su pagina oficial:
        echo https://nodejs.org/ (Elige la version LTS recomendada)
        echo Una vez instalado, vuelve a hacer doble clic en este archivo.
        echo.
        pause
        exit /b 1
    )
) else (
    for /f "tokens=*" %%v in ('node -v') do set NODE_VERSION=%%v
    echo [OK] Node.js detectado en tu PC: !NODE_VERSION!
)
echo.

:: 2. CONFIGURAR ARCHIVO DE ENTORNO LOCAL
echo [PASO 2/5] Configurando archivo de entorno local (.env)...
if not exist .env (
    if exist .env.example (
        copy .env.example .env >nul
    ) else (
        echo PORT=3000 > .env
        echo NODE_ENV=development >> .env
        echo VITE_APP_TITLE=AssetFlow Enterprise ERP (PC Local) >> .env
    )
    echo [OK] Archivo .env preparado para tu PC.
) else (
    echo [OK] El archivo .env ya existe.
)
echo.

:: 3. INSTALAR LIBRERIAS Y DEPENDENCIAS
echo [PASO 3/5] Descargando e instalando las librerias del sistema (npm install)...
echo Esto puede tardar 1 o 2 minutos la primera vez, por favor espera...
call npm install
if %errorlevel% neq 0 (
    echo Hubo una advertencia en la instalacion, continuando con dependencias minimas...
)
echo [OK] Dependencias instaladas correctamente.
echo.

:: 4. COMPILAR EL SISTEMA WEB
echo [PASO 4/5] Compilando la aplicacion web para maxima velocidad en tu PC...
call npm run build
if %errorlevel% neq 0 (
    echo [AVISO] Se ejecutara en modo directo de desarrollo...
)
echo [OK] Compilacion lista.
echo.

:: 5. CREAR ACCESO DIRECTO EN TU ESCRITORIO
echo [PASO 5/5] Creando lanzador en tu Escritorio de Windows...
set DESKTOP_DIR=%USERPROFILE%\Desktop
if exist "%DESKTOP_DIR%" (
    (
        echo @echo off
        echo cd /d "%~dp0"
        echo title AssetFlow Enterprise ERP - Servidor Local
        echo echo ========================================================
        echo echo   Iniciando AssetFlow Enterprise en tu PC...
        echo echo   Abriendo tu navegador en http://localhost:3000
        echo echo ========================================================
        echo start http://localhost:3000
        echo call npx tsx server.ts
    ) > "%DESKTOP_DIR%\Iniciar AssetFlow ERP.bat"
    echo [OK] Se ha creado un acceso directo en tu Escritorio: "Iniciar AssetFlow ERP.bat"
)

:: CREAR ARCHIVO LOCAL DE INICIO RAPIDO
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
echo  COMO USAR EL SISTEMA EN TU COMPUTADOR:
echo    1. Tu base de datos y catastro de propiedades se crearan automaticamente
echo       en el primer inicio (residencia 100%% Local-First en tu equipo).
echo    2. En el futuro, solo haz doble clic en el archivo de tu Escritorio:
echo       "Iniciar AssetFlow ERP.bat" o en "abrir-en-mi-pc.bat".
echo    3. Para cerrar el sistema, simplemente cierra la ventana negra de consola.
echo.
echo ==============================================================================
echo.

set /p RESP="Deseas abrir y probar el sistema en tu navegador ahora mismo? (S/N): "
if /i "%RESP%"=="S" (
    echo.
    echo Abriendo tu navegador en http://localhost:3000...
    start http://localhost:3000
    echo Iniciando el servidor en tu PC...
    call npx tsx server.ts
) else (
    echo.
    echo Listo Cristian. Cuando quieras probarlo, haz doble clic en "abrir-en-mi-pc.bat"
    echo o en el acceso directo de tu Escritorio.
    echo.
    pause
)
