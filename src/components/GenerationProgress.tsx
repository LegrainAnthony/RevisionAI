'use client';

import type { ChunkStatus } from '@/shared/types';

interface Props {
  statuses: ChunkStatus[];
  running: boolean;
  onCancel: () => void;
  onRetry: (index: number) => void;
  retrying: number | null;
}

/**
 * Suivi chunk par chunk.
 *
 * Rend visible ce que l'appel serveur unique cachait : quels chunks ont
 * abouti, lesquels ont échoué et pourquoi, et surtout combien de cartes ont
 * réellement été obtenues face au nombre demandé.
 */
export function GenerationProgress({ statuses, running, onCancel, onRetry, retrying }: Props) {
  const finished = statuses.filter((s) => s.phase === 'done' || s.phase === 'error').length;
  const total = statuses.length;
  const cards = statuses.reduce((sum, s) => sum + s.obtained, 0);
  const failed = statuses.filter((s) => s.phase === 'error').length;
  const percent = total ? Math.round((finished / total) * 100) : 0;

  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">
            {running ? 'Génération en cours' : 'Génération terminée'}
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {finished} / {total} chunk{total !== 1 ? 's' : ''} · {cards} carte{cards !== 1 ? 's' : ''} obtenue{cards !== 1 ? 's' : ''}
            {failed > 0 && <span className="text-[var(--danger)]"> · {failed} en échec</span>}
          </p>
        </div>
        {running && (
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--text-muted)] hover:text-[var(--danger)] hover:border-[var(--danger)] flex-shrink-0"
          >
            Annuler
          </button>
        )}
      </div>

      {/* Barre de progression */}
      <div className="h-1.5 rounded-full bg-[var(--bg-hover)] overflow-hidden">
        <div
          className="h-full bg-[var(--accent)] transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Détail par chunk */}
      <div className="space-y-1 max-h-[22rem] overflow-y-auto pr-1">
        {statuses.map((status) => (
          <ChunkRow
            key={status.index}
            status={status}
            onRetry={() => onRetry(status.index)}
            retrying={retrying === status.index}
          />
        ))}
      </div>
    </div>
  );
}

function ChunkRow({
  status,
  onRetry,
  retrying,
}: {
  status: ChunkStatus;
  onRetry: () => void;
  retrying: boolean;
}) {
  const shortfall = status.phase === 'done' && status.obtained < status.requested;

  return (
    <div className="flex items-start gap-3 px-3 py-2 rounded-lg bg-[var(--bg)] text-xs">
      <span className="w-4 flex-shrink-0 text-center mt-px">
        <PhaseIcon phase={status.phase} retrying={retrying} />
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">Chunk {status.index + 1}</span>
          <span className="text-[var(--text-muted)]">{formatPages(status.pageNumbers)}</span>
          {status.hasInstructions && (
            <span
              className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)]"
              title="Une consigne spécifique est appliquée à ce chunk"
            >
              consigne
            </span>
          )}
          {status.toppedUp && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--bg-hover)] text-[var(--text-muted)]">
              complété
            </span>
          )}
        </div>

        {status.error && <p className="text-[var(--danger)] mt-1 leading-relaxed">{status.error}</p>}

        {status.warnings.length > 0 && (
          <p className="text-[var(--warning)] mt-1 leading-relaxed">{status.warnings.join(' ')}</p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {(status.phase === 'done' || status.phase === 'error') && (
          <span
            className={`font-mono ${shortfall || status.phase === 'error' ? 'text-[var(--warning)]' : 'text-[var(--text-muted)]'}`}
            title="Cartes obtenues sur cartes demandées"
          >
            {status.obtained}/{status.requested}
          </span>
        )}
        {(status.phase === 'error' || shortfall) && (
          <button
            onClick={onRetry}
            disabled={retrying}
            className="px-2 py-1 rounded border border-[var(--border)] text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)] disabled:opacity-50"
          >
            {retrying ? '…' : 'Relancer'}
          </button>
        )}
      </div>
    </div>
  );
}

function PhaseIcon({ phase, retrying }: { phase: ChunkStatus['phase']; retrying: boolean }) {
  if (retrying || phase === 'running') {
    return (
      <span className="inline-block w-3 h-3 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
    );
  }
  switch (phase) {
    case 'done':
      return <span className="text-[var(--success)]">✓</span>;
    case 'error':
      return <span className="text-[var(--danger)]">✕</span>;
    case 'cancelled':
      return <span className="text-[var(--text-muted)]">—</span>;
    default:
      return <span className="text-[var(--text-muted)]">·</span>;
  }
}

function formatPages(pages: number[]): string {
  if (pages.length === 0) return '';
  if (pages.length === 1) return `p. ${pages[0]}`;
  return `p. ${pages[0]}–${pages[pages.length - 1]}`;
}
