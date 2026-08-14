import { Equipe } from '../domain/equipe';
import { EquipeRepository } from '../domain/equipe.repository';
import { RetirerMembre } from './retirer-membre.usecase';

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

describe('RetirerMembre', () => {
  it('retire un Membre existant du roster', async () => {
    const repository = new EquipeRepositoryFake();
    const equipe = Equipe.creer('eq1', 'Alpha', 'e1').valeur;
    equipe.ajouterMembre('m1', 'Jean Dupont', 'jean@example.com');
    repository.equipes.push(equipe);
    const useCase = new RetirerMembre(repository);

    const resultat = await useCase.executer('eq1', 'm1');

    expect(resultat.type).toBe('retire');
    if (resultat.type !== 'retire') throw new Error('unreachable');
    expect(resultat.equipe.membres).toHaveLength(0);
  });

  it('renvoie "introuvable" pour une Équipe inconnue', async () => {
    const repository = new EquipeRepositoryFake();
    const useCase = new RetirerMembre(repository);

    const resultat = await useCase.executer('inconnue', 'm1');

    expect(resultat.type).toBe('introuvable');
  });

  it('renvoie "membre_introuvable" pour un id de Membre inconnu', async () => {
    const repository = new EquipeRepositoryFake();
    repository.equipes.push(Equipe.creer('eq1', 'Alpha', 'e1').valeur);
    const useCase = new RetirerMembre(repository);

    const resultat = await useCase.executer('eq1', 'inconnu');

    expect(resultat.type).toBe('membre_introuvable');
  });
});
