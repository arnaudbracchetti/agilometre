import { Equipe } from '../domain/equipe';
import { EquipeRepository } from '../domain/equipe.repository';
import { ModifierMembre } from './modifier-membre.usecase';

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

  compterParEntite(): Promise<number> {
    return Promise.resolve(0);
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

describe('ModifierMembre', () => {
  it('modifie le nom, le prénom et l’email d’un Membre existant', async () => {
    const repository = new EquipeRepositoryFake();
    const equipe = Equipe.creer('eq1', 'Alpha', 'e1').valeur;
    equipe.ajouterMembre('m1', 'Jean Dupont', null, 'jean@example.com');
    repository.equipes.push(equipe);
    const useCase = new ModifierMembre(repository);

    const resultat = await useCase.executer(
      'eq1',
      'm1',
      'Jean D.',
      'Jean',
      'jean.d@example.com',
    );

    expect(resultat.type).toBe('modifie');
    if (resultat.type !== 'modifie') throw new Error('unreachable');
    expect(resultat.equipe.membres[0].nom).toBe('Jean D.');
    expect(resultat.equipe.membres[0].prenom).toBe('Jean');
    expect(resultat.equipe.membres[0].email).toBe('jean.d@example.com');
  });

  it('renvoie "introuvable" pour une Équipe inconnue', async () => {
    const repository = new EquipeRepositoryFake();
    const useCase = new ModifierMembre(repository);

    const resultat = await useCase.executer(
      'inconnue',
      'm1',
      'Jean D.',
      null,
      'jean@example.com',
    );

    expect(resultat.type).toBe('introuvable');
  });

  it('renvoie "membre_introuvable" pour un id de Membre inconnu', async () => {
    const repository = new EquipeRepositoryFake();
    repository.equipes.push(Equipe.creer('eq1', 'Alpha', 'e1').valeur);
    const useCase = new ModifierMembre(repository);

    const resultat = await useCase.executer(
      'eq1',
      'inconnu',
      'Jean D.',
      null,
      'jean@example.com',
    );

    expect(resultat.type).toBe('membre_introuvable');
  });

  it('renvoie "invalide" pour un email mal formé', async () => {
    const repository = new EquipeRepositoryFake();
    const equipe = Equipe.creer('eq1', 'Alpha', 'e1').valeur;
    equipe.ajouterMembre('m1', 'Jean Dupont', null, 'jean@example.com');
    repository.equipes.push(equipe);
    const useCase = new ModifierMembre(repository);

    const resultat = await useCase.executer(
      'eq1',
      'm1',
      'Jean D.',
      null,
      'pas-un-email',
    );

    expect(resultat.type).toBe('invalide');
  });

  it('renvoie "invalide" pour un email déjà utilisé par un autre Membre du roster', async () => {
    const repository = new EquipeRepositoryFake();
    const equipe = Equipe.creer('eq1', 'Alpha', 'e1').valeur;
    equipe.ajouterMembre('m1', 'Jean Dupont', null, 'jean@example.com');
    equipe.ajouterMembre('m2', 'Marie Curie', null, 'marie@example.com');
    repository.equipes.push(equipe);
    const useCase = new ModifierMembre(repository);

    const resultat = await useCase.executer(
      'eq1',
      'm2',
      'Marie C.',
      null,
      'jean@example.com',
    );

    expect(resultat.type).toBe('invalide');
    if (resultat.type !== 'invalide') throw new Error('unreachable');
    expect(resultat.erreur.name).toBe('EmailMembreDejaUtiliseError');
  });
});
