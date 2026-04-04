import { CONFIG } from '@/shared/config';

export interface AiVisionResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Appel GPT-4o-mini avec des images.
 *
 * Les images sont envoyées en base64 dans le message utilisateur.
 * Le mode "low" detail suffit pour du contenu de cours
 * et coûte ~3-4x moins cher que "high".
 */
export async function callOpenAiVision(
  systemPrompt: string,
  imagesBase64: string[],
  userText: string,
  overrides?: { model?: string; apiKey?: string }
): Promise<AiVisionResponse> {
  const apiKey = overrides?.apiKey || CONFIG.openaiApiKey;
  const model = overrides?.model || CONFIG.aiModel;

  if (!apiKey) {
    throw new Error('Clé API OpenAI manquante. Configurez-la dans les paramètres ou dans .env.local');
  }

  // Construire le contenu multimodal : texte + images
  const content: Record<string, unknown>[] = [
    { type: 'text', text: userText },
  ];

  for (const img of imagesBase64) {
    content.push({
      type: 'image_url',
      image_url: {
        url: `data:image/png;base64,${img}`,
        detail: 'low', // Moins cher, suffisant pour du cours
      },
    });
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI ${response.status} : ${body.slice(0, 300)}`);
  }

  const data = await response.json();

  return {
    text: data.choices[0].message.content,
    inputTokens: data.usage?.prompt_tokens || 0,
    outputTokens: data.usage?.completion_tokens || 0,
  };
}
