import { Entite } from '../domain/entite';
import { EntiteRepository } from '../domain/entite.repository';
import { CreerEntite } from './creer-entite.usecase';

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

describe('CreerEntite', () => {
  it('crée et sauvegarde une Entité pour un nom valide', async () => {
    const repository = new EntiteRepositoryFake();
    const useCase = new CreerEntite(repository);

    const resultat = await useCase.executer('Direction Numérique');

    expect(resultat.type).toBe('cree');
    if (resultat.type !== 'cree') throw new Error('unreachable');
    expect(resultat.entite.nom).toBe('Direction Numérique');
    expect(repository.entites).toHaveLength(1);
    expect(repository.entites[0].id).toBe(resultat.entite.id);
  });

  it('renvoie une erreur et ne sauvegarde rien pour un nom vide', async () => {
    const repository = new EntiteRepositoryFake();
    const useCase = new CreerEntite(repository);

    const resultat = await useCase.executer('');

    expect(resultat.type).toBe('invalide');
    expect(repository.entites).toHaveLength(0);
  });

  it('renvoie "doublon" et ne sauvegarde rien si le nom existe déjà', async () => {
    const repository = new EntiteRepositoryFake();
    repository.entites.push(Entite.creer('e1', 'DSI').valeur);
    const useCase = new CreerEntite(repository);

    const resultat = await useCase.executer('DSI');

    expect(resultat.type).toBe('doublon');
    expect(repository.entites).toHaveLength(1);
  });

  it('renvoie "doublon" pour un nom identique à la casse près', async () => {
    const repository = new EntiteRepositoryFake();
    repository.entites.push(Entite.creer('e1', 'DSI').valeur);
    const useCase = new CreerEntite(repository);

    const resultat = await useCase.executer('dsi');

    expect(resultat.type).toBe('doublon');
    expect(repository.entites).toHaveLength(1);
  });
});
