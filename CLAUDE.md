# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server (Next.js)
npm run build    # Production build
npm run start    # Start production server
```

No test suite is configured.

## Environment Variables

Create a `.env.local` file at the root:

```
AI_PROVIDER=gemini        # or "openai"
AI_MODEL=gemini-2.5-flash # or "gpt-4o-mini"
GEMINI_API_KEY=...
OPENAI_API_KEY=...
```

These are **server-side fallbacks**. Users can override provider, model, and API key directly from the settings panel in the UI — those values are stored in `localStorage` and sent with each request.

## Architecture

AnkiDocs transforms a PDF into Anki flashcards using AI vision. The key design decisions:

- **PDF rendering is client-side**: `pdfjs-dist` runs in the browser and converts PDF pages to base64 PNG images. The server never receives the PDF file — only the already-rendered images.
- **Stateless**: No database, no cache. Each generation is independent — cards are returned directly in the API response and live in the browser's React state only.
- **Synchronous processing**: No job queue. The API route processes all image batches in a single request. For very long PDFs (200+ pages), the Next.js default timeout (~60s in dev) may cut the response short.
- **User settings in localStorage**: Provider, API key, model, pagesPerBatch, cardsPerChunk, and active prompt profile are stored client-side and sent with every `/api/generate` request. Server env vars are used as fallback only.

### Data flow

1. User uploads PDF → browser renders pages to PNG via `pdfjs-dist`
2. User selects pages + config → client POSTs `{ images[], config, settings, chunkCardOverrides }` to `/api/generate`
3. Server resolves AI provider/model/key from `settings` (falls back to env vars)
4. Server splits images into batches of `settings.pagesPerBatch`, calls AI vision per batch using the active prompt profile. Each batch uses `chunkCardOverrides[i]` if set, otherwise `settings.cardsPerChunk`.
5. Each card is tagged with `sourcePages` (the page numbers of the batch it was generated from)
6. Cards + usage stats returned to client
7. User reviews/edits cards → exports via `/api/export` as Anki `.txt` (tab-separated, HTML-enabled)

### Key files

| Path | Purpose |
|------|---------|
| `src/shared/types.ts` | All shared types (`Card`, `AppSettings`, `PromptProfile`, `GenerationConfig`, etc.) |
| `src/shared/config.ts` | Runtime config from env vars (server-side fallbacks). `pagesPerBatch` defaults to `1`. |
| `src/hooks/useSettings.ts` | React hook — reads/writes `AppSettings` to `localStorage` |
| `src/engine/ai/aiClient.ts` | Single entry point for AI calls — dispatches to openai or gemini provider. Accepts `AiOverrides` to override provider/model/apiKey at call time. |
| `src/engine/ai/prompts.ts` | All prompt profiles. `buildCardPrompt()` dispatches to the right prompt based on `profileId`. |
| `src/engine/generation/cardGenerator.ts` | Batching logic, AI call loop, JSON parsing. Tags each card with `sourcePages`. |
| `src/engine/export/ankiExporter.ts` | Generates tab-separated `.txt` importable by Anki (supports images via base64 HTML) |
| `src/app/api/generate/route.ts` | POST `/api/generate` — resolves settings overrides, orchestrates generation |
| `src/app/api/export/route.ts` | POST `/api/export` — returns `.txt` file |
| `src/app/page.tsx` | Main page, state orchestration, passes `settings` to all API calls |
| `src/components/PdfUploader.tsx` | PDF upload + client-side rendering to base64 PNG |
| `src/components/PageSelector.tsx` | Page grid with chunk size control and per-chunk card count override |
| `src/components/GenerationPanel.tsx` | Right-side panel: cards/chunk, difficulty, generate button |
| `src/components/CardResults.tsx` | Card list with edit, drag-and-drop, image upload, source page badge |
| `src/components/SettingsPanel.tsx` | Settings modal: prompt profiles, AI provider, API key, model, batch params |
| `src/components/PromptEditor.tsx` | Modal form to create/edit custom prompt profiles |

## Prompt Profiles

Five predefined profiles are available, each with a tailored prompt:

| ID | Name | Target domain |
|----|------|---------------|
| `general` | Général | Any subject — universal defaults |
| `kine` | Kinésithérapie | Anatomy, physiology, biomechanics |
| `info` | Informatique | Programming, software architecture, algorithms |
| `vente` | Vente & Commerce | Sales techniques, negotiation, commercial methods |
| `langues` | Langues étrangères | Vocabulary, grammar, expressions |

Users can also create **custom profiles** with four free-text fields:
- **Contexte** — who the student is and what the course is about
- **Règles** — mandatory instructions for the AI
- **Recommandations** — preferred (but not mandatory) behaviors
- **Interdits** — what the AI must never do

Custom profiles are stored in `localStorage` as part of `AppSettings.customProfiles`. The active profile ID is `AppSettings.activeProfileId`.

### Adding a new predefined profile

1. Add a `buildXxxPrompt(count, difficulty)` function in `src/engine/ai/prompts.ts`
2. Add its `case` in the `switch` inside `buildCardPrompt()`
3. Add its metadata entry in `PREDEFINED_PROFILES` in `src/components/SettingsPanel.tsx`

## Card fields

Each `Card` object includes:

| Field | Description |
|-------|-------------|
| `id` | Unique identifier |
| `question` / `answer` | Card content |
| `type` | `definition`, `process`, `comparison`, etc. |
| `difficulty` | `easy`, `medium`, `hard` |
| `sourceSection` | Section/theme label returned by the AI |
| `sourcePages` | Page numbers of the PDF batch that generated the card |
| `selected` | Whether the card is selected for export |
| `frontImages` / `backImages` | Base64 PNGs added manually by the user |
| `cardMode` | `basic` or `reverse` (reverse adds a mirrored card in the Anki export) |

## AppSettings fields

Stored in `localStorage` under the key `ankidocs_settings`.

| Field | Default | Description |
|-------|---------|-------------|
| `provider` | `'gemini'` | AI provider |
| `apiKey` | `''` | User API key (overrides `.env.local`) |
| `model` | `'gemini-2.5-flash'` | Model identifier |
| `pagesPerBatch` | `1` | Pages sent per AI request (1 = max precision) |
| `cardsPerChunk` | `5` | Cards generated per batch |
| `activeProfileId` | `'general'` | ID of the active prompt profile |
| `customProfiles` | `[]` | User-created `PromptProfile[]` |
| `exportTags` | `false` | Include Anki tags (type, difficulty, sourceSection) in export. Off by default. |

## Adding a new AI provider

1. Create `src/engine/ai/providers/{name}.ts` implementing `callXxxVision(prompt, images, userText, overrides?)` returning `AiVisionResponse`
2. Add the case in `src/engine/ai/aiClient.ts` (`callVision` and `estimateCost`)
3. Add cost estimates in `estimateCost()`
4. Update `AI_PROVIDER` env var type in `src/shared/config.ts`
5. Add the provider button in `src/components/SettingsPanel.tsx`

## Export format

Cards export as Anki-importable `.txt` (tab-separated, `#html:true`). Images attached by the user are embedded as base64 `<img>` tags. Cards with `cardMode: 'reverse'` get a second reversed line in the export.

By default **no tags are added** to exported cards. When `settings.exportTags = true`, each card gets tags for `type`, `difficulty`, and `sourceSection` (spaces replaced by `_`). The `exportToAnkiTxt` function in `ankiExporter.ts` accepts an `includeTags` boolean parameter.

List items in card text (`- item`, `* item`, `• item`, `1. item`) are automatically converted to `<ul><li>` HTML before export so they render as proper vertical lists in Anki. This is handled by `renderLists()` in `ankiExporter.ts`, applied to both the front and back of each card.
