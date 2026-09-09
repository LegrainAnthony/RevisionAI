import type { Card } from '@/shared/types';
import type { RawCard } from '@/engine/ai/cardSchema';

/**
 * Fait respecter le nombre de cartes demandé.
 *
 * « génère exactement N cartes » n'était qu'une phrase dans le prompt : rien
 * ne vérifiait le résultat. Ici on déduplique, on tronque le surplus, et on
 * signale ce qui manque pour que la route puisse lancer une complétion.
 */

export interface EnforceResult {
  cards: RawCard[];
  warnings: string[];
  /** Cartes écartées parce que déjà présentes */
  duplicatesDropped: number;
  /** Cartes écartées parce qu'au-delà du nombre demandé */
  truncated: number;
  /** Cartes encore manquantes par rapport au nombre demandé */
  missing: number;
}

export function enforceCards(candidates: RawCard[], requested: number): EnforceResult {
  const seen = new Set<string>();
  const unique: RawCard[] = [];
  let duplicatesDropped = 0;

  for (const card of candidates) {
    const key = normalizeQuestion(card.question);
    if (!key || seen.has(key)) {
      duplicatesDropped++;
      continue;
    }
    seen.add(key);
    unique.push(card);
  }

  const cards = unique.slice(0, requested);
  const truncated = unique.length - cards.length;
  const missing = Math.max(0, requested - cards.length);

  const warnings: string[] = [];
  if (duplicatesDropped > 0) {
    warnings.push(`${duplicatesDropped} carte(s) en double écartée(s).`);
  }
  if (truncated > 0) {
    warnings.push(`${truncated} carte(s) en trop retirée(s) : ${requested} demandée(s).`);
  }

  return { cards, warnings, duplicatesDropped, truncated, missing };
}

/**
 * Deux questions sont considérées identiques si elles ne diffèrent que par
 * la casse, les accents ou la ponctuation.
 */
export function normalizeQuestion(question: string): string {
  return (question || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Transforme les cartes brutes du modèle en cartes de l'application. */
export function toCards(raw: RawCard[], sourcePages: number[]): Card[] {
  return raw.map((c) => ({
    id: newId(),
    question: c.question,
    answer: c.answer,
    type: c.type,
    difficulty: c.difficulty,
    sourceSection: c.sourceSection,
    sourcePages,
    selected: true,
    frontImages: [],
    backImages: [],
    cardMode: 'basic' as const,
  }));
}

/**
 * Les chunks étant traités en parallèle, un identifiant fondé sur l'horloge
 * produirait des collisions entre requêtes simultanées.
 */
function newId(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return `card-${c.randomUUID()}`;
  return `card-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
