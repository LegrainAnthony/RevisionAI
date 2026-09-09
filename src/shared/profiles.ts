import type { PromptProfile, ProfileSpec } from './types';

/**
 * Catalogue des profils livrés avec l'application.
 *
 * Ils utilisent exactement la même structure que les profils créés par
 * l'utilisateur : un seul moteur (`engine/ai/promptBuilder.ts`) les rend.
 * Ajouter un profil = ajouter une entrée ici, rien d'autre.
 */
export const BUILTIN_PROFILES: PromptProfile[] = [
  // ─── Général ────────────────────────────────────────────────
  {
    id: 'general',
    name: 'Général',
    emoji: '📚',
    description: "Adapté à tous les types de cours. Idéal si vous ne savez pas quel profil choisir.",
    builtin: true,
    context:
      "Cours généraliste, toutes matières confondues. L'étudiant veut mémoriser fidèlement le contenu des slides fournies.",
    rules: [
      '- Une carte = une information claire et mémorisable.',
      '- Questions directes ; réponses courtes mais complètes.',
      '- Couvrir en priorité les définitions, les concepts clés, les processus et les listes importantes.',
      '- Utiliser le vocabulaire exact du cours.',
    ].join('\n'),
    recommendations: [
      '- Reprendre les formulations du cours quand elles sont déjà claires.',
      '- Regrouper dans une même carte les éléments qui forment un ensemble (une liste, une classification).',
    ].join('\n'),
    forbidden: [
      '- Poser des questions vagues ou trop générales.',
      '- Produire des réponses longues qui ressemblent à un résumé.',
      '- Inventer, supposer ou compléter avec des connaissances extérieures au cours.',
    ].join('\n'),
  },

  // ─── Kinésithérapie ─────────────────────────────────────────
  {
    id: 'kine',
    name: 'Kinésithérapie',
    emoji: '🦴',
    description: "Anatomie, physiologie, biomécanique. Fidélité maximale au cours.",
    builtin: true,
    context: [
      "Études de kinésithérapie : anatomie, physiologie, biomécanique.",
      "L'étudiant doit pouvoir RÉCITER le cours tel quel à partir des cartes.",
      "Tu es un EXTRACTEUR et un COPIEUR du cours, pas un reformulateur.",
      "Si on compare une carte au cours, aucune information ne doit manquer.",
    ].join('\n'),
    rules: [
      '- EXHAUSTIVITÉ : chaque carte contient TOUTES les informations que le cours associe à la question. Ne jamais tronquer une liste ni une explication.',
      "- FIDÉLITÉ : reprendre les mots EXACTS du cours. Conserver les expressions clés telles quelles (« sert à stabiliser », « transfert de force »…).",
      '- ANNOTATIONS : inclure impérativement les notes manuscrites, les ajouts à la main et les annotations en marge. Elles comptent autant que le texte imprimé.',
      '- STRUCTURE : quand le cours contient une énumération, une classification ou des étapes, la réponse doit être une liste structurée et complète.',
      '- SCHÉMAS : exploiter les légendes, repères anatomiques, insertions, trajets et relations visibles sur les figures.',
      "- DENSITÉ : si plusieurs informations portent sur une même notion, les regrouper dans UNE carte plutôt que de fragmenter artificiellement.",
    ].join('\n'),
    recommendations: [
      '- Privilégier les questions de restitution directe du cours.',
      '- Privilégier les définitions exactes et les relations anatomiques complètes.',
      '- Une carte doit permettre de réciter le passage correspondant du cours.',
    ].join('\n'),
    forbidden: [
      '- Omettre une information présente dans le cours.',
      '- Reformuler une phrase qui existe déjà telle quelle dans le cours.',
      '- Résumer ou simplifier.',
      '- Ajouter des connaissances externes au cours.',
      '- Produire une carte incomplète.',
    ].join('\n'),
  },

  // ─── Informatique ───────────────────────────────────────────
  {
    id: 'info',
    name: 'Informatique',
    emoji: '💻',
    description: 'Programmation, architecture logicielle, algorithmes, design patterns.',
    builtin: true,
    context:
      "Cours d'informatique : programmation, architecture logicielle, algorithmes et systèmes. L'objectif est de maîtriser les concepts techniques, la syntaxe, les patterns et les principes présentés.",
    rules: [
      "- Couvrir les définitions de concepts, les propriétés des structures de données, les algorithmes, les design patterns et les commandes importantes.",
      '- Si du code est visible dans le cours, citer des extraits courts et représentatifs dans la réponse.',
      "- Pour l'architecture, identifier les relations, les responsabilités et les avantages/inconvénients.",
      '- Questions précises et techniques.',
      '- Utiliser le vocabulaire technique exact du cours (en anglais si le cours est en anglais).',
    ].join('\n'),
    recommendations: [
      "- Définition d'un concept ou d'un terme technique.",
      "- Rôle et responsabilité d'un composant ou d'une couche.",
      '- Différences entre deux concepts proches.',
      "- Étapes d'un algorithme ou d'un processus.",
      "- Syntaxe ou signature d'une fonction ou d'une commande.",
      "- Avantages et inconvénients d'une approche.",
    ].join('\n'),
    forbidden: [
      "- Inventer du code qui n'apparaît pas dans le cours.",
      '- Poser des questions de culture générale sans lien avec le contenu visible.',
      "- Produire des cartes trop vagues (« Qu'est-ce que la POO ? » sans le contexte du cours).",
    ].join('\n'),
  },

  // ─── Vente & Commerce ───────────────────────────────────────
  {
    id: 'vente',
    name: 'Vente & Commerce',
    emoji: '🤝',
    description: 'Techniques de vente, négociation, méthodes commerciales, typologies clients.',
    builtin: true,
    context:
      "Formation en vente, négociation et marketing. L'objectif est de maîtriser les techniques, méthodes, étapes et argumentaires présentés dans le cours.",
    rules: [
      '- Couvrir les techniques de vente, les étapes du processus commercial, les méthodes de négociation et les typologies clients.',
      '- Si le cours présente un acronyme ou une méthode nommée (SONCAS, SPIN, CAB…), lui consacrer une carte dédiée.',
      "- Pour un processus, une carte peut demander de restituer l'ordre ET le contenu des étapes.",
      '- Orienter les questions vers l\'application : « Comment… », « Quelles sont les étapes de… », « Que faire quand… ».',
      '- Utiliser le vocabulaire exact du cours.',
    ].join('\n'),
    recommendations: [
      "- Définition d'une technique ou d'une méthode.",
      "- Étapes d'un processus commercial.",
      "- Signification d'un acronyme.",
      '- Différences entre deux approches.',
      '- Réponse à une objection type présentée dans le cours.',
      "- Profil ou comportement d'un type de client.",
    ].join('\n'),
    forbidden: [
      "- Inventer des techniques qui ne sont pas présentées dans le cours.",
      '- Donner des conseils de vente génériques non tirés du cours.',
      '- Poser des questions trop vagues ou purement culturelles.',
    ].join('\n'),
  },

  // ─── Langues étrangères ─────────────────────────────────────
  {
    id: 'langues',
    name: 'Langues étrangères',
    emoji: '🌍',
    description: 'Vocabulaire, grammaire, expressions idiomatiques, conjugaisons.',
    builtin: true,
    context:
      "Apprentissage d'une langue étrangère : acquisition de vocabulaire, de règles de grammaire, d'expressions et de conjugaisons à partir du cours fourni.",
    rules: [
      '- Vocabulaire : question = le mot dans la langue source, réponse = la traduction, plus un exemple si le cours en donne un.',
      "- Grammaire : question = la règle ou le cas, réponse = l'explication accompagnée d'un exemple tiré du cours.",
      "- Expressions idiomatiques : question = l'expression, réponse = son sens et son contexte d'usage.",
      '- Conjugaison : couvrir les formes présentées dans le cours.',
      '- Utiliser exactement les traductions et les exemples du cours.',
    ].join('\n'),
    recommendations: [
      "- Traduction d'un mot ou d'une expression.",
      '- Règle de grammaire accompagnée de son exemple.',
      "- Conjugaison d'un verbe à un temps donné.",
      '- Différence de sens entre deux mots proches.',
      "- Exemple de phrase utilisant une structure grammaticale.",
    ].join('\n'),
    forbidden: [
      '- Proposer une traduction inventée ou différente de celle du cours.',
      '- Utiliser des exemples qui ne viennent pas du cours.',
      '- Inventer des règles de grammaire.',
    ].join('\n'),
  },
];

export const BUILTIN_PROFILE_IDS: string[] = BUILTIN_PROFILES.map((p) => p.id);

export function isBuiltinId(id: string): boolean {
  return BUILTIN_PROFILE_IDS.includes(id);
}

/**
 * Retrouve le profil actif. Un identifiant inconnu (profil supprimé,
 * réglage obsolète) retombe sur « Général » plutôt que d'échouer.
 */
export function resolveProfile(id: string, customProfiles: PromptProfile[] = []): PromptProfile {
  return (
    BUILTIN_PROFILES.find((p) => p.id === id) ??
    customProfiles.find((p) => p.id === id) ??
    BUILTIN_PROFILES[0]
  );
}

/** Réduit un profil aux seuls champs utiles à la construction du prompt. */
export function toSpec(profile: PromptProfile): ProfileSpec {
  return {
    name: profile.name,
    context: profile.context,
    rules: profile.rules,
    recommendations: profile.recommendations,
    forbidden: profile.forbidden,
  };
}

/**
 * Copie modifiable d'un profil — y compris d'un profil livré avec l'app.
 * C'est le chemin le plus simple pour un utilisateur qui veut personnaliser
 * sans partir d'une page blanche.
 */
export function duplicateProfile(profile: PromptProfile): PromptProfile {
  return {
    ...profile,
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: `${profile.name} (copie)`,
    emoji: '✏️',
    description: profile.description || 'Profil personnalisé',
    builtin: false,
  };
}

/** Profil vierge pour la création depuis zéro. */
export function emptyProfile(): PromptProfile {
  return {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: '',
    emoji: '✏️',
    description: '',
    context: '',
    rules: '',
    recommendations: '',
    forbidden: '',
    builtin: false,
  };
}
