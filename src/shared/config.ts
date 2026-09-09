import type { ProviderId } from './types';

function env(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

/**
 * Configuration serveur.
 *
 * Les clés API ici sont des SECOURS : la clé fournie par l'utilisateur
 * (en-tête `X-Api-Key`) est toujours prioritaire. Ces valeurs ne doivent
 * jamais être exposées au client.
 */
export const CONFIG = {
  aiProvider: env('AI_PROVIDER', 'gemini') as ProviderId,
  aiModel: env('AI_MODEL', 'gemini-2.5-flash'),
  openaiApiKey: env('OPENAI_API_KEY', ''),
  geminiApiKey: env('GEMINI_API_KEY', ''),

  /** Délai maximum d'un appel au fournisseur */
  requestTimeoutMs: 90_000,
  /** Nouvelles tentatives sur 429 / 5xx (en plus de l'appel initial) */
  maxRetries: 2,
  /**
   * Température basse : la tâche est une EXTRACTION fidèle, pas de la
   * rédaction créative. C'est un des leviers directs de la prévisibilité.
   */
  temperature: 0.2,
  /**
   * Les modèles de raisonnement refusent `temperature` : c'est ce réglage
   * qui joue son rôle. « low » suffit largement pour de l'extraction fidèle
   * et évite de payer des tokens de raisonnement inutiles.
   */
  reasoningEffort: 'low',
} as const;

/** Clé de secours configurée dans `.env.local` pour ce provider. */
export function envApiKey(provider: ProviderId): string {
  return provider === 'openai' ? CONFIG.openaiApiKey : CONFIG.geminiApiKey;
}
