import { Role } from '@agilometre/shared';
import { PerimetreUtilisateur } from './perimetre-utilisateur';

describe('PerimetreUtilisateur', () => {
  const perimetre = new PerimetreUtilisateur();

  it('peutVoirEntite — toujours vrai pour un Coach', () => {
    expect(
      perimetre.peutVoirEntite(
        { id: 'u1', email: 'coach@example.com', role: Role.Coach },
        'entite-1',
      ),
    ).toBe(true);
  });

  it('peutVoirEquipe — toujours vrai pour un Coach', () => {
    expect(
      perimetre.peutVoirEquipe(
        { id: 'u1', email: 'coach@example.com', role: Role.Coach },
        'equipe-1',
      ),
    ).toBe(true);
  });

  it('peutVoirEntite — non implémenté pour Direction (tranche 3, #61)', () => {
    expect(() =>
      perimetre.peutVoirEntite(
        { id: 'u2', email: 'direction@example.com', role: Role.Direction },
        'entite-1',
      ),
    ).toThrow();
  });

  it('peutVoirEquipe — non implémenté pour Membre (tranche 4, #62)', () => {
    expect(() =>
      perimetre.peutVoirEquipe(
        { id: 'u3', email: 'membre@example.com', role: Role.Membre },
        'equipe-1',
      ),
    ).toThrow();
  });
});
