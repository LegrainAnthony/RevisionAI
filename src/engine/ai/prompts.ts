import { Card, Quiz } from '@/shared/types';

/**
 * Prompt cartes Anki à partir d'IMAGES de cours.
 * Inclut la déduplication : les cartes déjà générées sont listées
 * pour que l'IA produise du contenu différent.
 */
export function buildCardPrompt(count: number, difficulty: string, previousCards: Card[]): string {
  const diffLine = difficulty === 'mixed'
    ? 'Varie les difficultés (easy, medium, hard) équitablement.'
    : `Toutes les cartes doivent être de difficulté "${difficulty}".`;

  let dedup = '';
  if (previousCards.length > 0) {
    const prev = previousCards.slice(-50).map((c) => `- ${c.question}`).join('\n');
    dedup = `\n\nCARTES DÉJÀ GÉNÉRÉES (ne PAS reproduire de questions similaires) :\n${prev}\n\nGénère des cartes sur des aspects DIFFÉRENTS du contenu.`;
  }

  return `Tu es un expert en pédagogie médicale et en création de flashcards.
Analyse les images de cours fournies et génère exactement ${count} cartes de révision.

RÈGLES :
1. Une carte = un concept atomique.
2. Question précise et sans ambiguïté.
3. Réponse courte (1 à 3 phrases max).
4. Varie les types : definition, process, comparison, application, cause_effect, cloze.
5. ${diffLine}
6. Pour les cartes "cloze", utilise {{c1::réponse}} dans le champ question.
7. Exploite TOUT le contenu visible : texte, schémas, tableaux, légendes, annotations.
8. Pour les schémas anatomiques, pose des questions sur les structures visibles.

INTERDIT :
- Questions triviales ou trop vagues
- Doublons ou quasi-doublons
- Réponses de plus de 3 phrases
- Ignorer le contenu des schémas et tableaux${dedup}

FORMAT JSON strict (rien d'autre) :
{
  "cards": [
    {
      "question": "...",
      "answer": "...",
      "type": "definition|process|comparison|application|cause_effect|cloze",
      "difficulty": "easy|medium|hard",
      "sourceSection": "thème ou section source"
    }
  ]
}`;
}

/**
 * Prompt QCM à partir d'images, avec déduplication.
 */
export function buildQuizPrompt(count: number, difficulty: string, previousQuizzes: Quiz[]): string {
  const diffLine = difficulty === 'mixed'
    ? 'Varie les difficultés (easy, medium, hard) équitablement.'
    : `Toutes les questions doivent être de difficulté "${difficulty}".`;

  let dedup = '';
  if (previousQuizzes.length > 0) {
    const prev = previousQuizzes.slice(-30).map((q) => `- ${q.question}`).join('\n');
    dedup = `\n\nQCM DÉJÀ GÉNÉRÉS (ne PAS reproduire) :\n${prev}\n\nGénère des questions sur des aspects DIFFÉRENTS.`;
  }

  return `Tu es un expert en pédagogie médicale et en création de QCM.
Analyse les images de cours fournies et génère exactement ${count} questions QCM.

RÈGLES :
1. 4 choix (A, B, C, D), UNE seule bonne réponse.
2. Distracteurs plausibles basés sur des confusions courantes.
3. Explication courte de la bonne réponse.
4. ${diffLine}
5. Exploite le contenu des schémas, tableaux et annotations.

INTERDIT :
- "Toutes les réponses" ou "Aucune"
- Questions pièges ou ambiguës
- Distracteurs évidemment faux${dedup}

FORMAT JSON strict (rien d'autre) :
{
  "questions": [
    {
      "question": "...",
      "choices": [
        {"label": "A", "text": "...", "correct": false},
        {"label": "B", "text": "...", "correct": true},
        {"label": "C", "text": "...", "correct": false},
        {"label": "D", "text": "...", "correct": false}
      ],
      "explanation": "...",
      "difficulty": "easy|medium|hard",
      "sourceSection": "thème ou section source"
    }
  ]
}`;
}
