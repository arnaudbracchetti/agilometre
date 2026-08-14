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
}

describe('ModifierMembre', () => {
  it('modifie le nom et l’email d’un Membre existant', async () => {
    const repository = new EquipeRepositoryFake();
    const equipe = Equipe.creer('eq1', 'Alpha', 'e1').valeur;
    equipe.ajouterMembre('m1', 'Jean Dupont', 'jean@example.com');
    repository.equipes.push(equipe);
    const useCase = new ModifierMembre(repository);

    const resultat = await useCase.executer(
      'eq1',
      'm1',
      'Jean D.',
      'jean.d@example.com',
    );

    expect(resultat.type).toBe('modifie');
    if (resultat.type !== 'modifie') throw new Error('unreachable');
    expect(resultat.equipe.membres[0].nom).toBe('Jean D.');
    expect(resultat.equipe.membres[0].email).toBe('jean.d@example.com');
  });

  it('renvoie "introuvable" pour une Équipe inconnue', async () => {
    const repository = new EquipeRepositoryFake();
    const useCase = new ModifierMembre(repository);

    const resultat = await useCase.executer(
      'inconnue',
      'm1',
      'Jean D.',
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
      'jean@example.com',
    );

    expect(resultat.type).toBe('membre_introuvable');
  });

  it('renvoie "invalide" pour un email mal formé', async () => {
    const repository = new EquipeRepositoryFake();
    const equipe = Equipe.creer('eq1', 'Alpha', 'e1').valeur;
    equipe.ajouterMembre('m1', 'Jean Dupont', 'jean@example.com');
    repository.equipes.push(equipe);
    const useCase = new ModifierMembre(repository);

    const resultat = await useCase.executer(
      'eq1',
      'm1',
      'Jean D.',
      'pas-un-email',
    );

    expect(resultat.type).toBe('invalide');
  });

  it('renvoie "invalide" pour un email déjà utilisé par un autre Membre du roster', async () => {
    const repository = new EquipeRepositoryFake();
    const equipe = Equipe.creer('eq1', 'Alpha', 'e1').valeur;
    equipe.ajouterMembre('m1', 'Jean Dupont', 'jean@example.com');
    equipe.ajouterMembre('m2', 'Marie Curie', 'marie@example.com');
    repository.equipes.push(equipe);
    const useCase = new ModifierMembre(repository);

    const resultat = await useCase.executer(
      'eq1',
      'm2',
      'Marie C.',
      'jean@example.com',
    );

    expect(resultat.type).toBe('invalide');
    if (resultat.type !== 'invalide') throw new Error('unreachable');
    expect(resultat.erreur.name).toBe('EmailMembreDejaUtiliseError');
  });
});
