'use client';

import { useState } from 'react';
import { AppSettings } from '@/shared/types';

const GEMINI_MODELS = [
  { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash — Rapide et économique (recommandé)' },
  { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash — Légèrement moins récent' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro — Plus puissant, plus cher' },
];

const OPENAI_MODELS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini — Rapide et économique (recommandé)' },
  { value: 'gpt-4o', label: 'GPT-4o — Plus puissant, plus cher' },
];

interface Props {
  settings: AppSettings;
  onUpdate: (updates: Partial<AppSettings>) => void;
  onClose: () => void;
}

export function SettingsPanel({ settings, onUpdate, onClose }: Props) {
  const [showKey, setShowKey] = useState(false);
  const models = settings.provider === 'openai' ? OPENAI_MODELS : GEMINI_MODELS;

  // Si le modèle actuel n'appartient pas au provider sélectionné, choisir le premier
  function handleProviderChange(provider: 'gemini' | 'openai') {
    const defaultModel = provider === 'openai' ? OPENAI_MODELS[0].value : GEMINI_MODELS[0].value;
    onUpdate({ provider, model: defaultModel, apiKey: '' });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-base font-semibold">Paramètres</h2>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text)] text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Contenu */}
        <div className="px-6 py-5 space-y-6 overflow-y-auto max-h-[75vh]">

          {/* Fournisseur IA */}
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

          {/* Clé API */}
          <Setting
            title="Clé API"
            description={
              settings.provider === 'gemini'
                ? "Votre clé personnelle pour accéder à Gemini. Elle se trouve sur Google AI Studio (aistudio.google.com). Commence par \"AIza...\"."
                : "Votre clé personnelle pour accéder à OpenAI. Elle se trouve sur platform.openai.com. Commence par \"sk-...\"."
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

          {/* Modèle */}
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

          {/* Pages par requête */}
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

          {/* Cartes par requête */}
          <Setting
            title={`Cartes par requête — ${settings.cardsPerChunk} carte${settings.cardsPerChunk > 1 ? 's' : ''}`}
            description="Nombre de cartes que l'IA doit créer pour chaque groupe de pages. Plus ce chiffre est élevé, plus vous obtenez de cartes par slide — mais l'IA peut commencer à inventer ou répéter des informations si le contenu de la slide est limité. 3 à 5 cartes par slide est généralement idéal."
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

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border)]">
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
  );
}

// ─── Bloc paramètre individuel ────────────────────────────────

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
