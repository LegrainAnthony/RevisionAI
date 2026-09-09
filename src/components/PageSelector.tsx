'use client';

import type { ChunkWindow } from '@/engine/generation/chunkPlanner';
import { LIMITS } from '@/shared/limits';

interface Props {
  /** Vignettes base64, indexées 0-based */
  pages: string[];
  selected: boolean[];
  /** Fenêtres calculées par `planWindows` — même découpage que celui envoyé à l'IA */
  windows: ChunkWindow[];
  pagesPerChunk: number;
  onToggle: (pageIndex: number) => void;
  onToggleWindow: (windowIndex: number, value: boolean) => void;
  onChunkSizeChange: (n: number) => void;
  onCardOverride: (windowIndex: number, value: number | null) => void;
  onInstructions: (windowIndex: number, value: string) => void;
  onPreviewPrompt: (windowIndex: number) => void;
}

/**
 * Grille des pages, groupées par chunk.
 *
 * Les fenêtres affichées ici sont celles que `planWindows` produit : ce qui
 * est visible à l'écran correspond exactement à ce qui part au modèle, y
 * compris quand des pages sont décochées.
 */
export function PageSelector({
  pages,
  selected,
  windows,
  pagesPerChunk,
  onToggle,
  onToggleWindow,
  onChunkSizeChange,
  onCardOverride,
  onInstructions,
  onPreviewPrompt,
}: Props) {
  const selectedCount = selected.filter(Boolean).length;
  const activeWindows = windows.filter((w) => w.pageNumbers.length > 0);

  return (
    <div className="space-y-5">
      {/* Barre de contrôle */}
      <div className="flex items-center justify-between gap-4 bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)] flex-wrap">
        <div>
          <p className="text-sm font-medium">
            {selectedCount} / {pages.length} page{pages.length !== 1 ? 's' : ''} sélectionnée{selectedCount !== 1 ? 's' : ''}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {activeWindows.length} chunk{activeWindows.length !== 1 ? 's' : ''} · {activeWindows.length} appel{activeWindows.length !== 1 ? 's' : ''} à l’IA
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[var(--text-muted)] mr-1">Pages par chunk</span>
          {Array.from(
            { length: LIMITS.maxPagesPerChunk - LIMITS.minPagesPerChunk + 1 },
            (_, i) => i + LIMITS.minPagesPerChunk
          ).map((n) => (
            <button
              key={n}
              onClick={() => onChunkSizeChange(n)}
              className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                pagesPerChunk === n
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {windows.map((w) => (
        <ChunkCard
          key={w.index}
          window={w}
          pages={pages}
          selected={selected}
          onToggle={onToggle}
          onToggleWindow={onToggleWindow}
          onCardOverride={onCardOverride}
          onInstructions={onInstructions}
          onPreviewPrompt={onPreviewPrompt}
        />
      ))}
    </div>
  );
}

function ChunkCard({
  window: w,
  pages,
  selected,
  onToggle,
  onToggleWindow,
  onCardOverride,
  onInstructions,
  onPreviewPrompt,
}: {
  window: ChunkWindow;
  pages: string[];
  selected: boolean[];
  onToggle: (i: number) => void;
  onToggleWindow: (i: number, v: boolean) => void;
  onCardOverride: (i: number, v: number | null) => void;
  onInstructions: (i: number, v: string) => void;
  onPreviewPrompt: (i: number) => void;
}) {
  const active = w.pageNumbers.length > 0;
  const hasInstructions = w.instructions.trim().length > 0;
  const highlighted = w.hasCardOverride || hasInstructions;
  const remaining = LIMITS.maxInstructionsLength - w.instructions.length;

  return (
    <div
      className={`rounded-xl border p-3 transition-colors ${
        !active
          ? 'border-[var(--border)] bg-[var(--bg-card)] opacity-50'
          : highlighted
            ? 'border-[var(--accent)]/50 bg-[var(--bg-card)]'
            : 'border-[var(--border)] bg-[var(--bg-card)]'
      }`}
    >
      {/* En-tête du chunk */}
      <div className="flex items-center justify-between gap-3 mb-2 px-1 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold tracking-wide uppercase text-[var(--text-muted)]">
            Chunk {w.index + 1}
          </span>
          <button
            onClick={() => onToggleWindow(w.index, !active)}
            className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)] underline decoration-dotted underline-offset-2"
          >
            {active ? 'tout décocher' : 'tout cocher'}
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {w.hasCardOverride && (
            <button
              onClick={() => onCardOverride(w.index, null)}
              className="text-[9px] text-[var(--text-muted)] hover:text-[var(--danger)] px-1"
              title="Revenir au nombre par défaut"
            >
              ✕
            </button>
          )}
          <button
            onClick={() => onCardOverride(w.index, Math.max(LIMITS.minCardsPerChunk, w.cardCount - 1))}
            className="w-5 h-5 rounded bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text)] text-xs font-bold leading-none"
          >
            −
          </button>
          <span
            className={`text-[11px] font-semibold min-w-[4.5rem] text-center ${
              w.hasCardOverride ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'
            }`}
          >
            {w.cardCount} carte{w.cardCount !== 1 ? 's' : ''}
          </span>
          <button
            onClick={() => onCardOverride(w.index, Math.min(LIMITS.maxCardsPerChunk, w.cardCount + 1))}
            className="w-5 h-5 rounded bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text)] text-xs font-bold leading-none"
          >
            +
          </button>
          <span className="text-[11px] text-[var(--accent)] ml-1">
            · {w.pageNumbers.length} page{w.pageNumbers.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Vignettes */}
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
        {w.allPageNumbers.map((pageNumber) => {
          const i = pageNumber - 1;
          return (
            <button
              key={pageNumber}
              onClick={() => onToggle(i)}
              className={`relative rounded-lg overflow-hidden border-2 aspect-[3/4] ${
                selected[i] ? 'border-[var(--accent)]/60' : 'border-transparent opacity-25 grayscale'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/png;base64,${pages[i]}`}
                alt={`Page ${pageNumber}`}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <span className="absolute bottom-0 right-0 text-[9px] bg-black/70 text-white px-1 py-0.5 rounded-tl font-mono">
                {pageNumber}
              </span>
            </button>
          );
        })}
      </div>

      {/* Consigne appliquée UNIQUEMENT à ce chunk */}
      {active && (
        <div className="mt-2">
          <textarea
            value={w.instructions}
            onChange={(e) => onInstructions(w.index, e.target.value.slice(0, LIMITS.maxInstructionsLength))}
            rows={2}
            placeholder="Consigne pour CE chunk uniquement — ex : « génère surtout des questions sur les définitions »"
            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg p-2 text-xs resize-none focus:outline-none focus:border-[var(--accent)]"
          />
          <div className="flex items-center justify-between mt-1 px-0.5">
            <button
              onClick={() => onPreviewPrompt(w.index)}
              className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)] underline decoration-dotted underline-offset-2"
            >
              Voir le prompt envoyé pour ce chunk
            </button>
            {hasInstructions && (
              <span
                className={`text-[10px] ${remaining < 100 ? 'text-[var(--warning)]' : 'text-[var(--text-muted)]'}`}
              >
                {remaining} caractères restants
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
