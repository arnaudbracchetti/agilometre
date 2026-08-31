import { Role } from '@agilometre/shared';
import { Utilisateur } from '../../organisation/domain/utilisateur';
import { UtilisateurRepository } from '../../organisation/domain/utilisateur.repository';
import { PerimetreUtilisateur } from './perimetre-utilisateur';

function creerDirectionHabilitee(entiteIds: string[]): Utilisateur {
  const utilisateur = Utilisateur.creer(
    'u2',
    'direction@example.com',
    'Ada',
    'Lovelace',
    'hash',
    Role.Direction,
  ).valeur;
  entiteIds.forEach((entiteId, index) =>
    utilisateur.ajouterHabilitation(`h${index}`, { entiteId }),
  );
  return utilisateur;
}

class UtilisateurRepositoryFake implements UtilisateurRepository {
  constructor(private readonly utilisateurs: Utilisateur[]) {}

  trouverParId(id: string): Promise<Utilisateur | null> {
    return Promise.resolve(
      this.utilisateurs.find((utilisateur) => utilisateur.id === id) ?? null,
    );
  }

  trouverParEmail(): Promise<Utilisateur | null> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }

  lister(): Promise<Utilisateur[]> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }

  save(): Promise<void> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }
}

describe('PerimetreUtilisateur', () => {
  it('peutVoirEntite — toujours vrai pour un Coach', async () => {
    const perimetre = new PerimetreUtilisateur(
      new UtilisateurRepositoryFake([]),
    );

    await expect(
      perimetre.peutVoirEntite(
        { id: 'u1', email: 'coach@example.com', role: Role.Coach },
        'entite-1',
      ),
    ).resolves.toBe(true);
  });

  it('peutVoirEquipe — toujours vrai pour un Coach', async () => {
    const perimetre = new PerimetreUtilisateur(
      new UtilisateurRepositoryFake([]),
    );

    await expect(
      perimetre.peutVoirEquipe(
        { id: 'u1', email: 'coach@example.com', role: Role.Coach },
        'equipe-1',
      ),
    ).resolves.toBe(true);
  });

  it('peutVoirEntite — vrai pour une Direction habilitée sur cette Entité', async () => {
    const direction = creerDirectionHabilitee(['entite-1', 'entite-2']);
    const perimetre = new PerimetreUtilisateur(
      new UtilisateurRepositoryFake([direction]),
    );

    await expect(
      perimetre.peutVoirEntite(
        { id: 'u2', email: 'direction@example.com', role: Role.Direction },
        'entite-1',
      ),
    ).resolves.toBe(true);
  });

  it('peutVoirEntite — faux pour une Direction non habilitée sur cette Entité', async () => {
    const direction = creerDirectionHabilitee(['entite-1']);
    const perimetre = new PerimetreUtilisateur(
      new UtilisateurRepositoryFake([direction]),
    );

    await expect(
      perimetre.peutVoirEntite(
        { id: 'u2', email: 'direction@example.com', role: Role.Direction },
        'entite-2',
      ),
    ).resolves.toBe(false);
  });

  it('peutVoirEntite — faux pour un compte Direction introuvable', async () => {
    const perimetre = new PerimetreUtilisateur(
      new UtilisateurRepositoryFake([]),
    );

    await expect(
      perimetre.peutVoirEntite(
        { id: 'inconnu', email: 'direction@example.com', role: Role.Direction },
        'entite-1',
      ),
    ).resolves.toBe(false);
  });

  it('peutVoirEquipe — non implémenté pour Membre (tranche 4, #62)', async () => {
    const perimetre = new PerimetreUtilisateur(
      new UtilisateurRepositoryFake([]),
    );

    await expect(
      perimetre.peutVoirEquipe(
        { id: 'u3', email: 'membre@example.com', role: Role.Membre },
        'equipe-1',
      ),
    ).rejects.toThrow();
  });
});
