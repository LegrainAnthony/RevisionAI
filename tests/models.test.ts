import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultModelId,
  estimatePlanCost,
  findModel,
  getModels,
  isReasoningModel,
  resolveImageDetail,
  resolveModelId,
} from '@/shared/models';

test('chaque fournisseur a exactement un modèle recommandé', () => {
  for (const provider of ['openai', 'gemini'] as const) {
    const recommended = getModels(provider).filter((m) => m.recommended);
    assert.equal(recommended.length, 1, `${provider} : ${recommended.length} recommandé(s)`);
  }
});

test('les modèles de raisonnement sont identifiés — ils refusent temperature', () => {
  // Envoyer `temperature` à ces modèles provoque une 400 côté OpenAI.
  assert.equal(isReasoningModel('openai', 'gpt-5.6-luna'), true);
  assert.equal(isReasoningModel('openai', 'gpt-5.6-terra'), true);
  assert.equal(isReasoningModel('openai', 'gpt-5-nano'), true);
  assert.equal(isReasoningModel('openai', 'gpt-4.1-mini'), false);
  assert.equal(isReasoningModel('openai', 'gpt-4o-mini'), false);
});

test('la résolution d’origine est ramenée à « high » sur les modèles qui l’ignorent', () => {
  assert.equal(resolveImageDetail('openai', 'gpt-5.6-luna', 'original'), 'original');
  assert.equal(resolveImageDetail('openai', 'gpt-4.1-mini', 'original'), 'high');
  assert.equal(resolveImageDetail('openai', 'gpt-4.1-mini', 'low'), 'low');
});

test('un modèle retiré retombe sur le recommandé', () => {
  assert.equal(resolveModelId('openai', 'gpt-4o'), defaultModelId('openai'));
  assert.equal(resolveModelId('gemini', 'gemini-1.5-pro'), 'gemini-2.5-flash');
  assert.equal(resolveModelId('openai', 'gpt-5.6-luna'), 'gpt-5.6-luna');
});

test('le surcoût en tokens image de la famille 4o est pris en compte', () => {
  // Mesuré : 25 696 tokens pour la page où les autres en consomment 1 151.
  const plan = { pageCount: 10, cardCount: 50, callCount: 10, imageDetail: 'high' as const, provider: 'openai' as const };
  const luna = estimatePlanCost({ ...plan, modelId: 'gpt-5.6-luna' });
  const mini4o = estimatePlanCost({ ...plan, modelId: 'gpt-4o-mini' });

  assert.ok(mini4o > luna * 3, `gpt-4o-mini devrait ressortir bien plus cher (luna=${luna}, 4o-mini=${mini4o})`);
  assert.equal(findModel('openai', 'gpt-4o-mini')?.imageTokenFactor, 22);
});
