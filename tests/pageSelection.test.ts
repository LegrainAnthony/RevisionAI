import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extendSelection } from '@/engine/generation/pageSelection';

const all = (n: number, v = true) => new Array<boolean>(n).fill(v);

test('décoche toute la plage, bornes incluses, vers l’avant', () => {
  const r = extendSelection(all(8), { from: 2, to: 2, value: false }, 5);
  assert.deepEqual(r, [true, true, false, false, false, false, true, true]);
});

test('fonctionne aussi vers l’arrière', () => {
  const r = extendSelection(all(6), { from: 4, to: 4, value: false }, 1);
  assert.deepEqual(r, [true, false, false, false, false, true]);
});

test('recoche une plage dans le sens de l’ancre', () => {
  const r = extendSelection(all(5, false), { from: 1, to: 1, value: true }, 3);
  assert.deepEqual(r, [false, true, true, true, false]);
});

test('ne touche pas aux pages hors plage', () => {
  const start = [false, true, true, true, false, true];
  const r = extendSelection(start, { from: 2, to: 2, value: false }, 3);
  assert.deepEqual(r, [false, true, false, false, false, true]);
});

test('une ancre de chunk couvre tout le chunk et la cible', () => {
  // ancre = chunk pages 3–5 (0-based 2..4), cible = chunk 8–9 (7..8)
  const r = extendSelection(all(10), { from: 2, to: 4, value: false }, 7, 8);
  assert.deepEqual(r, [true, true, false, false, false, false, false, false, false, true]);
});

test('cible avant une ancre de chunk : la plage inclut tout le chunk d’ancrage', () => {
  const r = extendSelection(all(8), { from: 4, to: 6, value: false }, 1);
  assert.deepEqual(r, [true, false, false, false, false, false, false, true]);
});

test('borne la plage à la longueur du document', () => {
  const r = extendSelection(all(3), { from: 1, to: 1, value: false }, 9);
  assert.deepEqual(r, [true, false, false]);
});
