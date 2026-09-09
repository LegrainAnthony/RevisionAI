'use client';

import { useState, useCallback } from 'react';
import { LIMITS } from '@/shared/limits';

interface Props {
  onComplete: (fileName: string, pagesBase64: string[]) => void;
  /** Côté le plus long des images rendues, en pixels */
  renderScale: number;
}

/**
 * Upload un PDF et rend chaque page en PNG côté navigateur (pdf.js).
 * Le serveur ne voit jamais le PDF brut — seulement les images.
 */
export function PdfUploader({ onComplete, renderScale }: Props) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf') {
      setError('Seuls les fichiers PDF sont acceptés.');
      return;
    }
    if (file.size > LIMITS.maxFileSizeMb * 1024 * 1024) {
      setError(`Le fichier dépasse ${LIMITS.maxFileSizeMb} MB.`);
      return;
    }

    setLoading(true);
    setError(null);
    setProgress('Chargement du PDF…');

    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const pages: string[] = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        setProgress(`Rendu page ${i} / ${pdf.numPages}`);
        const page = await pdf.getPage(i);
        const vp = page.getViewport({ scale: 1 });
        // Ajuste le côté le plus long à `renderScale`, sans agrandir au-delà de 3×.
        const scale = Math.min(renderScale / Math.max(vp.width, vp.height), 3);
        const scaled = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = scaled.width;
        canvas.height = scaled.height;

        // Un canevas neuf est TRANSPARENT, et pdf.js ne peint que ce que le
        // PDF dessine : la plupart des documents ne tracent aucun fond blanc.
        // Les images partaient donc avec un canal alpha vide, et les modèles
        // de vision, qui aplatissent sur du noir, recevaient du texte noir sur
        // fond noir — donc illisible. C'était la première cause d'imprécision
        // et de cartes inventées.
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({ canvasContext: ctx, viewport: scaled }).promise;

        pages.push(canvas.toDataURL('image/png').split(',')[1]);
      }

      onComplete(file.name, pages);
    } catch (err) {
      setError(`Erreur : ${(err as Error).message}`);
    } finally {
      setLoading(false);
      setProgress('');
    }
  }, [onComplete, renderScale]);

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
      className={`
        relative border-2 border-dashed rounded-2xl p-20 text-center cursor-pointer
        ${dragging
          ? 'border-[var(--accent)] bg-[var(--accent-dim)]'
          : 'border-[var(--border)] bg-[var(--bg-card)] hover:border-[var(--border-focus)]'
        }
      `}
    >
      <input
        type="file"
        accept=".pdf"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={loading}
      />

      {loading ? (
        <div className="space-y-3">
          <div className="inline-block w-8 h-8 border-[3px] border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          <p className="text-[var(--text-muted)] text-sm">{progress}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-4xl">📄</p>
          <p className="text-lg font-medium">Glisse ton PDF ici</p>
          <p className="text-[var(--text-muted)] text-sm">ou clique pour sélectionner — max {LIMITS.maxFileSizeMb} MB</p>
        </div>
      )}

      {error && <p className="mt-4 text-[var(--danger)] text-sm">{error}</p>}
    </div>
  );
}
