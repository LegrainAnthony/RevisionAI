'use client';

import { useState, useRef, useCallback } from 'react';
import { Card } from '@/shared/types';

interface Props {
  cards: Card[];
  costUsd: number;
  onUpdate: (cards: Card[]) => void;
  onExport: () => void;
  onReset: () => void;
  exporting: boolean;
}

/**
 * Affiche les cartes générées avec édition, sélection, images, et mode basic/reverse.
 */
export function CardResults({ cards, costUsd, onUpdate, onExport, onReset, exporting }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const selectedCount = cards.filter((c) => c.selected).length;

  function toggleCard(id: string) {
    onUpdate(cards.map((c) => c.id === id ? { ...c, selected: !c.selected } : c));
  }

  function updateCard(id: string, field: 'question' | 'answer', value: string) {
    onUpdate(cards.map((c) => c.id === id ? { ...c, [field]: value } : c));
  }

  function toggleMode(id: string) {
    onUpdate(cards.map((c) =>
      c.id === id ? { ...c, cardMode: c.cardMode === 'basic' ? 'reverse' : 'basic' } : c
    ));
  }

  function selectAll(val: boolean) {
    onUpdate(cards.map((c) => ({ ...c, selected: val })));
  }

  function addImage(cardId: string, side: 'front' | 'back', base64: string) {
    const field = side === 'front' ? 'frontImages' : 'backImages';
    onUpdate(cards.map((c) =>
      c.id === cardId ? { ...c, [field]: [...c[field], base64] } : c
    ));
  }

  function removeImage(cardId: string, side: 'front' | 'back', index: number) {
    const field = side === 'front' ? 'frontImages' : 'backImages';
    onUpdate(cards.map((c) =>
      c.id === cardId ? { ...c, [field]: c[field].filter((_, i) => i !== index) } : c
    ));
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between bg-[var(--bg-card)] rounded-xl p-4 border border-[var(--border)]">
        <div>
          <p className="text-sm font-medium">{selectedCount} / {cards.length} cartes sélectionnées</p>
          <p className="text-xs text-[var(--text-muted)]">Coût de cette génération : ${costUsd.toFixed(4)}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => selectAll(true)}
            className="px-3 py-1.5 rounded-lg text-xs bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            Tout sélectionner
          </button>
          <button
            onClick={() => selectAll(false)}
            className="px-3 py-1.5 rounded-lg text-xs bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            Tout désélectionner
          </button>
        </div>
      </div>

      {/* Liste des cartes */}
      <div className="space-y-2">
        {cards.map((card) => (
          <CardItem
            key={card.id}
            card={card}
            isEditing={editingId === card.id}
            onToggle={() => toggleCard(card.id)}
            onToggleMode={() => toggleMode(card.id)}
            onEdit={() => setEditingId(card.id)}
            onDoneEditing={() => setEditingId(null)}
            onUpdateField={(field, val) => updateCard(card.id, field, val)}
            onAddImage={(side, b64) => addImage(card.id, side, b64)}
            onRemoveImage={(side, idx) => removeImage(card.id, side, idx)}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onReset}
          className="px-5 py-2.5 rounded-xl border border-[var(--border)] text-sm text-[var(--text-muted)] hover:bg-[var(--bg-card)]"
        >
          ← Nouveau document
        </button>
        <button
          onClick={onExport}
          disabled={selectedCount === 0 || exporting}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold ${
            selectedCount === 0 || exporting
              ? 'bg-[var(--bg-hover)] text-[var(--text-muted)] cursor-not-allowed'
              : 'bg-[var(--success)] hover:brightness-110 text-black'
          }`}
        >
          {exporting
            ? 'Export en cours…'
            : `📥 Exporter ${selectedCount} carte${selectedCount !== 1 ? 's' : ''} (.txt Anki)`
          }
        </button>
      </div>
    </div>
  );
}

// ─── Composant carte individuelle ────────────────────────────

interface CardItemProps {
  card: Card;
  isEditing: boolean;
  onToggle: () => void;
  onToggleMode: () => void;
  onEdit: () => void;
  onDoneEditing: () => void;
  onUpdateField: (field: 'question' | 'answer', value: string) => void;
  onAddImage: (side: 'front' | 'back', base64: string) => void;
  onRemoveImage: (side: 'front' | 'back', index: number) => void;
}

function CardItem({
  card, isEditing, onToggle, onToggleMode, onEdit, onDoneEditing,
  onUpdateField, onAddImage, onRemoveImage,
}: CardItemProps) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        card.selected
          ? 'border-[var(--border)] bg-[var(--bg-card)]'
          : 'border-transparent bg-[var(--bg-card)] opacity-40'
      }`}
    >
      <div className="flex gap-3">
        <button
          onClick={onToggle}
          className={`mt-0.5 w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center ${
            card.selected
              ? 'bg-[var(--accent)] border-[var(--accent)]'
              : 'border-[var(--border)]'
          }`}
        >
          {card.selected && <span className="text-white text-[10px]">✓</span>}
        </button>

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <EditMode
              card={card}
              onUpdateField={onUpdateField}
              onAddImage={onAddImage}
              onRemoveImage={onRemoveImage}
              onDone={onDoneEditing}
            />
          ) : (
            <ReadMode card={card} onEdit={onEdit} onToggleMode={onToggleMode} />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Mode lecture ────────────────────────────────────────────

function ReadMode({ card, onEdit, onToggleMode }: { card: Card; onEdit: () => void; onToggleMode: () => void }) {
  return (
    <div>
      <p className="text-sm font-medium leading-snug">{card.question}</p>
      {card.frontImages.length > 0 && (
        <div className="flex gap-1.5 mt-1.5 flex-wrap">
          {card.frontImages.map((img, i) => (
            <img key={i} src={`data:image/png;base64,${img}`} alt="" className="h-12 rounded border border-[var(--border)]" />
          ))}
        </div>
      )}

      <p className="text-sm text-[var(--text-muted)] mt-1.5 leading-snug">{card.answer}</p>
      {card.backImages.length > 0 && (
        <div className="flex gap-1.5 mt-1.5 flex-wrap">
          {card.backImages.map((img, i) => (
            <img key={i} src={`data:image/png;base64,${img}`} alt="" className="h-12 rounded border border-[var(--border)]" />
          ))}
        </div>
      )}

      <div className="flex items-center gap-2 mt-2">
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent-dim)] text-[var(--accent)]">{card.type}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg)] text-[var(--text-muted)]">{card.difficulty}</span>
        {card.sourceSection && (
          <span className="text-[10px] text-[var(--text-muted)]">📖 {card.sourceSection}</span>
        )}
        <button
          onClick={onToggleMode}
          className={`text-[10px] px-1.5 py-0.5 rounded ${
            card.cardMode === 'reverse'
              ? 'bg-[var(--success-dim)] text-[var(--success)]'
              : 'bg-[var(--bg)] text-[var(--text-muted)]'
          }`}
        >
          {card.cardMode === 'reverse' ? '↔ Réversible' : '→ Basique'}
        </button>
        <button onClick={onEdit} className="ml-auto text-[10px] text-[var(--text-muted)] hover:text-[var(--accent)]">
          Modifier
        </button>
      </div>
    </div>
  );
}

// ─── Mode édition ────────────────────────────────────────────

interface EditModeProps {
  card: Card;
  onUpdateField: (field: 'question' | 'answer', value: string) => void;
  onAddImage: (side: 'front' | 'back', base64: string) => void;
  onRemoveImage: (side: 'front' | 'back', index: number) => void;
  onDone: () => void;
}

function EditMode({ card, onUpdateField, onAddImage, onRemoveImage, onDone }: EditModeProps) {
  const handlePaste = useCallback((side: 'front' | 'back') => {
    return (e: React.ClipboardEvent) => {
      const items = Array.from(e.clipboardData.items);
      const imageItem = items.find((item) => item.type.startsWith('image/'));
      if (!imageItem) return;
      e.preventDefault();
      const file = imageItem.getAsFile();
      if (file) fileToBase64(file).then((b64) => onAddImage(side, b64));
    };
  }, [onAddImage]);

  return (
    <div className="space-y-3">
      <FieldEditor
        label="Question"
        value={card.question}
        images={card.frontImages}
        side="front"
        onChange={(val) => onUpdateField('question', val)}
        onAddImage={onAddImage}
        onRemoveImage={onRemoveImage}
        onPaste={handlePaste('front')}
      />
      <FieldEditor
        label="Réponse"
        value={card.answer}
        images={card.backImages}
        side="back"
        onChange={(val) => onUpdateField('answer', val)}
        onAddImage={onAddImage}
        onRemoveImage={onRemoveImage}
        onPaste={handlePaste('back')}
      />
      <button onClick={onDone} className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)]">
        ✓ Terminé
      </button>
    </div>
  );
}

// ─── Éditeur de champ ────────────────────────────────────────

interface FieldEditorProps {
  label: string;
  value: string;
  images: string[];
  side: 'front' | 'back';
  onChange: (val: string) => void;
  onAddImage: (side: 'front' | 'back', base64: string) => void;
  onRemoveImage: (side: 'front' | 'back', index: number) => void;
  onPaste: (e: React.ClipboardEvent) => void;
}

function FieldEditor({ label, value, images, side, onChange, onAddImage, onRemoveImage, onPaste }: FieldEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file) => {
      fileToBase64(file).then((b64) => onAddImage(side, b64));
    });
    e.target.value = '';
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[10px] text-[var(--text-muted)] uppercase tracking-wide">{label}</label>
        <span className="text-[10px] text-[var(--text-muted)]">Ctrl+V pour coller une image</span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={onPaste}
        rows={2}
        className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg p-2 text-sm resize-none focus:outline-none focus:border-[var(--accent)]"
      />
      {images.length > 0 && (
        <div className="flex gap-2 mt-2 flex-wrap">
          {images.map((img, i) => (
            <div key={i} className="relative group">
              <img src={`data:image/png;base64,${img}`} alt="" className="h-16 rounded border border-[var(--border)]" />
              <button
                onClick={() => onRemoveImage(side, i)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-[var(--danger)] text-white text-[10px] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        onClick={() => fileInputRef.current?.click()}
        className="mt-2 text-[11px] text-[var(--text-muted)] hover:text-[var(--accent)] flex items-center gap-1"
      >
        📷 Ajouter une image
      </button>
      <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileUpload} className="hidden" />
    </div>
  );
}

// ─── Utilitaire ──────────────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
