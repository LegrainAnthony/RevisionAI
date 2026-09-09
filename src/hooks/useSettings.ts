'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_SETTINGS,
  SETTINGS_VERSION,
  type AppSettings,
  type Difficulty,
  type DifficultySetting,
  type ImageDetail,
  type OutputLanguage,
  type PromptProfile,
  type ProviderId,
} from '@/shared/types';
import { LIMITS, RENDER_SCALES } from '@/shared/limits';
import { resolveModelId } from '@/shared/models';
import { migrateLegacyStorage, readJson, SETTINGS_KEY, writeJson } from '@/shared/storage';

/**
 * Préférences utilisateur persistées.
 *
 * `hydrated` indique que le `localStorage` a été lu. Le premier rendu se
 * fait forcément avec les valeurs par défaut (contrainte du rendu serveur) :
 * l'UI s'en sert pour ne pas lancer une génération avec des réglages qui ne
 * sont pas encore ceux de l'utilisateur.
 */
export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    migrateLegacyStorage();
    const stored = readJson<unknown>(SETTINGS_KEY);
    if (stored) setSettings(migrateSettings(stored));
    setHydrated(true);
  }, []);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...updates, version: SETTINGS_VERSION };
      writeJson(SETTINGS_KEY, next);
      return next;
    });
  }, []);

  return { settings, updateSettings, hydrated };
}

// ─── Migration et validation ─────────────────────────────────

/**
 * Accepte n'importe quel objet stocké, y compris au format v1, et en tire
 * des réglages valides.
 *
 * Un simple `{ ...DEFAULT, ...stored }` conservait les champs disparus et
 * laissait passer des modèles retirés par les fournisseurs — un réglage
 * `gemini-1.5-flash` rendait toute génération impossible sans le dire.
 */
export function migrateSettings(stored: unknown): AppSettings {
  if (!isRecord(stored)) return DEFAULT_SETTINGS;

  const provider: ProviderId = stored.provider === 'openai' ? 'openai' : 'gemini';

  // v1 stockait un seul `model` ; v2 en garde un par fournisseur.
  const storedModels = isRecord(stored.models) ? stored.models : {};
  const legacyModel = typeof stored.model === 'string' ? stored.model : '';
  const modelFor = (p: ProviderId) => {
    const candidate = str(storedModels[p]) || (p === provider ? legacyModel : '');
    return resolveModelId(p, candidate);
  };

  return {
    version: SETTINGS_VERSION,
    provider,
    models: { gemini: modelFor('gemini'), openai: modelFor('openai') },
    // v1 : `pagesPerBatch`
    pagesPerChunk: clamp(
      num(stored.pagesPerChunk ?? stored.pagesPerBatch, DEFAULT_SETTINGS.pagesPerChunk),
      LIMITS.minPagesPerChunk,
      LIMITS.maxPagesPerChunk
    ),
    cardsPerChunk: clamp(
      num(stored.cardsPerChunk, DEFAULT_SETTINGS.cardsPerChunk),
      LIMITS.minCardsPerChunk,
      LIMITS.maxCardsPerChunk
    ),
    difficulty: asDifficulty(stored.difficulty),
    language: asLanguage(stored.language),
    globalInstructions: str(stored.globalInstructions).slice(0, LIMITS.maxInstructionsLength),
    activeProfileId: str(stored.activeProfileId) || DEFAULT_SETTINGS.activeProfileId,
    customProfiles: sanitizeProfiles(stored.customProfiles),
    exportTags: bool(stored.exportTags, DEFAULT_SETTINGS.exportTags),
    autoCompleteCount: bool(stored.autoCompleteCount, DEFAULT_SETTINGS.autoCompleteCount),
    concurrency: clamp(
      num(stored.concurrency, DEFAULT_SETTINGS.concurrency),
      LIMITS.minConcurrency,
      LIMITS.maxConcurrency
    ),
    renderScale: asRenderScale(stored.renderScale),
    imageDetail: asImageDetail(stored.imageDetail),
  };
}

/** Ne conserve que les profils exploitables, et complète les champs ajoutés depuis. */
function sanitizeProfiles(value: unknown): PromptProfile[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry): PromptProfile[] => {
    if (!isRecord(entry)) return [];
    const id = str(entry.id);
    const name = str(entry.name);
    if (!id || !name) return [];

    return [
      {
        id,
        name,
        emoji: str(entry.emoji) || '✏️',
        description: str(entry.description) || 'Profil personnalisé',
        context: str(entry.context),
        rules: str(entry.rules),
        recommendations: str(entry.recommendations),
        forbidden: str(entry.forbidden),
        builtin: false,
      },
    ];
  });
}

// ─── Coercition ───────────────────────────────────────────────

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function asDifficulty(v: unknown): DifficultySetting {
  const allowed: DifficultySetting[] = ['mixed', 'easy', 'medium', 'hard'];
  return allowed.includes(v as Difficulty | 'mixed')
    ? (v as DifficultySetting)
    : DEFAULT_SETTINGS.difficulty;
}

function asLanguage(v: unknown): OutputLanguage {
  const allowed: OutputLanguage[] = ['auto', 'fr', 'en'];
  return allowed.includes(v as OutputLanguage) ? (v as OutputLanguage) : DEFAULT_SETTINGS.language;
}

function asImageDetail(v: unknown): ImageDetail {
  const allowed: ImageDetail[] = ['low', 'high', 'original'];
  return allowed.includes(v as ImageDetail) ? (v as ImageDetail) : DEFAULT_SETTINGS.imageDetail;
}

function asRenderScale(v: unknown): number {
  const allowed = RENDER_SCALES.map((s) => s.value) as readonly number[];
  return allowed.includes(num(v, 0)) ? (v as number) : DEFAULT_SETTINGS.renderScale;
}
