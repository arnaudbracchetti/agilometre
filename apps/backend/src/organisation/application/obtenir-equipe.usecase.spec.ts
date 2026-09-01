import { Equipe } from '../domain/equipe';
import { EquipeRepository } from '../domain/equipe.repository';
import { ObtenirEquipe } from './obtenir-equipe.usecase';

class EquipeRepositoryFake implements EquipeRepository {
  equipes: Equipe[] = [];

  findById(id: string): Promise<Equipe | null> {
    return Promise.resolve(this.equipes.find((e) => e.id === id) ?? null);
  }

  findByEntiteId(): Promise<Equipe[]> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }

  trouverParNom(): Promise<Equipe | null> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }

  save(): Promise<void> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }

  remove(): Promise<void> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }

  compterParEntite(): Promise<number> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }

  trouverParEmailMembre(): Promise<Equipe[]> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }

  estMembreDe(): Promise<boolean> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }

  aUneEquipeDansLEntite(): Promise<boolean> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }
}

describe('ObtenirEquipe', () => {
  it('renvoie l’Équipe trouvée', async () => {
    const repository = new EquipeRepositoryFake();
    repository.equipes.push(Equipe.creer('eq1', 'Alpha', 'e1').valeur);
    const useCase = new ObtenirEquipe(repository);

    const resultat = await useCase.executer('eq1');

    expect(resultat.type).toBe('ok');
    if (resultat.type !== 'ok') throw new Error('unreachable');
    expect(resultat.equipe.nom).toBe('Alpha');
  });

  it('renvoie "introuvable" pour une Équipe inconnue', async () => {
    const repository = new EquipeRepositoryFake();
    const useCase = new ObtenirEquipe(repository);

    const resultat = await useCase.executer('inconnue');

    expect(resultat).toEqual({ type: 'introuvable' });
  });
});
