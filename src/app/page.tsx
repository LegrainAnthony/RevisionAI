'use client';

import { useState, useCallback } from 'react';
import { Card, Difficulty, GenerationMode } from '@/shared/types';
import { PdfUploader } from '@/components/PdfUploader';
import { PageSelector } from '@/components/PageSelector';
import { GenerationPanel } from '@/components/GenerationPanel';
import { CardResults } from '@/components/CardResults';

// ─── Types locaux ────────────────────────────────────────────

type Step = 'upload' | 'configure' | 'results';

// Provider par défaut — lu depuis un meta tag ou hardcodé
// (la vraie valeur est côté serveur dans .env)
const DEFAULT_PROVIDER = 'gemini';

// ─── Page principale ─────────────────────────────────────────

export default function Home() {
  // ── Étape courante ──
  const [step, setStep] = useState<Step>('upload');

  // ── Données du PDF ──
  const [fileName, setFileName] = useState('');
  const [pdfHash, setPdfHash] = useState('');
  const [pages, setPages] = useState<string[]>([]);         // base64 images
  const [selected, setSelected] = useState<boolean[]>([]);   // sélection par page

  // ── Configuration ──
  const [pagesPerChunk, setPagesPerChunk] = useState(4);
  const [cardsPerChunk, setCardsPerChunk] = useState(5);
  const [difficulty, setDifficulty] = useState<Difficulty | 'mixed'>('mixed');

  // ── Résultats ──
  const [cards, setCards] = useState<Card[]>([]);
  const [costUsd, setCostUsd] = useState(0);

  // ── État UI ──
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Handlers ───────────────────────────────────────────────

  /** Appelé quand le PDF est rendu en images par PdfUploader */
  const handlePdfRendered = useCallback(async (name: string, pagesBase64: string[]) => {
    setFileName(name);
    setPages(pagesBase64);
    setSelected(new Array(pagesBase64.length).fill(true));

    // Hash simple pour identifier le PDF (nom + taille approximative)
    const hash = await computeHash(name + pagesBase64.length);
    setPdfHash(hash);

    setStep('configure');
  }, []);

  /** Toggle la sélection d'une page */
  function togglePage(index: number) {
    setSelected((prev) => prev.map((v, i) => (i === index ? !v : v)));
  }

  /** Lance la génération */
  async function handleGenerate() {
    setError(null);
    setGenerating(true);

    try {
      // Collecter les images des pages sélectionnées
      const selectedIndices = selected
        .map((v, i) => (v ? i : -1))
        .filter((i) => i >= 0);
      const selectedImages = selectedIndices.map((i) => pages[i]);

      if (selectedImages.length === 0) {
        setError('Aucune page sélectionnée.');
        setGenerating(false);
        return;
      }

      const chunkCount = Math.ceil(selectedImages.length / pagesPerChunk);
      const totalCards = chunkCount * cardsPerChunk;

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hash: pdfHash,
          fileName,
          pageCount: pages.length,
          images: selectedImages,
          config: {
            mode: 'cards' as GenerationMode,
            cardCount: totalCards,
            quizCount: 0,
            difficulty,
            selectedPages: selectedIndices.map((i) => i + 1), // 1-indexed
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur de génération');

      setCards(data.cards || []);
      setCostUsd(data.usage?.costUsd || 0);
      setStep('results');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setGenerating(false);
    }
  }

  /** Exporte les cartes sélectionnées en .txt (format Anki) */
  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cards: cards.filter((c) => c.selected),
          deckName: fileName.replace(/\.[^.]+$/, ''),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }

      const blob = await res.blob();
      downloadBlob(blob, `${fileName.replace(/\.[^.]+$/, '')}.txt`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setExporting(false);
    }
  }

  /** Retour au début */
  function handleReset() {
    setStep('upload');
    setPages([]);
    setSelected([]);
    setCards([]);
    setCostUsd(0);
    setError(null);
  }

  // ── Rendu ──────────────────────────────────────────────────

  const selectedCount = selected.filter(Boolean).length;

  return (
    <main className="min-h-screen px-4 py-10 max-w-6xl mx-auto">
      {/* Header */}
      <header className="text-center mb-10">
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="text-[var(--accent)]">Anki</span>Docs
        </h1>
        <p className="text-[var(--text-muted)] text-sm mt-1">
          PDF → Cartes Anki via IA vision
        </p>
      </header>

      {/* Barre de progression */}
      <div className="flex items-center justify-center gap-3 mb-8">
        {(['upload', 'configure', 'results'] as const).map((s, i) => {
          const labels = ['Import', 'Configurer', 'Résultats'];
          const current = ['upload', 'configure', 'results'].indexOf(step);
          return (
            <div key={s} className="flex items-center gap-3">
              <div className={`flex items-center gap-2 ${i <= current ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                  i <= current ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-card)] border border-[var(--border)]'
                }`}>
                  {i + 1}
                </div>
                <span className="text-sm hidden sm:inline">{labels[i]}</span>
              </div>
              {i < 2 && <div className={`w-10 h-px ${i < current ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`} />}
            </div>
          );
        })}
      </div>

      {/* Erreur */}
      {error && (
        <div className="mb-6 p-4 rounded-xl border border-[var(--danger)] bg-[var(--danger-dim)] text-[var(--danger)] text-sm">
          {error}
        </div>
      )}

      {/* ── Étape 1 : Upload ── */}
      {step === 'upload' && (
        <PdfUploader onComplete={handlePdfRendered} />
      )}

      {/* ── Étape 2 : Configuration ── */}
      {step === 'configure' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne gauche : pages (2/3) */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{fileName}</h2>
              <button
                onClick={handleReset}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                ← Changer de document
              </button>
            </div>
            <PageSelector
              pages={pages}
              selected={selected}
              pagesPerChunk={pagesPerChunk}
              onToggle={togglePage}
              onChunkSizeChange={setPagesPerChunk}
            />
          </div>

          {/* Colonne droite : config + coût (1/3) */}
          <div className="lg:sticky lg:top-6 lg:self-start">
            <GenerationPanel
              selectedPageCount={selectedCount}
              pagesPerChunk={pagesPerChunk}
              cardsPerChunk={cardsPerChunk}
              difficulty={difficulty}
              provider={DEFAULT_PROVIDER}
              onCardsPerChunkChange={setCardsPerChunk}
              onDifficultyChange={setDifficulty}
              onGenerate={handleGenerate}
              loading={generating}
            />
          </div>
        </div>
      )}

      {/* ── Étape 3 : Résultats ── */}
      {step === 'results' && (
        <CardResults
          cards={cards}
          costUsd={costUsd}
          onUpdate={setCards}
          onExport={handleExport}
          onReset={handleReset}
          exporting={exporting}
        />
      )}
    </main>
  );
}

// ─── Utilitaires ─────────────────────────────────────────────

/** Hash simple côté client (pour identifier un PDF entre sessions) */
async function computeHash(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}

/** Télécharge un Blob comme fichier */
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
