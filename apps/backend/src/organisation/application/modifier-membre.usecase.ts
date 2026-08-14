import {
  EmailMembreDejaUtiliseError,
  Equipe,
  MembreIntrouvableError,
} from '../domain/equipe';
import { ErreurInvariantMembre } from '../domain/membre';
import { EquipeRepository } from '../domain/equipe.repository';

export type ResultatModifierMembre =
  | { type: 'introuvable' }
  | { type: 'membre_introuvable' }
  | {
      type: 'invalide';
      erreur: ErreurInvariantMembre | EmailMembreDejaUtiliseError;
    }
  | { type: 'modifie'; equipe: Equipe };

export class ModifierMembre {
  constructor(private readonly repository: EquipeRepository) {}

  async executer(
    equipeId: string,
    membreId: string,
    nom: string,
    email: string,
  ): Promise<ResultatModifierMembre> {
    const equipe = await this.repository.findById(equipeId);
    if (!equipe) {
      return { type: 'introuvable' };
    }
    const resultat = equipe.modifierMembre(membreId, nom, email);
    if (resultat.estEchec) {
      if (resultat.erreur instanceof MembreIntrouvableError) {
        return { type: 'membre_introuvable' };
      }
      return { type: 'invalide', erreur: resultat.erreur };
    }
    await this.repository.save(equipe);
    return { type: 'modifie', equipe };
  }
}
