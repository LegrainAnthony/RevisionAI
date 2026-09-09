import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCardsPayload } from '@/engine/ai/cardSchema';

const one = '{"cards":[{"question":"Q","answer":"R","type":"definition","difficulty":"easy","sourceSection":"S"}]}';

test('lit un JSON propre', () => {
  const r = parseCardsPayload(one);
  assert.equal(r.cards.length, 1);
  assert.equal(r.warnings.length, 0);
});

test('supporte une réponse encadrée de balises markdown', () => {
  const r = parseCardsPayload('```json\n' + one + '\n```');
  assert.equal(r.cards.length, 1);
});

test('isole le JSON quand le modèle ajoute du texte autour', () => {
  const r = parseCardsPayload(`Voici vos cartes :\n${one}\nBonne révision !`);
  assert.equal(r.cards.length, 1);
  assert.equal(r.cards[0].question, 'Q');
});

test('accepte un tableau nu', () => {
  const r = parseCardsPayload('[{"question":"Q","answer":"R"}]');
  assert.equal(r.cards.length, 1);
});

test('remplace un type ou une difficulté hors référentiel', () => {
  const r = parseCardsPayload(
    '{"cards":[{"question":"Q","answer":"R","type":"basic","difficulty":"trivial","sourceSection":""}]}'
  );
  assert.equal(r.cards[0].type, 'definition');
  assert.equal(r.cards[0].difficulty, 'medium');
});

test('écarte les cartes sans réponse en le signalant', () => {
  const r = parseCardsPayload('{"cards":[{"question":"Q","answer":""},{"question":"Q2","answer":"R"}]}');
  assert.equal(r.cards.length, 1);
  assert.match(r.warnings.join(' '), /écartée/);
});

test('signale une réponse qui n’est pas du JSON', () => {
  const r = parseCardsPayload('Je ne peux pas traiter ces pages.');
  assert.equal(r.cards.length, 0);
  assert.equal(r.warnings.length, 1);
});
