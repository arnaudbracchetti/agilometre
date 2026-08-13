import { Result } from './result';

describe('Result', () => {
  it('porte une valeur en cas de succès', () => {
    const resultat = Result.succes<number>(42);

    expect(resultat.estSucces).toBe(true);
    expect(resultat.estEchec).toBe(false);
    expect(resultat.valeur).toBe(42);
  });

  it('porte une erreur en cas d’échec', () => {
    const erreur = new Error('oops');
    const resultat = Result.echec<number>(erreur);

    expect(resultat.estSucces).toBe(false);
    expect(resultat.estEchec).toBe(true);
    expect(resultat.erreur).toBe(erreur);
  });

  it('refuse de lire .valeur sur un échec', () => {
    const resultat = Result.echec<number>(new Error('oops'));

    expect(() => resultat.valeur).toThrow(/échec/);
  });

  it('refuse de lire .erreur sur un succès', () => {
    const resultat = Result.succes<number>(1);

    expect(() => resultat.erreur).toThrow(/succès/);
  });
});
