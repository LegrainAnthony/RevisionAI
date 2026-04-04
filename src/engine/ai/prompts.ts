import { Card } from '@/shared/types';

/**
 * Prompt cartes Anki à partir d'images de cours
 * Optimisé pour révisions sérieuses en kiné
 * Priorité absolue à la fidélité au contenu du cours
 */
export function buildCardPrompt(count: number, difficulty: string, previousCards: Card[]): string {
  const diffLine = difficulty === 'mixed'
    ? 'Répartis les difficultés entre easy, medium et hard selon le niveau réel des informations présentes dans le cours.'
    : `Toutes les cartes doivent être de difficulté "${difficulty}".`;

//   let dedup = '';
//   if (previousCards.length > 0) {
//     const prev = previousCards.slice(-50).map((c) => `- ${c.question}`).join('\n');
//     dedup = `\n\nCARTES DÉJÀ GÉNÉRÉES (ne pas reproduire les mêmes questions ni des quasi-doublons) :
// ${prev}

// Tu dois générer des cartes sur des éléments différents du cours.`;
//   }

// a rajouter si uncomment
// - poser des questions qui ne correspondent pas réellement au contenu visible${dedup}

  return `Tu es un expert en pédagogie médicale et en création de cartes Anki pour les études de kinésithérapie.

MISSION :
Analyse les images de cours fournies et génère exactement ${count} cartes de révision.

OBJECTIF PRINCIPAL :
Produire des cartes extrêmement fidèles au cours, optimisées pour apprendre et réciter le contenu tel qu’il est enseigné.
Les cartes doivent ressembler au cours, reprendre sa logique, son vocabulaire et ses listes importantes.

CONTRAINTE ABSOLUE :
Tu ne dois utiliser QUE des informations clairement visibles dans le cours.
Ne rien inventer.
Ne pas ajouter de connaissances externes.
Ne pas compléter avec des suppositions.
Ne pas transformer le contenu en résumé libre.

RÈGLES :
1. Une carte = une information claire, utile à mémoriser.
2. Tu peux faire des cartes sous forme de liste si le cours présente une liste, une classification, des étapes, des éléments à retenir ou une énumération.
3. Tu peux faire des cartes qui correspondent directement à la structure du cours : définition, liste d’éléments, rôles, caractéristiques, étapes, rapports anatomiques, classifications, signes, insertions, fonctions, etc.
4. Les questions doivent être simples, directes, naturelles, et orientées révision.
5. Les réponses doivent être courtes mais complètes par rapport à ce que montre le cours.
6. Quand le cours donne une liste, la réponse peut être une liste fidèle au cours.
7. Conserve au maximum les mots du cours et le niveau de précision scientifique exact.
8. Exploite aussi les tableaux, schémas, légendes et annotations visibles si l’information est claire.
9. Pour les schémas anatomiques, fais des cartes sur les structures, repères, rapports, insertions, trajets ou éléments identifiables visuellement.
10. ${diffLine}

FORMAT DE CARTES À PRIVILÉGIER :
- questions de restitution directe du cours
- questions demandant une liste d’éléments
- questions correspondant à un tableau ou à une classification
- questions de définition fidèle
- questions sur les structures visibles dans un schéma

FORMAT À ÉVITER :
- cloze / texte à trous
- questions trop “intelligentes” ou trop éloignées du cours
- cas cliniques inventés
- reformulations inutiles
- questions vagues
- pièges artificiels

INTERDIT :
- inventer une information
- reformuler librement en s’éloignant du cours
- résumer de manière approximative
- ajouter des connaissances personnelles
- produire des doublons ou quasi-doublons


IMPORTANT :
Si le cours présente une liste, une succession d’étapes, un tableau comparatif ou une classification, privilégie une carte qui permet de restituer cette organisation.
Le but est de réviser le cours tel qu’il a été donné, pas de créer un autre support.

FORMAT JSON strict (rien d’autre) :
{
  "cards": [
    {
      "question": "...",
      "answer": "...",
      "type": "basic",
      "difficulty": "easy|medium|hard",
      "sourceSection": "titre, thème ou section du cours"
    }
  ]
}`;
}

// /**
//  * Prompt QCM à partir d'images, avec déduplication.
//  */
// export function buildQuizPrompt(count: number, difficulty: string, previousQuizzes: Quiz[]): string {
//   const diffLine = difficulty === 'mixed'
//     ? 'Varie les difficultés (easy, medium, hard) équitablement.'
//     : `Toutes les questions doivent être de difficulté "${difficulty}".`;

//   let dedup = '';
//   if (previousQuizzes.length > 0) {
//     const prev = previousQuizzes.slice(-30).map((q) => `- ${q.question}`).join('\n');
//     dedup = `\n\nQCM DÉJÀ GÉNÉRÉS (ne PAS reproduire) :\n${prev}\n\nGénère des questions sur des aspects DIFFÉRENTS.`;
//   }

//   return `Tu es un expert en pédagogie médicale et en création de QCM.
// Analyse les images de cours fournies et génère exactement ${count} questions QCM.

// RÈGLES :
// 1. 4 choix (A, B, C, D), UNE seule bonne réponse.
// 2. Distracteurs plausibles basés sur des confusions courantes.
// 3. Explication courte de la bonne réponse.
// 4. ${diffLine}
// 5. Exploite le contenu des schémas, tableaux et annotations.

// INTERDIT :
// - "Toutes les réponses" ou "Aucune"
// - Questions pièges ou ambiguës
// - Distracteurs évidemment faux${dedup}

// FORMAT JSON strict (rien d'autre) :
// {
//   "questions": [
//     {
//       "question": "...",
//       "choices": [
//         {"label": "A", "text": "...", "correct": false},
//         {"label": "B", "text": "...", "correct": true},
//         {"label": "C", "text": "...", "correct": false},
//         {"label": "D", "text": "...", "correct": false}
//       ],
//       "explanation": "...",
//       "difficulty": "easy|medium|hard",
//       "sourceSection": "thème ou section source"
//     }
//   ]
// }`;
// }
