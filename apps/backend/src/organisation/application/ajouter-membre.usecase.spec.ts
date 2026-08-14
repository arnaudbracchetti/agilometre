import { Equipe } from '../domain/equipe';
import { EquipeRepository } from '../domain/equipe.repository';
import { AjouterMembre } from './ajouter-membre.usecase';

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

describe('AjouterMembre', () => {
  it('ajoute un Membre valide au roster de l’Équipe', async () => {
    const repository = new EquipeRepositoryFake();
    repository.equipes.push(Equipe.creer('eq1', 'Alpha', 'e1').valeur);
    const useCase = new AjouterMembre(repository);

    const resultat = await useCase.executer(
      'eq1',
      'Jean Dupont',
      'jean@example.com',
    );

    expect(resultat.type).toBe('ajoute');
    if (resultat.type !== 'ajoute') throw new Error('unreachable');
    expect(resultat.equipe.membres).toHaveLength(1);
    expect(resultat.equipe.membres[0].nom).toBe('Jean Dupont');
  });

  it('renvoie "introuvable" pour une Équipe inconnue', async () => {
    const repository = new EquipeRepositoryFake();
    const useCase = new AjouterMembre(repository);

    const resultat = await useCase.executer(
      'inconnue',
      'Jean Dupont',
      'jean@example.com',
    );

    expect(resultat.type).toBe('introuvable');
  });

  it('renvoie "invalide" pour un email mal formé', async () => {
    const repository = new EquipeRepositoryFake();
    repository.equipes.push(Equipe.creer('eq1', 'Alpha', 'e1').valeur);
    const useCase = new AjouterMembre(repository);

    const resultat = await useCase.executer(
      'eq1',
      'Jean Dupont',
      'pas-un-email',
    );

    expect(resultat.type).toBe('invalide');
  });

  it('renvoie "invalide" pour un email déjà présent dans le roster de cette Équipe', async () => {
    const repository = new EquipeRepositoryFake();
    const equipe = Equipe.creer('eq1', 'Alpha', 'e1').valeur;
    equipe.ajouterMembre('m1', 'Jean Dupont', 'jean@example.com');
    repository.equipes.push(equipe);
    const useCase = new AjouterMembre(repository);

    const resultat = await useCase.executer(
      'eq1',
      'Jean D.',
      'jean@example.com',
    );

    expect(resultat.type).toBe('invalide');
    if (resultat.type !== 'invalide') throw new Error('unreachable');
    expect(resultat.erreur.name).toBe('EmailMembreDejaUtiliseError');
  });
});
