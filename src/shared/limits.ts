/**
 * Constantes partagées client / serveur.
 *
 * Volontairement séparées de `config.ts`, qui lit les clés API et ne doit
 * jamais se retrouver dans le graphe d'import d'un composant client.
 */
export const LIMITS = {
  maxFileSizeMb: 50,
  /** Longueur maximale d'une consigne libre (chunk ou globale) */
  maxInstructionsLength: 1000,
  minCardsPerChunk: 1,
  maxCardsPerChunk: 20,
  minPagesPerChunk: 1,
  maxPagesPerChunk: 8,
  minConcurrency: 1,
  maxConcurrency: 6,
} as const;

/** Résolutions de rendu PDF proposées (px sur le côté le plus long). */
export const RENDER_SCALES = [
  { value: 1024, label: 'Standard — 1024 px', hint: 'Rapide et bon marché. Convient à des slides aérées.' },
  { value: 1536, label: 'Élevée — 1536 px', hint: 'Recommandé si le cours contient des schémas ou du texte dense.' },
  { value: 2048, label: 'Maximale — 2048 px', hint: 'Pour les annotations manuscrites et les figures très chargées. Plus lent et plus cher.' },
] as const;
