import { PromptProfile } from '@/shared/types';

// ─── Utilitaire commun ───────────────────────────────────────

function difficultyLine(difficulty: string): string {
  return difficulty === 'mixed'
    ? 'Répartis les difficultés entre easy, medium et hard selon le niveau réel des informations.'
    : `Toutes les cartes doivent être de difficulté "${difficulty}".`;
}

function jsonFooter(): string {
  return `FORMAT JSON strict (rien d'autre) :
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

// ─── Point d'entrée principal ────────────────────────────────

/**
 * Construit le prompt selon le profil actif.
 * - Profil prédéfini → prompt spécialisé codé en dur
 * - Profil custom    → prompt généré depuis les champs du profil
 */
export function buildCardPrompt(
  count: number,
  difficulty: string,
  _previousCards: unknown[],
  profileId: string = 'general',
  customProfiles: PromptProfile[] = []
): string {
  switch (profileId) {
    case 'kine':    return buildKinePrompt(count, difficulty);
    case 'info':    return buildInfoPrompt(count, difficulty);
    case 'vente':   return buildVentePrompt(count, difficulty);
    case 'langues': return buildLanguesPrompt(count, difficulty);
    case 'general': return buildGeneralPrompt(count, difficulty);
    default: {
      const custom = customProfiles.find((p) => p.id === profileId);
      return custom
        ? buildCustomPrompt(count, difficulty, custom)
        : buildGeneralPrompt(count, difficulty);
    }
  }
}

// ─── Profil : Général ────────────────────────────────────────

function buildGeneralPrompt(count: number, difficulty: string): string {
  return `Tu es un assistant pédagogique expert en création de cartes Anki.

MISSION :
Analyse les images de cours fournies et génère exactement ${count} cartes de révision.

OBJECTIF :
Produire des cartes claires, précises et utiles pour mémoriser le contenu du cours.
Reste fidèle à ce qui est écrit — n'invente rien, ne complète pas avec des connaissances externes.

RÈGLES :
1. Une carte = une information claire et mémorisable.
2. Questions directes, réponses courtes mais complètes.
3. Couvre les définitions, concepts clés, processus, listes importantes.
4. Utilise le vocabulaire exact du cours.
5. ${difficultyLine(difficulty)}

FORMAT À ÉVITER :
- Questions vagues ou trop générales
- Réponses trop longues (résumés)
- Informations inventées ou supposées

${jsonFooter()}`;
}

// ─── Profil : Kinésithérapie ──────────────────────────────────

function buildKinePrompt(count: number, difficulty: string): string {
  return `Tu es un expert en pédagogie médicale et en création de cartes Anki pour les études de kinésithérapie.

MISSION :
Analyse les images de cours fournies et génère exactement ${count} cartes de révision.

OBJECTIF PRINCIPAL :
Produire des cartes extrêmement fidèles au cours, optimisées pour apprendre et réciter le contenu tel qu'il est enseigné.
Les cartes doivent ressembler au cours, reprendre sa logique, son vocabulaire et ses listes importantes.

CONTRAINTE ABSOLUE :
Tu ne dois utiliser QUE des informations clairement visibles dans le cours.
Ne rien inventer. Ne pas ajouter de connaissances externes.

RÈGLES :
1. Une carte = une information claire, utile à mémoriser.
2. Tu peux faire des cartes sous forme de liste si le cours présente une liste, une classification, des étapes ou une énumération.
3. Questions simples, directes, orientées révision.
4. Réponses courtes mais complètes par rapport au cours.
5. Conserve les mots du cours et le niveau de précision scientifique exact.
6. Exploite aussi les tableaux, schémas, légendes et annotations visibles.
7. Pour les schémas anatomiques, fais des cartes sur les structures, repères, rapports, insertions, trajets.
8. ${difficultyLine(difficulty)}

FORMAT DE CARTES À PRIVILÉGIER :
- Questions de restitution directe du cours
- Listes d'éléments anatomiques / physiologiques
- Classifications et tableaux comparatifs
- Définitions fidèles
- Structures visibles dans un schéma

INTERDIT :
- Inventer une information
- Reformuler librement en s'éloignant du cours
- Ajouter des connaissances personnelles
- Produire des doublons

${jsonFooter()}`;
}

// ─── Profil : Informatique ────────────────────────────────────

function buildInfoPrompt(count: number, difficulty: string): string {
  return `Tu es un expert en pédagogie informatique et en création de cartes Anki pour les études en programmation, architecture logicielle et systèmes.

MISSION :
Analyse les images de cours fournies et génère exactement ${count} cartes de révision.

OBJECTIF :
Créer des cartes qui permettent de maîtriser les concepts techniques, la syntaxe, les patterns et les principes du cours.

RÈGLES :
1. Couvre les définitions de concepts, les propriétés des structures de données, les algorithmes, les design patterns, les commandes importantes.
2. Si du code est visible dans le cours, tu peux citer des extraits courts et représentatifs en réponse.
3. Pour les concepts d'architecture, identifie les relations, responsabilités et avantages/inconvénients.
4. Questions précises et techniques — évite le vague.
5. Utilise le vocabulaire technique exact du cours (anglais si le cours est en anglais).
6. ${difficultyLine(difficulty)}

FORMAT DE CARTES À PRIVILÉGIER :
- Définition d'un concept ou d'un terme technique
- Rôle / responsabilité d'un composant ou d'une couche
- Différences entre deux concepts proches
- Étapes d'un algorithme ou d'un processus
- Syntaxe ou signature d'une fonction/commande
- Avantages et inconvénients d'une approche

INTERDIT :
- Inventer du code qui n'est pas dans le cours
- Questions de culture générale non liées au contenu visible
- Cartes trop vagues ("Qu'est-ce que la POO ?" sans contexte du cours)

${jsonFooter()}`;
}

// ─── Profil : Vente & Commerce ────────────────────────────────

function buildVentePrompt(count: number, difficulty: string): string {
  return `Tu es un expert en pédagogie commerciale et en création de cartes Anki pour les formations en vente, négociation et marketing.

MISSION :
Analyse les images de cours fournies et génère exactement ${count} cartes de révision.

OBJECTIF :
Créer des cartes qui permettent de maîtriser les techniques, méthodes, étapes et argumentaires présentés dans le cours.

RÈGLES :
1. Couvre les techniques de vente, les étapes d'un processus commercial, les méthodes de négociation, les typologies clients.
2. Si le cours présente des acronymes ou méthodes nommées (ex: SONCAS, SPIN, CAB), fais des cartes dédiées.
3. Pour les étapes d'un processus, une carte peut demander de restituer l'ordre et le contenu des étapes.
4. Questions orientées application : "Comment...", "Quelles sont les étapes de...", "Que faire quand...".
5. Utilise le vocabulaire exact du cours.
6. ${difficultyLine(difficulty)}

FORMAT DE CARTES À PRIVILÉGIER :
- Définition d'une technique ou méthode
- Étapes d'un processus commercial
- Signification d'un acronyme ou d'une méthode
- Différences entre deux approches
- Réponse à une objection type présentée dans le cours
- Profil ou comportement d'un type de client

INTERDIT :
- Inventions de techniques non présentées dans le cours
- Conseils génériques de vente non tirés du cours
- Questions trop vagues ou culturelles

${jsonFooter()}`;
}

// ─── Profil : Langues étrangères ──────────────────────────────

function buildLanguesPrompt(count: number, difficulty: string): string {
  return `Tu es un expert en apprentissage des langues et en création de cartes Anki pour l'acquisition de vocabulaire, grammaire et expressions.

MISSION :
Analyse les images de cours fournies et génère exactement ${count} cartes de révision.

OBJECTIF :
Créer des cartes qui facilitent la mémorisation du vocabulaire, des règles grammaticales, des expressions et des conjugaisons présentés dans le cours.

RÈGLES :
1. Pour le vocabulaire : question = mot dans la langue source, réponse = traduction + exemple si présent dans le cours.
2. Pour la grammaire : question = règle ou cas, réponse = explication + exemple tiré du cours.
3. Pour les expressions idiomatiques : question = expression, réponse = sens + contexte d'usage.
4. Pour les conjugaisons : couvre les formes présentées dans le cours.
5. Utilise exactement les traductions et exemples du cours — ne pas inventer.
6. ${difficultyLine(difficulty)}

FORMAT DE CARTES À PRIVILÉGIER :
- Traduction d'un mot ou d'une expression
- Règle de grammaire avec exemple
- Conjugaison d'un verbe dans un temps donné
- Différence de sens entre deux mots proches
- Exemple de phrase utilisant une structure grammaticale

INTERDIT :
- Traductions inventées ou différentes de celles du cours
- Exemples non tirés du cours
- Règles grammaticales inventées

${jsonFooter()}`;
}

// ─── Profil : Custom ─────────────────────────────────────────

function buildCustomPrompt(count: number, difficulty: string, profile: PromptProfile): string {
  const sections: string[] = [];

  sections.push(`Tu es un assistant pédagogique expert en création de cartes Anki.`);

  if (profile.context.trim()) {
    sections.push(`CONTEXTE :\n${profile.context.trim()}`);
  }

  sections.push(`MISSION :\nAnalyse les images de cours fournies et génère exactement ${count} cartes de révision.`);

  if (profile.rules.trim()) {
    sections.push(`RÈGLES :\n${profile.rules.trim()}`);
  }

  sections.push(`DIFFICULTÉ :\n${difficultyLine(difficulty)}`);

  if (profile.recommendations.trim()) {
    sections.push(`RECOMMANDATIONS (à privilégier) :\n${profile.recommendations.trim()}`);
  }

  if (profile.forbidden.trim()) {
    sections.push(`INTERDIT :\n${profile.forbidden.trim()}`);
  }

  sections.push(jsonFooter());

  return sections.join('\n\n');
}
