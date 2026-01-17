@echo off
TITLE Subir cambios a GitHub y AWS
cd /d "%~dp0"

echo ==========================================
echo    ACTUALIZANDO PROYECTO EN LA NUBE
echo ==========================================
echo.

:: 1. Verificar si git existe
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Git no esta instalado o no se encuentra en el PATH.
    echo Por favor, instala Git desde https://git-scm.com/ e intentalo de nuevo.
    pause
    exit
)

:: 2. Ejecutar comandos de Git
echo [*] Preparando archivos...
git add .

echo [*] Guardando cambios localmente...
set /p commitMsg="Introduce una descripcion de los cambios (o pulsa Enter para usar una por defecto): "
if "%commitMsg%"=="" set commitMsg="Actualizaciones del sistema y mejoras de UI"

git commit -m "%commitMsg%"

echo [*] Subiendo a GitHub...
git push origin main

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Hubo un problema al subir los cambios. 
    echo Verifica tu conexion a internet y que tengas permisos en el repositorio.
) else (
    echo.
    echo ==========================================
    echo    ¡EXITO! Cambios subidos a GitHub.
    echo    AWS Amplify se actualizara en breve.
    echo ==========================================
)

echo.
pause
