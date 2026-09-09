import type { ProviderId } from './types';

/**
 * Accès au `localStorage`, tolérant au rendu serveur et aux navigateurs
 * qui refusent le stockage (navigation privée, quota dépassé).
 */

export const SETTINGS_KEY = 'ankidocs_settings';
/** Les clés API vivent à part : jamais dans le même objet que les réglages. */
export const KEYS_KEY = 'ankidocs_keys';

export type KeyStore = Partial<Record<ProviderId, string>>;

export function readJson<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeJson(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Stockage indisponible : la session reste utilisable, sans persistance.
  }
}

export function removeItem(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignoré
  }
}

/**
 * Sort la clé API de l'ancien objet de réglages (v1) vers son store dédié,
 * puis l'efface de l'ancien emplacement.
 *
 * Idempotent : les deux hooks l'appellent, l'ordre n'a pas d'importance.
 */
export function migrateLegacyStorage(): void {
  if (typeof window === 'undefined') return;

  const settings = readJson<Record<string, unknown>>(SETTINGS_KEY);
  if (!settings || !('apiKey' in settings)) return;

  const legacyKey = typeof settings.apiKey === 'string' ? settings.apiKey.trim() : '';

  if (legacyKey) {
    const provider: ProviderId = settings.provider === 'openai' ? 'openai' : 'gemini';
    const keys = readJson<KeyStore>(KEYS_KEY) ?? {};
    if (!keys[provider]) {
      keys[provider] = legacyKey;
      writeJson(KEYS_KEY, keys);
    }
  }

  delete settings.apiKey;
  writeJson(SETTINGS_KEY, settings);
}
