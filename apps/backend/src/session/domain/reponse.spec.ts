import { Reponse } from './reponse';

describe('Reponse', () => {
  it('crée une Reponse valide (SESSION avec tourId)', () => {
    const resultat = Reponse.creer(
      'r1',
      'q1',
      3,
      'equipe-1',
      new Date('2026-04-01'),
      'SESSION',
      'tour-1',
    );

    expect(resultat.estSucces).toBe(true);
    expect(resultat.valeur.niveau).toBe(3);
    expect(resultat.valeur.tourId).toBe('tour-1');
  });

  it('accepte une origine SESSION sans tourId (pas encore repointée)', () => {
    const resultat = Reponse.creer(
      'r1',
      'q1',
      2,
      'equipe-1',
      new Date('2026-04-01'),
      'SESSION',
      null,
    );

    expect(resultat.estSucces).toBe(true);
  });

  it('accepte une origine POULS sans tourId', () => {
    const resultat = Reponse.creer(
      'r1',
      'q1',
      2,
      'equipe-1',
      new Date('2026-04-01'),
      'POULS',
      null,
    );

    expect(resultat.estSucces).toBe(true);
  });

  it('rejette un niveau hors 1..4', () => {
    const resultat = Reponse.creer(
      'r1',
      'q1',
      5,
      'equipe-1',
      new Date('2026-04-01'),
      'SESSION',
      null,
    );

    expect(resultat.estEchec).toBe(true);
    expect(resultat.erreur.name).toBe('NiveauInvalideError');
  });

  it('rejette un niveau non entier', () => {
    const resultat = Reponse.creer(
      'r1',
      'q1',
      2.5,
      'equipe-1',
      new Date('2026-04-01'),
      'SESSION',
      null,
    );

    expect(resultat.estEchec).toBe(true);
    expect(resultat.erreur.name).toBe('NiveauInvalideError');
  });

  it("rejette un tourId renseigné pour l'origine POULS (ADR-0002)", () => {
    const resultat = Reponse.creer(
      'r1',
      'q1',
      2,
      'equipe-1',
      new Date('2026-04-01'),
      'POULS',
      'tour-1',
    );

    expect(resultat.estEchec).toBe(true);
    expect(resultat.erreur.name).toBe('TourIdInvalidePourOrigineError');
  });

  it('reconstituer recharge sans revalider', () => {
    const reponse = Reponse.reconstituer(
      'r1',
      'q1',
      2,
      'equipe-1',
      new Date('2026-04-01'),
      'SESSION',
      null,
    );

    expect(reponse.niveau).toBe(2);
  });
});
