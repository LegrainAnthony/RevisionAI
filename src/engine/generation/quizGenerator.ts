import { Quiz, GenerationConfig } from '@/shared/types';
import { callVision, estimateCost } from '@/engine/ai/aiClient';
import { buildQuizPrompt } from '@/engine/ai/prompts';
import { CONFIG } from '@/shared/config';

interface QuizResult {
  quizzes: Quiz[];
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

/**
 * Génère des QCM à partir d'images de pages.
 * Même logique que le générateur de cartes : lots + déduplication.
 */
export async function generateQuizzes(
  pagesBase64: string[],
  config: GenerationConfig,
  previousQuizzes: Quiz[]
): Promise<QuizResult> {
  const batches = splitBatches(pagesBase64, CONFIG.pagesPerBatch);
  const perBatch = Math.max(1, Math.ceil(config.quizCount / batches.length));

  const allQuizzes: Quiz[] = [];
  let totalIn = 0;
  let totalOut = 0;

  for (let i = 0; i < batches.length; i++) {
    const prompt = buildQuizPrompt(perBatch, config.difficulty, [...previousQuizzes, ...allQuizzes]);

    try {
      const res = await callVision(prompt, batches[i]);
      totalIn += res.inputTokens;
      totalOut += res.outputTokens;
      allQuizzes.push(...parseQuizzes(res.text));
    } catch (err) {
      console.error(`[QuizGen] Lot ${i + 1}/${batches.length} échoué :`, (err as Error).message);
    }
  }

  return {
    quizzes: allQuizzes.slice(0, config.quizCount).map((q, i) => ({
      ...q,
      id: `quiz-${Date.now()}-${i}`,
      selected: true,
    })),
    inputTokens: totalIn,
    outputTokens: totalOut,
    costUsd: estimateCost(totalIn, totalOut),
  };
}

function parseQuizzes(text: string): Quiz[] {
  try {
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const data = JSON.parse(cleaned);
    if (!Array.isArray(data.questions)) return [];
    return data.questions.map((q: Record<string, unknown>) => ({
      id: '', question: (q.question as string) || '',
      choices: Array.isArray(q.choices) ? q.choices : [],
      explanation: (q.explanation as string) || '',
      difficulty: (q.difficulty as string) || 'medium',
      sourceSection: (q.sourceSection as string) || '',
      selected: true,
    }));
  } catch {
    return [];
  }
}

function splitBatches<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
