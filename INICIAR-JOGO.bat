@echo off
chcp 65001 >nul
title Mundo Kids
cd /d "%~dp0"

set "NODE="
where node >nul 2>&1 && set "NODE=node"
if not defined NODE if exist "C:\Program Files\nodejs\node.exe" set "NODE=C:\Program Files\nodejs\node.exe"
if not defined NODE if exist "%LOCALAPPDATA%\Programs\node\node.exe" set "NODE=%LOCALAPPDATA%\Programs\node\node.exe"

if not defined NODE (
    echo.
    echo   Node.js nao encontrado.
    echo   Instale em: https://nodejs.org/
    echo   Depois FECHE e abra este arquivo de novo.
    echo.
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo   Instalando... primeira vez
    if exist "C:\Program Files\nodejs\npm.cmd" (
        call "C:\Program Files\nodejs\npm.cmd" install
    ) else (
        call npm install
    )
)

echo.
echo   MUNDO KIDS - servidor iniciando...
echo   PC: http://localhost:3847
echo   Para parar: feche esta janela
echo.

"%NODE%" server.js
pause
