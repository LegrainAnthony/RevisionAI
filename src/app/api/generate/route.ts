import { NextRequest, NextResponse } from 'next/server';
import { generateCards } from '@/engine/generation/cardGenerator';
import { cache } from '@/cache/cacheManager';
import { AppSettings, GenerationConfig, GenerationRecord } from '@/shared/types';

/**
 * POST /api/generate
 *
 * Reçoit les images des pages sélectionnées + la config.
 * Génère des cartes et sauvegarde l'historique pour déduplication.
 *
 * Body : {
 *   hash: string,           ← hash du PDF (calculé côté client)
 *   fileName: string,
 *   pageCount: number,       ← nb total de pages du PDF
 *   images: string[],        ← base64 des pages SÉLECTIONNÉES
 *   config: GenerationConfig
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { hash, fileName, pageCount, images, config, settings } = await request.json() as {
      hash: string;
      fileName: string;
      pageCount: number;
      images: string[];
      config: GenerationConfig;
      settings?: AppSettings;
    };

    if (!hash || !images?.length || !config) {
      return NextResponse.json({ error: 'hash, images et config requis' }, { status: 400 });
    }

    // S'assurer que le dossier cache existe pour ce document
    await cache.ensureDocument(hash, fileName, pageCount || images.length);

    // Charger l'historique pour la déduplication
    const previousCards = await cache.getPreviousCards(hash);

    // Construire les overrides depuis les settings client (si fournis)
    const aiOverrides = settings ? {
      provider: settings.provider,
      apiKey: settings.apiKey || undefined,
      model: settings.model || undefined,
      pagesPerBatch: settings.pagesPerBatch,
      cardsPerChunk: settings.cardsPerChunk,
    } : undefined;

    // Générer
    const result = await generateCards(images, config, previousCards, aiOverrides);

    // Sauvegarder dans l'historique
    const provider = settings?.provider || process.env.AI_PROVIDER || 'gemini';
    const record: GenerationRecord = {
      id: `gen-${Date.now()}`,
      mode: config.mode,
      cards: result.cards,
      quizzes: [],
      selectedPages: config.selectedPages,
      costUsd: result.costUsd,
      provider,
      model: settings?.model || process.env.AI_MODEL || 'gemini-2.5-flash',
      createdAt: new Date().toISOString(),
    };
    await cache.saveGeneration(hash, record);

    return NextResponse.json({
      cards: result.cards,
      usage: {
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        costUsd: result.costUsd,
      },
    });
  } catch (err) {
    console.error('[Generate]', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
