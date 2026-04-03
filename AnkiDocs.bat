@echo off
title AnkiDocs

echo.
echo   AnkiDocs v2
echo   PDF - Cartes Anki via IA
echo.

cd /d "%~dp0"

where git >nul 2>nul
if %errorlevel% equ 0 (
    echo   [UPDATE] Verification des mises a jour...
    git pull --ff-only origin main 2>nul
    echo.
)

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo   [ERREUR] Node.js n'est pas installe.
    echo   Telecharge-le ici : https://nodejs.org/
    echo.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo   [SETUP] Premiere utilisation - installation en cours...
    echo.
    call npm install
    echo.
)

if not exist ".env.local" (
    echo   [ERREUR] Le fichier .env.local n'existe pas.
    echo   Copie .env.example en .env.local et ajoute ta cle API.
    echo.
    copy ".env.example" ".env.local" >nul
    start notepad ".env.local"
    pause
    exit /b 0
)

echo   [START] Demarrage du serveur...
echo   Ferme cette fenetre pour arreter.
echo.

start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000"

call node_modules\.bin\next dev
pause