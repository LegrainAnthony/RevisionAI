# AnkiDocs v2

Génère des cartes Anki à partir de PDF de cours via l'IA vision.
Upload ton PDF → sélectionne les pages → l'IA les lit et crée des flashcards → exporte en .apkg.

---

## Prérequis

- **Node.js 18+**
- **Une clé API** :
  - Gemini (recommandé) : [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
  - OpenAI : [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

Rien d'autre. Pas de Docker, pas de base de données.

## Installation

```bash
cd ankidocs-v2
npm install
cp .env.example .env.local
# → Éditer .env.local avec ta clé API
npm run dev
```

Ouvrir **http://localhost:3000**

## Lancement rapide (utilisateur non-technique)

Au lieu de taper des commandes, double-clique sur le lanceur :

| Système | Fichier | Action |
|---------|---------|--------|
| **Windows** | `AnkiDocs.bat` | Double-clic dans l'explorateur |
| **Mac** | `AnkiDocs.command` | Double-clic dans le Finder |

Le lanceur fait tout automatiquement :
1. Vérifie que Node.js est installé
2. Installe les dépendances (première fois seulement)
3. Vérifie que la clé API est configurée (guide l'utilisateur sinon)
4. Démarre le serveur
5. Ouvre le navigateur sur l'application

Pour arrêter : fermer la fenêtre du terminal.

---

## Utilisation

1. **Glisse ton PDF** sur la zone de drop
2. **Vérifie les pages** — clique sur une page pour la retirer du traitement
3. **Ajuste les chunks** — choisis combien de pages par groupe (2 à 6)
4. **Configure** — cartes par chunk (2 à 10), difficulté, et vérifie le coût estimé
5. **Génère** — l'IA lit les images de tes pages et crée des flashcards
6. **Vérifie** — lis chaque carte, modifie si nécessaire, décoche les mauvaises
7. **Exporte** — télécharge le .apkg et importe-le dans Anki

### Déduplication

Si tu régénères des cartes sur le même PDF, l'IA reçoit l'historique des cartes précédentes et produit du contenu différent. Plus tu régénères, plus les cartes couvrent des aspects variés du cours.

---

## Architecture

```
src/
├── app/                     ← Next.js
│   ├── page.tsx             ← Flux principal (upload → config → résultats)
│   ├── api/
│   │   ├── generate/        ← POST : images → cartes via IA
│   │   └── export/          ← POST : cartes → fichier .apkg
│   ├── globals.css
│   └── layout.tsx
│
├── components/              ← Composants React
│   ├── PdfUploader.tsx      ← Drag & drop + rendu PDF → PNG (navigateur)
│   ├── PageSelector.tsx     ← Grille de pages groupées en chunks
│   ├── GenerationPanel.tsx  ← Config + estimation coût + bouton générer
│   └── CardResults.tsx      ← Preview + édition + sélection + export
│
├── engine/                  ← Traitement pur (ZÉRO dépendance framework)
│   ├── ai/
│   │   ├── aiClient.ts      ← Client unifié (Gemini / OpenAI)
│   │   ├── prompts.ts       ← Prompts avec déduplication
│   │   └── providers/
│   │       ├── gemini.ts
│   │       └── openai.ts
│   ├── generation/
│   │   ├── cardGenerator.ts  ← Pipeline : lots d'images → cartes
│   │   └── quizGenerator.ts
│   └── export/
│       └── ankiExporter.ts   ← Génération .apkg
│
├── cache/
│   └── cacheManager.ts      ← Historique des générations (JSON fichier)
│
└── shared/
    ├── types.ts              ← Types partagés
    └── config.ts             ← Configuration
```

### Principes

- **`engine/` n'importe jamais Next.js ou React.** Portable.
- **Le rendu PDF se fait dans le navigateur** (pdf.js). Le serveur ne voit que des images PNG.
- **Pas de base de données.** Le cache est un dossier de fichiers JSON.
- **2 API routes seulement** : generate et export. C'est tout.

### Pipeline

```
[Navigateur]                         [Serveur]
PDF → pdf.js → PNG par page            │
Sélection des pages                    │
     │                                 │
     └── POST /api/generate ────────▶  Découpe en lots de N pages
         { hash, images[], config }    Pour chaque lot → appel IA vision
                                       Charge historique (déduplication)
                                       Sauvegarde génération en cache
     ◀── { cards[], usage } ─────────  │
                                       │
Preview, édition, sélection            │
     │                                 │
     └── POST /api/export ──────────▶  Génère le fichier .apkg
     ◀── fichier binaire ────────────  │
```

---

## Configuration

Dans `.env.local` :

| Variable | Valeurs | Défaut |
|----------|---------|--------|
| `AI_PROVIDER` | `openai` ou `gemini` | `gemini` |
| `AI_MODEL` | selon le provider | `gemini-2.5-flash` |
| `OPENAI_API_KEY` | ta clé | — |
| `GEMINI_API_KEY` | ta clé | — |

### Coût estimé

| Document | Gemini 2.5 Flash | GPT-4o-mini |
|----------|-----------------|-------------|
| 20 pages | ~$0.01 | ~$0.01 |
| 50 pages | ~$0.02 | ~$0.02 |
| 80 pages | ~$0.04 | ~$0.02 |

---

## Dépannage

**"Clé API manquante"** → Vérifier `.env.local`

**"Connect Timeout"** → Proxy d'entreprise. Utiliser un réseau personnel ou `HTTPS_PROXY=http://proxy:port npm run dev`

**Le PDF ne se charge pas** → Vérifier que c'est un vrai PDF (pas un .docx renommé)

**Les cartes sont médiocres** → Réduire le nombre de pages par chunk (3 au lieu de 4) et baisser les cartes par chunk (3-4 au lieu de 5). Plus le lot est petit, plus l'IA est précise.
# RevisionAI
