// ─── Paramètres utilisateur ──────────────────────────────────

export interface AppSettings {
  provider: 'gemini' | 'openai';
  apiKey: string;
  model: string;
  pagesPerBatch: number;
  cardsPerChunk: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  provider: 'gemini',
  apiKey: '',
  model: 'gemini-2.5-flash',
  pagesPerBatch: 1,
  cardsPerChunk: 5,
};

// ─── Cartes Anki (éphémères — pas stockées) ─────────────────

export type CardType = 'definition' | 'process' | 'comparison' | 'application' | 'cause_effect' | 'cloze';
export type Difficulty = 'easy' | 'medium' | 'hard';

export interface Card {
  id: string;
  question: string;
  answer: string;
  type: CardType;
  difficulty: Difficulty;
  sourceSection: string;
  sourcePages: number[];  // pages du PDF dont la carte est issue
  selected: boolean;
  frontImages: string[];  // base64 PNG ajoutées par l'utilisateur (côté question)
  backImages: string[];   // base64 PNG ajoutées par l'utilisateur (côté réponse)
  cardMode: 'basic' | 'reverse';
}

// ─── QCM ─────────────────────────────────────────────────────

export interface QuizChoice {
  label: string;
  text: string;
  correct: boolean;
}

export interface Quiz {
  id: string;
  question: string;
  choices: QuizChoice[];
  explanation: string;
  difficulty: Difficulty;
  sourceSection: string;
  selected: boolean;
}

// ─── Génération ──────────────────────────────────────────────

export type GenerationMode = 'cards' | 'quiz' | 'both';

export interface GenerationConfig {
  mode: GenerationMode;
  cardCount: number;
  quizCount: number;
  difficulty: Difficulty | 'mixed';
  selectedPages: number[];
}

// ─── Cache ───────────────────────────────────────────────────

export interface DocumentMeta {
  hash: string;
  fileName: string;
  pageCount: number;
  createdAt: string;
  costs: {
    total: number;
    history: { id: string; cost: number; date: string }[];
  };
}

export interface GenerationRecord {
  id: string;
  mode: GenerationMode;
  cards: Card[];
  quizzes: Quiz[];
  selectedPages: number[];
  costUsd: number;
  provider: string;
  model: string;
  createdAt: string;
}

// ─── API ─────────────────────────────────────────────────────

export interface GenerateResponse {
  cards: Card[];
  quizzes: Quiz[];
  usage: { inputTokens: number; outputTokens: number; costUsd: number };
}