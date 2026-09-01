import { Role } from '@agilometre/shared';
import { Utilisateur } from '../domain/utilisateur';
import { UtilisateurRepository } from '../domain/utilisateur.repository';
import { DesactiverUtilisateur } from './desactiver-utilisateur.usecase';
import { ReactiverUtilisateur } from './reactiver-utilisateur.usecase';

class UtilisateurRepositoryFake implements UtilisateurRepository {
  utilisateurs: Utilisateur[] = [];

  trouverParEmail(): Promise<Utilisateur | null> {
    return Promise.reject(new Error('non utilisé par ce test'));
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

  sauvegarderEtPropager(): Promise<void> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }
}

describe('DesactiverUtilisateur / ReactiverUtilisateur', () => {
  it('désactive un compte actif', async () => {
    const repository = new UtilisateurRepositoryFake();
    const utilisateur = Utilisateur.creer(
      'id-1',
      'ada@example.com',
      'Ada',
      'Lovelace',
      'hash',
      Role.Coach,
    ).valeur;
    repository.utilisateurs.push(utilisateur);

    const resultat = await new DesactiverUtilisateur(repository).executer(
      'id-1',
    );

    expect(resultat.type).toBe('desactive');
    if (resultat.type !== 'desactive') throw new Error('unreachable');
    expect(resultat.utilisateur.actif).toBe(false);
  });

  it('échoue à désactiver un compte introuvable', async () => {
    const repository = new UtilisateurRepositoryFake();

    const resultat = await new DesactiverUtilisateur(repository).executer(
      'inconnu',
    );

    expect(resultat).toEqual({ type: 'introuvable' });
  });

  it('réactive un compte désactivé, mot de passe inchangé', async () => {
    const repository = new UtilisateurRepositoryFake();
    const utilisateur = Utilisateur.reconstituer(
      'id-1',
      'ada@example.com',
      'Ada',
      'Lovelace',
      'hash',
      false,
      Role.Coach,
      [],
    );
    repository.utilisateurs.push(utilisateur);

    const resultat = await new ReactiverUtilisateur(repository).executer(
      'id-1',
    );

    expect(resultat.type).toBe('reactive');
    if (resultat.type !== 'reactive') throw new Error('unreachable');
    expect(resultat.utilisateur.actif).toBe(true);
    expect(resultat.utilisateur.motDePasseHash).toBe('hash');
  });

  it('échoue à réactiver un compte introuvable', async () => {
    const repository = new UtilisateurRepositoryFake();

    const resultat = await new ReactiverUtilisateur(repository).executer(
      'inconnu',
    );

    expect(resultat).toEqual({ type: 'introuvable' });
  });
});
