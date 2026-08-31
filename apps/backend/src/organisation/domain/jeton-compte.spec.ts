import { JetonCompte } from './jeton-compte';

describe('JetonCompte', () => {
  it('creer — expire 7 jours après la création, non consommé', () => {
    const creeLe = new Date('2026-01-01T00:00:00.000Z');

    const jeton = JetonCompte.creer(
      'id-1',
      'utilisateur-1',
      'hash-du-jeton',
      creeLe,
    );

    expect(jeton.id).toBe('id-1');
    expect(jeton.utilisateurId).toBe('utilisateur-1');
    expect(jeton.tokenHash).toBe('hash-du-jeton');
    expect(jeton.creeLe).toEqual(creeLe);
    expect(jeton.expireLe).toEqual(new Date('2026-01-08T00:00:00.000Z'));
    expect(jeton.consommeLe).toBeNull();
  });

  it('reconstituer — restitue tel quel, y compris un jeton déjà consommé', () => {
    const consommeLe = new Date('2026-01-02T00:00:00.000Z');

    const jeton = JetonCompte.reconstituer(
      'id-1',
      'utilisateur-1',
      'hash-du-jeton',
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-01-08T00:00:00.000Z'),
      consommeLe,
    );

    expect(jeton.consommeLe).toEqual(consommeLe);
  });
});
