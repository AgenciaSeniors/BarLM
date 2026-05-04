@echo off
chcp 437 >nul
title BAR LM - Menu Digital
color 0D

echo.
echo ============================================
echo    BAR LM - Menu Digital
echo    NO CIERRES ESTA VENTANA
echo ============================================
echo.

REM Verificar que los archivos estan en C:\BarLM
if not exist "C:\BarLM\server\server.js" (
    echo [ERROR] No se encontro el servidor en C:\BarLM
    echo.
    echo Ejecuta primero INSTALAR.bat para configurar el sistema.
    echo.
    pause
    exit /b 1
)

cd /d "C:\BarLM\server"
echo Iniciando servidor...
echo.

:reiniciar
node server.js
echo.
echo [!] El servidor se detuvo. Reiniciando en 3 segundos...
timeout /t 3 /nobreak >nul
goto reiniciar
