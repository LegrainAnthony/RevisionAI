'use client';

import type { AppSettings, Difficulty } from '@/shared/types';
import { LIMITS } from '@/shared/limits';
import { estimatePlanCost, getModels, PROVIDER_LABELS } from '@/shared/models';
import type { ApiKeyStatus } from '@/hooks/useApiKeys';

interface Props {
  settings: AppSettings;
  onUpdate: (updates: Partial<AppSettings>) => void;
  chunkCount: number;
  pageCount: number;
  totalCards: number;
  keyStatus: ApiKeyStatus;
  onGenerate: () => void;
  onOpenSettings: () => void;
  loading: boolean;
}

const DIFFICULTY_LABELS: Record<Difficulty | 'mixed', string> = {
  mixed: 'Mixte',
  easy: 'Facile',
  medium: 'Moyen',
  hard: 'Difficile',
};

/**
 * Réglages du moment de la génération.
 *
 * Le modèle réellement utilisé est affiché et modifiable ici : l'ancien
 * panneau affichait un libellé codé en dur qui ne reflétait pas le choix
 * enregistré dans les paramètres.
 */
export function GenerationPanel({
  settings,
  onUpdate,
  chunkCount,
  pageCount,
  totalCards,
  keyStatus,
  onGenerate,
  onOpenSettings,
  loading,
}: Props) {
  const models = getModels(settings.provider);
  const modelId = settings.models[settings.provider];

  const cost = estimatePlanCost({
    pageCount,
    cardCount: totalCards,
    callCount: chunkCount,
    provider: settings.provider,
    modelId,
    imageDetail: settings.imageDetail,
  });

  const remaining = LIMITS.maxInstructionsLength - settings.globalInstructions.length;
  const canGenerate = !loading && chunkCount > 0;

  return (
    <div className="bg-[var(--bg-card)] rounded-xl border border-[var(--border)] p-6 space-y-6">
      <h2 className="text-lg font-semibold">Configuration</h2>

      {/* Modèle — visible et modifiable au moment du choix */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <label className="text-sm text-[var(--text-muted)]">Modèle</label>
          <button
            onClick={onOpenSettings}
            className="text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)] underline decoration-dotted underline-offset-2"
          >
            Changer de fournisseur
          </button>
        </div>
        <select
          value={modelId}
          onChange={(e) =>
            onUpdate({ models: { ...settings.models, [settings.provider]: e.target.value } })
          }
          className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
              {m.recommended ? ' — recommandé' : ''}
            </option>
          ))}
        </select>
        <p className="text-[10px] text-[var(--text-muted)] mt-1">
          {PROVIDER_LABELS[settings.provider]} ·{' '}
          {keyStatus.configured ? (
            <>clé enregistrée <span className="font-mono">{keyStatus.masked}</span></>
          ) : (
            <span className="text-[var(--warning)]">
              aucune clé enregistrée — celle du serveur sera utilisée si elle existe
            </span>
          )}
        </p>
      </div>

      {/* Cartes par chunk */}
      <div>
        <div className="flex justify-between mb-2">
          <label className="text-sm text-[var(--text-muted)]">Cartes par chunk</label>
          <span className="text-sm font-semibold">{settings.cardsPerChunk}</span>
        </div>
        <input
          type="range"
          min={LIMITS.minCardsPerChunk}
          max={15}
          value={settings.cardsPerChunk}
          onChange={(e) => onUpdate({ cardsPerChunk: Number(e.target.value) })}
          className="w-full accent-[var(--accent)]"
        />
        <p className="text-[10px] text-[var(--text-muted)] mt-1">
          Valeur par défaut. Chaque chunk peut la remplacer individuellement.
        </p>
      </div>

      {/* Difficulté */}
      <div>
        <label className="text-sm text-[var(--text-muted)] block mb-2">Difficulté</label>
        <div className="flex gap-1.5">
          {(['mixed', 'easy', 'medium', 'hard'] as const).map((d) => (
            <button
              key={d}
              onClick={() => onUpdate({ difficulty: d })}
              className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                settings.difficulty === d
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              {DIFFICULTY_LABELS[d]}
            </button>
          ))}
        </div>
      </div>

      {/* Consigne globale */}
      <div>
        <label className="text-sm text-[var(--text-muted)] block mb-1">Consigne globale</label>
        <p className="text-[10px] text-[var(--text-muted)] mb-2 leading-relaxed">
          Appliquée à tous les chunks. Une consigne écrite sur un chunk précis reste
          prioritaire sur celle-ci.
        </p>
        <textarea
          value={settings.globalInstructions}
          onChange={(e) =>
            onUpdate({ globalInstructions: e.target.value.slice(0, LIMITS.maxInstructionsLength) })
          }
          rows={2}
          placeholder="Ex : réponses en trois lignes maximum, toujours en français."
          className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg p-2 text-xs resize-none focus:outline-none focus:border-[var(--accent)]"
        />
        {settings.globalInstructions && (
          <p className={`text-[10px] mt-1 text-right ${remaining < 100 ? 'text-[var(--warning)]' : 'text-[var(--text-muted)]'}`}>
            {remaining} caractères restants
          </p>
        )}
      </div>

      {/* Résumé */}
      <div className="grid grid-cols-3 gap-3">
        <StatBox label="Chunks" value={String(chunkCount)} />
        <StatBox label="Cartes visées" value={String(totalCards)} />
        <StatBox label="Coût estimé" value={`$${cost.toFixed(4)}`} accent />
      </div>

      <p className="text-[10px] text-[var(--text-muted)] text-center">
        {pageCount} page{pageCount !== 1 ? 's' : ''} · {chunkCount} appel{chunkCount !== 1 ? 's' : ''} à l’IA
        {settings.concurrency > 1 && <> · {settings.concurrency} en parallèle</>}
      </p>

      <button
        onClick={onGenerate}
        disabled={!canGenerate}
        className={`w-full py-3 rounded-xl text-sm font-semibold transition-colors ${
          canGenerate
            ? 'bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white'
            : 'bg-[var(--bg-hover)] text-[var(--text-muted)] cursor-not-allowed'
        }`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Génération…
          </span>
        ) : chunkCount === 0 ? (
          'Sélectionnez au moins une page'
        ) : (
          `Générer ${totalCards} carte${totalCards !== 1 ? 's' : ''} — $${cost.toFixed(4)}`
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
