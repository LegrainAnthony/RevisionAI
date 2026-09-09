// ─── Providers ────────────────────────────────────────────────

export type ProviderId = 'gemini' | 'openai';

export const PROVIDER_IDS: ProviderId[] = ['gemini', 'openai'];

export interface ModelSelection {
  provider: ProviderId;
  model: string;
}

/**
 * Détail des images envoyées au modèle.
 * `original` conserve la résolution d'entrée — indispensable pour le texte
 * minuscule et l'écriture manuscrite. Tous les modèles ne l'exploitent pas :
 * voir `resolveImageDetail()` dans `shared/models.ts`.
 */
export type ImageDetail = 'low' | 'high' | 'original';

// ─── Profils de prompt ────────────────────────────────────────

/**
 * Un profil décrit le COMPORTEMENT attendu de l'IA pour une matière.
 *
 * Les profils livrés avec l'app et les profils créés par l'utilisateur
 * partagent exactement la même structure : un seul moteur de rendu les
 * transforme en prompt (voir `engine/ai/promptBuilder.ts`).
 */
export interface PromptProfile {
  id: string;
  name: string;
  emoji: string;
  description: string;
  /** Qui est l'étudiant, de quoi parle le cours */
  context: string;
  /** Ce que l'IA DOIT faire */
  rules: string;
  /** Ce que l'IA DEVRAIT privilégier */
  recommendations: string;
  /** Ce que l'IA NE DOIT JAMAIS faire */
  forbidden: string;
  /** true = livré avec l'app : non modifiable et non supprimable, mais duplicable */
  builtin: boolean;
}

/** Les seuls champs dont la construction du prompt a besoin. */
export type ProfileSpec = Pick<
  PromptProfile,
  'name' | 'context' | 'rules' | 'recommendations' | 'forbidden'
>;

// ─── Cartes Anki (éphémères — jamais stockées côté serveur) ──

export type CardType =
  | 'definition'
  | 'process'
  | 'comparison'
  | 'application'
  | 'cause_effect'
  | 'cloze';

export const CARD_TYPES: CardType[] = [
  'definition',
  'process',
  'comparison',
  'application',
  'cause_effect',
  'cloze',
];

export type Difficulty = 'easy' | 'medium' | 'hard';

export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

/** Difficulté choisie par l'utilisateur — `mixed` laisse l'IA répartir. */
export type DifficultySetting = Difficulty | 'mixed';

export interface Card {
  id: string;
  question: string;
  answer: string;
  type: CardType;
  difficulty: Difficulty;
  sourceSection: string;
  /** Numéros de page (1-based) du chunk dont la carte est issue */
  sourcePages: number[];
  selected: boolean;
  /** base64 PNG ajoutées manuellement par l'utilisateur */
  frontImages: string[];
  backImages: string[];
  cardMode: 'basic' | 'reverse';
}

// ─── Découpage en chunks ──────────────────────────────────────

/**
 * Un chunk est une fenêtre FIXE de pages du document
 * (`[index * pagesPerChunk, index * pagesPerChunk + pagesPerChunk)`),
 * moins les pages désélectionnées par l'utilisateur.
 *
 * `index` est donc une identité STABLE : décocher une page ne renumérote
 * jamais les chunks, et une consigne reste attachée aux pages exactes
 * de la boîte où elle a été saisie.
 */
export interface GenerationChunk {
  /** Index de la fenêtre dans le document, 0-based */
  index: number;
  /** Pages (1-based) réellement sélectionnées dans cette fenêtre */
  pageNumbers: number[];
  /** Nombre de cartes demandé pour ce chunk */
  cardCount: number;
  /** Consigne libre transmise UNIQUEMENT lors du traitement de ce chunk */
  instructions: string;
}

// ─── Paramètres de génération ─────────────────────────────────

export type OutputLanguage = 'auto' | 'fr' | 'en';

export interface GenerationParams {
  difficulty: DifficultySetting;
  language: OutputLanguage;
  /** Consigne libre appliquée à TOUS les chunks de la génération */
  globalInstructions: string;
}

// ─── API : une requête HTTP = un chunk ───────────────────────

export interface GenerateChunkRequest {
  /** base64 PNG, dans le même ordre que `chunk.pageNumbers` */
  images: string[];
  chunk: GenerationChunk;
  params: GenerationParams;
  /** Profil déjà résolu côté client — le serveur ne fait aucune recherche */
  profile: ProfileSpec;
  selection: ModelSelection;
  /** Relancer un appel de complétion si le modèle renvoie trop peu de cartes */
  autoComplete: boolean;
  /** Niveau de détail des images (OpenAI uniquement) */
  imageDetail: ImageDetail;
}

export interface UsageStats {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface GenerateChunkResponse {
  cards: Card[];
  /** Nombre demandé pour ce chunk */
  requested: number;
  /** Nombre effectivement retenu après validation, déduplication et troncature */
  obtained: number;
  usage: UsageStats;
  /** Messages non bloquants : troncature, doublons écartés, complétion partielle… */
  warnings: string[];
  /** true si un appel de complétion a été nécessaire */
  toppedUp: boolean;
}

// ─── Suivi de la génération (client) ─────────────────────────

export type ChunkPhase = 'pending' | 'running' | 'done' | 'error' | 'cancelled';

export interface ChunkStatus {
  index: number;
  pageNumbers: number[];
  requested: number;
  obtained: number;
  phase: ChunkPhase;
  hasInstructions: boolean;
  toppedUp: boolean;
  warnings: string[];
  error?: string;
}

// ─── Paramètres utilisateur (localStorage) ───────────────────

export const SETTINGS_VERSION = 2;

/**
 * Préférences persistées dans `localStorage` sous `ankidocs_settings`.
 *
 * La clé API n'est VOLONTAIREMENT pas ici : elle vit dans un store séparé
 * (`ankidocs_keys`, voir `hooks/useApiKeys.ts`) pour ne jamais transiter
 * dans le même objet que les préférences.
 */
export interface AppSettings {
  version: number;
  provider: ProviderId;
  /** Dernier modèle utilisé pour chaque provider */
  models: Record<ProviderId, string>;
  pagesPerChunk: number;
  cardsPerChunk: number;
  difficulty: DifficultySetting;
  language: OutputLanguage;
  /** Consigne libre appliquée à tous les chunks */
  globalInstructions: string;
  activeProfileId: string;
  customProfiles: PromptProfile[];
  exportTags: boolean;
  /** Compléter automatiquement quand le modèle renvoie trop peu de cartes */
  autoCompleteCount: boolean;
  /** Nombre de chunks traités en parallèle */
  concurrency: number;
  /** Résolution de rendu des pages PDF, en px sur le côté le plus long */
  renderScale: number;
  /** Niveau de détail des images envoyées à OpenAI */
  imageDetail: ImageDetail;
}

export const DEFAULT_SETTINGS: AppSettings = {
  version: SETTINGS_VERSION,
  provider: 'gemini',
  models: { gemini: 'gemini-2.5-flash', openai: 'gpt-5.6-luna' },
  pagesPerChunk: 1,
  cardsPerChunk: 5,
  difficulty: 'mixed',
  language: 'auto',
  globalInstructions: '',
  activeProfileId: 'general',
  customProfiles: [],
  exportTags: false,
  autoCompleteCount: true,
  concurrency: 3,
  renderScale: 1024,
  imageDetail: 'high',
};
