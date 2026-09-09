import { CONFIG } from '@/shared/config';
import { isReasoningModel, resolveImageDetail } from '@/shared/models';
import { OPENAI_JSON_SCHEMA } from '../cardSchema';
import { AiProviderError, type AiVisionRequest, type AiVisionResponse } from '../types';
import { fetchWithTimeout, httpError } from './shared';

const ENDPOINT = 'https://api.openai.com/v1/chat/completions';

/**
 * Appel OpenAI avec images.
 *
 * `response_format: json_schema` en mode strict garantit la forme de la
 * sortie côté fournisseur — l'ancien `json_object` ne garantissait que
 * « du JSON », pas le bon JSON.
 *
 * `imageDetail` est un réglage : `low` sous-échantillonne à 512 px,
 * `original` conserve la résolution d'entrée. L'API accepte `original` en
 * silence même sur les modèles qui l'ignorent, d'où le passage par
 * `resolveImageDetail()`.
 *
 * Les modèles de raisonnement (famille GPT-5) REFUSENT `temperature` avec
 * une 400 « Only the default (1) value is supported » : on envoie
 * `reasoning_effort` à la place. Sans ce branchement, sélectionner un
 * modèle GPT-5 casserait toute génération.
 */
export async function callOpenAiVision(req: AiVisionRequest): Promise<AiVisionResponse> {
  const { prompt, images, model, apiKey, imageDetail, signal } = req;

  if (!apiKey) {
    throw new AiProviderError({
      provider: 'openai',
      message: 'Aucune clé API OpenAI. Renseignez-la dans les paramètres, ou définissez OPENAI_API_KEY dans .env.local.',
    });
  }

  // L'ordre du contenu est significatif : consigne, images, puis rappel final.
  const detail = resolveImageDetail('openai', model, imageDetail);

  const content: Record<string, unknown>[] = [{ type: 'text', text: prompt.userLead }];
  for (const img of images) {
    content.push({
      type: 'image_url',
      image_url: { url: `data:image/png;base64,${img}`, detail },
    });
  }
  content.push({ type: 'text', text: prompt.userTail });

  const sampling: Record<string, unknown> = isReasoningModel('openai', model)
    ? { reasoning_effort: CONFIG.reasoningEffort }
    : { temperature: CONFIG.temperature };

  const response = await fetchWithTimeout(
    ENDPOINT,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content },
        ],
        ...sampling,
        response_format: { type: 'json_schema', json_schema: OPENAI_JSON_SCHEMA },
      }),
    },
    'openai',
    signal
  );

  if (!response.ok) {
    throw httpError({
      provider: 'openai',
      status: response.status,
      body: await response.text(),
      model,
      retryAfterHeader: response.headers.get('retry-after'),
    });
  }

  const data = await response.json();
  const warnings: string[] = [];
  const choice = data.choices?.[0];

  if (choice?.message?.refusal) {
    throw new AiProviderError({
      provider: 'openai',
      message: `OpenAI a refusé de traiter ces pages : ${String(choice.message.refusal).slice(0, 200)}`,
    });
  }

  if (choice?.finish_reason === 'length') {
    warnings.push('Réponse tronquée par la limite de tokens : demandez moins de cartes par chunk.');
  }

  const text: string = choice?.message?.content ?? '';
  if (!text.trim()) {
    throw new AiProviderError({
      provider: 'openai',
      message: 'OpenAI a renvoyé une réponse vide.',
      retryable: true,
    });
  }

  return {
    text,
    inputTokens: data.usage?.prompt_tokens ?? 0,
    outputTokens: data.usage?.completion_tokens ?? 0,
    warnings,
  };
}
