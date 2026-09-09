import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrateSettings } from '@/hooks/useSettings';
import { DEFAULT_SETTINGS } from '@/shared/types';

test('migre des réglages v1 sans rien perdre', () => {
  const v1 = {
    provider: 'openai',
    apiKey: 'sk-secret-value-1234567890',
    model: 'gpt-4o',
    pagesPerBatch: 3,
    cardsPerChunk: 7,
    activeProfileId: 'kine',
    customProfiles: [{ id: 'custom-1', name: 'Droit', context: 'c', rules: 'r', recommendations: '', forbidden: '' }],
    exportTags: true,
  };

  const s = migrateSettings(v1);

  assert.equal(s.version, 2);
  assert.equal(s.provider, 'openai');
  // gpt-4o a été retiré du catalogue : la migration doit basculer sur le recommandé
  assert.equal(s.models.openai, 'gpt-5.6-luna');
  assert.equal(s.pagesPerChunk, 3, 'pagesPerBatch renommé en pagesPerChunk');
  assert.equal(s.cardsPerChunk, 7);
  assert.equal(s.activeProfileId, 'kine');
  assert.equal(s.exportTags, true);
  assert.equal(s.customProfiles[0].name, 'Droit');
  assert.equal(s.customProfiles[0].builtin, false, 'les champs manquants sont complétés');
  assert.equal('apiKey' in s, false, 'la clé ne fait plus partie des réglages');
});

test('remplace un modèle retiré par le fournisseur', () => {
  const s = migrateSettings({ provider: 'gemini', model: 'gemini-1.5-flash' });
  assert.equal(s.models.gemini, 'gemini-2.5-flash');
});

test('borne les valeurs numériques aberrantes', () => {
  const s = migrateSettings({ pagesPerChunk: 99, cardsPerChunk: -4, concurrency: 100 });
  assert.equal(s.pagesPerChunk, 8);
  assert.equal(s.cardsPerChunk, 1);
  assert.equal(s.concurrency, 6);
});

test('ignore un profil personnalisé malformé', () => {
  const s = migrateSettings({ customProfiles: [{ name: 'sans id' }, null, 'texte'] });
  assert.deepEqual(s.customProfiles, []);
});

test('retombe sur les valeurs par défaut face à n’importe quoi', () => {
  assert.deepEqual(migrateSettings(null), DEFAULT_SETTINGS);
  assert.deepEqual(migrateSettings('cassé'), DEFAULT_SETTINGS);
});
