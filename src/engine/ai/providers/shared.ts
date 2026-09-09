import type { ProviderId } from '@/shared/types';
import { CONFIG } from '@/shared/config';
import { redactSecrets } from '@/shared/redact';
import { AiProviderError } from '../types';

const PROVIDER_NAMES: Record<ProviderId, string> = {
  gemini: 'Gemini',
  openai: 'OpenAI',
};

/**
 * `fetch` avec délai maximum, en respectant une éventuelle annulation
 * venue de l'appelant.
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  provider: ProviderId,
  signal?: AbortSignal
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('timeout')), CONFIG.requestTimeoutMs);
  const onAbort = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', onAbort, { once: true });

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (signal?.aborted) throw err; // annulation demandée par l'utilisateur
    const seconds = Math.round(CONFIG.requestTimeoutMs / 1000);
    throw new AiProviderError({
      provider,
      message: `${PROVIDER_NAMES[provider]} n’a pas répondu en moins de ${seconds} s.`,
      retryable: true,
    });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

/**
 * Traduit une réponse d'erreur en message actionnable, sans jamais laisser
 * passer un fragment de clé.
 *
 * Le statut ne suffit pas : Gemini répond 400 INVALID_ARGUMENT pour une clé
 * invalide, là où OpenAI répond 401. On inspecte donc aussi le message du
 * fournisseur, sinon l'utilisateur reçoit un pavé JSON au lieu de « votre
 * clé est refusée ».
 */
export function httpError(input: {
  provider: ProviderId;
  status: number;
  body: string;
  model: string;
  retryAfterHeader?: string | null;
}): AiProviderError {
  const { provider, status, body, model, retryAfterHeader } = input;
  const name = PROVIDER_NAMES[provider];
  const detail = extractMessage(body);

  const authFailure =
    status === 401 ||
    status === 403 ||
    /api[ _-]?key not valid|invalid[ _-]?api[ _-]?key|incorrect api key|api[ _-]?key[ _-]?invalid|unauthenticated|permission denied/i.test(
      detail
    );

  if (authFailure) {
    return new AiProviderError({
      provider,
      status,
      message: `Clé API refusée par ${name}. Vérifiez dans les paramètres qu’elle est valide et toujours active.`,
    });
  }

  const unknownModel =
    status === 404 ||
    /not found|does not exist|is not supported|unsupported model|no such model/i.test(detail);

  if (unknownModel) {
    return new AiProviderError({
      provider,
      status,
      message: `Le modèle « ${model} » est introuvable chez ${name} ou n’est pas accessible avec cette clé. Choisissez-en un autre dans les paramètres.`,
    });
  }

  if (status === 429 || /quota|rate limit|resource[ _-]?exhausted/i.test(detail)) {
    return new AiProviderError({
      provider,
      status,
      message: `Limite de débit ou quota atteint chez ${name}. Réduisez le nombre de chunks traités en parallèle dans les paramètres.`,
      retryable: true,
      retryAfterMs: parseRetryAfter(retryAfterHeader),
    });
  }

  if (status >= 500) {
    return new AiProviderError({
      provider,
      status,
      message: `${name} est momentanément indisponible (${status}).`,
      retryable: true,
    });
  }

  return new AiProviderError({
    provider,
    status,
    message: `Requête refusée par ${name} (${status})${detail ? ` : ${detail}` : '.'}`,
  });
}

/**
 * Extrait le message lisible du corps d'erreur. Gemini et OpenAI utilisent
 * tous deux `{ "error": { "message": … } }` ; à défaut on retombe sur un
 * extrait du corps brut. Dans tous les cas le résultat est expurgé.
 */
function extractMessage(body: string): string {
  const safe = redactSecrets(body);
  try {
    const parsed = JSON.parse(body);
    const message = parsed?.error?.message ?? parsed?.message;
    if (typeof message === 'string' && message.trim()) {
      return redactSecrets(message).slice(0, 300);
    }
  } catch {
    // Corps non JSON : on garde l'extrait brut.
  }
  return safe.replace(/\s+/g, ' ').slice(0, 200);
}

function parseRetryAfter(header?: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, 60_000);
  const date = Date.parse(header);
  if (!Number.isNaN(date)) return Math.max(0, Math.min(date - Date.now(), 60_000));
  return undefined;
}

export function providerName(provider: ProviderId): string {
  return PROVIDER_NAMES[provider];
}
