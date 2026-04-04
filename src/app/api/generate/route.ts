import { NextRequest, NextResponse } from 'next/server';
import { generateCards } from '@/engine/generation/cardGenerator';
import { AppSettings, GenerationConfig } from '@/shared/types';

/**
 * POST /api/generate
 *
 * Reçoit les images des pages sélectionnées + la config.
 * Génère des cartes et les retourne directement (pas de cache).
 *
 * Body : {
 *   images: string[],        ← base64 des pages SÉLECTIONNÉES
 *   config: GenerationConfig,
 *   settings?: AppSettings,
 *   chunkCardOverrides?: Record<number, number>
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const { images, config, settings, chunkCardOverrides } = await request.json() as {
      images: string[];
      config: GenerationConfig;
      settings?: AppSettings;
      chunkCardOverrides?: Record<number, number>;
    };

    if (!images?.length || !config) {
      return NextResponse.json({ error: 'images et config requis' }, { status: 400 });
    }

    const aiOverrides = settings ? {
      provider: settings.provider,
      apiKey: settings.apiKey || undefined,
      model: settings.model || undefined,
      pagesPerBatch: settings.pagesPerBatch,
      cardsPerChunk: settings.cardsPerChunk,
    } : undefined;

    const result = await generateCards(
      images,
      config,
      aiOverrides,
      settings?.activeProfileId,
      settings?.customProfiles,
      chunkCardOverrides
    );

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
