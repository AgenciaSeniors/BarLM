@echo off
chcp 437 >nul
title BAR LM - Instalacion

echo.
echo ============================================
echo    BAR LM - Instalacion del Menu Digital
echo    Agencia Senores
echo ============================================
echo.

REM Verificar que Node.js esta instalado
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado.
    echo.
    echo Instala primero: node-v24.12.0-x64.msi
    echo Reinicia la laptop y vuelve a ejecutar este archivo.
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js detectado:
node --version
echo.

REM Crear carpeta de instalacion en C:\BarLM
echo [1/4] Creando carpeta C:\BarLM...
if not exist "C:\BarLM" mkdir "C:\BarLM"
if not exist "C:\BarLM" (
    echo [ERROR] No se pudo crear C:\BarLM
    echo Ejecuta este archivo como Administrador.
    pause
    exit /b 1
)
echo [OK] Carpeta creada.
echo.

REM Copiar todos los archivos al disco duro
echo [2/4] Copiando archivos (puede tardar 2-3 minutos)...
xcopy /E /I /Y /Q "%~dp0public"  "C:\BarLM\public"  >nul
xcopy /E /I /Y /Q "%~dp0server"  "C:\BarLM\server"  >nul
echo [OK] Archivos copiados.
echo.

REM Verificar que el servidor existe
if not exist "C:\BarLM\server\server.js" (
    echo [ERROR] El archivo server.js no se copio correctamente.
    echo Asegurate de que el USB tiene la carpeta server completa.
    pause
    exit /b 1
)

REM Crear usuario administrador
echo [3/4] Creando usuario administrador...
cd /d "C:\BarLM\server"
node scripts\create-admin.js
echo.

REM Configurar inicio automatico de Windows
echo [4/4] Configurando inicio automatico...
copy /Y "C:\BarLM\ARRANCAR.bat" "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\BarLM.bat" >nul 2>&1
if exist "C:\BarLM\ARRANCAR.bat" (
    echo [OK] El servidor arrancara automaticamente al encender la laptop.
) else (
    copy /Y "%~dp0ARRANCAR.bat" "C:\BarLM\ARRANCAR.bat" >nul
    copy /Y "C:\BarLM\ARRANCAR.bat" "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\BarLM.bat" >nul
    echo [OK] Inicio automatico configurado.
)
echo.

echo ============================================
echo    INSTALACION COMPLETADA
echo ============================================
echo.
echo Ahora ejecuta ARRANCAR.bat para iniciar el servidor.
echo O reinicia la laptop y arrancara automaticamente.
echo.
pause
