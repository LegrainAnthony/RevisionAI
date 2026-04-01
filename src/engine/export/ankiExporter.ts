import { Card } from '@/shared/types';

/**
 * Génère un fichier texte tab-separated importable dans Anki.
 *
 * Format : question \t réponse \t tags
 * Les images sont embarquées en base64 dans le HTML (<img src="data:...">).
 * Anki affiche les images directement dans les cartes.
 *
 * Import dans Anki :
 *   Fichier → Importer → sélectionner le .txt
 *   Cocher "Autoriser le HTML dans les champs"
 */
export function exportToAnkiTxt(cards: Card[]): string {
  const lines: string[] = [];

  lines.push('#separator:tab');
  lines.push('#html:true');
  lines.push('#columns:Front\tBack\tTags');
  lines.push('#deck:AnkiDocs');

for (const card of cards) {
  const front = escapeField(formatFront(card));
  const back = escapeField(formatBack(card));
  const tags = buildTags(card);

  // Carte normale : question → réponse
  lines.push(`${front}\t${back}\t${tags}`);

  // Si réversible : ajouter une carte inversée (réponse → question)
  if (card.cardMode === 'reverse') {
    lines.push(`${back}\t${front}\t${tags}`);
  }
}

  return lines.join('\n');
}

/**
 * Formate le recto (question + images front).
 */
function formatFront(card: Card): string {
  let html = card.question;

  if (card.frontImages && card.frontImages.length > 0) {
    html += '<br>';
    for (const img of card.frontImages) {
      html += `<br><img src="data:image/png;base64,${img}" style="max-width:100%">`;
    }
  }

  return html;
}

/**
 * Formate le verso (réponse + images back + métadonnées).
 */
function formatBack(card: Card): string {
  let html = card.answer;

  if (card.backImages && card.backImages.length > 0) {
    html += '<br>';
    for (const img of card.backImages) {
      html += `<br><img src="data:image/png;base64,${img}" style="max-width:100%">`;
    }
  }

  if (card.sourceSection) {
    html += `<br><br><small>${card.sourceSection}</small>`;
  }

  return html;
}

function buildTags(card: Card): string {
  const tags: string[] = [];
  if (card.type) tags.push(card.type);
  if (card.difficulty) tags.push(card.difficulty);
  if (card.sourceSection) {
    tags.push(card.sourceSection.replace(/\s+/g, '_').replace(/[^\w\-_àâéèêëïîôùûüç]/gi, ''));
  }
  return tags.join(' ');
}

function escapeField(text: string): string {
  return text
    .replace(/\t/g, '    ')
    .replace(/\n/g, '<br>')
    .replace(/\r/g, '');
}