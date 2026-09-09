import type { ImageDetail, ProviderId } from './types';

/**
 * Catalogue unique des modèles.
 *
 * Les tarifs sont en USD par million de tokens (relevés en août 2026 sur
 * developers.openai.com/api/docs/pricing — ils changent régulièrement).
 *
 * Les scores et coûts par page cités dans les descriptions viennent d'un
 * banc d'essai réel sur une slide de cours dense (773×1000 px, 11 valeurs
 * précises à relever : amplitudes, innervations, seuils cliniques).
 */

export type { ImageDetail };

export interface ModelInfo {
  id: string;
  label: string;
  description: string;
  pricing: { inputPerM: number; outputPerM: number };
  recommended?: boolean;
  /**
   * false = modèle de raisonnement. Ces modèles REFUSENT `temperature`
   * (400 « Only the default (1) value is supported ») et prennent
   * `reasoning_effort` à la place.
   */
  supportsTemperature: boolean;
  /** Niveau de détail d'image le plus élevé réellement exploité */
  maxImageDetail: ImageDetail;
  /**
   * Facteur de tokens par image relatif à la normale.
   * La famille 4o utilise un tokeniseur d'images bien plus coûteux :
   * 25 696 tokens pour la même page où les autres en consomment 1 151.
   */
  imageTokenFactor: number;
}

export const PROVIDER_LABELS: Record<ProviderId, string> = {
  gemini: 'Gemini (Google)',
  openai: 'OpenAI (ChatGPT)',
};

export const MODELS: Record<ProviderId, ModelInfo[]> = {
  openai: [
    {
      id: 'gpt-5.6-luna',
      label: 'GPT-5.6 Luna',
      description:
        'Le meilleur rapport qualité/prix de loin : 11/11 sur notre page de test, environ $0,0006 par page, et le seul modèle bon marché à lire les images en résolution d’origine — décisif pour les annotations manuscrites.',
      pricing: { inputPerM: 0.20, outputPerM: 1.20 },
      recommended: true,
      supportsTemperature: false,
      maxImageDetail: 'original',
      imageTokenFactor: 1,
    },
    {
      id: 'gpt-5.6-terra',
      label: 'GPT-5.6 Terra',
      description:
        'Même score parfait que Luna mais raisonne davantage. À réserver aux pages vraiment difficiles : schémas denses, écriture peu lisible. Environ dix fois le prix de Luna.',
      pricing: { inputPerM: 2.00, outputPerM: 12.00 },
      supportsTemperature: false,
      maxImageDetail: 'original',
      imageTokenFactor: 1,
    },
    {
      id: 'gpt-4.1-mini',
      label: 'GPT-4.1 mini',
      description:
        'Sans phase de raisonnement : latence stable et prévisible. 10/11 sur la page de test, environ $0,0008 par page. Une bonne alternative si Luna vous paraît trop lent.',
      pricing: { inputPerM: 0.40, outputPerM: 1.60 },
      supportsTemperature: true,
      maxImageDetail: 'high',
      imageTokenFactor: 1,
    },
    {
      id: 'gpt-5-nano',
      label: 'GPT-5 nano',
      description:
        'Le tarif le plus bas du catalogue, mais nettement plus lent (environ 11 s par page) et 10/11 sur la page de test. À réserver aux cours très simples.',
      pricing: { inputPerM: 0.05, outputPerM: 0.40 },
      supportsTemperature: false,
      maxImageDetail: 'high',
      imageTokenFactor: 1,
    },
    {
      id: 'gpt-4o-mini',
      label: 'GPT-4o mini — déconseillé',
      description:
        'Son tarif au token est trompeur : il consomme 22 fois plus de tokens par image que les autres, ce qui en fait l’un des plus chers par page (~$0,0039), pour un score inférieur. Conservé uniquement pour compatibilité.',
      pricing: { inputPerM: 0.15, outputPerM: 0.60 },
      supportsTemperature: true,
      maxImageDetail: 'high',
      imageTokenFactor: 22,
    },
  ],
  gemini: [
    {
      id: 'gemini-2.5-flash',
      label: 'Gemini 2.5 Flash',
      description: 'Rapide et économique. Bon compromis pour des slides de cours.',
      pricing: { inputPerM: 0.30, outputPerM: 2.50 },
      recommended: true,
      supportsTemperature: true,
      maxImageDetail: 'high',
      imageTokenFactor: 1,
    },
    {
      id: 'gemini-2.5-pro',
      label: 'Gemini 2.5 Pro',
      description: 'Le plus précis de la gamme sur les schémas denses. Plus lent et plus cher.',
      pricing: { inputPerM: 1.25, outputPerM: 10.00 },
      supportsTemperature: true,
      maxImageDetail: 'high',
      imageTokenFactor: 1,
    },
    {
      id: 'gemini-2.5-flash-lite',
      label: 'Gemini 2.5 Flash Lite',
      description: 'Le moins cher. Suffisant pour du texte simple, moins fiable sur les figures.',
      pricing: { inputPerM: 0.10, outputPerM: 0.40 },
      supportsTemperature: true,
      maxImageDetail: 'high',
      imageTokenFactor: 1,
    },
    {
      id: 'gemini-2.0-flash',
      label: 'Gemini 2.0 Flash',
      description: 'Génération précédente, toujours disponible et bon marché.',
      pricing: { inputPerM: 0.10, outputPerM: 0.40 },
      supportsTemperature: true,
      maxImageDetail: 'high',
      imageTokenFactor: 1,
    },
  ],
};

export function getModels(provider: ProviderId): ModelInfo[] {
  return MODELS[provider] ?? MODELS.gemini;
}

export function defaultModelId(provider: ProviderId): string {
  const list = getModels(provider);
  return (list.find((m) => m.recommended) ?? list[0]).id;
}

export function findModel(provider: ProviderId, modelId: string): ModelInfo | undefined {
  return getModels(provider).find((m) => m.id === modelId);
}

/**
 * Renvoie un identifiant utilisable. Un modèle inconnu — retiré par le
 * fournisseur, ou réglage devenu obsolète — retombe sur le recommandé.
 */
export function resolveModelId(provider: ProviderId, modelId?: string): string {
  if (modelId && findModel(provider, modelId)) return modelId;
  return defaultModelId(provider);
}

export function modelLabel(provider: ProviderId, modelId: string): string {
  return findModel(provider, modelId)?.label ?? modelId;
}

/**
 * Ramène le niveau de détail demandé à ce que le modèle exploite vraiment.
 * L'API accepte `original` en silence sur des modèles qui l'ignorent : sans
 * ce garde-fou, l'interface promettrait une précision inexistante.
 */
export function resolveImageDetail(
  provider: ProviderId,
  modelId: string,
  requested: ImageDetail
): ImageDetail {
  if (requested !== 'original') return requested;
  return findModel(provider, modelId)?.maxImageDetail === 'original' ? 'original' : 'high';
}

/** Ce modèle refuse-t-il `temperature` ? */
export function isReasoningModel(provider: ProviderId, modelId: string): boolean {
  return findModel(provider, modelId)?.supportsTemperature === false;
}

// ─── Coûts ────────────────────────────────────────────────────

/** Coût réel, à partir des tokens effectivement consommés. */
export function estimateCost(
  inputTokens: number,
  outputTokens: number,
  provider: ProviderId,
  modelId: string
): number {
  const model = findModel(provider, modelId) ?? getModels(provider)[0];
  const { inputPerM, outputPerM } = model.pricing;
  return (inputTokens / 1_000_000) * inputPerM + (outputTokens / 1_000_000) * outputPerM;
}

/** Tokens consommés par page image, mesurés sur une slide de 773×1000 px. */
const TOKENS_PER_IMAGE: Record<ImageDetail, number> = { low: 300, high: 1150, original: 1500 };
/** Tokens produits par carte générée. */
const TOKENS_PER_CARD = 160;
/** Tokens du prompt système, facturés à chaque appel. */
const TOKENS_PER_CALL = 800;

/**
 * Coût prévisionnel affiché avant génération.
 * Volontairement approximatif : le coût réel est recalculé sur les tokens
 * renvoyés par le fournisseur.
 */
export function estimatePlanCost(input: {
  pageCount: number;
  cardCount: number;
  callCount: number;
  provider: ProviderId;
  modelId: string;
  imageDetail: ImageDetail;
}): number {
  const { pageCount, cardCount, callCount, provider, modelId, imageDetail } = input;
  const model = findModel(provider, modelId);
  const detail = resolveImageDetail(provider, modelId, imageDetail);

  const perImage = TOKENS_PER_IMAGE[detail] * (model?.imageTokenFactor ?? 1);
  const inputTokens = pageCount * perImage + callCount * TOKENS_PER_CALL;
  const outputTokens = cardCount * TOKENS_PER_CARD;

  return estimateCost(inputTokens, outputTokens, provider, modelId);
}
