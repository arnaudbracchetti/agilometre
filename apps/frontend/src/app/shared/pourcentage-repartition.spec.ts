import { PourcentageRepartition } from './pourcentage-repartition';

describe('PourcentageRepartition', () => {
  it('calcule le % arrondi', () => {
    expect(PourcentageRepartition.executer(2, 4)).toBe(50);
    expect(PourcentageRepartition.executer(1, 3)).toBe(33);
  });

  it('renvoie 0 sur un effectif nul, sans division par zéro', () => {
    expect(PourcentageRepartition.executer(0, 0)).toBe(0);
  });
});
