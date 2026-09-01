import { Equipe } from '../domain/equipe';
import { EquipeRepository } from '../domain/equipe.repository';

export type ResultatObtenirEquipe =
  { type: 'introuvable' } | { type: 'ok'; equipe: Equipe };

export class ObtenirEquipe {
  constructor(private readonly repository: EquipeRepository) {}

  async executer(id: string): Promise<ResultatObtenirEquipe> {
    const equipe = await this.repository.findById(id);
    if (!equipe) {
      return { type: 'introuvable' };
    }
    return { type: 'ok', equipe };
  }
}
