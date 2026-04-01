'use client';

interface Props {
  pages: string[];
  selected: boolean[];
  pagesPerChunk: number;
  onToggle: (index: number) => void;
  onChunkSizeChange: (n: number) => void;
}

/**
 * Affiche les pages du PDF regroupées en chunks.
 * Cliquer sur une page la désélectionne (elle ne sera pas traitée).
 * Le slider ajuste le nombre de pages par chunk.
 */
export function PageSelector({ pages, selected, pagesPerChunk, onToggle, onChunkSizeChange }: Props) {
  const selectedCount = selected.filter(Boolean).length;
  const chunkCount = Math.ceil(selectedCount / pagesPerChunk);

  // Grouper les pages par paquets visuels de pagesPerChunk
  const chunks: number[][] = [];
  for (let i = 0; i < pages.length; i += pagesPerChunk) {
    chunks.push(
      Array.from({ length: Math.min(pagesPerChunk, pages.length - i) }, (_, j) => i + j)
    );
  }

  return (
    <div className="space-y-5">
      {/* Barre de contrôle */}
      <div className="flex items-center justify-between bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)]">
        <div>
          <p className="text-sm font-medium">{selectedCount} / {pages.length} pages sélectionnées</p>
          <p className="text-xs text-[var(--text-muted)]">{chunkCount} chunk{chunkCount !== 1 ? 's' : ''} de traitement</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[var(--text-muted)] mr-2">Pages / chunk :</span>
          {[2, 3, 4, 5, 6].map((n) => (
            <button
              key={n}
              onClick={() => onChunkSizeChange(n)}
              className={`w-8 h-8 rounded-lg text-xs font-semibold ${
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

      {/* Chunks */}
      {chunks.map((chunkIndices, ci) => {
        const chunkSelected = chunkIndices.filter((i) => selected[i]).length;

        return (
          <div key={ci} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-3">
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[11px] font-semibold tracking-wide uppercase text-[var(--text-muted)]">
                Chunk {ci + 1}
              </span>
              <span className="text-[11px] text-[var(--accent)]">
                {chunkSelected} page{chunkSelected !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
              {chunkIndices.map((pageIdx) => (
                <button
                  key={pageIdx}
                  onClick={() => onToggle(pageIdx)}
                  className={`relative rounded-lg overflow-hidden border-2 aspect-[3/4] ${
                    selected[pageIdx]
                      ? 'border-[var(--accent)]/60'
                      : 'border-transparent opacity-25 grayscale'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`data:image/png;base64,${pages[pageIdx]}`}
                    alt={`Page ${pageIdx + 1}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <span className="absolute bottom-0 right-0 text-[9px] bg-black/70 text-white px-1 py-0.5 rounded-tl font-mono">
                    {pageIdx + 1}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
