#!/bin/bash

# ╔══════════════════════════════════╗
# ║         AnkiDocs v2              ║
# ║   PDF → Cartes Anki via IA       ║
# ╚══════════════════════════════════╝

# Se placer dans le dossier du script
cd "$(dirname "$0")"

echo ""
echo "  ╔══════════════════════════════════╗"
echo "  ║         AnkiDocs v2              ║"
echo "  ║   PDF → Cartes Anki via IA       ║"
echo "  ╚══════════════════════════════════╝"
echo ""

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    echo "  [ERREUR] Node.js n'est pas installé."
    echo "  Télécharge-le ici : https://nodejs.org/"
    echo ""
    read -p "  Appuie sur Entrée pour fermer..."
    exit 1
fi

# Première fois : installer les dépendances
if [ ! -d "node_modules" ]; then
    echo "  [SETUP] Première utilisation — installation en cours..."
    echo "  Ça peut prendre 1-2 minutes."
    echo ""
    npm install
    echo ""
fi

# Vérifier .env.local
if [ ! -f ".env.local" ]; then
    echo "  [ERREUR] Le fichier .env.local n'existe pas."
    echo ""
    echo "  Avant de lancer AnkiDocs, tu dois configurer ta clé API :"
    echo "    1. Le fichier va être créé automatiquement"
    echo "    2. Ouvre-le et remplace la clé API par la tienne"
    echo ""
    echo "  Pour obtenir une clé API gratuite (Gemini) :"
    echo "    → https://aistudio.google.com/apikey"
    echo ""

    read -p "  Créer le fichier maintenant ? (o/n) : " choice
    if [[ "$choice" =~ ^[oOyY]$ ]]; then
        cp .env.example .env.local
        echo ""
        echo "  Le fichier .env.local a été créé."
        echo "  Ouvre-le et ajoute ta clé API, puis relance AnkiDocs."
        echo ""
        open -e .env.local 2>/dev/null || nano .env.local
        read -p "  Appuie sur Entrée pour fermer..."
        exit 0
    else
        read -p "  Appuie sur Entrée pour fermer..."
        exit 1
    fi
fi

# Lancer le serveur + ouvrir le navigateur
echo "  [START] Démarrage du serveur..."
echo "  L'application va s'ouvrir dans ton navigateur."
echo ""
echo "  Pour arrêter : ferme cette fenêtre ou appuie sur Ctrl+C"
echo ""

# Ouvrir le navigateur après 3 secondes
(sleep 3 && open "http://localhost:3000" 2>/dev/null || xdg-open "http://localhost:3000" 2>/dev/null) &

# Lancer Next.js
npx next dev
