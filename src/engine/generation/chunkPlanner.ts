import type { GenerationChunk } from '@/shared/types';
import { LIMITS } from '@/shared/limits';

/**
 * Source de vérité UNIQUE du découpage en chunks.
 *
 * Règle : un chunk est la fenêtre FIXE de pages
 * `[index * pagesPerChunk, index * pagesPerChunk + pagesPerChunk)` du
 * document, moins les pages désélectionnées. Une fenêtre sans aucune page
 * sélectionnée est ignorée.
 *
 * Conséquence : `index` ne dépend PAS de la sélection. Décocher une page ne
 * renumérote rien, donc une consigne reste attachée exactement aux pages de
 * la boîte où l'utilisateur l'a saisie.
 *
 * L'ancien code construisait les fenêtres sur toutes les pages côté UI mais
 * les lots sur les seules pages sélectionnées côté serveur, puis tentait de
 * relier les deux en devinant. Dès qu'une page était décochée, les consignes
 * partaient sur les pages d'un autre chunk.
 */

export interface ChunkPlanInput {
  /** Nombre total de pages du document */
  pageCount: number;
  /** `selected[i]` : la page d'index `i` (0-based) est retenue */
  selected: boolean[];
  pagesPerChunk: number;
  /** Nombre de cartes par défaut, issu des paramètres */
  defaultCardCount: number;
  /** Surcharges du nombre de cartes, indexées par index de fenêtre */
  cardOverrides: Record<number, number>;
  /** Consignes libres, indexées par index de fenêtre */
  instructions: Record<number, string>;
}

export interface ChunkWindow extends GenerationChunk {
  /** Toutes les pages (1-based) de la fenêtre, sélectionnées ou non */
  allPageNumbers: number[];
  /** true si le nombre de cartes vient d'une surcharge utilisateur */
  hasCardOverride: boolean;
}

/**
 * Toutes les fenêtres du document, y compris celles entièrement
 * désélectionnées. C'est ce que l'UI affiche.
 */
export function planWindows(input: ChunkPlanInput): ChunkWindow[] {
  const { pageCount, selected, instructions, cardOverrides } = input;
  const pagesPerChunk = clamp(
    input.pagesPerChunk,
    LIMITS.minPagesPerChunk,
    LIMITS.maxPagesPerChunk
  );

  const windows: ChunkWindow[] = [];

  for (let start = 0, index = 0; start < pageCount; start += pagesPerChunk, index++) {
    const end = Math.min(start + pagesPerChunk, pageCount);

    const allPageNumbers: number[] = [];
    const pageNumbers: number[] = [];
    for (let i = start; i < end; i++) {
      allPageNumbers.push(i + 1);
      if (selected[i]) pageNumbers.push(i + 1);
    }

    const override = cardOverrides[index];
    const hasCardOverride = override !== undefined;

    windows.push({
      index,
      allPageNumbers,
      pageNumbers,
      hasCardOverride,
      cardCount: clamp(
        hasCardOverride ? override : input.defaultCardCount,
        LIMITS.minCardsPerChunk,
        LIMITS.maxCardsPerChunk
      ),
      instructions: instructions[index] ?? '',
    });
  }

  return windows;
}

/** Les chunks réellement envoyés à l'IA : ceux qui ont au moins une page. */
export function planChunks(input: ChunkPlanInput): GenerationChunk[] {
  return chunksFromWindows(planWindows(input));
}

/**
 * Même filtrage, à partir de fenêtres déjà calculées — l'UI affiche les
 * fenêtres et envoie les chunks, sans refaire le découpage deux fois.
 */
export function chunksFromWindows(windows: ChunkWindow[]): GenerationChunk[] {
  return windows
    .filter((w) => w.pageNumbers.length > 0)
    .map(({ index, pageNumbers, cardCount, instructions }) => ({
      index,
      pageNumbers,
      cardCount,
      instructions,
    }));
}

/** Nombre total de cartes qui seront demandées — sert au coût prévisionnel. */
export function totalCards(chunks: GenerationChunk[]): number {
  return chunks.reduce((sum, c) => sum + c.cardCount, 0);
}

/** Nombre total de pages effectivement envoyées. */
export function totalPages(chunks: GenerationChunk[]): number {
  return chunks.reduce((sum, c) => sum + c.pageNumbers.length, 0);
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}
