# AnkiDocs v2 — Documentation Technique Complète

---

## Table des matières

1. [Vue d'ensemble](#1--vue-densemble)
2. [Choix d'architecture](#2--choix-darchitecture)
3. [Structure du projet](#3--structure-du-projet)
4. [Types de données](#4--types-de-données)
5. [Configuration](#5--configuration)
6. [Flux de données complet](#6--flux-de-données-complet)
7. [Frontend — Composants React](#7--frontend--composants-react)
8. [Backend — API Routes](#8--backend--api-routes)
9. [Engine — Moteur de traitement](#9--engine--moteur-de-traitement)
10. [Cache — Persistance locale](#10--cache--persistance-locale)
11. [Diagramme de séquence](#11--diagramme-de-séquence)
12. [Comment modifier ou étendre](#12--comment-modifier-ou-étendre)

---

## 1 — Vue d'ensemble

### Ce que fait l'application

AnkiDocs transforme un PDF de cours en cartes Anki (flashcards) en utilisant
l'IA vision. L'IA "voit" directement les pages du PDF (texte, schémas, tableaux,
annotations) et génère des questions/réponses structurées.

### Pourquoi "vision-first"

Les cours ciblés (kinésithérapie) contiennent beaucoup de schémas anatomiques,
tableaux et dessins annotés. Un pipeline classique (extraction texte + OCR)
perd ces informations visuelles. L'IA vision les comprend directement.

### Stack technique

| Couche | Technologie | Pourquoi |
|--------|-------------|----------|
| Framework | Next.js 14 (App Router) | Full-stack, un seul projet |
| Langage | TypeScript (strict) | Sécurité des types, autocomplétion |
| UI | React + Tailwind CSS | Composants déclaratifs + CSS utilitaire |
| Rendu PDF | pdfjs-dist (côté navigateur) | Pas de dépendance serveur |
| IA | Gemini 2.5 Flash / GPT-4o-mini | Vision multimodale, coût faible |
| Export | anki-apkg-export | Génération .apkg en JS |
| Stockage | Fichiers JSON sur disque | Zéro dépendance (pas de BDD) |

### Métriques du code

| Module | Fichiers | Lignes |
|--------|----------|--------|
| Frontend (page + composants) | 5 | 793 |
| Backend (API routes + cache) | 3 | 225 |
| Engine (IA + génération + export) | 7 | 464 |
| Shared (types + config) | 2 | 127 |
| **Total** | **17 fichiers .ts/.tsx** | **1 609 lignes** |

---

## 2 — Choix d'architecture

### 2.1 — Séparation client / serveur

Le rendu PDF se fait **côté navigateur** (client), pas côté serveur.

**Raison :** pdfjs-dist en Node.js nécessite `node-canvas`, qui est une
dépendance C++ difficile à installer sur certaines machines. En utilisant
pdf.js dans le navigateur, on élimine cette dépendance. Le navigateur a
un moteur de rendu canvas natif.

**Conséquence :** le serveur ne reçoit jamais le PDF. Il reçoit des images
PNG en base64 envoyées par le client au moment de la génération.

### 2.2 — Pas de base de données

Le projet utilise des fichiers JSON sur disque au lieu de SQLite/Prisma.

**Raison :** l'application est mono-utilisateur (self-hosted). Les données
à persister sont simples (métadonnées de documents, historique des générations).
Une BDD ajouterait Prisma (~50 MB de node_modules), des migrations, et de la
complexité sans bénéfice réel.

**Conséquence :** le cache est un dossier `data/cache/` avec un sous-dossier
par document. Chaque sous-dossier contient `meta.json` et `generations/*.json`.

### 2.3 — Pas de job runner

Le traitement est synchrone dans les API routes.

**Raison :** un appel IA vision sur un lot de 4 pages prend 2 à 8 secondes.
Pour un PDF de 80 pages (20 lots), le total est ~40-160 secondes. C'est long
mais acceptable pour un outil perso — l'utilisateur voit un spinner et attend.
Un job runner (polling BDD, workers) ajouterait beaucoup de complexité.

**Limite :** si le timeout HTTP de Next.js est atteint (~60s par défaut
en dev), seuls les lots terminés avant le timeout seront retournés.
Pour des PDF très longs (200+ pages), il faudrait un système async.

### 2.4 — Engine séparé du framework

Le dossier `engine/` n'importe rien de Next.js, React, ou du cache.
Il prend des données en entrée et retourne des données en sortie.

**Raison :** portabilité. L'engine pourrait tourner dans un script CLI,
un worker, ou un autre framework. C'est aussi plus facile à tester.

### 2.5 — Déduplication par injection dans le prompt

Quand l'utilisateur régénère des cartes sur un même PDF, les cartes
précédentes sont injectées dans le prompt avec la consigne "ne PAS
reproduire de questions similaires".

**Raison :** c'est la solution la plus simple. L'alternative (embedding +
recherche de similarité) est beaucoup plus complexe et coûteuse.

**Limite :** on injecte les 50 dernières cartes maximum pour ne pas
exploser la fenêtre de contexte. Au-delà, les plus anciennes sont ignorées.

### 2.6 — Multi-provider via un client unifié

`aiClient.ts` est un routeur qui appelle le bon provider selon la config.
Les providers OpenAI et Gemini sont dans des fichiers séparés.

**Raison :** changer de provider = changer une variable d'environnement.
Le reste du code ne sait pas quel provider est utilisé.

---

## 3 — Structure du projet

```
ankidocs-v2/
│
├── .env.example              Configuration (template)
├── .env.local                Configuration (tes clés API — gitignored)
├── package.json              Dépendances
├── tsconfig.json             Config TypeScript
├── next.config.mjs           Config Next.js
├── tailwind.config.js        Config Tailwind CSS
├── postcss.config.js         Config PostCSS
├── AnkiDocs.bat              Lanceur Windows (double-clic)
├── AnkiDocs.command          Lanceur Mac (double-clic)
│
├── data/
│   └── cache/                Données persistantes (gitignored)
│       └── {hash}/           Un dossier par PDF
│           ├── meta.json     Métadonnées + coûts
│           └── generations/  Historique des générations
│
└── src/
    ├── shared/               Types et configuration
    │   ├── types.ts          Interfaces TypeScript partagées
    │   └── config.ts         Variables d'environnement centralisées
    │
    ├── cache/                Persistance locale
    │   └── cacheManager.ts   Lecture/écriture fichiers JSON
    │
    ├── engine/               Traitement pur (ZÉRO dépendance framework)
    │   ├── ai/
    │   │   ├── aiClient.ts       Routeur multi-provider
    │   │   ├── prompts.ts        Templates de prompts IA
    │   │   └── providers/
    │   │       ├── openai.ts     Appel API OpenAI vision
    │   │       └── gemini.ts     Appel API Gemini vision
    │   ├── generation/
    │   │   ├── cardGenerator.ts  Pipeline : images → cartes
    │   │   └── quizGenerator.ts  Pipeline : images → QCM
    │   └── export/
    │       └── ankiExporter.ts   Génération fichier .apkg
    │
    ├── components/            Composants React (UI)
    │   ├── PdfUploader.tsx    Drag & drop + rendu PDF
    │   ├── PageSelector.tsx   Grille de pages + sélection
    │   ├── GenerationPanel.tsx Config + estimation coût
    │   └── CardResults.tsx    Preview + édition + export
    │
    └── app/                   Next.js App Router
        ├── layout.tsx         Layout HTML racine
        ├── globals.css        Styles globaux + variables CSS
        ├── page.tsx           Page principale (orchestrateur)
        └── api/
            ├── generate/
            │   └── route.ts   POST : images → cartes via IA
            └── export/
                └── route.ts   POST : cartes → fichier .apkg
```

### Règle de dépendances entre les modules

```
page.tsx → components → (aucune dépendance serveur)
page.tsx → fetch(/api/...)

api/generate → cache + engine/generation
api/export  → engine/export

engine/generation → engine/ai
engine/ai         → engine/ai/providers
engine/*          → shared/types + shared/config

cache             → shared/types + shared/config
```

**`engine/` n'importe jamais `cache/`, `app/`, ou `components/`.**
**`components/` n'importe jamais `engine/`, `cache/`, ou `app/api/`.**

---

## 4 — Types de données

Tous les types sont dans `src/shared/types.ts`.

### Card

```typescript
interface Card {
  id: string;            // Identifiant unique (ex: "card-1711234567-0")
  question: string;      // Question de la flashcard
  answer: string;        // Réponse
  type: CardType;        // Type de question (voir ci-dessous)
  difficulty: Difficulty; // "easy" | "medium" | "hard"
  sourceSection: string; // Section du cours d'où vient la carte
  selected: boolean;     // Cochée pour l'export (true par défaut)
}

type CardType =
  | 'definition'     // "Qu'est-ce que le muscle deltoïde ?"
  | 'process'        // "Quelles sont les étapes de la mitose ?"
  | 'comparison'     // "Quelle différence entre abduction et adduction ?"
  | 'application'    // "Dans quel cas utilise-t-on cette technique ?"
  | 'cause_effect'   // "Pourquoi X entraîne-t-il Y ?"
  | 'cloze';         // "Le {{c1::biceps brachial}} fléchit l'avant-bras"
```

### Quiz

```typescript
interface Quiz {
  id: string;
  question: string;
  choices: QuizChoice[];      // Toujours 4 choix (A, B, C, D)
  explanation: string;        // Explication de la bonne réponse
  difficulty: Difficulty;
  sourceSection: string;
  selected: boolean;
}

interface QuizChoice {
  label: string;     // "A", "B", "C", "D"
  text: string;      // Texte du choix
  correct: boolean;  // true pour la bonne réponse (une seule)
}
```

### GenerationConfig

```typescript
interface GenerationConfig {
  mode: GenerationMode;       // "cards" | "quiz" | "both"
  cardCount: number;          // Nombre total de cartes souhaitées
  quizCount: number;          // Nombre total de QCM souhaités
  difficulty: Difficulty | 'mixed';
  selectedPages: number[];    // Numéros de pages sélectionnées (1-indexed)
}
```

### DocumentMeta (cache)

```typescript
interface DocumentMeta {
  hash: string;          // Hash SHA-256 tronqué (16 chars)
  fileName: string;      // Nom du PDF original
  pageCount: number;
  createdAt: string;     // ISO 8601
  costs: {
    total: number;       // Coût cumulé en USD (toutes générations)
    history: {           // Détail par génération
      id: string;
      cost: number;
      date: string;
    }[];
  };
}
```

### GenerationRecord (cache)

```typescript
interface GenerationRecord {
  id: string;                // "gen-1711234567890"
  mode: GenerationMode;
  cards: Card[];             // Cartes générées dans ce run
  quizzes: Quiz[];           // QCM générés dans ce run
  selectedPages: number[];   // Pages traitées
  costUsd: number;           // Coût de cette génération
  provider: string;          // "openai" ou "gemini"
  model: string;             // "gpt-4o-mini", "gemini-2.5-flash", etc.
  createdAt: string;
}
```

---

## 5 — Configuration

Fichier : `src/shared/config.ts`

### Variables serveur (CONFIG)

Lues depuis `process.env` (fichier `.env.local`). **Contiennent les clés API — jamais exposées au client.**

| Variable | Type | Défaut | Rôle |
|----------|------|--------|------|
| `AI_PROVIDER` | `'openai' \| 'gemini'` | `'gemini'` | Provider IA actif |
| `AI_MODEL` | `string` | `'gemini-2.5-flash'` | Modèle à utiliser |
| `OPENAI_API_KEY` | `string` | `''` | Clé API OpenAI |
| `GEMINI_API_KEY` | `string` | `''` | Clé API Gemini |
| `CACHE_DIR` | `string` | `'./data/cache'` | Chemin du cache |
| `MAX_FILE_SIZE_MB` | `number` | `50` | Taille max upload |

### Constantes fixes

| Constante | Valeur | Rôle |
|-----------|--------|------|
| `pagesPerBatch` | `4` | Pages envoyées par appel IA |
| `cardsPerChunk` | `5` | Cartes demandées par chunk |

### Constantes client (CLIENT_DEFAULTS)

Utilisées dans le frontend pour l'estimation de coût sans appel serveur.

| Constante | Valeur | Rôle |
|-----------|--------|------|
| `costPerImage.gemini` | `$0.00008` | Coût estimé par image (input) |
| `costPerImage.openai` | `$0.0002` | Idem OpenAI |
| `costPerCard.gemini` | `$0.00025` | Coût estimé par carte (output) |
| `costPerCard.openai` | `$0.00006` | Idem OpenAI |

---

## 6 — Flux de données complet

### Étape 1 — Upload et rendu (côté client uniquement)

```
[Utilisateur]                 [Navigateur]
Glisse un PDF  ───────────▶  PdfUploader.tsx
                              │
                              ├─ Vérifie : type = PDF, taille < 50 MB
                              ├─ Import dynamique de pdfjs-dist
                              ├─ Configure le worker PDF (CDN)
                              ├─ pdf.getDocument(arrayBuffer)
                              │
                              ├─ Pour chaque page (1..N) :
                              │   ├─ page.getViewport({ scale })
                              │   ├─ scale = min(1024/width, 1024/height, 2)
                              │   ├─ Crée un <canvas> en mémoire
                              │   ├─ page.render({ canvasContext, viewport })
                              │   └─ canvas.toDataURL('image/png') → base64
                              │
                              └─ Appelle onComplete(fileName, string[])
                                 Les images base64 sont stockées dans
                                 le state React de page.tsx
```

**Rien n'est envoyé au serveur à cette étape.** Les images vivent dans la mémoire du navigateur.

### Étape 2 — Sélection des pages (côté client)

```
[page.tsx state]
  pages: string[]        ← les images base64
  selected: boolean[]    ← true/false par page

[PageSelector.tsx]
  Affiche les pages groupées en chunks de N
  Clic sur une page → toggle selected[i]
  Boutons 2/3/4/5/6 → change pagesPerChunk

[GenerationPanel.tsx]
  Calcule en temps réel :
    chunkCount = ceil(selectedCount / pagesPerChunk)
    totalCards = chunkCount × cardsPerChunk
    cost = selectedCount × costPerImage + totalCards × costPerCard
```

### Étape 3 — Génération (client → serveur → IA)

```
[Client]                         [Serveur: POST /api/generate]
Envoie :                          │
  hash (identifiant PDF)          │
  fileName                        │
  pageCount                       │
  images[] (base64 sélectionnées) │
  config (mode, counts, diff)     │
                                  │
                                  ▼
                           1. cache.ensureDocument(hash, ...)
                              Crée data/cache/{hash}/ si inexistant
                                  │
                           2. cache.getPreviousCards(hash)
                              Lit toutes les generations/*.json
                              Extrait les cartes → Card[]
                                  │
                           3. generateCards(images, config, previousCards)
                              ├─ splitBatches(images, 4)
                              │   → [[page1,page2,page3,page4], [page5,...], ...]
                              │
                              ├─ Pour chaque batch :
                              │   ├─ buildCardPrompt(cardsPerBatch, difficulty, allPreviousCards)
                              │   │   Le prompt inclut les cartes des batches
                              │   │   PRÉCÉDENTS de ce run + les générations passées
                              │   │
                              │   ├─ callVision(prompt, batchImages)
                              │   │   → Routeur : CONFIG.aiProvider = "gemini" ?
                              │   │     → callGeminiVision(prompt, images, userText)
                              │   │       POST https://generativelanguage.googleapis.com/...
                              │   │       Body : { systemInstruction, contents[parts[text + images]] }
                              │   │     → callOpenAiVision(prompt, images, userText)
                              │   │       POST https://api.openai.com/v1/chat/completions
                              │   │       Body : { messages[system + user[text + image_urls]] }
                              │   │
                              │   ├─ parseCards(response.text)
                              │   │   JSON.parse → data.cards.map(...)
                              │   │   Gère les backticks markdown et erreurs de parsing
                              │   │
                              │   └─ allCards.push(...parsed)
                              │
                              ├─ Troncature : allCards.slice(0, config.cardCount)
                              ├─ Attribution des IDs : card-{timestamp}-{index}
                              └─ estimateCost(totalInputTokens, totalOutputTokens)
                                  │
                           4. cache.saveGeneration(hash, record)
                              Écrit generations/gen-{timestamp}.json
                              Met à jour meta.json (costs.total += ...)
                                  │
                           5. Retourne :
                              { cards, usage: { inputTokens, outputTokens, costUsd } }
```

### Étape 4 — Preview et export (côté client + serveur)

```
[CardResults.tsx]
  Affiche chaque carte avec :
    ☑ checkbox (selected)
    Question (texte)
    Réponse (texte)
    Tags (type, difficulty, sourceSection)
    Bouton "Modifier" → textarea inline

[Export : POST /api/export]
  Client envoie : { cards (filtrées selected=true), deckName }
  Serveur :
    1. exportToAnki(cards, deckName)
       ├─ new AnkiExport(deckName)
       ├─ Pour chaque carte :
       │   apkg.addCard(question, formatBack(answer + tags))
       └─ apkg.save() → Buffer (fichier ZIP .apkg)
    2. Retourne le Buffer en réponse HTTP
       Content-Type: application/octet-stream
  Client :
    Reçoit un Blob → crée un lien <a download> → clic auto
    L'utilisateur voit le fichier téléchargé
```

---

## 7 — Frontend — Composants React

### 7.1 — page.tsx (orchestrateur)

**Fichier :** `src/app/page.tsx` — 276 lignes

**Rôle :** C'est le chef d'orchestre. Il gère tout l'état de l'application
et coordonne les composants enfants. Aucune logique métier ici — seulement
de la gestion d'état et des appels fetch.

**État (useState) :**

| Variable | Type | Rôle |
|----------|------|------|
| `step` | `'upload' \| 'configure' \| 'results'` | Étape courante |
| `fileName` | `string` | Nom du PDF |
| `pdfHash` | `string` | Hash SHA-256 du PDF (16 chars) |
| `pages` | `string[]` | Images base64 de toutes les pages |
| `selected` | `boolean[]` | Sélection par page |
| `pagesPerChunk` | `number` | Pages par chunk (défaut: 4) |
| `cardsPerChunk` | `number` | Cartes par chunk (défaut: 5) |
| `difficulty` | `Difficulty \| 'mixed'` | Difficulté choisie |
| `cards` | `Card[]` | Cartes générées |
| `costUsd` | `number` | Coût de la dernière génération |
| `generating` | `boolean` | Spinner pendant la génération |
| `exporting` | `boolean` | Spinner pendant l'export |
| `error` | `string \| null` | Message d'erreur affiché |

**Fonctions :**

| Fonction | Déclencheur | Action |
|----------|-------------|--------|
| `handlePdfRendered(name, pages)` | PdfUploader termine le rendu | Stocke les images, calcule le hash, passe à l'étape "configure" |
| `togglePage(index)` | Clic sur une page dans PageSelector | Inverse `selected[index]` |
| `handleGenerate()` | Clic sur le bouton "Générer" | Collecte les images sélectionnées, POST /api/generate, stocke les cartes |
| `handleExport()` | Clic sur "Exporter .apkg" | POST /api/export avec les cartes sélectionnées, télécharge le fichier |
| `handleReset()` | Clic sur "Nouveau document" | Remet tout l'état à zéro, retourne à l'étape "upload" |
| `computeHash(input)` | Interne | SHA-256 via Web Crypto API (côté client) |
| `downloadBlob(blob, name)` | Interne | Crée un lien `<a download>` et clique dessus |

---

### 7.2 — PdfUploader.tsx

**Fichier :** `src/components/PdfUploader.tsx` — 103 lignes

**Rôle :** Zone de drag & drop. Quand un PDF est déposé, il est rendu
page par page en images PNG côté navigateur via pdf.js.

**Props :**

| Prop | Type | Rôle |
|------|------|------|
| `onComplete` | `(fileName: string, pages: string[]) => void` | Callback appelé quand toutes les pages sont rendues |

**Comportement :**
1. L'utilisateur glisse un PDF ou clique pour sélectionner
2. Validation : type = PDF, taille < 50 MB
3. Import dynamique de `pdfjs-dist` (chargé seulement quand nécessaire)
4. Le worker pdf.js est chargé depuis le CDN (évite le bundling)
5. Pour chaque page : rendu dans un canvas (max 1024px de côté) → base64
6. Barre de progression : "Rendu page X / N"
7. Appel de `onComplete` avec le nom du fichier et les images

---

### 7.3 — PageSelector.tsx

**Fichier :** `src/components/PageSelector.tsx` — 97 lignes

**Rôle :** Affiche les miniatures des pages groupées visuellement en chunks.
L'utilisateur clique sur une page pour la retirer du traitement.

**Props :**

| Prop | Type | Rôle |
|------|------|------|
| `pages` | `string[]` | Images base64 |
| `selected` | `boolean[]` | État de sélection par page |
| `pagesPerChunk` | `number` | Taille des groupes |
| `onToggle` | `(index: number) => void` | Toggle la sélection d'une page |
| `onChunkSizeChange` | `(n: number) => void` | Change le nombre de pages par chunk |

**Affichage :**
- Barre supérieure : compteur "X / Y pages sélectionnées" + boutons 2/3/4/5/6
- Groupes visuels : chaque chunk est un cadre avec un label "Chunk N"
- Pages désélectionnées : opacité réduite + grayscale
- Chaque miniature a un numéro de page en overlay

---

### 7.4 — GenerationPanel.tsx

**Fichier :** `src/components/GenerationPanel.tsx` — 143 lignes

**Rôle :** Panneau de configuration. Slider cartes/chunk, sélecteur de
difficulté, et estimation de coût en temps réel.

**Props :**

| Prop | Type | Rôle |
|------|------|------|
| `selectedPageCount` | `number` | Nombre de pages sélectionnées |
| `pagesPerChunk` | `number` | Pages par chunk (pour le calcul) |
| `cardsPerChunk` | `number` | Valeur du slider |
| `difficulty` | `Difficulty \| 'mixed'` | Difficulté sélectionnée |
| `provider` | `'openai' \| 'gemini'` | Provider pour l'estimation |
| `onCardsPerChunkChange` | `(n: number) => void` | Slider change |
| `onDifficultyChange` | `(d) => void` | Bouton difficulté cliqué |
| `onGenerate` | `() => void` | Clic sur "Générer" |
| `loading` | `boolean` | État de chargement |

**Estimation de coût (fonction `estimateCostClient`) :**
```
coût = (pageCount × costPerImage) + (cardCount × costPerCard)
```
Tout est calculé localement — pas d'appel serveur.

---

### 7.5 — CardResults.tsx

**Fichier :** `src/components/CardResults.tsx` — 174 lignes

**Rôle :** Affiche les cartes générées avec des contrôles de sélection
et d'édition.

**Props :**

| Prop | Type | Rôle |
|------|------|------|
| `cards` | `Card[]` | Cartes à afficher |
| `costUsd` | `number` | Coût de la génération |
| `onUpdate` | `(cards: Card[]) => void` | Mise à jour du tableau complet |
| `onExport` | `() => void` | Clic sur "Exporter" |
| `onReset` | `() => void` | Clic sur "Nouveau document" |
| `exporting` | `boolean` | État de chargement export |

**Fonctionnalités :**
- **Checkbox** : clic → toggle `card.selected`
- **Édition inline** : clic "Modifier" → les champs question/answer deviennent
  des `<textarea>`. Clic "Terminé" → retour en mode lecture.
- **Sélection groupée** : boutons "Tout sélectionner" / "Tout désélectionner"
- **Export** : bouton vert, affiche le nombre de cartes sélectionnées

---

## 8 — Backend — API Routes

### 8.1 — POST /api/generate

**Fichier :** `src/app/api/generate/route.ts` — 63 lignes

**Rôle :** Reçoit les images des pages sélectionnées, génère des cartes
via l'IA, sauvegarde l'historique dans le cache.

**Requête :**

```json
{
  "hash": "a1b2c3d4e5f67890",
  "fileName": "anatomie-epaule.pdf",
  "pageCount": 80,
  "images": ["base64...", "base64...", "..."],
  "config": {
    "mode": "cards",
    "cardCount": 25,
    "quizCount": 0,
    "difficulty": "mixed",
    "selectedPages": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  }
}
```

**Étapes internes :**

1. Validation : hash, images[], config requis
2. `cache.ensureDocument(hash, fileName, pageCount)` — crée le dossier si nouveau
3. `cache.getPreviousCards(hash)` — charge l'historique pour déduplication
4. `generateCards(images, config, previousCards)` — appels IA par lots
5. `cache.saveGeneration(hash, record)` — sauvegarde pour déduplication future
6. Retourne `{ cards, usage: { inputTokens, outputTokens, costUsd } }`

**Réponse (200) :**

```json
{
  "cards": [
    {
      "id": "card-1711234567-0",
      "question": "Quel muscle est responsable de l'abduction du bras ?",
      "answer": "Le muscle deltoïde (faisceau moyen).",
      "type": "definition",
      "difficulty": "easy",
      "sourceSection": "Muscles de l'épaule",
      "selected": true
    }
  ],
  "usage": {
    "inputTokens": 5200,
    "outputTokens": 1800,
    "costUsd": 0.0061
  }
}
```

---

### 8.2 — POST /api/export

**Fichier :** `src/app/api/export/route.ts` — 34 lignes

**Rôle :** Reçoit les cartes sélectionnées, retourne un fichier .apkg.

**Requête :**

```json
{
  "cards": [{ "id": "...", "question": "...", "answer": "...", "selected": true, "..." }],
  "deckName": "anatomie-epaule"
}
```

**Étapes internes :**

1. Filtre les cartes avec `selected === true`
2. `exportToAnki(selected, deckName)` → Buffer
3. Retourne le Buffer avec `Content-Type: application/octet-stream`

**Réponse :** fichier binaire .apkg (téléchargement direct)

---

## 9 — Engine — Moteur de traitement

### 9.1 — aiClient.ts (routeur)

**Fichier :** `src/engine/ai/aiClient.ts` — 42 lignes

**Méthodes :**

| Méthode | Signature | Rôle |
|---------|-----------|------|
| `callVision` | `(systemPrompt, imagesBase64[], userText?) → AiVisionResponse` | Appelle le bon provider selon CONFIG.aiProvider |
| `estimateCost` | `(inputTokens, outputTokens) → number` | Calcule le coût en USD à partir des tokens |

**`AiVisionResponse` :**

```typescript
{ text: string; inputTokens: number; outputTokens: number }
```

---

### 9.2 — providers/openai.ts

**Fichier :** `src/engine/ai/providers/openai.ts` — 69 lignes

**Méthode :** `callOpenAiVision(systemPrompt, imagesBase64[], userText) → AiVisionResponse`

**Détails techniques :**
- Endpoint : `POST https://api.openai.com/v1/chat/completions`
- Les images sont envoyées en `data:image/png;base64,{data}` dans le contenu `user`
- Mode `detail: 'low'` : ~3-4x moins cher que `'high'`, suffisant pour du cours
- `response_format: { type: 'json_object' }` : force une réponse JSON
- `temperature: 0.7` : équilibre entre créativité et cohérence

---

### 9.3 — providers/gemini.ts

**Fichier :** `src/engine/ai/providers/gemini.ts` — 67 lignes

**Méthode :** `callGeminiVision(systemPrompt, imagesBase64[], userText) → AiVisionResponse`

**Détails techniques :**
- Endpoint : `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
- La clé API est dans l'URL (`?key=...`), pas dans un header
- Le prompt système va dans `systemInstruction`, pas dans `contents`
- Les images sont dans `inline_data: { mime_type, data }` dans le tableau `parts`
- `responseMimeType: 'application/json'` : équivalent Gemini du mode JSON

---

### 9.4 — prompts.ts

**Fichier :** `src/engine/ai/prompts.ts` — 98 lignes

**Méthodes :**

| Méthode | Signature | Rôle |
|---------|-----------|------|
| `buildCardPrompt` | `(count, difficulty, previousCards[]) → string` | Construit le prompt système pour les cartes |
| `buildQuizPrompt` | `(count, difficulty, previousQuizzes[]) → string` | Construit le prompt système pour les QCM |

**Structure du prompt (cartes) :**

```
1. Rôle : "Tu es un expert en pédagogie médicale..."
2. Consigne : "Génère exactement N cartes"
3. Règles de qualité (8 règles)
4. Interdictions (4 anti-patterns)
5. [Si déduplication] Liste des questions déjà générées + "génère des cartes DIFFÉRENTES"
6. Format de sortie JSON strict
```

**Déduplication :** les 50 dernières cartes sont injectées sous forme de liste
de questions. L'IA est instruite de ne pas reproduire de questions similaires.
Les cartes du run actuel sont aussi ajoutées progressivement (chaque batch
voit les cartes des batches précédents).

---

### 9.5 — cardGenerator.ts

**Fichier :** `src/engine/generation/cardGenerator.ts` — 78 lignes

**Méthode :** `generateCards(pagesBase64[], config, previousCards[]) → CardResult`

**Pipeline :**

1. `splitBatches(images, CONFIG.pagesPerBatch)` — découpe en lots de 4
2. Pour chaque batch :
   - `buildCardPrompt(cardsPerBatch, difficulty, [...previousCards, ...allCards])`
   - `callVision(prompt, batchImages)`
   - `parseCards(response.text)` → Card[]
   - Ajoute au tableau accumulé
3. Tronque au nombre demandé
4. Attribue les IDs
5. Calcule le coût total

**Fonctions internes :**

| Fonction | Rôle |
|----------|------|
| `parseCards(text)` | JSON.parse le texte de l'IA. Gère les backticks markdown que l'IA ajoute parfois. Retourne `[]` si le parsing échoue. |
| `splitBatches(items, size)` | Découpe un tableau en sous-tableaux de taille fixe. |

---

### 9.6 — quizGenerator.ts

**Fichier :** `src/engine/generation/quizGenerator.ts` — 76 lignes

Identique à `cardGenerator.ts` mais pour les QCM. Utilise `buildQuizPrompt`
et parse un format `{ questions: [...] }` au lieu de `{ cards: [...] }`.

---

### 9.7 — ankiExporter.ts

**Fichier :** `src/engine/export/ankiExporter.ts` — 34 lignes

**Méthode :** `exportToAnki(cards[], deckName?) → Buffer`

**Détails :**
- Utilise la librairie `anki-apkg-export` (import dynamique)
- Chaque carte est ajoutée avec `apkg.addCard(front, back)`
- Le verso (`back`) est enrichi avec les métadonnées : section source, type, difficulté
- Les cartes cloze utilisent la question comme recto (contient `{{c1::...}}`)
- `apkg.save()` retourne un Buffer ZIP (le format .apkg est un ZIP)

**`formatBack(card)` :**

```html
Réponse de la carte
<hr>
<small>📖 Section source</small><br>
<small>🏷️ definition · medium</small>
```

---

## 10 — Cache — Persistance locale

**Fichier :** `src/cache/cacheManager.ts` — 128 lignes

### Structure sur disque

```
data/cache/
  a1b2c3d4e5f67890/              ← hash du PDF
    meta.json                     ← métadonnées + coûts cumulés
    generations/
      gen-1711234567890.json      ← première génération
      gen-1711234599999.json      ← deuxième génération (cartes différentes)
```

### Méthodes

| Méthode | Signature | Rôle |
|---------|-----------|------|
| `dir(hash)` | `(string) → string` | Retourne le chemin du dossier cache |
| `ensureDocument(hash, fileName, pageCount)` | `→ void` | Crée le dossier + meta.json si inexistant |
| `getMeta(hash)` | `→ DocumentMeta \| null` | Lit meta.json |
| `saveGeneration(hash, record)` | `→ void` | Écrit le record JSON + met à jour les coûts dans meta.json |
| `getPreviousCards(hash)` | `→ Card[]` | Lit toutes les generations/*.json, extrait les cartes |
| `getPreviousQuizzes(hash)` | `→ Quiz[]` | Idem pour les QCM |

### Gestion des erreurs

Toutes les méthodes de lecture (`getMeta`, `getPreviousCards`, etc.) utilisent
un `try/catch` qui retourne `null` ou `[]` en cas d'erreur. Si le cache est
corrompu ou le dossier supprimé, l'application fonctionne quand même —
elle perd juste la déduplication.

---

## 11 — Diagramme de séquence

```
 Utilisateur          Navigateur             Serveur              API IA
     │                    │                     │                    │
     │  Drop PDF          │                     │                    │
     │──────────────────▶│                     │                    │
     │                    │                     │                    │
     │                    │ pdf.js render        │                    │
     │                    │ pages → PNG base64   │                    │
     │                    │                     │                    │
     │  ◀── Miniatures ──│                     │                    │
     │                    │                     │                    │
     │  Sélection pages   │                     │                    │
     │  Config (cartes,   │                     │                    │
     │  difficulté)       │                     │                    │
     │──────────────────▶│                     │                    │
     │                    │                     │                    │
     │                    │  POST /api/generate  │                    │
     │                    │  { hash, images,     │                    │
     │                    │    config }          │                    │
     │                    │────────────────────▶│                    │
     │                    │                     │                    │
     │                    │                     │ ensureDocument()    │
     │                    │                     │ getPreviousCards()  │
     │                    │                     │                    │
     │                    │                     │ Batch 1 (4 pages)  │
     │                    │                     │───────────────────▶│
     │                    │                     │  ◀── JSON cartes ──│
     │                    │                     │                    │
     │                    │                     │ Batch 2 (4 pages)  │
     │                    │                     │───────────────────▶│
     │                    │                     │  ◀── JSON cartes ──│
     │                    │                     │                    │
     │                    │                     │ ... (N batches)    │
     │                    │                     │                    │
     │                    │                     │ saveGeneration()   │
     │                    │                     │                    │
     │                    │ ◀── { cards, usage } │                    │
     │                    │                     │                    │
     │  ◀── Cartes ──────│                     │                    │
     │                    │                     │                    │
     │  Édition, sélection│                     │                    │
     │                    │                     │                    │
     │  Export .apkg      │                     │                    │
     │──────────────────▶│                     │                    │
     │                    │  POST /api/export    │                    │
     │                    │────────────────────▶│                    │
     │                    │                     │ exportToAnki()     │
     │                    │ ◀── fichier .apkg ──│                    │
     │                    │                     │                    │
     │  ◀── Téléchargement│                     │                    │
```

---

## 12 — Comment modifier ou étendre

### Ajouter un nouveau provider IA

1. Créer `src/engine/ai/providers/monProvider.ts`
2. Exporter une fonction `callMonProviderVision(systemPrompt, images, userText) → AiVisionResponse`
3. Ajouter le case dans `aiClient.ts` → `callVision()`
4. Ajouter les prix dans `estimateCost()`
5. Mettre à jour `CONFIG` dans `config.ts` avec la nouvelle clé API

### Modifier le prompt

Fichier unique : `src/engine/ai/prompts.ts`. Modifier directement
`buildCardPrompt()` ou `buildQuizPrompt()`. Le prompt est le facteur
de qualité n°1 — tester chaque modification sur 2-3 PDF différents.

### Changer le nombre de pages par chunk

Variable `pagesPerBatch` dans `src/shared/config.ts`. Valeur recommandée :
3 à 5. En dessous de 3, l'IA manque de contexte. Au-dessus de 6,
elle commence à survoler.

### Ajouter le support d'images (PNG directes, sans PDF)

1. Créer un composant `ImageUploader.tsx` similaire à `PdfUploader.tsx`
2. Au lieu de pdf.js, lire les fichiers en base64 directement
3. Le reste du pipeline (page.tsx → api/generate → engine) ne change pas —
   il travaille déjà avec des images base64

### Ajouter l'export QCM (Moodle, Kahoot)

1. Créer `src/engine/export/moodleExporter.ts` (format GIFT texte)
2. Créer `src/engine/export/kahootExporter.ts` (format CSV)
3. Ajouter les cas dans `api/export/route.ts`
4. Ajouter des boutons d'export dans `CardResults.tsx`
