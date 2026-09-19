import { positionDansSelectionComplete } from './position-affichee';

describe('positionDansSelectionComplete', () => {
  it('renvoie undefined si aucune position affichée fournie (append en fin de liste)', () => {
    expect(
      positionDansSelectionComplete(
        ['q1', 'q2'],
        new Set(['q1', 'q2']),
        undefined,
      ),
    ).toBeUndefined();
  });

  it('sans Question archivée, la position affichée correspond directement à la position complète', () => {
    const complets = ['q1', 'q2', 'q3'];
    const actifs = new Set(complets);

    expect(positionDansSelectionComplete(complets, actifs, 0)).toBe(0);
    expect(positionDansSelectionComplete(complets, actifs, 2)).toBe(2);
  });

  it('décale la position complète pour sauter une Question archivée qui précède le point de dépôt', () => {
    // Ordre complet : [archivée, q1, q2] — seules q1/q2 sont visibles, aux positions affichées 0/1.
    const complets = ['archivee', 'q1', 'q2'];
    const actifs = new Set(['q1', 'q2']);

    // Déposer en position affichée 1 (entre q1 et q2) doit viser l'index 2 du tableau complet,
    // pas 1 (qui insérerait entre l'archivée et q1).
    expect(positionDansSelectionComplete(complets, actifs, 1)).toBe(2);
    expect(positionDansSelectionComplete(complets, actifs, 0)).toBe(1);
  });

  it('une position affichée au-delà du nombre de Questions visibles ajoute en fin de tableau complet', () => {
    const complets = ['q1', 'archivee'];
    const actifs = new Set(['q1']);

    expect(positionDansSelectionComplete(complets, actifs, 5)).toBe(2);
  });
});
