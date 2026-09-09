'use client';

import { useState } from 'react';
import type { AppSettings, ImageDetail, OutputLanguage, PromptProfile, ProviderId } from '@/shared/types';
import { BUILTIN_PROFILES, duplicateProfile, emptyProfile } from '@/shared/profiles';
import { LIMITS, RENDER_SCALES } from '@/shared/limits';
import { defaultModelId, findModel, getModels, modelLabel, PROVIDER_LABELS } from '@/shared/models';
import type { useApiKeys } from '@/hooks/useApiKeys';
import { PromptEditor } from './PromptEditor';

interface Props {
  settings: AppSettings;
  onUpdate: (updates: Partial<AppSettings>) => void;
  keys: ReturnType<typeof useApiKeys>;
  onClose: () => void;
}

const IMAGE_DETAIL_OPTIONS: { value: ImageDetail; label: string }[] = [
  { value: 'high', label: 'Standard' },
  { value: 'original', label: 'Résolution d’origine' },
  { value: 'low', label: 'Économique' },
];

export function SettingsPanel({ settings, onUpdate, keys, onClose }: Props) {
  const [editing, setEditing] = useState<{ profile: PromptProfile; isNew: boolean } | null>(null);

  const profiles: PromptProfile[] = [...BUILTIN_PROFILES, ...settings.customProfiles];

  function saveProfile(profile: PromptProfile) {
    const exists = settings.customProfiles.some((p) => p.id === profile.id);
    onUpdate({
      customProfiles: exists
        ? settings.customProfiles.map((p) => (p.id === profile.id ? profile : p))
        : [...settings.customProfiles, profile],
      activeProfileId: profile.id,
    });
    setEditing(null);
  }

  function deleteProfile(id: string) {
    onUpdate({
      customProfiles: settings.customProfiles.filter((p) => p.id !== id),
      activeProfileId: settings.activeProfileId === id ? 'general' : settings.activeProfileId,
    });
  }

  /** Changer de fournisseur ne touche plus aux clés : chacune est conservée. */
  function changeProvider(provider: ProviderId) {
    onUpdate({
      provider,
      models: {
        ...settings.models,
        [provider]: settings.models[provider] || defaultModelId(provider),
      },
    });
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-lg bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] flex-shrink-0">
            <h2 className="text-base font-semibold">Paramètres</h2>
            <button
              onClick={onClose}
              className="text-[var(--text-muted)] hover:text-[var(--text)] text-xl leading-none"
            >
              ✕
            </button>
          </div>

          <div className="px-6 py-5 space-y-7 overflow-y-auto flex-1">
            {/* ── Profils ── */}
            <section>
              <p className="text-sm font-semibold mb-0.5">Profil de prompt</p>
              <p className="text-[11px] text-[var(--text-muted)] mb-3 leading-relaxed">
                Le profil décrit comment l’IA doit lire votre cours et formuler les cartes.
                Choisissez celui qui correspond à votre matière, ou partez d’un profil existant
                pour créer le vôtre.
              </p>

              <div className="space-y-2">
                {profiles.map((p) => (
                  <ProfileRow
                    key={p.id}
                    profile={p}
                    active={settings.activeProfileId === p.id}
                    onSelect={() => onUpdate({ activeProfileId: p.id })}
                    onDuplicate={() => setEditing({ profile: duplicateProfile(p), isNew: true })}
                    onEdit={() => setEditing({ profile: p, isNew: false })}
                    onDelete={() => deleteProfile(p.id)}
                  />
                ))}
              </div>

              <button
                onClick={() => setEditing({ profile: emptyProfile(), isNew: true })}
                className="mt-3 w-full py-2 rounded-xl border border-dashed border-[var(--border)] text-sm text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
              >
                + Créer un profil depuis zéro
              </button>
            </section>

            <Divider />

            {/* ── Fournisseur ── */}
            <Setting
              title="Fournisseur d’IA"
              description="Le service qui lit vos slides et rédige les cartes. Gemini et OpenAI donnent des résultats comparables — choisissez celui dont vous possédez une clé. Chaque fournisseur garde sa propre clé et son propre modèle."
            >
              <div className="flex gap-2 mt-2">
                {(['gemini', 'openai'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => changeProvider(p)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      settings.provider === p
                        ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                        : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--text)]'
                    }`}
                  >
                    {PROVIDER_LABELS[p]}
                  </button>
                ))}
              </div>
            </Setting>

            {/* ── Modèle ── */}
            <Setting
              title="Modèle"
              description="Les modèles plus puissants lisent mieux les schémas et suivent mieux les consignes détaillées, mais coûtent plus cher. Le modèle recommandé est un bon équilibre."
            >
              <select
                value={settings.models[settings.provider]}
                onChange={(e) =>
                  onUpdate({ models: { ...settings.models, [settings.provider]: e.target.value } })
                }
                className="w-full mt-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
              >
                {getModels(settings.provider).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                    {m.recommended ? ' — recommandé' : ''}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-[var(--text-muted)] mt-1.5 leading-relaxed">
                {getModels(settings.provider).find((m) => m.id === settings.models[settings.provider])?.description}
              </p>
            </Setting>

            {/* ── Clé API ── */}
            <ApiKeySetting provider={settings.provider} keys={keys} />

            <Divider />

            {/* ── Découpage ── */}
            <Setting
              title={`Pages par chunk — ${settings.pagesPerChunk}`}
              description="Nombre de slides envoyées à l’IA en une seule fois. À 1 page, chaque carte indique exactement d’où elle vient et les consignes sont les plus ciblées. Au-delà, la génération est plus rapide mais moins précise."
            >
              <Range
                min={LIMITS.minPagesPerChunk}
                max={LIMITS.maxPagesPerChunk}
                value={settings.pagesPerChunk}
                onChange={(v) => onUpdate({ pagesPerChunk: v })}
                left="1 — précis"
                right="8 — rapide"
              />
            </Setting>

            <Setting
              title={`Cartes par chunk — ${settings.cardsPerChunk}`}
              description="Valeur par défaut, que chaque chunk peut remplacer. Au-delà de ce que contient réellement la slide, l’IA se répète ou invente : 3 à 5 par page est un bon repère."
            >
              <Range
                min={LIMITS.minCardsPerChunk}
                max={15}
                value={settings.cardsPerChunk}
                onChange={(v) => onUpdate({ cardsPerChunk: v })}
                left="1"
                right="15"
              />
            </Setting>

            <Setting
              title={`Chunks en parallèle — ${settings.concurrency}`}
              description="Nombre de chunks traités simultanément. Plus élevé = plus rapide, mais augmente le risque d’atteindre la limite de débit de votre clé. Réduisez à 1 en cas d’erreurs de quota."
            >
              <Range
                min={LIMITS.minConcurrency}
                max={LIMITS.maxConcurrency}
                value={settings.concurrency}
                onChange={(v) => onUpdate({ concurrency: v })}
                left="1 — prudent"
                right="6 — rapide"
              />
            </Setting>

            <Divider />

            {/* ── Qualité de lecture ── */}
            <Setting
              title="Résolution de rendu des pages"
              description="Qualité des images extraites du PDF. Une résolution élevée est nécessaire pour les schémas denses et les annotations manuscrites, mais alourdit les requêtes — surtout combinée à plusieurs pages par chunk."
            >
              <select
                value={settings.renderScale}
                onChange={(e) => onUpdate({ renderScale: Number(e.target.value) })}
                className="w-full mt-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
              >
                {RENDER_SCALES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-[var(--text-muted)] mt-1.5 leading-relaxed">
                {RENDER_SCALES.find((s) => s.value === settings.renderScale)?.hint}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] mt-1">
                Prend effet au prochain import de PDF.
              </p>
            </Setting>

            {settings.provider === 'openai' && (
              <Setting
                title="Détail des images envoyées à OpenAI"
                description="« Économique » sous-échantillonne à 512 px : les annotations manuscrites et le texte des schémas deviennent illisibles. « Résolution d’origine » conserve l’image telle quelle — c’est le réglage à choisir pour de l’écriture à la main ou des scans de mauvaise qualité."
              >
                <div className="flex gap-2 mt-2">
                  {IMAGE_DETAIL_OPTIONS.map(({ value, label }) => {
                    const available =
                      value !== 'original' ||
                      findModel('openai', settings.models.openai)?.maxImageDetail === 'original';
                    return (
                      <button
                        key={value}
                        onClick={() => available && onUpdate({ imageDetail: value })}
                        disabled={!available}
                        title={
                          available
                            ? undefined
                            : `${modelLabel('openai', settings.models.openai)} n’exploite pas la résolution d’origine.`
                        }
                        className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                          settings.imageDetail === value
                            ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                            : available
                              ? 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)]'
                              : 'border-[var(--border)] text-[var(--text-muted)] opacity-40 cursor-not-allowed'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </Setting>
            )}

            <Divider />

            {/* ── Comportement ── */}
            <Setting
              title="Langue des cartes"
              description="Par défaut, l’IA écrit dans la langue du cours. Forcez une langue si votre cours est dans une autre langue que celle dans laquelle vous révisez."
            >
              <div className="flex gap-2 mt-2">
                {(
                  [
                    ['auto', 'Langue du cours'],
                    ['fr', 'Français'],
                    ['en', 'Anglais'],
                  ] as [OutputLanguage, string][]
                ).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => onUpdate({ language: value })}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-colors ${
                      settings.language === value
                        ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                        : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </Setting>

            <Toggle
              title="Compléter automatiquement le nombre de cartes"
              description="Quand l’IA renvoie moins de cartes que demandé, un second appel réclame uniquement les manquantes, en évitant les doublons. Garantit le nombre demandé, au prix de quelques appels supplémentaires facturés sur votre clé."
              value={settings.autoCompleteCount}
              onChange={(v) => onUpdate({ autoCompleteCount: v })}
            />

            <Divider />

            <Toggle
              title="Ajouter des tags dans l’export Anki"
              description="Chaque carte exportée reçoit des tags automatiques (type, difficulté, section). Pratique pour filtrer dans Anki, désactivé par défaut pour garder un deck propre."
              value={settings.exportTags}
              onChange={(v) => onUpdate({ exportTags: v })}
            />
          </div>

          <div className="px-6 py-4 border-t border-[var(--border)] flex-shrink-0">
            <p className="text-[10px] text-[var(--text-muted)] mb-3">
              Les paramètres sont enregistrés automatiquement dans ce navigateur.
            </p>
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-[var(--accent)] text-white text-sm font-semibold hover:brightness-110"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>

      {editing && (
        <PromptEditor
          initial={editing.profile}
          isNew={editing.isNew}
          onSave={saveProfile}
          onCancel={() => setEditing(null)}
        />
      )}
    </>
  );
}

// ─── Clé API ──────────────────────────────────────────────────

function ApiKeySetting({
  provider,
  keys,
}: {
  provider: ProviderId;
  keys: ReturnType<typeof useApiKeys>;
}) {
  const status = keys.status(provider);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [visible, setVisible] = useState(false);

  const hint =
    provider === 'gemini'
      ? 'Votre clé personnelle Gemini, sur aistudio.google.com. Elle commence par « AIza ».'
      : 'Votre clé personnelle OpenAI, sur platform.openai.com. Elle commence par « sk- ».';

  function save() {
    keys.setKey(provider, draft);
    setDraft('');
    setVisible(false);
    setEditing(false);
  }

  function cancel() {
    setDraft('');
    setVisible(false);
    setEditing(false);
  }

  const showForm = editing || !status.configured;

  return (
    <Setting title={`Clé API ${PROVIDER_LABELS[provider]}`} description={hint}>
      {!showForm ? (
        <div className="mt-2 space-y-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
            <span className="text-[var(--success)] text-xs">✓</span>
            <span className="text-xs text-[var(--text-muted)]">Clé enregistrée</span>
            <span className="text-xs font-mono ml-auto">{status.masked}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(true)}
              className="flex-1 py-2 rounded-lg border border-[var(--border)] text-xs text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--accent)]"
            >
              Remplacer
            </button>
            <button
              onClick={() => keys.removeKey(provider)}
              className="flex-1 py-2 rounded-lg border border-[var(--border)] text-xs text-[var(--text-muted)] hover:text-[var(--danger)] hover:border-[var(--danger)]"
            >
              Supprimer
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2 space-y-2">
          <div className="flex gap-2">
            <input
              type={visible ? 'text' : 'password'}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={provider === 'gemini' ? 'AIza…' : 'sk-…'}
              autoComplete="off"
              spellCheck={false}
              className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] font-mono"
            />
            <button
              onClick={() => setVisible((v) => !v)}
              className="px-3 py-2 rounded-lg border border-[var(--border)] text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
              title="Afficher ce que vous êtes en train de saisir"
            >
              {visible ? 'Masquer' : 'Afficher'}
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={!draft.trim()}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold ${
                draft.trim()
                  ? 'bg-[var(--accent)] text-white hover:brightness-110'
                  : 'bg-[var(--bg-hover)] text-[var(--text-muted)] cursor-not-allowed'
              }`}
            >
              Enregistrer
            </button>
            {status.configured && (
              <button
                onClick={cancel}
                className="flex-1 py-2 rounded-lg border border-[var(--border)] text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                Annuler
              </button>
            )}
          </div>
          {!status.configured && (
            <p className="text-[10px] text-[var(--text-muted)]">
              Sans clé ici, celle du serveur (.env.local) sera utilisée si elle existe.
            </p>
          )}
        </div>
      )}
    </Setting>
  );
}

// ─── Profils ──────────────────────────────────────────────────

function ProfileRow({
  profile,
  active,
  onSelect,
  onDuplicate,
  onEdit,
  onDelete,
}: {
  profile: PromptProfile;
  active: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`rounded-xl border p-3 flex items-start gap-3 transition-colors ${
        active
          ? 'border-[var(--accent)] bg-[var(--accent-dim)]'
          : 'border-[var(--border)] hover:border-[var(--accent)] cursor-pointer'
      }`}
      onClick={onSelect}
    >
      <span className="text-lg mt-0.5 flex-shrink-0">{profile.emoji}</span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">{profile.name}</p>
          {active && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent)] text-white">
              Actif
            </span>
          )}
        </div>
        <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-relaxed line-clamp-2">
          {profile.description}
        </p>
      </div>

      <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        {profile.builtin ? (
          <SmallButton onClick={onDuplicate} title="Créer une copie modifiable de ce profil">
            Personnaliser
          </SmallButton>
        ) : (
          <>
            <SmallButton onClick={onEdit}>Modifier</SmallButton>
            <SmallButton onClick={onDelete} danger>
              Supprimer
            </SmallButton>
          </>
        )}
      </div>
    </div>
  );
}

function SmallButton({
  onClick,
  children,
  danger,
  title,
}: {
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`text-[10px] px-2 py-1 rounded border border-[var(--border)] text-[var(--text-muted)] ${
        danger
          ? 'hover:text-[var(--danger)] hover:border-[var(--danger)]'
          : 'hover:text-[var(--accent)] hover:border-[var(--accent)]'
      }`}
    >
      {children}
    </button>
  );
}

// ─── Sous-composants ─────────────────────────────────────────

function Divider() {
  return <div className="border-t border-[var(--border)]" />;
}

function Setting({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-sm font-medium">{title}</p>
      <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-relaxed">{description}</p>
      {children}
    </div>
  );
}

function Toggle({
  title,
  description,
  value,
  onChange,
}: {
  title: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <Setting title={title} description={description}>
      <button
        onClick={() => onChange(!value)}
        className={`mt-2 w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${
          value ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
        }`}
        aria-pressed={value}
      >
        <span
          className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
            value ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </Setting>
  );
}

function Range({
  min,
  max,
  value,
  onChange,
  left,
  right,
}: {
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
  left: string;
  right: string;
}) {
  return (
    <>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full mt-2 accent-[var(--accent)]"
      />
      <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-0.5">
        <span>{left}</span>
        <span>{right}</span>
      </div>
    </>
  );
}
