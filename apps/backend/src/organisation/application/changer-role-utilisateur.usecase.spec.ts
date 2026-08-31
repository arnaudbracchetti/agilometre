import { Role } from '@agilometre/shared';
import { Utilisateur } from '../domain/utilisateur';
import { UtilisateurRepository } from '../domain/utilisateur.repository';
import { ChangerRoleUtilisateur } from './changer-role-utilisateur.usecase';

class UtilisateurRepositoryFake implements UtilisateurRepository {
  utilisateurs: Utilisateur[] = [];

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

  save(utilisateur: Utilisateur): Promise<void> {
    this.utilisateurs = this.utilisateurs.filter(
      (u) => u.id !== utilisateur.id,
    );
    this.utilisateurs.push(utilisateur);
    return Promise.resolve();
  }
}

describe('ChangerRoleUtilisateur', () => {
  it('change le Rôle quand aucune Habilitation n’existe', async () => {
    const repository = new UtilisateurRepositoryFake();
    repository.utilisateurs.push(
      Utilisateur.creer(
        'u1',
        'a@example.com',
        'Ada',
        'Lovelace',
        'hash',
        Role.Coach,
      ).valeur,
    );
    const usecase = new ChangerRoleUtilisateur(repository);

    const resultat = await usecase.executer('u1', Role.Direction);

    expect(resultat.type).toBe('change');
    expect((await repository.trouverParId('u1'))!.role).toBe(Role.Direction);
  });

  it('rejette si le compte est introuvable', async () => {
    const repository = new UtilisateurRepositoryFake();
    const usecase = new ChangerRoleUtilisateur(repository);

    const resultat = await usecase.executer('inconnu', Role.Direction);

    expect(resultat.type).toBe('introuvable');
  });

  it('rejette si des Habilitations existantes deviennent incohérentes', async () => {
    const repository = new UtilisateurRepositoryFake();
    const direction = Utilisateur.creer(
      'u1',
      'direction@example.com',
      'Ada',
      'Lovelace',
      'hash',
      Role.Direction,
    ).valeur;
    direction.ajouterHabilitation('h1', { entiteId: 'e1' });
    repository.utilisateurs.push(direction);
    const usecase = new ChangerRoleUtilisateur(repository);

    const resultat = await usecase.executer('u1', Role.Coach);

    expect(resultat.type).toBe('invalide');
    expect((await repository.trouverParId('u1'))!.role).toBe(Role.Direction);
  });
});
