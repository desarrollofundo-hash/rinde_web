@echo off
REM Script para desplegar a IIS
REM Ejecutar como Administrador

setlocal enabledelayedexpansion

echo.
echo ════════════════════════════════════════════════════════════
echo     DEPLOYMENT A IIS - Rinde Web
echo ════════════════════════════════════════════════════════════
echo.

REM Verificar si se ejecuta como admin
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ❌ ERROR: Este script debe ejecutarse como ADMINISTRADOR
    echo.
    echo Solución: Click derecho en CMD/PowerShell y selecciona "Ejecutar como administrador"
    pause
    exit /b 1
)

echo ✅ Ejecutándose como Administrador
echo.

REM Configurar variables
set PROJECT_ROOT=%~dp0..
set DEPLOYMENT_PKG=%PROJECT_ROOT%\deployment-package
set IIS_PATH=C:\inetpub\wwwroot\RindeWeb
set APP_POOL=RindeWeb

echo 📋 Configuración:
echo   Proyecto: %PROJECT_ROOT%
echo   Deployment pkg: %DEPLOYMENT_PKG%
echo   IIS destino: %IIS_PATH%
echo   App Pool: %APP_POOL%
echo.

REM Paso 1: Verificar que deployment-package existe
echo ════════════════════════════════════════════════════════════
echo PASO 1: Verificando carpeta deployment-package...
echo ════════════════════════════════════════════════════════════
if not exist "%DEPLOYMENT_PKG%" (
    echo ❌ ERROR: Carpeta deployment-package NO encontrada
    echo.
    echo Solución: En tu máquina local ejecuta:
    echo   cd "D:\PROYECTOS ASA WEB\rinde-web"
    echo   npm run deploy:pack
    echo.
    pause
    exit /b 1
)
echo ✅ Carpeta deployment-package encontrada
echo.

REM Paso 2: Verificar archivos críticos
echo ════════════════════════════════════════════════════════════
echo PASO 2: Verificando archivos críticos...
echo ════════════════════════════════════════════════════════════

set MISSING=0

if not exist "%DEPLOYMENT_PKG%\package.json" (
    echo ❌ Falta: package.json
    set MISSING=1
)
if not exist "%DEPLOYMENT_PKG%\server.js" (
    echo ❌ Falta: server.js
    set MISSING=1
)
if not exist "%DEPLOYMENT_PKG%\web.config" (
    echo ❌ Falta: web.config
    set MISSING=1
)
if not exist "%DEPLOYMENT_PKG%\dist" (
    echo ❌ Falta: carpeta dist
    set MISSING=1
)
if not exist "%DEPLOYMENT_PKG%\.env" (
    echo ❌ Falta: .env
    set MISSING=1
)

if %MISSING% equ 1 (
    echo.
    echo ❌ ERROR: Faltan archivos en deployment-package
    echo.
    pause
    exit /b 1
)

echo ✅ package.json
echo ✅ server.js
echo ✅ web.config
echo ✅ dist/
echo ✅ .env
echo ✅ Todos los archivos críticos encontrados
echo.

REM Paso 3: Crear/Limpiar carpeta en IIS
echo ════════════════════════════════════════════════════════════
echo PASO 3: Preparando carpeta en IIS...
echo ════════════════════════════════════════════════════════════

if exist "%IIS_PATH%" (
    echo 🗑️  Limpiando carpeta anterior: %IIS_PATH%
    REM Mantener node_modules si existe
    if exist "%IIS_PATH%\node_modules" (
        echo   ⏸️  Preservando node_modules...
        mkdir "%IIS_PATH%\.backup_nm" 2>nul
        xcopy "%IIS_PATH%\node_modules" "%IIS_PATH%\.backup_nm" /E /I /Y >nul 2>&1
    )
    REM Eliminar contenido excepto node_modules
    for /D %%i in ("%IIS_PATH%\*") do (
        if not "%%~nxi"=="node_modules" (
            rmdir /S /Q "%%i" 2>nul
        )
    )
    del /Q "%IIS_PATH%\*.*" 2>nul
) else (
    echo 📁 Creando carpeta: %IIS_PATH%
    mkdir "%IIS_PATH%"
)
echo ✅ Carpeta preparada
echo.

REM Paso 4: Copiar archivos
echo ════════════════════════════════════════════════════════════
echo PASO 4: Copiando archivos de deployment-package...
echo ════════════════════════════════════════════════════════════

echo 📋 Copiando package.json...
copy "%DEPLOYMENT_PKG%\package.json" "%IIS_PATH%\package.json" /Y >nul
if %errorlevel% neq 0 (
    echo ❌ Error copiando package.json
    pause
    exit /b 1
)
echo ✅ package.json copiado

echo 📋 Copiando package-lock.json...
if exist "%DEPLOYMENT_PKG%\package-lock.json" (
    copy "%DEPLOYMENT_PKG%\package-lock.json" "%IIS_PATH%\package-lock.json" /Y >nul
    echo ✅ package-lock.json copiado
)

echo 📋 Copiando server.js...
copy "%DEPLOYMENT_PKG%\server.js" "%IIS_PATH%\server.js" /Y >nul
echo ✅ server.js copiado

echo 📋 Copiando web.config...
copy "%DEPLOYMENT_PKG%\web.config" "%IIS_PATH%\web.config" /Y >nul
echo ✅ web.config copiado

echo 📋 Copiando .env...
copy "%DEPLOYMENT_PKG%\.env" "%IIS_PATH%\.env" /Y >nul
echo ✅ .env copiado

echo 📋 Copiando dist/...
xcopy "%DEPLOYMENT_PKG%\dist" "%IIS_PATH%\dist" /E /I /Y >nul
echo ✅ dist/ copiado

echo.

REM Paso 5: Instalar dependencias
echo ════════════════════════════════════════════════════════════
echo PASO 5: Instalando dependencias (npm install --production)...
echo ════════════════════════════════════════════════════════════
echo.

cd /d "%IIS_PATH%"
call npm install --production

if %errorlevel% neq 0 (
    echo.
    echo ❌ ERROR durante npm install
    echo.
    echo Posibles soluciones:
    echo   - Verificar que Node.js esté instalado: node --version
    echo   - Verificar que npm esté instalado: npm --version
    echo   - Verificar conexión a internet
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ Dependencias instaladas correctamente
echo.

REM Paso 6: Verificar instalación
echo ════════════════════════════════════════════════════════════
echo PASO 6: Verificando instalación...
echo ════════════════════════════════════════════════════════════

if not exist "%IIS_PATH%\node_modules" (
    echo ❌ ERROR: node_modules no se instaló
    pause
    exit /b 1
)
echo ✅ node_modules instalado

if not exist "%IIS_PATH%\dist\index.html" (
    echo ❌ ERROR: Frontend no encontrado
    pause
    exit /b 1
)
echo ✅ Frontend presente

echo.

REM Paso 7: Resumen final
echo ════════════════════════════════════════════════════════════
echo ✅ ¡DEPLOYMENT COMPLETADO EXITOSAMENTE!
echo ════════════════════════════════════════════════════════════
echo.
echo 📦 Archivos instalados en: %IIS_PATH%
echo.
echo 📋 Próximos pasos en IIS Manager:
echo   1. Crear nueva aplicación:
echo      - Alias: rinde-web
echo      - Ruta: %IIS_PATH%
echo   2. Crear Application Pool (sin managed code)
echo   3. Reiniciar el Application Pool
echo.
echo 📝 IMPORTANTE - Verificar .env:
echo   Archivo: %IIS_PATH%\.env
echo   Cambiar: VITE_OPENAI_API_KEY=tu_clave_aqui
echo.
echo 🌐 Probar en navegador:
echo   http://tu-servidor/rinde-web
echo.

pause
exit /b 0
