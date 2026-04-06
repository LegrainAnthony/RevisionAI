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
 * Les prix sont approximatifs — ils varient selon le provider/modèle
 * et sont susceptibles de changer.
 */
export function estimateCost(inputTokens: number, outputTokens: number, provider?: string, model?: string): number {
  // Prix par modèle ($/M tokens)
  const modelPrices: Record<string, { input: number; output: number }> = {
    // OpenAI
    'gpt-4o-mini':             { input: 0.15,  output: 0.60  },
    'gpt-4o':                  { input: 2.50,  output: 10.00 },
    // Gemini
    'gemini-2.5-flash':        { input: 0.30,  output: 2.50  },
    'gemini-2.0-flash':        { input: 0.10,  output: 0.40  },
    'gemini-1.5-flash':        { input: 0.075, output: 0.30  },
    'gemini-1.5-pro':          { input: 1.25,  output: 5.00  },
  };

  // Fallback par provider si le modèle n'est pas dans la table
  const providerFallback: Record<string, { input: number; output: number }> = {
    openai: { input: 0.15,  output: 0.60  }, // gpt-4o-mini par défaut
    gemini: { input: 0.30,  output: 2.50  }, // gemini-2.5-flash par défaut
  };

  const resolvedProvider = provider || CONFIG.aiProvider;
  const p = (model && modelPrices[model]) || providerFallback[resolvedProvider] || providerFallback.gemini;
  return (inputTokens / 1_000_000) * p.input + (outputTokens / 1_000_000) * p.output;
}
