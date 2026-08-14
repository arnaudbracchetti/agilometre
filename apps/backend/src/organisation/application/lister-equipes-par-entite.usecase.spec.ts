import { Equipe } from '../domain/equipe';
import { EquipeRepository } from '../domain/equipe.repository';
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
}

describe('ListerEquipesParEntite', () => {
  it('renvoie les Équipes d’une Entité, triées par nom, en ignorant les autres', async () => {
    const repository = new EquipeRepositoryFake();
    repository.equipes.push(Equipe.creer('eq1', 'Beta', 'e1').valeur);
    repository.equipes.push(Equipe.creer('eq2', 'Alpha', 'e1').valeur);
    repository.equipes.push(Equipe.creer('eq3', 'Gamma', 'e2').valeur);
    const useCase = new ListerEquipesParEntite(repository);

    const resultat = await useCase.executer('e1');

    expect(resultat.map((e) => e.nom)).toEqual(['Alpha', 'Beta']);
  });

  it('renvoie un tableau vide si l’Entité n’a aucune Équipe', async () => {
    const repository = new EquipeRepositoryFake();
    const useCase = new ListerEquipesParEntite(repository);

    const resultat = await useCase.executer('e1');

    expect(resultat).toEqual([]);
  });
});
