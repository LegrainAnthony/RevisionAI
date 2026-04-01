'use client';

import { Difficulty } from '@/shared/types';

interface Props {
  selectedPageCount: number;
  pagesPerChunk: number;
  cardsPerChunk: number;
  difficulty: Difficulty | 'mixed';
  provider: 'openai' | 'gemini';
  onCardsPerChunkChange: (n: number) => void;
  onDifficultyChange: (d: Difficulty | 'mixed') => void;
  onGenerate: () => void;
  loading: boolean;
}

/**
 * Panneau de configuration de la génération.
 *
 * Affiche en temps réel :
 * - Le nombre de chunks qui seront traités
 * - Le nombre total de cartes estimé
 * - Le coût estimé en USD
 *
 * Le coût se met à jour immédiatement quand l'utilisateur
 * change un paramètre (pas d'appel serveur).
 */
export function GenerationPanel({
  selectedPageCount,
  pagesPerChunk,
  cardsPerChunk,
  difficulty,
  provider,
  onCardsPerChunkChange,
  onDifficultyChange,
  onGenerate,
  loading,
}: Props) {
  const chunkCount = Math.ceil(selectedPageCount / pagesPerChunk);
  const totalCards = chunkCount * cardsPerChunk;
  const cost = estimateCostClient(selectedPageCount, totalCards, provider);

  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-6 space-y-6">
      <h2 className="text-lg font-semibold">Configuration</h2>

      {/* Cartes par chunk */}
      <div>
        <div className="flex justify-between mb-2">
          <label className="text-sm text-[var(--text-muted)]">Cartes par chunk</label>
          <span className="text-sm font-semibold">{cardsPerChunk}</span>
        </div>
        <input
          type="range"
          min={2}
          max={10}
          value={cardsPerChunk}
          onChange={(e) => onCardsPerChunkChange(Number(e.target.value))}
          className="w-full accent-[var(--accent)]"
        />
        <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-1">
          <span>2 (précis)</span>
          <span>10 (large)</span>
        </div>
      </div>

      {/* Difficulté */}
      <div>
        <label className="text-sm text-[var(--text-muted)] block mb-2">Difficulté</label>
        <div className="flex gap-1.5">
          {(['mixed', 'easy', 'medium', 'hard'] as const).map((d) => (
            <button
              key={d}
              onClick={() => onDifficultyChange(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                difficulty === d
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              {{ mixed: 'Mixte', easy: 'Facile', medium: 'Moyen', hard: 'Difficile' }[d]}
            </button>
          ))}
        </div>
      </div>

      {/* Résumé + coût */}
      <div className="grid grid-cols-3 gap-3">
        <StatBox label="Chunks" value={String(chunkCount)} />
        <StatBox label="Cartes estimées" value={String(totalCards)} />
        <StatBox label="Coût estimé" value={`$${cost.toFixed(4)}`} accent />
      </div>

      {/* Provider info */}
      <p className="text-[10px] text-[var(--text-muted)] text-center">
        Provider : {provider === 'openai' ? 'OpenAI (GPT-4o-mini)' : 'Google (Gemini 2.5 Flash)'}
        {' · '}{selectedPageCount} pages · {chunkCount} appels API
      </p>

      {/* Bouton générer */}
      <button
        onClick={onGenerate}
        disabled={loading || selectedPageCount === 0}
        className={`w-full py-3 rounded-xl text-sm font-semibold ${
          loading || selectedPageCount === 0
            ? 'bg-[var(--bg-hover)] text-[var(--text-muted)] cursor-not-allowed'
            : 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white'
        }`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Génération en cours…
          </span>
        ) : (
          `Générer ${totalCards} cartes — $${cost.toFixed(4)}`
        )}
      </button>
    </div>
  );
}

function StatBox({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="text-center p-3 rounded-lg bg-[var(--bg)]">
      <p className={`text-xl font-bold ${accent ? 'text-[var(--success)]' : ''}`}>{value}</p>
      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{label}</p>
    </div>
  );
}

/**
 * Estimation de coût côté client (pas d'appel serveur).
 * Basée sur les prix publics approximatifs.
 */
function estimateCostClient(pageCount: number, cardCount: number, provider: string): number {
  const prices = {
    openai: { perImage: 0.0002, perCard: 0.00006 },
    gemini: { perImage: 0.00008, perCard: 0.00025 },
  };
  const p = prices[provider as keyof typeof prices] || prices.gemini;
  return pageCount * p.perImage + cardCount * p.perCard;
}
