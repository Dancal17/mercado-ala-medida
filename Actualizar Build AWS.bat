@echo off
TITLE Empujar Cambios a AWS
cd /d "%~dp0"

echo ==========================================
echo    ACTUALIZANDO CONFIGURACION EN AWS
echo ==========================================
echo.

:: 1. Verificar si git existe
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Git no esta instalado o no se encuentra en el PATH.
    pause
    exit
)

:: 2. Ejecutar comandos de Git con mensaje predefinido
echo [*] Preparando archivos...
git add .

echo [*] Aplicando correccion de build...
git commit -m "Actualizando configuracion de build"

echo [*] Enviando a la nube...
git push origin main

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Hubo un problema. Reintenta en unos instantes.
) else (
    echo.
    echo ==========================================
    echo    ¡LISTO! AWS recibio la instruccion.
    echo    Espera 2 minutos y refresca tu web.
    echo ==========================================
)

echo.
pause
