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
export async function callVision(
  systemPrompt: string,
  imagesBase64: string[],
  userText: string = 'Analyse ces pages de cours et génère le contenu demandé.'
): Promise<AiVisionResponse> {
  switch (CONFIG.aiProvider) {
    case 'openai':
      return callOpenAiVision(systemPrompt, imagesBase64, userText);
    case 'gemini':
      return callGeminiVision(systemPrompt, imagesBase64, userText);
    default:
      throw new Error(`Provider inconnu : "${CONFIG.aiProvider}"`);
  }
}

/**
 * Estime le coût d'un appel en dollars.
 *
 * Les prix sont approximatifs — ils varient selon le provider
 * et sont susceptibles de changer.
 */
export function estimateCost(inputTokens: number, outputTokens: number): number {
  const prices: Record<string, { input: number; output: number }> = {
    openai: { input: 0.15, output: 0.60 },   // GPT-4o-mini ($/M tokens)
    gemini: { input: 0.30, output: 2.50 },    // Gemini 2.5 Flash ($/M tokens)
  };

  const p = prices[CONFIG.aiProvider] || prices.gemini;
  return (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output;
}
