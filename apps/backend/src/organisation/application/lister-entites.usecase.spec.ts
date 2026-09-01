import { Role } from '@agilometre/shared';
import { PerimetreUtilisateur } from '../../auth/domain/perimetre-utilisateur';
import { UtilisateurConnecte } from '../../auth/jeton-utilisateur';
import { Entite } from '../domain/entite';
import { EntiteRepository } from '../domain/entite.repository';
import { Utilisateur } from '../domain/utilisateur';
import { UtilisateurRepository } from '../domain/utilisateur.repository';
import { Equipe } from '../domain/equipe';
import { EquipeRepository } from '../domain/equipe.repository';
import { ListerEntites } from './lister-entites.usecase';

class EntiteRepositoryFake implements EntiteRepository {
  entites: Entite[] = [];

  findById(id: string): Promise<Entite | null> {
    return Promise.resolve(this.entites.find((e) => e.id === id) ?? null);
  }

  findAll(): Promise<Entite[]> {
    return Promise.resolve(this.entites);
  }

  trouverParNom(nom: string): Promise<Entite | null> {
    const nomRecherche = nom.toLowerCase();
    return Promise.resolve(
      this.entites.find((e) => e.nom.toLowerCase() === nomRecherche) ?? null,
    );
  }

  save(entite: Entite): Promise<void> {
    this.entites.push(entite);
    return Promise.resolve();
  }

  remove(id: string): Promise<void> {
    this.entites = this.entites.filter((e) => e.id !== id);
    return Promise.resolve();
  }
}

class UtilisateurRepositoryFake implements UtilisateurRepository {
  constructor(private readonly utilisateurs: Utilisateur[] = []) {}

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

  sauvegarderEtPropager(): Promise<void> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }
}

class EquipeRepositoryFake implements EquipeRepository {
  findById(): Promise<Equipe | null> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }

  findByEntiteId(): Promise<Equipe[]> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }

  trouverParNom(): Promise<Equipe | null> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }

  save(): Promise<void> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }

  remove(): Promise<void> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }

  compterParEntite(): Promise<number> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }

  trouverParEmailMembre(): Promise<Equipe[]> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }

  estMembreDe(): Promise<boolean> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }

  aUneEquipeDansLEntite(): Promise<boolean> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }
}

const COACH: UtilisateurConnecte = {
  id: 'coach-1',
  email: 'coach@example.com',
  role: Role.Coach,
};

describe('ListerEntites', () => {
  it('renvoie toutes les Entités triées par nom pour un Coach', async () => {
    const repository = new EntiteRepositoryFake();
    repository.entites.push(
      Entite.creer('e1', 'Marketing').valeur,
      Entite.creer('e2', 'DSI').valeur,
      Entite.creer('e3', 'Achats').valeur,
    );
    const useCase = new ListerEntites(
      repository,
      new PerimetreUtilisateur(
        new UtilisateurRepositoryFake(),
        new EquipeRepositoryFake(),
      ),
    );

    const resultat = await useCase.executer(COACH);

    expect(resultat.map((e) => e.nom)).toEqual(['Achats', 'DSI', 'Marketing']);
  });

  it('ne renvoie à une Direction que ses Entités habilitées', async () => {
    const repository = new EntiteRepositoryFake();
    repository.entites.push(
      Entite.creer('e1', 'Marketing').valeur,
      Entite.creer('e2', 'DSI').valeur,
      Entite.creer('e3', 'Achats').valeur,
    );
    const direction = Utilisateur.creer(
      'u2',
      'direction@example.com',
      'Ada',
      'Lovelace',
      'hash',
      Role.Direction,
    ).valeur;
    direction.ajouterHabilitation('h1', { entiteId: 'e1' });
    const useCase = new ListerEntites(
      repository,
      new PerimetreUtilisateur(
        new UtilisateurRepositoryFake([direction]),
        new EquipeRepositoryFake(),
      ),
    );

    const resultat = await useCase.executer({
      id: 'u2',
      email: 'direction@example.com',
      role: Role.Direction,
    });

    expect(resultat.map((e) => e.id)).toEqual(['e1']);
  });
});
