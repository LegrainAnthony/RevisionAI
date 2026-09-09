import { NextRequest, NextResponse } from 'next/server';
import type { GenerateChunkRequest, GenerateChunkResponse, ImageDetail } from '@/shared/types';
import { PROVIDER_IDS } from '@/shared/types';
import { envApiKey } from '@/shared/config';
import { LIMITS } from '@/shared/limits';
import { estimateCost, resolveModelId } from '@/shared/models';
import { redactSecrets } from '@/shared/redact';
import { buildChunkPrompt, buildTopUpPrompt, type ChunkPromptInput } from '@/engine/ai/promptBuilder';
import { parseCardsPayload } from '@/engine/ai/cardSchema';
import { AiProviderError, callVisionWithRetry, toUserMessage } from '@/engine/ai/aiClient';
import { enforceCards, toCards } from '@/engine/generation/cardEnforcer';

/**
 * POST /api/generate/chunk — traite UN chunk et un seul.
 *
 * C'est ce qui rend l'étanchéité structurelle : le prompt est construit à
 * partir des seules données reçues ici, donc une consigne ne peut pas
 * atteindre un autre chunk. C'est aussi ce qui supprime le risque de
 * timeout, permet la progression en direct et la relance d'un chunk isolé.
 *
 * La clé API arrive par l'en-tête `X-Api-Key`, jamais dans le corps.
 */
export const maxDuration = 120;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let body: GenerateChunkRequest;

  try {
    body = (await request.json()) as GenerateChunkRequest;
  } catch {
    return NextResponse.json({ error: 'Corps de requête illisible.' }, { status: 400 });
  }

  const invalid = validate(body);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  const provider = body.selection.provider;
  const model = resolveModelId(provider, body.selection.model);
  const apiKey = request.headers.get('x-api-key')?.trim() || envApiKey(provider);

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          'Aucune clé API disponible. Renseignez-la dans les paramètres, ou définissez-la dans .env.local.',
      },
      { status: 400 }
    );
  }

  const promptInput: ChunkPromptInput = {
    profile: body.profile,
    params: body.params,
    chunk: {
      pageNumbers: body.chunk.pageNumbers,
      cardCount: body.chunk.cardCount,
      instructions: body.chunk.instructions,
    },
  };

  const requested = body.chunk.cardCount;
  const warnings: string[] = [];
  let inputTokens = 0;
  let outputTokens = 0;
  let toppedUp = false;

  try {
    // ── Appel principal ──
    const first = await callVisionWithRetry(provider, {
      prompt: buildChunkPrompt(promptInput),
      images: body.images,
      model,
      apiKey,
      imageDetail: body.imageDetail,
      signal: request.signal,
    });

    inputTokens += first.inputTokens;
    outputTokens += first.outputTokens;
    warnings.push(...first.warnings);

    const parsed = parseCardsPayload(first.text);
    warnings.push(...parsed.warnings);

    let enforced = enforceCards(parsed.cards, requested);

    // ── Complétion : on ne relance que si le modèle a produit quelque chose.
    // Zéro carte signale un problème de fond, qu'un second appel identique
    // ne résoudrait pas — autant ne pas le facturer à l'utilisateur.
    if (body.autoComplete && enforced.missing > 0 && enforced.cards.length > 0) {
      try {
        const topUp = await callVisionWithRetry(provider, {
          prompt: buildTopUpPrompt(
            promptInput,
            enforced.missing,
            enforced.cards.map((c) => c.question)
          ),
          images: body.images,
          model,
          apiKey,
          imageDetail: body.imageDetail,
          signal: request.signal,
        });

        inputTokens += topUp.inputTokens;
        outputTokens += topUp.outputTokens;
        toppedUp = true;

        const extra = parseCardsPayload(topUp.text);
        enforced = enforceCards([...enforced.cards, ...extra.cards], requested);
      } catch (err) {
        warnings.push(`Complétion impossible : ${toUserMessage(err)}`);
      }
    }

    // Les avertissements de `enforceCards` sont pris sur le résultat FINAL,
    // pour ne pas refléter un état intermédiaire déjà corrigé.
    warnings.push(...enforced.warnings);

    if (enforced.cards.length === 0) {
      warnings.push('Le modèle n’a produit aucune carte pour ces pages.');
    } else if (enforced.missing > 0) {
      warnings.push(`${enforced.cards.length} carte(s) sur ${requested} demandée(s).`);
    }

    const response: GenerateChunkResponse = {
      cards: toCards(enforced.cards, body.chunk.pageNumbers),
      requested,
      obtained: enforced.cards.length,
      usage: {
        inputTokens,
        outputTokens,
        costUsd: estimateCost(inputTokens, outputTokens, provider, model),
      },
      warnings,
      toppedUp,
    };

    return NextResponse.json(response);
  } catch (err) {
    if (request.signal.aborted) {
      return NextResponse.json({ error: 'Génération annulée.' }, { status: 499 });
    }

    // `redactSecrets` est indispensable ici : les fournisseurs renvoient
    // volontiers un extrait de la requête dans leurs messages d'erreur.
    console.error(`[generate/chunk ${body.chunk?.index}]`, redactSecrets(err));

    return NextResponse.json(
      { error: toUserMessage(err) },
      { status: err instanceof AiProviderError ? 502 : 500 }
    );
  }
}

const IMAGE_DETAILS: ImageDetail[] = ['low', 'high', 'original'];

function validate(body: GenerateChunkRequest): string | null {
  if (!body || typeof body !== 'object') return 'Requête invalide.';
  if (!Array.isArray(body.images) || body.images.length === 0) return 'Aucune image fournie.';
  if (body.images.length > LIMITS.maxPagesPerChunk) {
    return `Un chunk ne peut pas dépasser ${LIMITS.maxPagesPerChunk} pages.`;
  }
  if (!body.chunk || !Array.isArray(body.chunk.pageNumbers)) return 'Chunk invalide.';
  if (body.images.length !== body.chunk.pageNumbers.length) {
    return 'Le nombre d’images ne correspond pas au nombre de pages du chunk.';
  }
  if (!Number.isFinite(body.chunk.cardCount) || body.chunk.cardCount < 1) {
    return 'Nombre de cartes invalide.';
  }
  if (!body.selection || !PROVIDER_IDS.includes(body.selection.provider)) {
    return 'Fournisseur d’IA invalide.';
  }
  if (!body.profile || !body.params) return 'Profil ou paramètres manquants.';
  if (!IMAGE_DETAILS.includes(body.imageDetail)) return 'Niveau de détail d’image invalide.';
  return null;
}
