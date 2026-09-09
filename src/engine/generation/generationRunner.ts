import type {
  Card,
  ChunkStatus,
  ImageDetail,
  GenerateChunkRequest,
  GenerateChunkResponse,
  GenerationChunk,
  GenerationParams,
  ModelSelection,
  ProfileSpec,
  UsageStats,
} from '@/shared/types';

/**
 * Orchestrateur client de la génération.
 *
 * Les chunks partent en requêtes séparées, avec une concurrence bornée. On
 * y gagne quatre choses que l'appel serveur unique ne pouvait pas offrir :
 * une progression réelle, l'annulation, la relance d'un chunk isolé, et
 * l'absence de timeout puisque chaque requête ne fait qu'un appel IA.
 *
 * Les cartes sont réassemblées dans l'ORDRE DES CHUNKS, pas dans l'ordre
 * d'arrivée des réponses, pour que le deck suive l'ordre du document.
 */

export interface RunContext {
  params: GenerationParams;
  profile: ProfileSpec;
  selection: ModelSelection;
  /** Clé utilisateur ; vide = la clé serveur de `.env.local` sera utilisée */
  apiKey: string;
  autoComplete: boolean;
  imageDetail: ImageDetail;
  /** Renvoie l'image base64 d'une page (numéro 1-based) */
  getImage: (pageNumber: number) => string;
}

export interface RunInput extends RunContext {
  chunks: GenerationChunk[];
  concurrency: number;
  signal: AbortSignal;
  onProgress: (statuses: ChunkStatus[]) => void;
}

export interface RunResult {
  /** Cartes indexées par index de chunk — permet de remplacer un seul chunk lors d'une relance */
  cardsByChunk: Record<number, Card[]>;
  usage: UsageStats;
  statuses: ChunkStatus[];
}

/** Aplatit les cartes dans l'ordre des chunks, donc dans l'ordre du document. */
export function flattenCards(cardsByChunk: Record<number, Card[]>): Card[] {
  return Object.keys(cardsByChunk)
    .map(Number)
    .sort((a, b) => a - b)
    .flatMap((index) => cardsByChunk[index] ?? []);
}

export async function runGeneration(input: RunInput): Promise<RunResult> {
  const { chunks, concurrency, signal, onProgress } = input;

  const statuses: ChunkStatus[] = chunks.map((c) => ({
    index: c.index,
    pageNumbers: c.pageNumbers,
    requested: c.cardCount,
    obtained: 0,
    phase: 'pending',
    hasInstructions: c.instructions.trim().length > 0,
    toppedUp: false,
    warnings: [],
  }));

  const cardsByChunk: Record<number, Card[]> = {};
  const usage: UsageStats = { inputTokens: 0, outputTokens: 0, costUsd: 0 };

  const emit = () => onProgress(statuses.map((s) => ({ ...s })));
  emit();

  let cursor = 0;
  const workerCount = Math.max(1, Math.min(concurrency, chunks.length));

  async function worker(): Promise<void> {
    for (;;) {
      const slot = cursor++;
      if (slot >= chunks.length) return;

      if (signal.aborted) {
        statuses[slot].phase = 'cancelled';
        emit();
        continue;
      }

      statuses[slot].phase = 'running';
      emit();

      try {
        const result = await postChunk(chunks[slot], input, signal);

        cardsByChunk[chunks[slot].index] = result.cards;
        statuses[slot] = {
          ...statuses[slot],
          phase: 'done',
          obtained: result.obtained,
          toppedUp: result.toppedUp,
          warnings: result.warnings,
        };

        usage.inputTokens += result.usage.inputTokens;
        usage.outputTokens += result.usage.outputTokens;
        usage.costUsd += result.usage.costUsd;
      } catch (err) {
        statuses[slot] = {
          ...statuses[slot],
          phase: isAbort(err) ? 'cancelled' : 'error',
          error: isAbort(err) ? 'Annulé.' : errorMessage(err),
        };
      }

      emit();
    }
  }

  await Promise.all(Array.from({ length: workerCount }, worker));

  return { cardsByChunk, usage, statuses };
}

/** Relance d'un chunk isolé, sans refaire les autres. */
export async function retryChunk(
  chunk: GenerationChunk,
  context: RunContext,
  signal?: AbortSignal
): Promise<GenerateChunkResponse> {
  return postChunk(chunk, context, signal);
}

// ─── Transport ────────────────────────────────────────────────

async function postChunk(
  chunk: GenerationChunk,
  context: RunContext,
  signal?: AbortSignal
): Promise<GenerateChunkResponse> {
  const payload: GenerateChunkRequest = {
    images: chunk.pageNumbers.map(context.getImage),
    chunk,
    params: context.params,
    profile: context.profile,
    selection: context.selection,
    autoComplete: context.autoComplete,
    imageDetail: context.imageDetail,
  };

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  // La clé voyage dans un en-tête, jamais dans le corps mêlée aux réglages.
  if (context.apiKey) headers['X-Api-Key'] = context.apiKey;

  const response = await fetch('/api/generate/chunk', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error || `Le serveur a répondu ${response.status}.`);
  }

  return data as GenerateChunkResponse;
}

function isAbort(err: unknown): boolean {
  return err instanceof DOMException ? err.name === 'AbortError' : false;
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return 'Erreur inconnue.';
}
