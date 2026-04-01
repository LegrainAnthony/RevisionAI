function env(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

export const CONFIG = {
  aiProvider: env('AI_PROVIDER', 'gemini') as 'openai' | 'gemini',
  aiModel: env('AI_MODEL', 'gemini-2.5-flash'),
  openaiApiKey: env('OPENAI_API_KEY', ''),
  geminiApiKey: env('GEMINI_API_KEY', ''),

  /** Nombre de pages par chunk (défaut) */
  pagesPerBatch: 4,

  /** Nombre de cartes à générer par chunk */
  cardsPerChunk: 5,

  /** Dossier de cache */
  cacheDir: env('CACHE_DIR', './data/cache'),

  /** Taille max de fichier (MB) */
  maxFileSizeMb: 50,
} as const;

/**
 * Constantes exposables au client (pas de clés API).
 * Utilisées pour l'estimation de coût côté navigateur.
 */
export const CLIENT_DEFAULTS = {
  pagesPerChunk: 4,
  cardsPerChunk: 5,
  /** Coût approximatif par image en input (USD) */
  costPerImage: { openai: 0.0002, gemini: 0.00008 },
  /** Coût approximatif par carte en output (USD) */
  costPerCard: { openai: 0.00006, gemini: 0.00025 },
};
