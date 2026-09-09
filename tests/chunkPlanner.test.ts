import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planChunks, planWindows, totalCards, totalPages } from '@/engine/generation/chunkPlanner';
import type { ChunkPlanInput } from '@/engine/generation/chunkPlanner';

function input(over: Partial<ChunkPlanInput> = {}): ChunkPlanInput {
  return {
    pageCount: 6,
    selected: new Array(6).fill(true),
    pagesPerChunk: 2,
    defaultCardCount: 5,
    cardOverrides: {},
    instructions: {},
    ...over,
  };
}

test('découpe le document en fenêtres fixes', () => {
  const chunks = planChunks(input());
  assert.deepEqual(
    chunks.map((c) => c.pageNumbers),
    [[1, 2], [3, 4], [5, 6]]
  );
  assert.deepEqual(chunks.map((c) => c.index), [0, 1, 2]);
});

test('une page désélectionnée ne décale pas les chunks suivants', () => {
  // Le cas exact que l'ancienne implémentation cassait : la consigne du
  // chunk 1 partait sur une page appartenant au chunk 2.
  const selected = [true, false, true, true, true, true]; // page 2 décochée
  const chunks = planChunks(
    input({
      selected,
      instructions: { 0: 'définitions', 1: 'dates', 2: 'liens entre notions' },
    })
  );

  assert.deepEqual(
    chunks.map((c) => [c.index, c.pageNumbers, c.instructions]),
    [
      [0, [1], 'définitions'],
      [1, [3, 4], 'dates'],
      [2, [5, 6], 'liens entre notions'],
    ]
  );
});

test('une consigne n’apparaît que dans son propre chunk', () => {
  const chunks = planChunks(input({ instructions: { 1: 'uniquement les dates' } }));
  const carrying = chunks.filter((c) => c.instructions !== '');
  assert.equal(carrying.length, 1);
  assert.equal(carrying[0].index, 1);
  assert.deepEqual(carrying[0].pageNumbers, [3, 4]);
});

test('une fenêtre entièrement désélectionnée est ignorée sans renuméroter', () => {
  const selected = [true, true, false, false, true, true]; // fenêtre 1 vide
  const chunks = planChunks(input({ selected, instructions: { 2: 'chunk trois' } }));

  assert.deepEqual(chunks.map((c) => c.index), [0, 2]);
  assert.equal(chunks[1].instructions, 'chunk trois');
  assert.deepEqual(chunks[1].pageNumbers, [5, 6]);
});

test('la dernière fenêtre peut être incomplète', () => {
  const chunks = planChunks(input({ pageCount: 5, selected: new Array(5).fill(true) }));
  assert.deepEqual(
    chunks.map((c) => c.pageNumbers),
    [[1, 2], [3, 4], [5]]
  );
});

test('les surcharges de cartes suivent l’index de fenêtre et sont bornées', () => {
  const chunks = planChunks(input({ cardOverrides: { 1: 12, 2: 999 } }));
  assert.deepEqual(chunks.map((c) => c.cardCount), [5, 12, 20]);
});

test('planWindows expose aussi les fenêtres vides pour l’affichage', () => {
  const selected = [true, true, false, false, true, true];
  const windows = planWindows(input({ selected }));

  assert.equal(windows.length, 3);
  assert.deepEqual(windows[1].allPageNumbers, [3, 4]);
  assert.deepEqual(windows[1].pageNumbers, []);
});

test('les totaux ne comptent que ce qui sera envoyé', () => {
  const selected = [true, false, false, false, true, true];
  const chunks = planChunks(input({ selected, cardOverrides: { 2: 3 } }));

  assert.equal(totalPages(chunks), 3);
  assert.equal(totalCards(chunks), 5 + 3);
});
