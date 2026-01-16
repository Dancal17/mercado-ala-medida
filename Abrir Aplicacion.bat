@echo off
TITLE Iniciando Mercado a la Medida
cd /d "%~dp0"
echo.
echo ==========================================
echo    INICIANDO SERVIDOR DE DESARROLLO
echo ==========================================
echo.
echo La aplicacion se abrira en tu navegador en unos segundos...
echo.
cmd /c npm run dev -- --open
pause
