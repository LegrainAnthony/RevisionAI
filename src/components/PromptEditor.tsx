'use client';

import { useState } from 'react';
import { PromptProfile } from '@/shared/types';

interface Props {
  initial?: PromptProfile;
  onSave: (profile: PromptProfile) => void;
  onCancel: () => void;
}

const FIELDS: { key: keyof Omit<PromptProfile, 'id' | 'name'>; label: string; description: string; placeholder: string }[] = [
  {
    key: 'context',
    label: 'Contexte',
    description: 'Décrivez le type de cours et le public visé. L\'IA utilisera ces informations pour adapter le ton, le vocabulaire et le niveau de précision des cartes.',
    placeholder: 'Ex : Cours de licence en droit civil pour des étudiants de L2. Le contenu porte sur les contrats, obligations et responsabilités civiles.',
  },
  {
    key: 'rules',
    label: 'Règles (obligatoires)',
    description: 'Ce que l\'IA doit absolument respecter. Soyez précis : chaque règle doit être actionnable.',
    placeholder: 'Ex :\n- Une carte = une notion juridique identifiable\n- Citer les articles de loi quand ils apparaissent dans le cours\n- Reprendre les définitions exactes du cours\n- Inclure les exceptions mentionnées',
  },
  {
    key: 'recommendations',
    label: 'Recommandations (à privilégier)',
    description: 'Ce que vous préférez mais qui n\'est pas obligatoire. L\'IA essaiera de s\'y conformer autant que possible.',
    placeholder: 'Ex :\n- Privilégier les cartes de type "liste d\'éléments"\n- Faire des cartes sur les distinctions importantes entre deux concepts\n- Poser des questions sous forme de cas pratiques si le cours en présente',
  },
  {
    key: 'forbidden',
    label: 'Interdits',
    description: 'Ce que l\'IA ne doit jamais faire dans ce profil.',
    placeholder: 'Ex :\n- Ne pas inventer d\'exemples jurisprudentiels non présents dans le cours\n- Ne pas faire de cartes sur l\'histoire du droit\n- Éviter les questions trop vagues comme "Qu\'est-ce que le contrat ?"',
  },
];

export function PromptEditor({ initial, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [fields, setFields] = useState({
    context: initial?.context ?? '',
    rules: initial?.rules ?? '',
    recommendations: initial?.recommendations ?? '',
    forbidden: initial?.forbidden ?? '',
  });

  const isValid = name.trim().length > 0;

  function handleSave() {
    if (!isValid) return;
    onSave({
      id: initial?.id ?? `custom-${Date.now()}`,
      name: name.trim(),
      ...fields,
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] flex-shrink-0">
          <h2 className="text-base font-semibold">
            {initial ? 'Modifier le profil' : 'Créer un profil de prompt'}
          </h2>
          <button onClick={onCancel} className="text-[var(--text-muted)] hover:text-[var(--text)] text-xl leading-none">✕</button>
        </div>

        {/* Contenu scrollable */}
        <div className="overflow-y-auto px-6 py-5 space-y-5 flex-1">

          {/* Nom */}
          <div>
            <label className="text-sm font-medium block mb-1">Nom du profil</label>
            <p className="text-[11px] text-[var(--text-muted)] mb-2">
              Un nom court pour retrouver facilement ce profil (ex : Droit civil, Biologie cellulaire).
            </p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex : Droit civil"
              className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)]"
            />
          </div>

          {/* Champs dynamiques */}
          {FIELDS.map(({ key, label, description, placeholder }) => (
            <div key={key}>
              <label className="text-sm font-medium block mb-1">{label}</label>
              <p className="text-[11px] text-[var(--text-muted)] mb-2 leading-relaxed">{description}</p>
              <textarea
                value={fields[key]}
                onChange={(e) => setFields((prev) => ({ ...prev, [key]: e.target.value }))}
                placeholder={placeholder}
                rows={4}
                className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-[var(--accent)] placeholder:text-[var(--text-muted)] placeholder:text-xs"
              />
            </div>
          ))}

          <p className="text-[10px] text-[var(--text-muted)] pb-1">
            Seuls le nom et au moins un champ rempli suffisent — les autres sont optionnels.
          </p>
        </div>

        {/* Footer */}
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
            {initial ? 'Enregistrer' : 'Créer le profil'}
          </button>
        </div>
      </div>
    </div>
  );
}
