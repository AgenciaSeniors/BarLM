@echo off
chcp 65001 >nul
echo.
echo ══════════════════════════════════════════════
echo    BAR LM — Instalacion del Menu Digital
echo    Agencia Senores
echo ══════════════════════════════════════════════
echo.

:: Verificar que Node.js esta instalado
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no esta instalado.
    echo.
    echo Instala primero Node.js:
    echo 1. Abre la carpeta del USB
    echo 2. Doble clic en: node-v24.12.0-x64.msi
    echo 3. Sigue los pasos y reinicia el sistema
    echo 4. Vuelve a ejecutar este archivo
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js detectado:
node --version
echo.

:: Crear carpeta de instalacion
echo [1/4] Creando carpeta C:\BarLM ...
if not exist "C:\BarLM" mkdir "C:\BarLM"

:: Copiar proyecto completo (excluir el propio .bat y el instalador de node)
echo [2/4] Copiando proyecto (puede tardar 1-2 minutos)...
xcopy /E /I /Y /Q "%~dp0." "C:\BarLM" /EXCLUDE:"%~dp0xcopy-excluir.txt" >nul
echo [OK] Proyecto copiado.
echo.

:: Crear usuario administrador
echo [3/4] Creando usuario administrador...
cd /d "C:\BarLM\server"
node scripts\create-admin.js
echo.

:: Crear acceso directo de arranque
echo [4/4] Configurando inicio automatico...
copy /Y "C:\BarLM\ARRANCAR.bat" "%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\BarLM.bat" >nul
echo [OK] El servidor arrancara automaticamente al encender la laptop.
echo.

echo ══════════════════════════════════════════════
echo    INSTALACION COMPLETADA
echo ══════════════════════════════════════════════
echo.
echo Ahora ejecuta ARRANCAR.bat para iniciar el servidor.
echo O reinicia la laptop y arrancara automaticamente.
echo.
pause
