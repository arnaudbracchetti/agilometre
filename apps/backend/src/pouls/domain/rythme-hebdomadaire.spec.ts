import { RythmeHebdomadaire } from './rythme-hebdomadaire';

describe('RythmeHebdomadaire', () => {
  it('refuse une liste de jours vide', () => {
    const resultat = RythmeHebdomadaire.creer([], 480);

    expect(resultat.estEchec).toBe(true);
  });

  it('refuse un jour hors de 1 à 7', () => {
    expect(RythmeHebdomadaire.creer([0, 3], 480).estEchec).toBe(true);
    expect(RythmeHebdomadaire.creer([1, 8], 480).estEchec).toBe(true);
  });

  it('refuse un doublon de jour', () => {
    const resultat = RythmeHebdomadaire.creer([1, 3, 1], 480);

    expect(resultat.estEchec).toBe(true);
  });

  it('refuse une heure hors de 0 à 1439', () => {
    expect(RythmeHebdomadaire.creer([1], -1).estEchec).toBe(true);
    expect(RythmeHebdomadaire.creer([1], 1440).estEchec).toBe(true);
  });

  it('accepte des jours valides sans doublon et une heure dans la plage', () => {
    const resultat = RythmeHebdomadaire.creer([1, 3, 5], 480);

    expect(resultat.estSucces).toBe(true);
    expect(resultat.valeur.joursEnvoi).toEqual([1, 3, 5]);
    expect(resultat.valeur.heureEnvoi).toBe(480);
  });

  it('reconstitue sans revalider', () => {
    const rythme = RythmeHebdomadaire.reconstituer([2, 4], 60);

    expect(rythme.joursEnvoi).toEqual([2, 4]);
    expect(rythme.heureEnvoi).toBe(60);
  });
});
