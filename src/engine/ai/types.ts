import type { ImageDetail, ProviderId } from '@/shared/types';
import type { BuiltPrompt } from './promptBuilder';

export interface AiVisionRequest {
  prompt: BuiltPrompt;
  /** base64 PNG, insérées entre `prompt.userLead` et `prompt.userTail` */
  images: string[];
  model: string;
  apiKey: string;
  /** Niveau de détail des images (OpenAI uniquement) */
  imageDetail: ImageDetail;
  signal?: AbortSignal;
}

export interface AiVisionResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
  /** Anomalies non bloquantes remontées jusqu'à l'UI */
  warnings: string[];
}

/**
 * Erreur normalisée d'un fournisseur.
 *
 * `message` est destiné à être affiché à l'utilisateur : il est rédigé en
 * français et déjà passé par `redactSecrets()`.
 */
export class AiProviderError extends Error {
  readonly provider: ProviderId;
  readonly status?: number;
  readonly retryable: boolean;
  readonly retryAfterMs?: number;

  constructor(init: {
    provider: ProviderId;
    message: string;
    status?: number;
    retryable?: boolean;
    retryAfterMs?: number;
  }) {
    super(init.message);
    this.name = 'AiProviderError';
    this.provider = init.provider;
    this.status = init.status;
    this.retryable = init.retryable ?? false;
    this.retryAfterMs = init.retryAfterMs;
  }
}
