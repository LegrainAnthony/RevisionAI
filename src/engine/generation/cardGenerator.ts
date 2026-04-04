import { Card, GenerationConfig, PromptProfile } from '@/shared/types';
import { callVision, estimateCost, AiOverrides } from '@/engine/ai/aiClient';
import { buildCardPrompt } from '@/engine/ai/prompts';
import { CONFIG } from '@/shared/config';

interface CardResult {
  cards: Card[];
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

/**
 * Génère des cartes Anki à partir d'images de pages.
 *
 * Pipeline :
 * 1. Découper les pages en lots de 3-5 images
 * 2. Pour chaque lot, appeler l'IA vision avec le prompt + images
 * 3. Injecter les cartes précédentes pour déduplication
 * 4. Parser les réponses JSON et assembler le résultat
 */
export async function generateCards(
  pagesBase64: string[],
  config: GenerationConfig,
  aiOverrides?: AiOverrides & { pagesPerBatch?: number; cardsPerChunk?: number },
  promptProfileId?: string,
  customProfiles?: PromptProfile[],
  chunkCardOverrides?: Record<number, number>
): Promise<CardResult> {
  const pagesPerBatch = aiOverrides?.pagesPerBatch ?? CONFIG.pagesPerBatch;
  const batches = splitBatches(pagesBase64, pagesPerBatch);
  const perBatch = aiOverrides?.cardsPerChunk ?? Math.max(1, Math.ceil(config.cardCount / batches.length));

  // Associer chaque batch aux numéros de pages réels
  const pageNumbers = config.selectedPages;
  const batchPageNumbers = batches.map((_, i) => {
    const start = i * pagesPerBatch;
    return pageNumbers.slice(start, start + pagesPerBatch);
  });

  const allCards: Card[] = [];
  let totalIn = 0;
  let totalOut = 0;

  for (let i = 0; i < batches.length; i++) {
    const batchCardCount = chunkCardOverrides?.[i] ?? perBatch;
    const prompt = buildCardPrompt(batchCardCount, config.difficulty, [], promptProfileId, customProfiles);

    try {
      const res = await callVision(prompt, batches[i], undefined, aiOverrides);
      totalIn += res.inputTokens;
      totalOut += res.outputTokens;
      allCards.push(...parseCards(res.text, batchPageNumbers[i]));
    } catch (err) {
      console.error(`[CardGen] Lot ${i + 1}/${batches.length} échoué :`, (err as Error).message);
    }
  }

  return {
    cards: allCards.map((c, i) => ({
      ...c,
      id: `card-${Date.now()}-${i}`,
      selected: true,
    })),
    inputTokens: totalIn,
    outputTokens: totalOut,
    costUsd: estimateCost(totalIn, totalOut, aiOverrides?.provider),
  };
}

function parseCards(text: string, sourcePages: number[] = []): Card[] {
  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const data = JSON.parse(cleaned);
    if (!Array.isArray(data.cards)) return [];
    return data.cards.map((c: Record<string, string>) => ({
      id: '',
      question: c.question || '',
      answer: c.answer || '',
      type: c.type || 'definition',
      difficulty: c.difficulty || 'medium',
      sourceSection: c.sourceSection || '',
      sourcePages,
      selected: true,
      frontImages: [],  // Vides — l'utilisateur les ajoute manuellement
      backImages: [],
      cardMode: 'basic',
    }));
  } catch {
    return [];
  }
}

function splitBatches<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}