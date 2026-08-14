import {
  EquipeRepository,
  EquipeReferenceeError,
} from '../domain/equipe.repository';

export type ResultatSupprimerEquipe =
  { type: 'introuvable' } | { type: 'referencee' } | { type: 'supprimee' };

export class SupprimerEquipe {
  constructor(private readonly repository: EquipeRepository) {}

  async executer(id: string): Promise<ResultatSupprimerEquipe> {
    const equipe = await this.repository.findById(id);
    if (!equipe) {
      return { type: 'introuvable' };
    }
    try {
      await this.repository.remove(id);
    } catch (erreur) {
      if (erreur instanceof EquipeReferenceeError) {
        return { type: 'referencee' };
      }
      throw erreur;
    }
    return { type: 'supprimee' };
  }
}
