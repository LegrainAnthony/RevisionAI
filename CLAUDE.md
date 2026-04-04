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
CACHE_DIR=./data/cache    # optional, this is the default
```

## Architecture

AnkiDocs transforms a PDF into Anki flashcards using AI vision. The key design decisions:

- **PDF rendering is client-side**: `pdfjs-dist` runs in the browser and converts PDF pages to base64 PNG images. The server never receives the PDF file — only the already-rendered images.
- **No database**: Generations are stored as JSON files in `data/cache/{hash}/` (one subfolder per document, identified by hash). `meta.json` holds document metadata and cumulative costs; `generations/*.json` holds card records used for deduplication.
- **Synchronous processing**: No job queue. The API route processes all image batches in a single request. For very long PDFs (200+ pages), the Next.js default timeout (~60s in dev) may cut the response short.

### Data flow

1. User uploads PDF → browser renders pages to PNG via `pdfjs-dist`
2. User selects pages + config → client POSTs `{ hash, images[], config }` to `/api/generate`
3. Server splits images into batches of 4, calls AI vision per batch, parses JSON cards
4. Cards + usage stats returned to client
5. User reviews/edits cards → exports via `/api/export` as Anki `.txt` (tab-separated, HTML-enabled)

### Key files

| Path | Purpose |
|------|---------|
| `src/shared/types.ts` | All shared types (`Card`, `Quiz`, `GenerationConfig`, `GenerationRecord`, etc.) |
| `src/shared/config.ts` | Runtime config from env vars + `CLIENT_DEFAULTS` (safe to expose to browser) |
| `src/engine/ai/aiClient.ts` | Single entry point for AI calls — dispatches to openai or gemini provider |
| `src/engine/ai/prompts.ts` | System prompt for card generation (tuned for kinesiology courses) |
| `src/engine/generation/cardGenerator.ts` | Batching logic, AI call loop, JSON parsing |
| `src/engine/export/ankiExporter.ts` | Generates tab-separated `.txt` importable by Anki (supports images via base64 HTML) |
| `src/cache/cacheManager.ts` | File-based cache CRUD (`ensureDocument`, `saveGeneration`, `getPreviousCards`) |
| `src/app/api/generate/route.ts` | POST `/api/generate` — orchestrates generation + cache |
| `src/app/api/export/route.ts` | POST `/api/export` — returns `.txt` file |
| `src/app/page.tsx` | Main page, state orchestration |
| `src/components/` | `PdfUploader`, `PageSelector`, `GenerationPanel`, `CardResults` |

### Adding a new AI provider

1. Create `src/engine/ai/providers/{name}.ts` implementing `callXxxVision` returning `AiVisionResponse`
2. Add the case in `src/engine/ai/aiClient.ts`
3. Add cost estimates in `estimateCost()`
4. Update `AI_PROVIDER` env var type in `src/shared/config.ts`

### Modifying the prompt

The card generation prompt lives entirely in `src/engine/ai/prompts.ts` — `buildCardPrompt()`. The quiz prompt (`buildQuizPrompt`) is commented out; the `quizGenerator.ts` engine is also partially disabled.

### Export format

Cards export as Anki-importable `.txt` (tab-separated, `#html:true`). Images attached by the user are embedded as base64 `<img>` tags. Cards with `cardMode: 'reverse'` get a second reversed line in the export.
