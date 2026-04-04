'use client';

import { useState } from 'react';
import { AppSettings, PromptProfile, PREDEFINED_PROFILE_IDS } from '@/shared/types';
import { PromptEditor } from './PromptEditor';

// ─── Données des profils prédéfinis ──────────────────────────

const PREDEFINED_PROFILES: { id: string; name: string; description: string; emoji: string }[] = [
  {
    id: 'general',
    name: 'Général',
    description: 'Adapté à tous les types de cours. Idéal si vous ne savez pas quel profil choisir.',
    emoji: '📚',
  },
  {
    id: 'kine',
    name: 'Kinésithérapie',
    description: 'Optimisé pour l\'anatomie, la physiologie, la biomécanique. Fidélité maximale au cours.',
    emoji: '🦴',
  },
  {
    id: 'info',
    name: 'Informatique',
    description: 'Programmation, architecture logicielle, algorithmes, design patterns.',
    emoji: '💻',
  },
  {
    id: 'vente',
    name: 'Vente & Commerce',
    description: 'Techniques de vente, négociation, méthodes commerciales, typologies clients.',
    emoji: '🤝',
  },
  {
    id: 'langues',
    name: 'Langues étrangères',
    description: 'Vocabulaire, grammaire, expressions idiomatiques, conjugaisons.',
    emoji: '🌍',
  },
];

// ─── Modèles disponibles ─────────────────────────────────────

const GEMINI_MODELS = [
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash — Rapide et économique (recommandé)' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash — Légèrement moins récent' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro — Plus puissant, plus cher' },
];

const OPENAI_MODELS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini — Rapide et économique (recommandé)' },
  { value: 'gpt-4o', label: 'GPT-4o — Plus puissant, plus cher' },
];

// ─── Composant principal ─────────────────────────────────────

interface Props {
  settings: AppSettings;
  onUpdate: (updates: Partial<AppSettings>) => void;
  onClose: () => void;
}

export function SettingsPanel({ settings, onUpdate, onClose }: Props) {
  const [showKey, setShowKey] = useState(false);
  const [editingProfile, setEditingProfile] = useState<PromptProfile | null | 'new'>(null);

  const models = settings.provider === 'openai' ? OPENAI_MODELS : GEMINI_MODELS;

  function handleProviderChange(provider: 'gemini' | 'openai') {
    const defaultModel = provider === 'openai' ? OPENAI_MODELS[0].value : GEMINI_MODELS[0].value;
    onUpdate({ provider, model: defaultModel, apiKey: '' });
  }

  function handleSaveProfile(profile: PromptProfile) {
    const existing = settings.customProfiles.find((p) => p.id === profile.id);
    const updated = existing
      ? settings.customProfiles.map((p) => (p.id === profile.id ? profile : p))
      : [...settings.customProfiles, profile];
    onUpdate({ customProfiles: updated, activeProfileId: profile.id });
    setEditingProfile(null);
  }

  function handleDeleteProfile(id: string) {
    onUpdate({
      customProfiles: settings.customProfiles.filter((p) => p.id !== id),
      activeProfileId: settings.activeProfileId === id ? 'general' : settings.activeProfileId,
    });
  }

  type ProfileEntry = {
    id: string;
    name: string;
    description: string;
    emoji: string;
    isCustom: boolean;
    profile: PromptProfile | null;
  };

  const allProfiles: ProfileEntry[] = [
    ...PREDEFINED_PROFILES.map((p) => ({ ...p, isCustom: false, profile: null })),
    ...settings.customProfiles.map((p): ProfileEntry => ({
      id: p.id,
      name: p.name,
      description: [p.context, p.rules, p.recommendations, p.forbidden]
        .filter(Boolean)
        .join(' · ')
        .slice(0, 80) || 'Profil personnalisé',
      emoji: '✏️',
      isCustom: true,
      profile: p,
    })),
  ];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-lg bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] flex-shrink-0">
            <h2 className="text-base font-semibold">Paramètres</h2>
            <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text)] text-xl leading-none">✕</button>
          </div>

          {/* Contenu scrollable */}
          <div className="px-6 py-5 space-y-7 overflow-y-auto flex-1">

            {/* ── Profil de prompt ── */}
            <section>
              <p className="text-sm font-semibold mb-0.5">Profil de prompt</p>
              <p className="text-[11px] text-[var(--text-muted)] mb-3 leading-relaxed">
                Le profil détermine comment l'IA va lire votre cours et formuler les cartes.
                Choisissez le profil qui correspond le mieux à votre matière, ou créez le vôtre.
              </p>

              <div className="space-y-2">
                {allProfiles.map((p) => {
                  const isActive = settings.activeProfileId === p.id;
                  const isCustom = 'isCustom' in p && p.isCustom;
                  return (
                    <div
                      key={p.id}
                      className={`rounded-xl border p-3 flex items-start gap-3 transition-colors ${
                        isActive
                          ? 'border-[var(--accent)] bg-[var(--accent-dim)]'
                          : 'border-[var(--border)] hover:border-[var(--accent)] cursor-pointer'
                      }`}
                      onClick={() => onUpdate({ activeProfileId: p.id })}
                    >
                      <span className="text-lg mt-0.5 flex-shrink-0">{p.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{p.name}</p>
                          {isActive && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent)] text-white">Actif</span>
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] mt-0.5 leading-relaxed line-clamp-2">{p.description}</p>
                      </div>
                      {isCustom && (
                        <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => p.profile && setEditingProfile(p.profile)}
                            className="text-[10px] px-2 py-1 rounded border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)]"
                          >
                            Modifier
                          </button>
                          <button
                            onClick={() => handleDeleteProfile(p.id)}
                            className="text-[10px] px-2 py-1 rounded border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--danger)] hover:border-[var(--danger)]"
                          >
                            Supprimer
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => setEditingProfile('new')}
                className="mt-3 w-full py-2 rounded-xl border border-dashed border-[var(--border)] text-sm text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
              >
                + Créer un profil personnalisé
              </button>
            </section>

            <Divider />

            {/* ── Fournisseur IA ── */}
            <Setting
              title="Fournisseur d'IA"
              description="Le service d'intelligence artificielle qui va lire vos slides et créer les cartes. Gemini (Google) et OpenAI (ChatGPT) donnent des résultats similaires — le choix dépend principalement de la clé API que vous possédez."
            >
              <div className="flex gap-2 mt-2">
                {(['gemini', 'openai'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => handleProviderChange(p)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      settings.provider === p
                        ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
                        : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--text)]'
                    }`}
                  >
                    {p === 'gemini' ? 'Gemini (Google)' : 'OpenAI (ChatGPT)'}
                  </button>
                ))}
              </div>
            </Setting>

            {/* ── Clé API ── */}
            <Setting
              title="Clé API"
              description={
                settings.provider === 'gemini'
                  ? 'Votre clé personnelle pour accéder à Gemini. Elle se trouve sur Google AI Studio (aistudio.google.com). Commence par "AIza...".'
                  : 'Votre clé personnelle pour accéder à OpenAI. Elle se trouve sur platform.openai.com. Commence par "sk-...".'
              }
            >
              <div className="flex gap-2 mt-2">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={settings.apiKey}
                  onChange={(e) => onUpdate({ apiKey: e.target.value })}
                  placeholder={settings.provider === 'gemini' ? 'AIza...' : 'sk-...'}
                  className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] font-mono"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="px-3 py-2 rounded-lg border border-[var(--border)] text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
                >
                  {showKey ? 'Masquer' : 'Afficher'}
                </button>
              </div>
              {!settings.apiKey && (
                <p className="text-[10px] text-[var(--text-muted)] mt-1.5">
                  Si vide, la clé configurée sur le serveur (.env.local) sera utilisée.
                </p>
              )}
            </Setting>

            {/* ── Modèle ── */}
            <Setting
              title="Modèle d'IA"
              description="La version du modèle à utiliser. Les modèles plus récents comprennent mieux les images et produisent des cartes de meilleure qualité, mais coûtent légèrement plus cher. Le modèle recommandé est un bon équilibre qualité / prix."
            >
              <select
                value={settings.model}
                onChange={(e) => onUpdate({ model: e.target.value })}
                className="w-full mt-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
              >
                {models.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </Setting>

            <Divider />

            {/* ── Pages par requête ── */}
            <Setting
              title={`Pages par requête — ${settings.pagesPerBatch} page${settings.pagesPerBatch > 1 ? 's' : ''}`}
              description="Nombre de slides envoyées à l'IA en une seule fois. Avec 1 page, chaque carte indique exactement de quelle slide elle provient (précision maximale). Avec plus de pages, la génération est plus rapide mais vous ne saurez plus précisément d'où vient chaque carte."
            >
              <input
                type="range"
                min={1}
                max={8}
                value={settings.pagesPerBatch}
                onChange={(e) => onUpdate({ pagesPerBatch: Number(e.target.value) })}
                className="w-full mt-2 accent-[var(--accent)]"
              />
              <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-0.5">
                <span>1 — Précis (lent)</span>
                <span>8 — Rapide (moins précis)</span>
              </div>
            </Setting>

            {/* ── Cartes par requête ── */}
            <Setting
              title={`Cartes par requête — ${settings.cardsPerChunk} carte${settings.cardsPerChunk > 1 ? 's' : ''}`}
              description="Nombre de cartes que l'IA doit créer pour chaque groupe de pages. Plus ce chiffre est élevé, plus vous obtenez de cartes par slide — mais l'IA peut commencer à inventer ou répéter si le contenu est limité. 3 à 5 cartes par slide est généralement idéal."
            >
              <input
                type="range"
                min={1}
                max={15}
                value={settings.cardsPerChunk}
                onChange={(e) => onUpdate({ cardsPerChunk: Number(e.target.value) })}
                className="w-full mt-2 accent-[var(--accent)]"
              />
              <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-0.5">
                <span>1 — Peu de cartes</span>
                <span>15 — Beaucoup de cartes</span>
              </div>
            </Setting>

            <Divider />

            {/* ── Tags Anki ── */}
            <Setting
              title="Ajouter des tags dans l'export Anki"
              description="Quand cette option est activée, chaque carte exportée reçoit des tags Anki automatiques (type de carte, difficulté, section source). Les tags permettent de filtrer et d'organiser les cartes dans Anki. Désactivé par défaut pour garder un deck propre."
            >
              <button
                onClick={() => onUpdate({ exportTags: !settings.exportTags })}
                className={`mt-2 w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${
                  settings.exportTags ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'
                }`}
              >
                <span className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  settings.exportTags ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </Setting>

          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[var(--border)] flex-shrink-0">
            <p className="text-[10px] text-[var(--text-muted)] mb-3">
              Les paramètres sont sauvegardés automatiquement dans votre navigateur.
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

      {/* Éditeur de profil custom */}
      {editingProfile !== null && (
        <PromptEditor
          initial={editingProfile === 'new' ? undefined : editingProfile}
          onSave={handleSaveProfile}
          onCancel={() => setEditingProfile(null)}
        />
      )}
    </>
  );
}

// ─── Sous-composants ─────────────────────────────────────────

function Divider() {
  return <div className="border-t border-[var(--border)]" />;
}

function Setting({ title, description, children }: {
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
