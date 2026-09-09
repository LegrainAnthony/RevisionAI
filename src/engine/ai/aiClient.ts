import type { ProviderId } from '@/shared/types';
import { CONFIG } from '@/shared/config';
import { redactSecrets } from '@/shared/redact';
import { AiProviderError, type AiVisionRequest, type AiVisionResponse } from './types';
import { callGeminiVision } from './providers/gemini';
import { callOpenAiVision } from './providers/openai';

export { AiProviderError };
export type { AiVisionRequest, AiVisionResponse };

/**
 * Point d'entrée unique des appels IA.
 * Le reste du code n'a jamais besoin de savoir quel fournisseur est utilisé.
 */
export async function callVision(
  provider: ProviderId,
  req: AiVisionRequest
): Promise<AiVisionResponse> {
  switch (provider) {
    case 'openai':
      return callOpenAiVision(req);
    case 'gemini':
      return callGeminiVision(req);
    default:
      throw new AiProviderError({
        provider: 'gemini',
        message: `Fournisseur inconnu : « ${provider} ».`,
      });
  }
}

/**
 * Même appel, avec relances sur les erreurs transitoires (429, 5xx,
 * timeout, réponse vide).
 *
 * Auparavant un 429 faisait échouer un lot en silence : l'erreur était
 * journalisée et la génération continuait, laissant un trou dans les cartes
 * sans que personne ne le sache.
 */
export async function callVisionWithRetry(
  provider: ProviderId,
  req: AiVisionRequest
): Promise<AiVisionResponse> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= CONFIG.maxRetries; attempt++) {
    try {
      return await callVision(provider, req);
    } catch (err) {
      lastError = err;

      if (req.signal?.aborted) throw err;
      if (!(err instanceof AiProviderError) || !err.retryable) throw err;
      if (attempt === CONFIG.maxRetries) break;

      await sleep(err.retryAfterMs ?? backoffMs(attempt), req.signal);
    }
  }

  throw lastError;
}

/** Attente exponentielle bornée, avec bruit pour éviter les rafales. */
function backoffMs(attempt: number): number {
  const base = Math.min(1000 * 2 ** attempt, 15_000);
  return base + Math.random() * 500;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(timer);
      reject(signal?.reason ?? new Error('aborted'));
    }
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * Message d'erreur prêt à être affiché : jamais de secret, jamais de
 * pavé technique brut.
 */
export function toUserMessage(err: unknown): string {
  if (err instanceof AiProviderError) return redactSecrets(err.message);
  if (err instanceof Error) return redactSecrets(err.message) || 'Erreur inconnue.';
  return redactSecrets(err);
}
