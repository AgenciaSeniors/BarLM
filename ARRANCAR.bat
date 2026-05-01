@echo off
chcp 65001 >nul
title BAR LM — Menu Digital
color 0D

echo.
echo ══════════════════════════════════════════════
echo    BAR LM — Menu Digital
echo    NO CIERRES ESTA VENTANA
echo ══════════════════════════════════════════════
echo.

cd /d "C:\BarLM\server"
node server.js

echo.
echo [!] El servidor se detuvo. Presiona una tecla para reiniciar.
pause >nul
ARRANCAR.bat
