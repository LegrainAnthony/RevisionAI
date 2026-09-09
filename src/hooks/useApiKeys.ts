'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ProviderId } from '@/shared/types';
import { maskKey } from '@/shared/redact';
import { KEYS_KEY, migrateLegacyStorage, readJson, writeJson, type KeyStore } from '@/shared/storage';

export interface ApiKeyStatus {
  configured: boolean;
  /** Aperçu non réversible, du type `AIzaSyD…9f2c` */
  masked: string;
}

/**
 * Gestion des clés API, séparée des préférences.
 *
 * - une clé par fournisseur : changer de fournisseur ne fait plus perdre
 *   l'autre clé, ce que faisait l'ancien panneau de réglages ;
 * - la valeur complète n'est jamais rendue dans l'interface, seulement son
 *   aperçu masqué ;
 * - elle ne part vers le serveur que dans l'en-tête `X-Api-Key`.
 */
export function useApiKeys() {
  const [keys, setKeys] = useState<KeyStore>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    migrateLegacyStorage();
    setKeys(readJson<KeyStore>(KEYS_KEY) ?? {});
    setHydrated(true);
  }, []);

  const persist = useCallback((next: KeyStore) => {
    setKeys(next);
    writeJson(KEYS_KEY, next);
  }, []);

  const setKey = useCallback(
    (provider: ProviderId, value: string) => {
      const trimmed = value.trim();
      const next = { ...keys };
      if (trimmed) next[provider] = trimmed;
      else delete next[provider];
      persist(next);
    },
    [keys, persist]
  );

  const removeKey = useCallback(
    (provider: ProviderId) => {
      const next = { ...keys };
      delete next[provider];
      persist(next);
    },
    [keys, persist]
  );

  const getKey = useCallback((provider: ProviderId) => keys[provider] ?? '', [keys]);

  const status = useCallback(
    (provider: ProviderId): ApiKeyStatus => {
      const key = keys[provider] ?? '';
      return { configured: key.length > 0, masked: maskKey(key) };
    },
    [keys]
  );

  return { hydrated, getKey, setKey, removeKey, status };
}
