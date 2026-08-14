import { Entite } from '../domain/entite';
import { EntiteRepository } from '../domain/entite.repository';
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
}

describe('ListerEntites', () => {
  it('renvoie les Entités triées par nom', async () => {
    const repository = new EntiteRepositoryFake();
    repository.entites.push(
      Entite.creer('e1', 'Marketing').valeur,
      Entite.creer('e2', 'DSI').valeur,
      Entite.creer('e3', 'Achats').valeur,
    );
    const useCase = new ListerEntites(repository);

    const resultat = await useCase.executer();

    expect(resultat.map((e) => e.nom)).toEqual(['Achats', 'DSI', 'Marketing']);
  });
});
