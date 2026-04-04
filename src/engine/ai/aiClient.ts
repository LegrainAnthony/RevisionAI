import { CONFIG } from '@/shared/config';
import { callOpenAiVision, type AiVisionResponse } from './providers/openai';
import { callGeminiVision } from './providers/gemini';

export type { AiVisionResponse };

/**
 * Envoie des images + un prompt à l'IA configurée.
 *
 * Point d'entrée unique — le reste du code n'a pas besoin
 * de savoir quel provider est utilisé.
 */
export interface AiOverrides {
  provider?: 'gemini' | 'openai';
  model?: string;
  apiKey?: string;
}

export async function callVision(
  systemPrompt: string,
  imagesBase64: string[],
  userText: string = 'Analyse ces pages de cours et génère le contenu demandé.',
  overrides?: AiOverrides
): Promise<AiVisionResponse> {
  const provider = overrides?.provider || CONFIG.aiProvider;
  switch (provider) {
    case 'openai':
      return callOpenAiVision(systemPrompt, imagesBase64, userText, overrides);
    case 'gemini':
      return callGeminiVision(systemPrompt, imagesBase64, userText, overrides);
    default:
      throw new Error(`Provider inconnu : "${provider}"`);
  }
}

/**
 * Estime le coût d'un appel en dollars.
 *
 * Les prix sont approximatifs — ils varient selon le provider
 * et sont susceptibles de changer.
 */
export function estimateCost(inputTokens: number, outputTokens: number, provider?: string): number {
  const prices: Record<string, { input: number; output: number }> = {
    openai: { input: 0.15, output: 0.60 },   // GPT-4o-mini ($/M tokens)
    gemini: { input: 0.30, output: 2.50 },    // Gemini 2.5 Flash ($/M tokens)
  };

  const p = prices[provider || CONFIG.aiProvider] || prices.gemini;
  return (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output;
}
