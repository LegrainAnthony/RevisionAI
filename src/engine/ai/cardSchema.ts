import { CARD_TYPES, DIFFICULTIES, type CardType, type Difficulty } from '@/shared/types';

/**
 * Contrat de sortie du modèle.
 *
 * Il est déclaré à TROIS endroits qui doivent rester cohérents :
 *   1. le schéma natif du fournisseur (sortie structurée) ;
 *   2. une description lisible insérée dans le prompt ;
 *   3. la validation du JSON reçu.
 *
 * Tout est dérivé des constantes de ce fichier, donc les trois ne peuvent
 * plus diverger — c'était le cas avant, où le prompt annonçait
 * `"type": "basic"`, une valeur qui n'existe pas dans `CardType`.
 */

export interface RawCard {
  question: string;
  answer: string;
  type: CardType;
  difficulty: Difficulty;
  sourceSection: string;
}

const FIELD_DOCS: Record<keyof RawCard, string> = {
  question: "la question posée à l'étudiant",
  answer: 'la réponse attendue, complète mais sans délayage',
  type: `le type de carte, parmi : ${CARD_TYPES.join(', ')}`,
  difficulty: `le niveau, parmi : ${DIFFICULTIES.join(', ')}`,
  sourceSection: 'le titre, le thème ou la section du cours dont la carte est issue',
};

// ─── Schéma natif Gemini (sous-ensemble OpenAPI) ─────────────

export const GEMINI_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    cards: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          question: { type: 'STRING' },
          answer: { type: 'STRING' },
          type: { type: 'STRING', enum: CARD_TYPES },
          difficulty: { type: 'STRING', enum: DIFFICULTIES },
          sourceSection: { type: 'STRING' },
        },
        required: ['question', 'answer', 'type', 'difficulty', 'sourceSection'],
        propertyOrdering: ['question', 'answer', 'type', 'difficulty', 'sourceSection'],
      },
    },
  },
  required: ['cards'],
} as const;

// ─── Schéma natif OpenAI (json_schema strict) ────────────────

export const OPENAI_JSON_SCHEMA = {
  name: 'anki_cards',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      cards: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            question: { type: 'string' },
            answer: { type: 'string' },
            type: { type: 'string', enum: CARD_TYPES },
            difficulty: { type: 'string', enum: DIFFICULTIES },
            sourceSection: { type: 'string' },
          },
          required: ['question', 'answer', 'type', 'difficulty', 'sourceSection'],
          additionalProperties: false,
        },
      },
    },
    required: ['cards'],
    additionalProperties: false,
  },
} as const;

// ─── Description lisible, insérée dans le prompt ─────────────

export function schemaForPrompt(): string {
  const fields = (Object.keys(FIELD_DOCS) as (keyof RawCard)[])
    .map((k) => `  · "${k}" — ${FIELD_DOCS[k]}`)
    .join('\n');

  return [
    'Réponds par un objet JSON de cette forme exacte :',
    '{ "cards": [ { "question": "…", "answer": "…", "type": "…", "difficulty": "…", "sourceSection": "…" } ] }',
    '',
    'Champs :',
    fields,
  ].join('\n');
}

// ─── Lecture et validation de la réponse ─────────────────────

export interface ParseResult {
  cards: RawCard[];
  warnings: string[];
}

/**
 * Lit la réponse du modèle de façon défensive.
 *
 * Même avec une sortie structurée, un modèle peut encadrer son JSON de
 * balises markdown ou renvoyer un tableau nu. On récupère ce qui est
 * récupérable, et on signale ce qui a été écarté plutôt que de renvoyer
 * un tableau vide en silence.
 */
export function parseCardsPayload(text: string): ParseResult {
  const warnings: string[] = [];
  const data = extractJson(text);

  if (data === null) {
    return { cards: [], warnings: ['La réponse du modèle n’était pas du JSON exploitable.'] };
  }

  const list = Array.isArray(data)
    ? data
    : Array.isArray((data as Record<string, unknown>).cards)
      ? ((data as Record<string, unknown>).cards as unknown[])
      : null;

  if (list === null) {
    return { cards: [], warnings: ['La réponse du modèle ne contenait aucun tableau de cartes.'] };
  }

  const cards: RawCard[] = [];
  let dropped = 0;

  for (const item of list) {
    const card = coerceCard(item);
    if (card) cards.push(card);
    else dropped++;
  }

  if (dropped > 0) {
    warnings.push(`${dropped} carte(s) écartée(s) : question ou réponse vide.`);
  }

  return { cards, warnings };
}

/** Une carte n'est retenue que si elle a une question ET une réponse. */
function coerceCard(item: unknown): RawCard | null {
  if (!item || typeof item !== 'object') return null;
  const o = item as Record<string, unknown>;

  const question = str(o.question);
  const answer = str(o.answer);
  if (!question || !answer) return null;

  const type = CARD_TYPES.includes(o.type as CardType) ? (o.type as CardType) : 'definition';
  const difficulty = DIFFICULTIES.includes(o.difficulty as Difficulty)
    ? (o.difficulty as Difficulty)
    : 'medium';

  return { question, answer, type, difficulty, sourceSection: str(o.sourceSection) };
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/** Retire les clôtures markdown puis isole le premier bloc JSON équilibré. */
function extractJson(text: string): unknown {
  const cleaned = (text || '')
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();

  if (!cleaned) return null;

  try {
    return JSON.parse(cleaned);
  } catch {
    // Le modèle a peut-être ajouté du texte autour du JSON.
  }

  const start = cleaned.search(/[{[]/);
  if (start === -1) return null;

  const open = cleaned[start];
  const close = open === '{' ? '}' : ']';
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < cleaned.length; i++) {
    const c = cleaned[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (c === '\\') escaped = true;
      else if (c === '"') inString = false;
      continue;
    }

    if (c === '"') inString = true;
    else if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(cleaned.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}
