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
export function exportToAnkiTxt(cards: Card[], deckName: string, includeTags = false): string {
  const lines: string[] = [];

  lines.push('#separator:tab');
  lines.push('#html:true');
  lines.push(includeTags ? '#columns:Front\tBack\tTags' : '#columns:Front\tBack');
  lines.push(`#deck:${deckName}`);

for (const card of cards) {
  const front = escapeField(formatFront(card));
  const back = escapeField(formatBack(card));

  if (includeTags) {
    const tags = buildTags(card);
    lines.push(`${front}\t${back}\t${tags}`);
    if (card.cardMode === 'reverse') lines.push(`${back}\t${front}\t${tags}`);
  } else {
    lines.push(`${front}\t${back}`);
    if (card.cardMode === 'reverse') lines.push(`${back}\t${front}`);
  }
}

  return lines.join('\n');
}

/**
 * Convertit les listes markdown (-, *, •, 1.) en <ul><li> HTML.
 * Les blocs non-liste sont laissés intacts (les \n seront traités par escapeField).
 */
function renderLists(text: string): string {
  const lines = text.split('\n');
  let result = '';
  let inList = false;

  for (const raw of lines) {
    const line = raw.trimEnd();
    const bulletMatch = line.match(/^[-*•]\s+(.+)/);
    const numberedMatch = line.match(/^\d+[.)]\s+(.+)/);
    const content = bulletMatch?.[1] ?? numberedMatch?.[1];

    if (content !== undefined) {
      if (!inList) {
        result += '<ul style="margin:4px 0;padding-left:20px;text-align:left;">';
        inList = true;
      }
      result += `<li>${content}</li>`;
    } else {
      if (inList) {
        result += '</ul>';
        inList = false;
      }
      result += (result ? '\n' : '') + line;
    }
  }

  if (inList) result += '</ul>';
  return result;
}

/**
 * Formate le recto (question + images front).
 */
function formatFront(card: Card): string {
  let html = renderLists(card.question);

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
  let html = renderLists(card.answer);

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