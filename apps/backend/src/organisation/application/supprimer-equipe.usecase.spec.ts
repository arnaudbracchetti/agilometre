import { Equipe } from '../domain/equipe';
import {
  EquipeRepository,
  EquipeReferenceeError,
} from '../domain/equipe.repository';
import { SupprimerEquipe } from './supprimer-equipe.usecase';

class EquipeRepositoryFake implements EquipeRepository {
  equipes: Equipe[] = [];
  erreurAuRetrait: Error | null = null;

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

  remove(id: string): Promise<void> {
    if (this.erreurAuRetrait) {
      return Promise.reject(this.erreurAuRetrait);
    }
    this.equipes = this.equipes.filter((e) => e.id !== id);
    return Promise.resolve();
  }

  compterParEntite(): Promise<number> {
    return Promise.resolve(0);
  }
}

describe('SupprimerEquipe', () => {
  it('supprime une Équipe existante', async () => {
    const repository = new EquipeRepositoryFake();
    repository.equipes.push(Equipe.creer('eq1', 'Alpha', 'e1').valeur);
    const useCase = new SupprimerEquipe(repository);

    const resultat = await useCase.executer('eq1');

    expect(resultat.type).toBe('supprimee');
    expect(repository.equipes).toHaveLength(0);
  });

  it('renvoie "introuvable" pour un id inconnu', async () => {
    const repository = new EquipeRepositoryFake();
    const useCase = new SupprimerEquipe(repository);

    const resultat = await useCase.executer('inconnue');

    expect(resultat.type).toBe('introuvable');
  });

  it('renvoie "referencee" si l’Équipe est encore référencée ailleurs', async () => {
    const repository = new EquipeRepositoryFake();
    repository.equipes.push(Equipe.creer('eq1', 'Alpha', 'e1').valeur);
    repository.erreurAuRetrait = new EquipeReferenceeError();
    const useCase = new SupprimerEquipe(repository);

    const resultat = await useCase.executer('eq1');

    expect(resultat.type).toBe('referencee');
  });
});
