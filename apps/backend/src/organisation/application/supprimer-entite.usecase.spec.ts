import { Entite } from '../domain/entite';
import { EntiteRepository } from '../domain/entite.repository';
import { EquipeRepository } from '../domain/equipe.repository';
import { SupprimerEntite } from './supprimer-entite.usecase';

class EntiteRepositoryFake implements EntiteRepository {
  entites: Entite[] = [];

  findById(id: string): Promise<Entite | null> {
    return Promise.resolve(this.entites.find((e) => e.id === id) ?? null);
  }

  findAll(): Promise<Entite[]> {
    return Promise.resolve(this.entites);
  }

  trouverParNom(): Promise<Entite | null> {
    return Promise.resolve(null);
  }

  save(): Promise<void> {
    return Promise.resolve();
  }

  remove(id: string): Promise<void> {
    this.entites = this.entites.filter((e) => e.id !== id);
    return Promise.resolve();
  }
}

class EquipeRepositoryFake implements Partial<EquipeRepository> {
  nombreEquipes = 0;

  compterParEntite(): Promise<number> {
    return Promise.resolve(this.nombreEquipes);
  }
}

describe('SupprimerEntite', () => {
  it('supprime une Entité sans Équipe rattachée', async () => {
    const entites = new EntiteRepositoryFake();
    entites.entites.push(Entite.creer('e1', 'Vente').valeur);
    const equipes = new EquipeRepositoryFake();
    const useCase = new SupprimerEntite(
      entites,
      equipes as unknown as EquipeRepository,
    );

    const resultat = await useCase.executer('e1');

    expect(resultat.type).toBe('supprimee');
    expect(entites.entites).toHaveLength(0);
  });

  it('renvoie "introuvable" pour un id inconnu', async () => {
    const entites = new EntiteRepositoryFake();
    const equipes = new EquipeRepositoryFake();
    const useCase = new SupprimerEntite(
      entites,
      equipes as unknown as EquipeRepository,
    );

    const resultat = await useCase.executer('inconnue');

    expect(resultat.type).toBe('introuvable');
  });

  it('renvoie "referencee" tant qu’au moins une Équipe est rattachée, sans supprimer', async () => {
    const entites = new EntiteRepositoryFake();
    entites.entites.push(Entite.creer('e1', 'Vente').valeur);
    const equipes = new EquipeRepositoryFake();
    equipes.nombreEquipes = 1;
    const useCase = new SupprimerEntite(
      entites,
      equipes as unknown as EquipeRepository,
    );

    const resultat = await useCase.executer('e1');

    expect(resultat.type).toBe('referencee');
    expect(entites.entites).toHaveLength(1);
  });
});
