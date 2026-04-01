import { CONFIG } from '@/shared/config';

export interface AiVisionResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Appel Gemini 2.5 Flash avec des images.
 *
 * Gemini accepte les images en inline_data (base64)
 * dans le tableau "parts" du message.
 */
export async function callGeminiVision(
  systemPrompt: string,
  imagesBase64: string[],
  userText: string
): Promise<AiVisionResponse> {
  if (!CONFIG.geminiApiKey) {
    throw new Error('Clé API Gemini manquante. Ajoutez GEMINI_API_KEY dans .env.local');
  }

  // Construire les parts : texte + images
  const parts: Record<string, unknown>[] = [
    { text: userText },
  ];

  for (const img of imagesBase64) {
    parts.push({
      inline_data: {
        mime_type: 'image/png',
        data: img,
      },
    });
  }

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${CONFIG.aiModel}:generateContent?key=${CONFIG.geminiApiKey}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ parts }],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini ${response.status} : ${body.slice(0, 300)}`);
  }

  const data = await response.json();

  return {
    text: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
    inputTokens: data.usageMetadata?.promptTokenCount || 0,
    outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
  };
}
