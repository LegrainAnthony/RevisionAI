/**
 * Sélection par plage (Maj+clic), comme dans un explorateur de fichiers.
 *
 * L'ancre est la dernière action « simple » : une page (`[i, i]`) ou un chunk
 * entier (`[première, dernière]`), avec l'état qu'elle a appliqué. Un Maj+clic
 * étend cette action à toute la plage qui va de l'ancre à la cible, bornes
 * incluses : on coche ou on décoche d'un coup, dans le même sens que l'ancre.
 *
 * Tout est en index de page 0-based, donc indépendant du découpage en chunks :
 * une plage peut traverser plusieurs chunks.
 */

export interface SelectionAnchor {
  /** Première page couverte par l'action d'ancrage (0-based, inclusive) */
  from: number;
  /** Dernière page couverte (0-based, inclusive) */
  to: number;
  /** État appliqué par l'action d'ancrage, propagé à la plage */
  value: boolean;
}

/**
 * Applique `anchor.value` à toutes les pages entre l'ancre et la cible
 * `[targetFrom, targetTo]`. Les autres pages ne bougent pas.
 */
export function extendSelection(
  selected: boolean[],
  anchor: SelectionAnchor,
  targetFrom: number,
  targetTo: number = targetFrom
): boolean[] {
  const lo = Math.max(0, Math.min(anchor.from, anchor.to, targetFrom, targetTo));
  const hi = Math.min(selected.length - 1, Math.max(anchor.from, anchor.to, targetFrom, targetTo));
  return selected.map((v, i) => (i >= lo && i <= hi ? anchor.value : v));
}
