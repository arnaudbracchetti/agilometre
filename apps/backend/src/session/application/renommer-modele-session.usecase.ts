import {
  ErreurInvariantModeleSession,
  ModeleSession,
} from '../domain/modele-session';
import { ModeleSessionRepository } from '../domain/modele-session.repository';

export type ResultatRenommerModeleSession =
  | { type: 'introuvable' }
  | { type: 'invalide'; erreur: ErreurInvariantModeleSession }
  | { type: 'renomme'; modele: ModeleSession };

export class RenommerModeleSession {
  constructor(private readonly repository: ModeleSessionRepository) {}

  async executer(
    id: string,
    nom: string,
  ): Promise<ResultatRenommerModeleSession> {
    const modele = await this.repository.findById(id);
    if (!modele) {
      return { type: 'introuvable' };
    }
    const resultat = modele.renommer(nom);
    if (resultat.estEchec) {
      return { type: 'invalide', erreur: resultat.erreur };
    }
    await this.repository.save(modele);
    return { type: 'renomme', modele };
  }
}
