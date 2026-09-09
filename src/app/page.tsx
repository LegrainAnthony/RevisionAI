'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { Card, ChunkStatus, UsageStats } from '@/shared/types';
import { resolveProfile, toSpec } from '@/shared/profiles';
import {
  chunksFromWindows,
  planWindows,
  totalCards as sumCards,
  totalPages as sumPages,
} from '@/engine/generation/chunkPlanner';
import {
  flattenCards,
  retryChunk,
  runGeneration,
  type RunContext,
} from '@/engine/generation/generationRunner';
import { buildChunkPrompt } from '@/engine/ai/promptBuilder';
import { useSettings } from '@/hooks/useSettings';
import { useApiKeys } from '@/hooks/useApiKeys';
import { PdfUploader } from '@/components/PdfUploader';
import { PageSelector } from '@/components/PageSelector';
import { GenerationPanel } from '@/components/GenerationPanel';
import { GenerationProgress } from '@/components/GenerationProgress';
import { CardResults } from '@/components/CardResults';
import { SettingsPanel } from '@/components/SettingsPanel';
import { PromptPreview } from '@/components/PromptPreview';

type Step = 'upload' | 'configure' | 'generating' | 'results';

const STEPS: { id: Step; label: string }[] = [
  { id: 'upload', label: 'Import' },
  { id: 'configure', label: 'Configurer' },
  { id: 'generating', label: 'Génération' },
  { id: 'results', label: 'Résultats' },
];

const EMPTY_USAGE: UsageStats = { inputTokens: 0, outputTokens: 0, costUsd: 0 };

export default function Home() {
  const { settings, updateSettings, hydrated: settingsReady } = useSettings();
  const keys = useApiKeys();

  const [step, setStep] = useState<Step>('upload');
  const [showSettings, setShowSettings] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Document ──
  const [fileName, setFileName] = useState('');
  const [deckName, setDeckName] = useState('Default');
  const [pages, setPages] = useState<string[]>([]);
  const [selected, setSelected] = useState<boolean[]>([]);

  // ── Réglages par chunk, indexés par index de fenêtre (identité stable) ──
  const [cardOverrides, setCardOverrides] = useState<Record<number, number>>({});
  const [instructions, setInstructions] = useState<Record<number, string>>({});

  // ── Génération ──
  const [statuses, setStatuses] = useState<ChunkStatus[]>([]);
  const [cardsByChunk, setCardsByChunk] = useState<Record<number, Card[]>>({});
  const [usage, setUsage] = useState<UsageStats>(EMPTY_USAGE);
  const [generating, setGenerating] = useState(false);
  const [retrying, setRetrying] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── Résultats éditables ──
  const [cards, setCards] = useState<Card[]>([]);
  const [exporting, setExporting] = useState(false);

  // ── Découpage : une seule source, partagée par l'affichage et l'envoi ──
  const windows = useMemo(
    () =>
      planWindows({
        pageCount: pages.length,
        selected,
        pagesPerChunk: settings.pagesPerChunk,
        defaultCardCount: settings.cardsPerChunk,
        cardOverrides,
        instructions,
      }),
    [pages.length, selected, settings.pagesPerChunk, settings.cardsPerChunk, cardOverrides, instructions]
  );

  const chunks = useMemo(() => chunksFromWindows(windows), [windows]);
  const activeProfile = useMemo(
    () => resolveProfile(settings.activeProfileId, settings.customProfiles),
    [settings.activeProfileId, settings.customProfiles]
  );

  const runContext = useCallback(
    (): RunContext => ({
      params: {
        difficulty: settings.difficulty,
        language: settings.language,
        globalInstructions: settings.globalInstructions,
      },
      profile: toSpec(activeProfile),
      selection: { provider: settings.provider, model: settings.models[settings.provider] },
      apiKey: keys.getKey(settings.provider),
      autoComplete: settings.autoCompleteCount,
      imageDetail: settings.imageDetail,
      getImage: (pageNumber: number) => pages[pageNumber - 1],
    }),
    [settings, activeProfile, keys, pages]
  );

  // ── Handlers ────────────────────────────────────────────────

  const handlePdfRendered = useCallback((name: string, rendered: string[]) => {
    const base = name.replace(/\.[^.]+$/, '');
    setFileName(base);
    setDeckName(base);
    setPages(rendered);
    setSelected(new Array(rendered.length).fill(true));
    setCardOverrides({});
    setInstructions({});
    setStep('configure');
  }, []);

  function togglePage(index: number) {
    setSelected((prev) => prev.map((v, i) => (i === index ? !v : v)));
  }

  function toggleWindow(windowIndex: number, value: boolean) {
    const target = windows.find((w) => w.index === windowIndex);
    if (!target) return;
    const inWindow = new Set(target.allPageNumbers.map((n) => n - 1));
    setSelected((prev) => prev.map((v, i) => (inWindow.has(i) ? value : v)));
  }

  function setCardOverride(windowIndex: number, value: number | null) {
    setCardOverrides((prev) => {
      const next = { ...prev };
      if (value === null) delete next[windowIndex];
      else next[windowIndex] = value;
      return next;
    });
  }

  function setInstruction(windowIndex: number, value: string) {
    setInstructions((prev) => {
      const next = { ...prev };
      if (!value.trim()) delete next[windowIndex];
      else next[windowIndex] = value;
      return next;
    });
  }

  async function handleGenerate() {
    if (chunks.length === 0) return;

    setError(null);
    setCardsByChunk({});
    setUsage(EMPTY_USAGE);
    setStep('generating');
    setGenerating(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await runGeneration({
        ...runContext(),
        chunks,
        concurrency: settings.concurrency,
        signal: controller.signal,
        onProgress: setStatuses,
      });

      setCardsByChunk(result.cardsByChunk);
      setUsage(result.usage);
      setStatuses(result.statuses);

      const allGood = result.statuses.every((s) => s.phase === 'done');
      const produced = flattenCards(result.cardsByChunk);

      // On ne saute aux résultats que si tout a abouti : sinon l'utilisateur
      // doit pouvoir voir ce qui a échoué et relancer les chunks concernés.
      if (allGood && produced.length > 0) {
        setCards(produced);
        setStep('results');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de génération.');
    } finally {
      setGenerating(false);
      abortRef.current = null;
    }
  }

  /** Relance d'un seul chunk, sans refaire les autres. */
  async function handleRetryChunk(chunkIndex: number) {
    const chunk = chunks.find((c) => c.index === chunkIndex);
    if (!chunk) return;

    setRetrying(chunkIndex);
    setStatuses((prev) =>
      prev.map((s) => (s.index === chunkIndex ? { ...s, phase: 'running', error: undefined } : s))
    );

    try {
      const result = await retryChunk(chunk, runContext());

      setCardsByChunk((prev) => ({ ...prev, [chunkIndex]: result.cards }));
      setUsage((prev) => ({
        inputTokens: prev.inputTokens + result.usage.inputTokens,
        outputTokens: prev.outputTokens + result.usage.outputTokens,
        costUsd: prev.costUsd + result.usage.costUsd,
      }));
      setStatuses((prev) =>
        prev.map((s) =>
          s.index === chunkIndex
            ? {
                ...s,
                phase: 'done',
                obtained: result.obtained,
                toppedUp: result.toppedUp,
                warnings: result.warnings,
                error: undefined,
              }
            : s
        )
      );
    } catch (err) {
      setStatuses((prev) =>
        prev.map((s) =>
          s.index === chunkIndex
            ? { ...s, phase: 'error', error: err instanceof Error ? err.message : 'Erreur.' }
            : s
        )
      );
    } finally {
      setRetrying(null);
    }
  }

  function goToResults() {
    setCards(flattenCards(cardsByChunk));
    setStep('results');
  }

  async function handleExport() {
    setExporting(true);
    setError(null);
    try {
      const response = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cards: cards.filter((c) => c.selected),
          deckName: deckName || fileName,
          exportTags: settings.exportTags,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || `Export impossible (${response.status}).`);
      }

      downloadBlob(await response.blob(), `${deckName || fileName || 'AnkiDocs'}.txt`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export impossible.');
    } finally {
      setExporting(false);
    }
  }

  function handleReset() {
    abortRef.current?.abort();
    setStep('upload');
    setPages([]);
    setSelected([]);
    setCards([]);
    setCardsByChunk({});
    setStatuses([]);
    setUsage(EMPTY_USAGE);
    setCardOverrides({});
    setInstructions({});
    setError(null);
  }

  // ── Rendu ───────────────────────────────────────────────────

  const previewWindow = previewIndex === null ? null : windows.find((w) => w.index === previewIndex);
  const currentStepIndex = STEPS.findIndex((s) => s.id === step);
  const producedCount = Object.values(cardsByChunk).reduce((n, list) => n + list.length, 0);
  const failedCount = statuses.filter((s) => s.phase === 'error').length;

  return (
    <main className="min-h-screen px-4 py-10 max-w-6xl mx-auto">
      <header className="flex items-center justify-between mb-10">
        <div className="flex-1" />
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="text-[var(--accent)]">Anki</span>Docs
          </h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">PDF → cartes Anki via IA vision</p>
        </div>
        <div className="flex-1 flex justify-end">
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-card)] transition-colors"
            title="Paramètres"
          >
            ⚙
          </button>
        </div>
      </header>

      {showSettings && (
        <SettingsPanel
          settings={settings}
          onUpdate={updateSettings}
          keys={keys}
          onClose={() => setShowSettings(false)}
        />
      )}

      {previewWindow && (
        <PromptPreview
          title={`Prompt du chunk ${previewWindow.index + 1}`}
          subtitle={`Profil « ${activeProfile.name} » · ${previewWindow.pageNumbers.length} page(s) · ${previewWindow.cardCount} carte(s) demandée(s)`}
          prompt={buildChunkPrompt({
            profile: toSpec(activeProfile),
            params: {
              difficulty: settings.difficulty,
              language: settings.language,
              globalInstructions: settings.globalInstructions,
            },
            chunk: {
              pageNumbers: previewWindow.pageNumbers,
              cardCount: previewWindow.cardCount,
              instructions: previewWindow.instructions,
            },
          })}
          onClose={() => setPreviewIndex(null)}
        />
      )}

      {/* Étapes */}
      <div className="flex items-center justify-center gap-3 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-3">
            <div
              className={`flex items-center gap-2 ${
                i <= currentStepIndex ? 'text-[var(--text)]' : 'text-[var(--text-muted)]'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
                  i <= currentStepIndex
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--bg-card)] border border-[var(--border)]'
                }`}
              >
                {i + 1}
              </div>
              <span className="text-sm hidden sm:inline">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`w-8 h-px ${i < currentStepIndex ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`}
              />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl border border-[var(--danger)] bg-[var(--danger-dim)] text-[var(--danger)] text-sm">
          {error}
        </div>
      )}

      {step === 'upload' && (
        <PdfUploader onComplete={handlePdfRendered} renderScale={settings.renderScale} />
      )}

      {step === 'configure' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
              windows={windows}
              pagesPerChunk={settings.pagesPerChunk}
              onToggle={togglePage}
              onToggleWindow={toggleWindow}
              onChunkSizeChange={(n) => updateSettings({ pagesPerChunk: n })}
              onCardOverride={setCardOverride}
              onInstructions={setInstruction}
              onPreviewPrompt={setPreviewIndex}
            />
          </div>

          <div className="lg:sticky lg:top-6 lg:self-start">
            <GenerationPanel
              settings={settings}
              onUpdate={updateSettings}
              chunkCount={chunks.length}
              pageCount={sumPages(chunks)}
              totalCards={sumCards(chunks)}
              keyStatus={keys.status(settings.provider)}
              onGenerate={handleGenerate}
              onOpenSettings={() => setShowSettings(true)}
              loading={generating || !settingsReady || !keys.hydrated}
            />
          </div>
        </div>
      )}

      {step === 'generating' && (
        <div className="max-w-2xl mx-auto space-y-4">
          <GenerationProgress
            statuses={statuses}
            running={generating}
            onCancel={() => abortRef.current?.abort()}
            onRetry={handleRetryChunk}
            retrying={retrying}
          />

          {!generating && (
            <div className="flex gap-3">
              <button
                onClick={() => setStep('configure')}
                className="px-5 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--text-muted)] hover:bg-[var(--bg-card)]"
              >
                ← Configuration
              </button>
              <button
                onClick={goToResults}
                disabled={producedCount === 0}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold ${
                  producedCount === 0
                    ? 'bg-[var(--bg-hover)] text-[var(--text-muted)] cursor-not-allowed'
                    : 'bg-[var(--accent)] text-white hover:brightness-110'
                }`}
              >
                {producedCount === 0
                  ? 'Aucune carte générée'
                  : `Voir les ${producedCount} carte${producedCount !== 1 ? 's' : ''}${
                      failedCount > 0 ? ` (${failedCount} chunk en échec)` : ''
                    }`}
              </button>
            </div>
          )}
        </div>
      )}

      {step === 'results' && (
        <CardResults
          cards={cards}
          costUsd={usage.costUsd}
          deckName={deckName}
          onDeckNameChange={setDeckName}
          onUpdate={setCards}
          onExport={handleExport}
          onReset={handleReset}
          exporting={exporting}
        />
      )}
    </main>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
