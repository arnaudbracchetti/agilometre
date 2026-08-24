/**
 * Ordre de piochage dans la palette catégorielle (`--color-cat-1..8`, styles.scss), retenu plutôt
 * que l'ordre numérique brut 1→8 : plusieurs couleurs adjacentes de la palette sont des teintes
 * voisines (1 sarcelle/4 vert/8 cyan, 3 ambre/7 marron, 2 violet/6 indigo) — les piocher dans
 * l'ordre aurait rendu deux premiers Thèmes difficiles à distinguer au premier coup d'œil. Cet
 * ordre maximise l'écart de teinte entre les premières couleurs piochées.
 */
const ORDRE_PALETTE_CATEGORIELLE = [7, 4, 2, 5, 8, 6, 1, 3] as const;

/** Couleur catégorielle (`var(--color-cat-N)`) pour la Nième entité distinguée (Thème, ...). */
export function couleurCategorielle(position: number): string {
  const numero = ORDRE_PALETTE_CATEGORIELLE[position % ORDRE_PALETTE_CATEGORIELLE.length];
  return `var(--color-cat-${numero})`;
}

/** Variante « fond » de `couleurCategorielle`, pour un badge texte-sur-teinte-claire. */
export function couleurCategorielleFond(position: number): string {
  const numero = ORDRE_PALETTE_CATEGORIELLE[position % ORDRE_PALETTE_CATEGORIELLE.length];
  return `var(--color-cat-${numero}-bg)`;
}
