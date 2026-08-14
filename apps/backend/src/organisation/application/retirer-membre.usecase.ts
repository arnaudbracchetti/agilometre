import { Equipe } from '../domain/equipe';
import { EquipeRepository } from '../domain/equipe.repository';

export type ResultatRetirerMembre =
  | { type: 'introuvable' }
  | { type: 'membre_introuvable' }
  | { type: 'retire'; equipe: Equipe };

export class RetirerMembre {
  constructor(private readonly repository: EquipeRepository) {}

  async executer(
    equipeId: string,
    membreId: string,
  ): Promise<ResultatRetirerMembre> {
    const equipe = await this.repository.findById(equipeId);
    if (!equipe) {
      return { type: 'introuvable' };
    }
    const resultat = equipe.retirerMembre(membreId);
    if (resultat.estEchec) {
      return { type: 'membre_introuvable' };
    }
    await this.repository.save(equipe);
    return { type: 'retire', equipe };
  }
}
