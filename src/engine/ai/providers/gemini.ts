import { CONFIG } from '@/shared/config';
import { GEMINI_RESPONSE_SCHEMA } from '../cardSchema';
import { AiProviderError, type AiVisionRequest, type AiVisionResponse } from '../types';
import { fetchWithTimeout, httpError } from './shared';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Appel Gemini avec images.
 *
 * Deux points importants par rapport à l'implémentation précédente :
 *
 * - la clé passe par l'en-tête `x-goog-api-key` et non plus par l'URL.
 *   Auparavant, un échec réseau produisait un message contenant l'URL
 *   complète — donc la clé — qui était journalisée puis renvoyée au client.
 *
 * - `responseSchema` force une sortie structurée. Le modèle ne peut plus
 *   renvoyer un JSON de forme libre.
 */
export async function callGeminiVision(req: AiVisionRequest): Promise<AiVisionResponse> {
  const { prompt, images, model, apiKey, signal } = req;

  if (!apiKey) {
    throw new AiProviderError({
      provider: 'gemini',
      message: 'Aucune clé API Gemini. Renseignez-la dans les paramètres, ou définissez GEMINI_API_KEY dans .env.local.',
    });
  }

  // L'ordre des parts est significatif : consigne, images, puis rappel final.
  const parts: Record<string, unknown>[] = [{ text: prompt.userLead }];
  for (const img of images) {
    parts.push({ inline_data: { mime_type: 'image/png', data: img } });
  }
  parts.push({ text: prompt.userTail });

  const response = await fetchWithTimeout(
    `${ENDPOINT}/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: prompt.system }] },
        contents: [{ role: 'user', parts }],
        generationConfig: {
          temperature: CONFIG.temperature,
          responseMimeType: 'application/json',
          responseSchema: GEMINI_RESPONSE_SCHEMA,
        },
      }),
    },
    'gemini',
    signal
  );

  if (!response.ok) {
    throw httpError({
      provider: 'gemini',
      status: response.status,
      body: await response.text(),
      model,
      retryAfterHeader: response.headers.get('retry-after'),
    });
  }

  const data = await response.json();
  const warnings: string[] = [];

  const blockReason = data.promptFeedback?.blockReason;
  if (blockReason) {
    throw new AiProviderError({
      provider: 'gemini',
      message: `Gemini a refusé de traiter ces pages (motif : ${blockReason}).`,
    });
  }

  const candidate = data.candidates?.[0];
  const text: string = (candidate?.content?.parts ?? [])
    .map((p: { text?: string }) => p.text ?? '')
    .join('');

  const finishReason = candidate?.finishReason;
  if (finishReason === 'MAX_TOKENS') {
    warnings.push('Réponse tronquée par la limite de tokens : demandez moins de cartes par chunk.');
  }
  if (finishReason === 'SAFETY' || finishReason === 'RECITATION') {
    throw new AiProviderError({
      provider: 'gemini',
      message: `Gemini a interrompu la génération (motif : ${finishReason}).`,
    });
  }

  if (!text.trim()) {
    throw new AiProviderError({
      provider: 'gemini',
      message:
        finishReason === 'MAX_TOKENS'
          ? 'Gemini a épuisé son budget de tokens sans produire de carte. Réduisez le nombre de cartes par chunk.'
          : 'Gemini a renvoyé une réponse vide.',
      retryable: true,
    });
  }

  const usage = data.usageMetadata ?? {};

  return {
    text,
    inputTokens: usage.promptTokenCount ?? 0,
    // Les modèles 2.5 facturent aussi les tokens de raisonnement.
    outputTokens: (usage.candidatesTokenCount ?? 0) + (usage.thoughtsTokenCount ?? 0),
    warnings,
  };
}
