import { Role } from '@agilometre/shared';
import { Utilisateur } from '../domain/utilisateur';
import { UtilisateurRepository } from '../domain/utilisateur.repository';
import { AjouterHabilitation } from './ajouter-habilitation.usecase';

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

  sauvegarderEtPropager(): Promise<void> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }
}

describe('AjouterHabilitation', () => {
  function creerDirection(repository: UtilisateurRepositoryFake): Utilisateur {
    const direction = Utilisateur.creer(
      'u1',
      'direction@example.com',
      'Ada',
      'Lovelace',
      'hash',
      Role.Direction,
    ).valeur;
    repository.utilisateurs.push(direction);
    return direction;
  }

  it('ajoute une Habilitation à un compte Direction existant', async () => {
    const repository = new UtilisateurRepositoryFake();
    creerDirection(repository);
    const usecase = new AjouterHabilitation(repository);

    const resultat = await usecase.executer('u1', { entiteId: 'e1' });

    expect(resultat.type).toBe('ajoutee');
    expect((await repository.trouverParId('u1'))!.habilitations).toHaveLength(
      1,
    );
  });

  it('rejette si le compte est introuvable', async () => {
    const repository = new UtilisateurRepositoryFake();
    const usecase = new AjouterHabilitation(repository);

    const resultat = await usecase.executer('inconnu', { entiteId: 'e1' });

    expect(resultat.type).toBe('introuvable');
  });

  it('rejette une cible incompatible avec le Rôle', async () => {
    const repository = new UtilisateurRepositoryFake();
    creerDirection(repository);
    const usecase = new AjouterHabilitation(repository);

    const resultat = await usecase.executer('u1', { equipeId: 'eq1' });

    expect(resultat.type).toBe('invalide');
  });

  it('rejette un doublon', async () => {
    const repository = new UtilisateurRepositoryFake();
    creerDirection(repository);
    const usecase = new AjouterHabilitation(repository);
    await usecase.executer('u1', { entiteId: 'e1' });

    const resultat = await usecase.executer('u1', { entiteId: 'e1' });

    expect(resultat.type).toBe('invalide');
  });
});
