/**
 * Rédaction des secrets.
 *
 * Toute valeur qui part dans un log serveur ou dans une réponse d'erreur
 * DOIT passer par `redactSecrets()`. Les fournisseurs renvoient volontiers
 * l'URL ou une partie de la requête dans leurs messages d'erreur : sans ce
 * filet, une clé API se retrouve dans la console puis dans le navigateur.
 */

const SECRET_PATTERNS: RegExp[] = [
  // Clés Google / Gemini
  /AIza[0-9A-Za-z_-]{10,}/g,
  // Clés OpenAI (sk-, sk-proj-, sk-svcacct-…)
  /sk-[A-Za-z0-9_-]{10,}/g,
  // Clé passée en paramètre d'URL
  /([?&]key=)[^&\s"'`]+/gi,
  // En-têtes d'authentification
  /(authorization\s*:\s*bearer\s+)\S+/gi,
  /(bearer\s+)[A-Za-z0-9._-]{10,}/gi,
  /(x-goog-api-key\s*[:=]\s*)\S+/gi,
  /(x-api-key\s*[:=]\s*)\S+/gi,
];

const PLACEHOLDER = '[clé masquée]';

/**
 * Remplace toute trace de secret par un marqueur.
 * Accepte n'importe quelle valeur : Error, objet, chaîne…
 */
export function redactSecrets(input: unknown): string {
  let text: string;

  if (input instanceof Error) {
    text = input.message;
  } else if (typeof input === 'string') {
    text = input;
  } else {
    try {
      text = JSON.stringify(input);
    } catch {
      text = String(input);
    }
  }

  for (const pattern of SECRET_PATTERNS) {
    text = text.replace(pattern, (match, prefix?: string) =>
      prefix ? `${prefix}${PLACEHOLDER}` : PLACEHOLDER
    );
  }

  return text;
}

/**
 * Affichage d'une clé sans la révéler : `AIzaSyD…9f2c`.
 * Utilisé par l'UI pour confirmer qu'une clé est bien enregistrée.
 */
export function maskKey(key: string): string {
  const trimmed = (key || '').trim();
  if (!trimmed) return '';
  if (trimmed.length <= 12) return '•'.repeat(8);
  return `${trimmed.slice(0, 6)}…${trimmed.slice(-4)}`;
}
