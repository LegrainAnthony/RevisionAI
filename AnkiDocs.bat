@echo off
chcp 65001 >nul
title AnkiDocs

echo.
echo   ╔══════════════════════════════════╗
echo   ║         AnkiDocs v2              ║
echo   ║   PDF → Cartes Anki via IA       ║
echo   ╚══════════════════════════════════╝
echo.

:: Se placer dans le dossier du script
cd /d "%~dp0"

:: Vérifier que Node.js est installé
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo   [ERREUR] Node.js n'est pas installé.
    echo   Télécharge-le ici : https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Première fois : installer les dépendances
if not exist "node_modules" (
    echo   [SETUP] Première utilisation — installation en cours...
    echo   Ça peut prendre 1-2 minutes.
    echo.
    call npm install
    echo.
)

:: Vérifier que .env.local existe
if not exist ".env.local" (
    echo   [ERREUR] Le fichier .env.local n'existe pas.
    echo.
    echo   Avant de lancer AnkiDocs, tu dois configurer ta clé API :
    echo     1. Copie le fichier ".env.example" et renomme-le ".env.local"
    echo     2. Ouvre ".env.local" avec le Bloc-notes
    echo     3. Remplace "sk-..." par ta vraie clé API
    echo.
    echo   Pour obtenir une clé API gratuite (Gemini) :
    echo     → https://aistudio.google.com/apikey
    echo.

    :: Proposer de créer le fichier automatiquement
    set /p choice="   Veux-tu créer le fichier maintenant ? (O/N) : "
    if /i "%choice%"=="O" (
        copy ".env.example" ".env.local" >nul
        echo.
        echo   Le fichier .env.local a été créé.
        echo   Ouvre-le avec le Bloc-notes et ajoute ta clé API.
        echo.
        start notepad ".env.local"
        pause
        exit /b 0
    ) else (
        pause
        exit /b 1
    )
)

:: Lancer le serveur
echo   [START] Démarrage du serveur...
echo   L'application va s'ouvrir dans ton navigateur.
echo.
echo   Pour arrêter : ferme cette fenêtre ou appuie sur Ctrl+C
echo.

:: Ouvrir le navigateur après 3 secondes (le temps que le serveur démarre)
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000"

:: Lancer Next.js
call npx next dev
