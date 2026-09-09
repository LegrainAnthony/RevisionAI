'use client';

import { useState } from 'react';
import type { BuiltPrompt } from '@/engine/ai/promptBuilder';

interface Props {
  title: string;
  subtitle?: string;
  prompt: BuiltPrompt;
  onClose: () => void;
}

/**
 * Affiche le prompt exact qui sera envoyé au modèle.
 *
 * C'est l'outil de vérification central de la refonte : plutôt que de
 * promettre que les consignes sont transmises, on les montre, à leur place
 * et avec leur niveau de priorité. Un utilisateur qui ne connaît rien aux
 * modèles IA peut ainsi constater lui-même qu'une consigne de chunk n'est
 * présente que dans le prompt de son chunk.
 */
export function PromptPreview({ title, subtitle, prompt, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  const fullText = [
    '### SYSTEM',
    prompt.system,
    '',
    '### UTILISATEUR — AVANT LES IMAGES',
    prompt.userLead,
    '',
    '### [IMAGES DES PAGES]',
    '',
    '### UTILISATEUR — APRÈS LES IMAGES',
    prompt.userTail,
  ].join('\n');

  async function copy() {
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Presse-papiers indisponible : sans conséquence.
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-3xl bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-[var(--border)] flex-shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-semibold">{title}</h2>
            {subtitle && <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={copy}
              className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs text-[var(--text-muted)] hover:text-[var(--accent)] hover:border-[var(--accent)]"
            >
              {copied ? 'Copié' : 'Copier'}
            </button>
            <button
              onClick={onClose}
              className="text-[var(--text-muted)] hover:text-[var(--text)] text-xl leading-none"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-6 py-5 space-y-4 flex-1">
          <Block
            label="Message système"
            hint="Identité, invariants, hiérarchie des consignes, profil et paramètres."
            text={prompt.system}
          />
          <Block
            label="Message utilisateur — avant les images"
            hint="Rappel de la consigne prioritaire, juste avant le contenu."
            text={prompt.userLead}
          />
          <div className="rounded-xl border border-dashed border-[var(--border)] px-4 py-3 text-center text-[11px] text-[var(--text-muted)]">
            🖼 Les images des pages du chunk sont insérées ici
          </div>
          <Block
            label="Message utilisateur — après les images"
            hint="Dernière position du contexte : c’est celle que le modèle suit le mieux."
            text={prompt.userTail}
          />
        </div>

        <div className="px-6 py-4 border-t border-[var(--border)] flex-shrink-0">
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

function Block({ label, hint, text }: { label: string; hint: string; text: string }) {
  return (
    <div>
      <p className="text-xs font-semibold">{label}</p>
      <p className="text-[10px] text-[var(--text-muted)] mb-1.5">{hint}</p>
      <pre className="bg-[var(--bg)] border border-[var(--border)] rounded-lg p-3 text-[11px] leading-relaxed whitespace-pre-wrap break-words font-mono overflow-x-auto">
        {text}
      </pre>
    </div>
  );
}
