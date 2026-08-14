import { Entite } from '../domain/entite';
import { EntiteRepository } from '../domain/entite.repository';
import { Equipe } from '../domain/equipe';
import { EquipeRepository } from '../domain/equipe.repository';
import { CreerEquipe } from './creer-equipe.usecase';

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

class EquipeRepositoryFake implements EquipeRepository {
  equipes: Equipe[] = [];

  findById(id: string): Promise<Equipe | null> {
    return Promise.resolve(this.equipes.find((e) => e.id === id) ?? null);
  }

  findByEntiteId(entiteId: string): Promise<Equipe[]> {
    return Promise.resolve(this.equipes.filter((e) => e.entiteId === entiteId));
  }

  trouverParNom(nom: string): Promise<Equipe | null> {
    const nomRecherche = nom.toLowerCase();
    return Promise.resolve(
      this.equipes.find((e) => e.nom.toLowerCase() === nomRecherche) ?? null,
    );
  }

  save(equipe: Equipe): Promise<void> {
    if (!this.equipes.includes(equipe)) {
      this.equipes.push(equipe);
    }
    return Promise.resolve();
  }

  remove(id: string): Promise<void> {
    this.equipes = this.equipes.filter((e) => e.id !== id);
    return Promise.resolve();
  }

  compterParEntite(entiteId: string): Promise<number> {
    return Promise.resolve(
      this.equipes.filter((e) => e.entiteId === entiteId).length,
    );
  }
}

describe('CreerEquipe', () => {
  it('crée et sauvegarde une Équipe pour un nom valide et une Entité existante', async () => {
    const entites = new EntiteRepositoryFake();
    entites.entites.push(Entite.creer('e1', 'DSI').valeur);
    const equipes = new EquipeRepositoryFake();
    const useCase = new CreerEquipe(equipes, entites);

    const resultat = await useCase.executer('Équipe Alpha', 'e1');

    expect(resultat.type).toBe('creee');
    if (resultat.type !== 'creee') throw new Error('unreachable');
    expect(resultat.equipe.nom).toBe('Équipe Alpha');
    expect(resultat.equipe.entiteId).toBe('e1');
    expect(equipes.equipes).toHaveLength(1);
  });

  it('renvoie "entite_introuvable" et ne sauvegarde rien si l’Entité est inconnue', async () => {
    const entites = new EntiteRepositoryFake();
    const equipes = new EquipeRepositoryFake();
    const useCase = new CreerEquipe(equipes, entites);

    const resultat = await useCase.executer('Équipe Alpha', 'inconnue');

    expect(resultat.type).toBe('entite_introuvable');
    expect(equipes.equipes).toHaveLength(0);
  });

  it('renvoie une erreur et ne sauvegarde rien pour un nom vide', async () => {
    const entites = new EntiteRepositoryFake();
    entites.entites.push(Entite.creer('e1', 'DSI').valeur);
    const equipes = new EquipeRepositoryFake();
    const useCase = new CreerEquipe(equipes, entites);

    const resultat = await useCase.executer('', 'e1');

    expect(resultat.type).toBe('invalide');
    expect(equipes.equipes).toHaveLength(0);
  });

  it('renvoie "doublon" si une autre Équipe porte déjà ce nom, même dans une autre Entité', async () => {
    const entites = new EntiteRepositoryFake();
    entites.entites.push(Entite.creer('e1', 'DSI').valeur);
    entites.entites.push(Entite.creer('e2', 'Marketing').valeur);
    const equipes = new EquipeRepositoryFake();
    equipes.equipes.push(Equipe.creer('eq1', 'Alpha', 'e2').valeur);
    const useCase = new CreerEquipe(equipes, entites);

    const resultat = await useCase.executer('alpha', 'e1');

    expect(resultat.type).toBe('doublon');
    expect(equipes.equipes).toHaveLength(1);
  });
});
