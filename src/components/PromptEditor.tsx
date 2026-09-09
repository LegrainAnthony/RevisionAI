'use client';

import { useState } from 'react';
import type { PromptProfile } from '@/shared/types';
import { buildChunkPrompt } from '@/engine/ai/promptBuilder';
import { PromptPreview } from './PromptPreview';

interface Props {
  initial: PromptProfile;
  /** true = création (depuis zéro ou par duplication), false = édition */
  isNew: boolean;
  onSave: (profile: PromptProfile) => void;
  onCancel: () => void;
}

const FIELDS: {
  key: 'context' | 'rules' | 'recommendations' | 'forbidden';
  label: string;
  description: string;
  placeholder: string;
}[] = [
  {
    key: 'context',
    label: 'Contexte',
    description:
      "Le type de cours et le public visé. L'IA s'en sert pour adapter le ton, le vocabulaire et le niveau de précision.",
    placeholder:
      'Ex : cours de licence en droit civil pour des étudiants de L2, portant sur les contrats, obligations et responsabilités civiles.',
  },
  {
    key: 'rules',
    label: 'Règles (obligatoires)',
    description:
      "Ce que l'IA doit absolument respecter. Une règle par ligne, formulée de façon vérifiable.",
    placeholder:
      "Ex :\n- Une carte = une notion juridique identifiable\n- Citer les articles de loi quand ils apparaissent dans le cours\n- Reprendre les définitions exactes\n- Inclure les exceptions mentionnées",
  },
  {
    key: 'recommendations',
    label: 'Recommandations (à privilégier)',
    description:
      "Vos préférences, sans caractère obligatoire. L'IA s'y conforme quand le contenu le permet.",
    placeholder:
      'Ex :\n- Privilégier les cartes de type « liste d’éléments »\n- Faire des cartes sur les distinctions entre deux concepts proches',
  },
  {
    key: 'forbidden',
    label: 'Interdits',
    description: "Ce que l'IA ne doit jamais faire avec ce profil.",
    placeholder:
      "Ex :\n- Ne pas inventer d’exemples jurisprudentiels absents du cours\n- Éviter les questions vagues comme « Qu’est-ce qu’un contrat ? »",
  },
];

export function PromptEditor({ initial, isNew, onSave, onCancel }: Props) {
  const [profile, setProfile] = useState<PromptProfile>(initial);
  const [preview, setPreview] = useState(false);

  const isValid = profile.name.trim().length > 0;
  const isEdit = !isNew;

  function set<K extends keyof PromptProfile>(key: K, value: PromptProfile[K]) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    if (!isValid) return;
    onSave({
      ...profile,
      name: profile.name.trim(),
      builtin: false,
      description: profile.description.trim() || deriveDescription(profile),
    });
  }

  return (
    <>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <div className="w-full max-w-xl bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] flex-shrink-0">
            <h2 className="text-base font-semibold">
              {isEdit ? 'Modifier le profil' : 'Créer un profil de prompt'}
            </h2>
            <button
              onClick={onCancel}
              className="text-[var(--text-muted)] hover:text-[var(--text)] text-xl leading-none"
            >
              ✕
            </button>
          </div>

          <div className="overflow-y-auto px-6 py-5 space-y-5 flex-1">
            <div>
              <label className="text-sm font-medium block mb-1">Nom du profil</label>
              <p className="text-[11px] text-[var(--text-muted)] mb-2">
                Un nom court pour le retrouver facilement (ex : Droit civil, Biologie cellulaire).
              </p>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Ex : Droit civil"
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
              />
            </div>

            {FIELDS.map(({ key, label, description, placeholder }) => (
              <div key={key}>
                <label className="text-sm font-medium block mb-1">{label}</label>
                <p className="text-[11px] text-[var(--text-muted)] mb-2 leading-relaxed">{description}</p>
                <textarea
                  value={profile[key]}
                  onChange={(e) => set(key, e.target.value)}
                  placeholder={placeholder}
                  rows={4}
                  className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-[var(--accent)] placeholder:text-[var(--text-muted)] placeholder:text-xs"
                />
              </div>
            ))}

            <button
              onClick={() => setPreview(true)}
              className="w-full py-2 rounded-xl border border-dashed border-[var(--border)] text-xs text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
            >
              Voir le prompt final envoyé à l’IA
            </button>

            <p className="text-[10px] text-[var(--text-muted)] pb-1">
              Le nom suffit. Les autres champs sont optionnels : ne remplissez que ce qui compte
              pour votre matière.
            </p>
          </div>

          <div className="px-6 py-4 border-t border-[var(--border)] flex gap-3 flex-shrink-0">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--text-muted)] hover:bg-[var(--bg-hover)]"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={!isValid}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold ${
                isValid
                  ? 'bg-[var(--accent)] text-white hover:brightness-110'
                  : 'bg-[var(--bg-hover)] text-[var(--text-muted)] cursor-not-allowed'
              }`}
            >
              {isEdit ? 'Enregistrer' : 'Créer le profil'}
            </button>
          </div>
        </div>
      </div>

      {preview && (
        <PromptPreview
          title={`Aperçu — ${profile.name.trim() || 'profil sans nom'}`}
          subtitle="Exemple sur un chunk de 2 pages avec 5 cartes et une consigne spécifique."
          prompt={buildChunkPrompt({
            profile: {
              name: profile.name.trim() || 'Profil sans nom',
              context: profile.context,
              rules: profile.rules,
              recommendations: profile.recommendations,
              forbidden: profile.forbidden,
            },
            params: { difficulty: 'mixed', language: 'auto', globalInstructions: '' },
            chunk: {
              pageNumbers: [1, 2],
              cardCount: 5,
              instructions: 'Exemple de consigne propre à ce chunk.',
            },
          })}
          onClose={() => setPreview(false)}
        />
      )}
    </>
  );
}

function deriveDescription(profile: PromptProfile): string {
  const source = [profile.context, profile.rules, profile.recommendations, profile.forbidden]
    .map((v) => v.trim())
    .filter(Boolean)
    .join(' · ')
    .replace(/\s+/g, ' ');
  return source.slice(0, 90) || 'Profil personnalisé';
}
