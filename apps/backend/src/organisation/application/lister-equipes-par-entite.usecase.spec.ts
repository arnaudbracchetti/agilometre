import { Role } from '@agilometre/shared';
import { UtilisateurConnecte } from '../../auth/jeton-utilisateur';
import { PerimetreUtilisateur } from '../../auth/domain/perimetre-utilisateur';
import { Equipe } from '../domain/equipe';
import { EquipeRepository } from '../domain/equipe.repository';
import { Utilisateur } from '../domain/utilisateur';
import { UtilisateurRepository } from '../domain/utilisateur.repository';
import { ListerEquipesParEntite } from './lister-equipes-par-entite.usecase';

class EquipeRepositoryFake implements EquipeRepository {
  equipes: Equipe[] = [];

  findById(id: string): Promise<Equipe | null> {
    return Promise.resolve(this.equipes.find((e) => e.id === id) ?? null);
  }

  findByEntiteId(entiteId: string): Promise<Equipe[]> {
    return Promise.resolve(this.equipes.filter((e) => e.entiteId === entiteId));
  }

  trouverParNom(): Promise<Equipe | null> {
    return Promise.resolve(null);
  }

  save(): Promise<void> {
    return Promise.resolve();
  }

  remove(): Promise<void> {
    return Promise.resolve();
  }

  compterParEntite(entiteId: string): Promise<number> {
    return Promise.resolve(
      this.equipes.filter((e) => e.entiteId === entiteId).length,
    );
  }

  trouverParEmailMembre(): Promise<Equipe[]> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }

  estMembreDe(utilisateurId: string, equipeId: string): Promise<boolean> {
    const equipe = this.equipes.find((e) => e.id === equipeId);
    return Promise.resolve(
      equipe?.membres.some((m) => m.utilisateurId === utilisateurId) ?? false,
    );
  }

  aUneEquipeDansLEntite(): Promise<boolean> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }
}

class UtilisateurRepositoryFake implements UtilisateurRepository {
  trouverParEmail(): Promise<Utilisateur | null> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }
  trouverParId(): Promise<Utilisateur | null> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }
  lister(): Promise<Utilisateur[]> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }
  save(): Promise<void> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }
  sauvegarderEtPropager(): Promise<void> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }
}

const COACH: UtilisateurConnecte = {
  id: 'coach-1',
  email: 'coach@example.com',
  role: Role.Coach,
};

const DIRECTION: UtilisateurConnecte = {
  id: 'direction-1',
  email: 'direction@example.com',
  role: Role.Direction,
};

function creerUseCase(equipes: Equipe[]) {
  const repository = new EquipeRepositoryFake();
  repository.equipes = equipes;
  const perimetre = new PerimetreUtilisateur(
    new UtilisateurRepositoryFake(),
    repository,
  );
  return new ListerEquipesParEntite(repository, perimetre);
}

describe('ListerEquipesParEntite', () => {
  it('renvoie à un Coach les Équipes d’une Entité, triées par nom, en ignorant les autres', async () => {
    const useCase = creerUseCase([
      Equipe.creer('eq1', 'Beta', 'e1').valeur,
      Equipe.creer('eq2', 'Alpha', 'e1').valeur,
      Equipe.creer('eq3', 'Gamma', 'e2').valeur,
    ]);

    const resultat = await useCase.executer('e1', COACH);

    expect(resultat.map((e) => e.nom)).toEqual(['Alpha', 'Beta']);
  });

  it('renvoie un tableau vide à un Coach si l’Entité n’a aucune Équipe', async () => {
    const useCase = creerUseCase([]);

    const resultat = await useCase.executer('e1', COACH);

    expect(resultat).toEqual([]);
  });

  it('ne renvoie à un Membre d’équipe que ses propres Équipes de cette Entité', async () => {
    const equipeMembre = Equipe.creer('eq1', 'Alpha', 'e1').valeur;
    equipeMembre.ajouterMembre('m1', 'Jean Dupont', null, 'jean@example.com');
    equipeMembre.lierUtilisateur(
      'm1',
      'membre-1',
      'Jean',
      'Dupont',
      'jean@example.com',
    );
    const autreEquipe = Equipe.creer('eq2', 'Beta', 'e1').valeur;
    const useCase = creerUseCase([equipeMembre, autreEquipe]);

    const resultat = await useCase.executer('e1', {
      id: 'membre-1',
      email: 'jean@example.com',
      role: Role.Membre,
    });

    expect(resultat.map((e) => e.id)).toEqual(['eq1']);
  });

  it('ne renvoie jamais aucune Équipe à une Direction, même en appelant directement cette route', async () => {
    const useCase = creerUseCase([Equipe.creer('eq1', 'Alpha', 'e1').valeur]);

    const resultat = await useCase.executer('e1', DIRECTION);

    expect(resultat).toEqual([]);
  });
});
