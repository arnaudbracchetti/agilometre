import { Equipe } from '../domain/equipe';
import { EquipeRepository } from '../domain/equipe.repository';
import { RenommerEquipe } from './renommer-equipe.usecase';

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

  save(): Promise<void> {
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

describe('RenommerEquipe', () => {
  it('renomme l’Équipe avec un nom valide', async () => {
    const repository = new EquipeRepositoryFake();
    repository.equipes.push(Equipe.creer('eq1', 'Alpha', 'e1').valeur);
    const useCase = new RenommerEquipe(repository);

    const resultat = await useCase.executer('eq1', 'Beta');

    expect(resultat.type).toBe('renommee');
    if (resultat.type !== 'renommee') throw new Error('unreachable');
    expect(resultat.equipe.nom).toBe('Beta');
  });

  it('renvoie "introuvable" pour un id inconnu', async () => {
    const repository = new EquipeRepositoryFake();
    const useCase = new RenommerEquipe(repository);

    const resultat = await useCase.executer('inconnue', 'Beta');

    expect(resultat.type).toBe('introuvable');
  });

  it('renvoie "doublon" si une autre Équipe porte déjà ce nom', async () => {
    const repository = new EquipeRepositoryFake();
    repository.equipes.push(Equipe.creer('eq1', 'Alpha', 'e1').valeur);
    repository.equipes.push(Equipe.creer('eq2', 'Beta', 'e2').valeur);
    const useCase = new RenommerEquipe(repository);

    const resultat = await useCase.executer('eq1', 'beta');

    expect(resultat.type).toBe('doublon');
  });

  it('autorise à garder son propre nom, à la casse près', async () => {
    const repository = new EquipeRepositoryFake();
    repository.equipes.push(Equipe.creer('eq1', 'Alpha', 'e1').valeur);
    const useCase = new RenommerEquipe(repository);

    const resultat = await useCase.executer('eq1', 'alpha');

    expect(resultat.type).toBe('renommee');
  });
});
