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

OBJECTIF PRINCIPAL (CRITIQUE) :
Produire des cartes STRICTEMENT fidèles au cours, en conservant 100% des informations importantes.
Aucune information pertinente du cours ne doit être perdue.

PRINCIPE FONDAMENTAL :
Tu es un EXTRACTEUR et COPIEUR du cours, pas un reformulateur.

CONTRAINTE ABSOLUE :
- Tu ne dois utiliser QUE les informations visibles dans le cours
- Tu ne dois RIEN inventer
- Tu ne dois PAS reformuler si une formulation est présente dans le cours
- Tu dois privilégier les formulations EXACTES du cours

RÈGLES CRITIQUES :

1. EXHAUSTIVITÉ TOTALE
- Chaque carte doit contenir TOUTES les informations associées à la question dans le cours
- Ne jamais omettre un élément d’une liste ou d’une explication
- Si plusieurs éléments sont liés → les regrouper dans UNE SEULE carte

2. RESPECT STRICT DU TEXTE
- Reprendre les mots EXACTS du cours autant que possible
- Interdiction de simplifier ou reformuler si le texte existe déjà
- Conserver les expressions clés du cours (ex : "sert à stabiliser", "transfert de force")

3. PRIORITÉ AUX ANNOTATIONS
- Inclure IMPÉRATIVEMENT :
  - notes manuscrites
  - ajouts écrits à la main
  - annotations autour du texte
- Elles sont considérées comme aussi importantes que le texte principal

4. STRUCTURE DES RÉPONSES
- Favoriser les listes structurées quand le cours contient :
  - énumérations
  - classifications
  - étapes
- Chaque élément doit être complet (pas tronqué)

5. CARTES OPTIMISÉES POUR LA RÉCITATION
- Les cartes doivent permettre de réciter le cours tel quel
- Pas de résumé → restitution fidèle

6. SCHÉMAS ET IMAGES
- Exploiter :
  - légendes
  - repères anatomiques
  - relations
  - insertions
  - trajets
- Transformer chaque élément visible en information mémorisable

7. DENSITÉ D’INFORMATION
- Si une notion contient plusieurs infos → les regrouper dans une seule carte
- Éviter de fragmenter artificiellement

8. ${difficultyLine(difficulty)}

FORMAT DE CARTES À PRIVILÉGIER :
- Questions de restitution directe du cours
- Listes complètes (TOUS les éléments)
- Définitions EXACTES
- Contenu de schéma + annotations
- Relations anatomiques complètes

INTERDIT (STRICT) :
- Omettre une information présente dans le cours
- Reformuler une phrase existante
- Résumer ou simplifier
- Ajouter des connaissances externes
- Produire des cartes incomplètes

OBJECTIF FINAL :
Si on compare la carte au cours → aucune information ne doit manquer.

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
