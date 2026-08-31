import { Role } from '@agilometre/shared';
import { Utilisateur } from '../domain/utilisateur';
import { UtilisateurRepository } from '../domain/utilisateur.repository';
import { RetirerHabilitation } from './retirer-habilitation.usecase';

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

describe('RetirerHabilitation', () => {
  function creerDirectionHabilitee(
    repository: UtilisateurRepositoryFake,
  ): Utilisateur {
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
    return direction;
  }

  it('retire une Habilitation existante', async () => {
    const repository = new UtilisateurRepositoryFake();
    creerDirectionHabilitee(repository);
    const usecase = new RetirerHabilitation(repository);

    const resultat = await usecase.executer('u1', 'h1');

    expect(resultat.type).toBe('retiree');
    expect((await repository.trouverParId('u1'))!.habilitations).toHaveLength(
      0,
    );
  });

  it('rejette si le compte est introuvable', async () => {
    const repository = new UtilisateurRepositoryFake();
    const usecase = new RetirerHabilitation(repository);

    const resultat = await usecase.executer('inconnu', 'h1');

    expect(resultat.type).toBe('introuvable');
  });

  it('rejette si l’Habilitation est introuvable', async () => {
    const repository = new UtilisateurRepositoryFake();
    creerDirectionHabilitee(repository);
    const usecase = new RetirerHabilitation(repository);

    const resultat = await usecase.executer('u1', 'inconnue');

    expect(resultat.type).toBe('habilitation_introuvable');
  });
});
