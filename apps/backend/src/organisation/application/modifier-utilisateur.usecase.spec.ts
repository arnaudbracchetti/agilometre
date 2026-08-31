import { Role } from '@agilometre/shared';
import { Utilisateur } from '../domain/utilisateur';
import { UtilisateurRepository } from '../domain/utilisateur.repository';
import { ModifierUtilisateur } from './modifier-utilisateur.usecase';

class UtilisateurRepositoryFake implements UtilisateurRepository {
  utilisateurs: Utilisateur[] = [];

  trouverParEmail(email: string): Promise<Utilisateur | null> {
    const recherche = email.toLowerCase();
    return Promise.resolve(
      this.utilisateurs.find((u) => u.email.toLowerCase() === recherche) ??
        null,
    );
  }

  trouverParId(id: string): Promise<Utilisateur | null> {
    return Promise.resolve(this.utilisateurs.find((u) => u.id === id) ?? null);
  }

  lister(): Promise<Utilisateur[]> {
    return Promise.resolve(this.utilisateurs);
  }

  save(): Promise<void> {
    return Promise.resolve();
  }
}

function ajouter(
  repository: UtilisateurRepositoryFake,
  id: string,
  email: string,
): Utilisateur {
  const utilisateur = Utilisateur.creer(
    id,
    email,
    'Ada',
    'Lovelace',
    'hash',
    Role.Direction,
  ).valeur;
  repository.utilisateurs.push(utilisateur);
  return utilisateur;
}

describe('ModifierUtilisateur', () => {
  it('modifie prénom/nom/email, jamais le mot de passe', async () => {
    const repository = new UtilisateurRepositoryFake();
    ajouter(repository, 'id-1', 'ada@example.com');
    const useCase = new ModifierUtilisateur(repository);

    const resultat = await useCase.executer(
      'id-1',
      'grace@example.com',
      'Grace',
      'Hopper',
    );

    expect(resultat.type).toBe('modifie');
    if (resultat.type !== 'modifie') throw new Error('unreachable');
    expect(resultat.utilisateur.email).toBe('grace@example.com');
    expect(resultat.utilisateur.prenom).toBe('Grace');
    expect(resultat.utilisateur.nom).toBe('Hopper');
    expect(resultat.utilisateur.motDePasseHash).toBe('hash');
  });

  it('échoue si le compte est introuvable', async () => {
    const repository = new UtilisateurRepositoryFake();
    const useCase = new ModifierUtilisateur(repository);

    const resultat = await useCase.executer(
      'inconnu',
      'a@example.com',
      'A',
      'A',
    );

    expect(resultat).toEqual({ type: 'introuvable' });
  });

  it('échoue si le nouvel email est déjà utilisé par un autre compte', async () => {
    const repository = new UtilisateurRepositoryFake();
    ajouter(repository, 'id-1', 'ada@example.com');
    ajouter(repository, 'id-2', 'grace@example.com');
    const useCase = new ModifierUtilisateur(repository);

    const resultat = await useCase.executer(
      'id-1',
      'grace@example.com',
      'Ada',
      'Lovelace',
    );

    expect(resultat).toEqual({ type: 'email_deja_utilise' });
  });

  it('permet de resauvegarder avec le même email (insensible à la casse)', async () => {
    const repository = new UtilisateurRepositoryFake();
    ajouter(repository, 'id-1', 'ada@example.com');
    const useCase = new ModifierUtilisateur(repository);

    const resultat = await useCase.executer(
      'id-1',
      'ADA@EXAMPLE.COM',
      'Ada',
      'Lovelace',
    );

    expect(resultat.type).toBe('modifie');
  });

  it('échoue avec une erreur de validation pour un email invalide', async () => {
    const repository = new UtilisateurRepositoryFake();
    ajouter(repository, 'id-1', 'ada@example.com');
    const useCase = new ModifierUtilisateur(repository);

    const resultat = await useCase.executer(
      'id-1',
      'pas-un-email',
      'Ada',
      'Lovelace',
    );

    expect(resultat.type).toBe('invalide');
  });
});
