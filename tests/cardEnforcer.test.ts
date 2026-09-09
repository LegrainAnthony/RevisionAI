import { test } from 'node:test';
import assert from 'node:assert/strict';
import { enforceCards, normalizeQuestion, toCards } from '@/engine/generation/cardEnforcer';
import type { RawCard } from '@/engine/ai/cardSchema';

function card(question: string, answer = 'réponse'): RawCard {
  return { question, answer, type: 'definition', difficulty: 'medium', sourceSection: 'Section' };
}

test('tronque le surplus au nombre demandé', () => {
  const r = enforceCards([card('a'), card('b'), card('c'), card('d')], 2);
  assert.equal(r.cards.length, 2);
  assert.equal(r.truncated, 2);
  assert.equal(r.missing, 0);
  assert.match(r.warnings.join(' '), /en trop/);
});

test('signale le manque sans inventer de carte', () => {
  const r = enforceCards([card('a'), card('b')], 5);
  assert.equal(r.cards.length, 2);
  assert.equal(r.missing, 3);
});

test('déduplique en ignorant casse, accents et ponctuation', () => {
  const r = enforceCards(
    [card("Qu'est-ce que l'élévation ?"), card('QU EST CE QUE L ELEVATION')],
    5
  );
  assert.equal(r.cards.length, 1);
  assert.equal(r.duplicatesDropped, 1);
  assert.equal(r.missing, 4);
});

test('écarte une question vide', () => {
  const r = enforceCards([card('   '), card('valide')], 2);
  assert.deepEqual(r.cards.map((c) => c.question), ['valide']);
});

test('normalizeQuestion rend comparables deux formulations identiques', () => {
  assert.equal(normalizeQuestion('Rôle du muscle ?'), normalizeQuestion('role du muscle'));
  assert.notEqual(normalizeQuestion('Rôle du muscle'), normalizeQuestion('Rôle du tendon'));
});

test('toCards attribue les pages sources et des identifiants uniques', () => {
  const cards = toCards([card('a'), card('b')], [3, 4]);
  assert.deepEqual(cards[0].sourcePages, [3, 4]);
  assert.equal(cards[0].selected, true);
  assert.equal(cards[0].cardMode, 'basic');
  assert.notEqual(cards[0].id, cards[1].id);
});
