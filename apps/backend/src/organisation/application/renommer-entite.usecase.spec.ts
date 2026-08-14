import { Entite } from '../domain/entite';
import { EntiteRepository } from '../domain/entite.repository';
import { RenommerEntite } from './renommer-entite.usecase';

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
    const index = this.entites.findIndex((e) => e.id === entite.id);
    if (index === -1) {
      this.entites.push(entite);
    } else {
      this.entites[index] = entite;
    }
    return Promise.resolve();
  }
}

describe('RenommerEntite', () => {
  it('renomme et sauvegarde une Entité existante', async () => {
    const repository = new EntiteRepositoryFake();
    const entite = Entite.creer('e1', 'DSI').valeur;
    repository.entites.push(entite);
    const useCase = new RenommerEntite(repository);

    const resultat = await useCase.executer(
      'e1',
      'Direction des Systèmes d’Information',
    );

    expect(resultat.type).toBe('renomme');
    expect(repository.entites[0].nom).toBe(
      'Direction des Systèmes d’Information',
    );
  });

  it('renvoie "introuvable" pour un id inconnu', async () => {
    const repository = new EntiteRepositoryFake();
    const useCase = new RenommerEntite(repository);

    const resultat = await useCase.executer('inconnu', 'Nouveau nom');

    expect(resultat.type).toBe('introuvable');
  });

  it('renvoie une erreur et ne sauvegarde rien pour un nom vide', async () => {
    const repository = new EntiteRepositoryFake();
    const entite = Entite.creer('e1', 'DSI').valeur;
    repository.entites.push(entite);
    const useCase = new RenommerEntite(repository);

    const resultat = await useCase.executer('e1', '');

    expect(resultat.type).toBe('invalide');
    expect(repository.entites[0].nom).toBe('DSI');
  });

  it('renvoie "doublon" et ne sauvegarde rien si une autre Entité porte déjà ce nom', async () => {
    const repository = new EntiteRepositoryFake();
    repository.entites.push(Entite.creer('e1', 'DSI').valeur);
    repository.entites.push(Entite.creer('e2', 'Marketing').valeur);
    const useCase = new RenommerEntite(repository);

    const resultat = await useCase.executer('e2', 'dsi');

    expect(resultat.type).toBe('doublon');
    expect(repository.entites[1].nom).toBe('Marketing');
  });

  it('autorise à renommer une Entité en gardant son propre nom (à la casse près)', async () => {
    const repository = new EntiteRepositoryFake();
    repository.entites.push(Entite.creer('e1', 'DSI').valeur);
    const useCase = new RenommerEntite(repository);

    const resultat = await useCase.executer('e1', 'dsi');

    expect(resultat.type).toBe('renomme');
    expect(repository.entites[0].nom).toBe('dsi');
  });
});
