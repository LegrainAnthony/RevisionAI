'use client';

import { useState, useCallback } from 'react';

interface Props {
  onComplete: (fileName: string, pagesBase64: string[]) => void;
}

/**
 * Upload un PDF et rend chaque page en PNG côté navigateur (pdf.js).
 * Le serveur ne voit jamais le PDF brut — seulement les images.
 */
export function PdfUploader({ onComplete }: Props) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf') {
      setError('Seuls les fichiers PDF sont acceptés.');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('Le fichier dépasse 50 MB.');
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
        const scale = Math.min(1024 / vp.width, 1024 / vp.height, 2);
        const scaled = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = scaled.width;
        canvas.height = scaled.height;
        await page.render({ canvasContext: canvas.getContext('2d')!, viewport: scaled }).promise;

        pages.push(canvas.toDataURL('image/png').split(',')[1]);
      }

      onComplete(file.name, pages);
    } catch (err) {
      setError(`Erreur : ${(err as Error).message}`);
    } finally {
      setLoading(false);
      setProgress('');
    }
  }, [onComplete]);

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
          <p className="text-[var(--text-muted)] text-sm">ou clique pour sélectionner — max 50 MB</p>
        </div>
      )}

      {error && <p className="mt-4 text-[var(--danger)] text-sm">{error}</p>}
    </div>
  );
}
