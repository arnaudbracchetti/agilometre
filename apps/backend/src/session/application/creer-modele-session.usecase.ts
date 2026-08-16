import { randomUUID } from 'node:crypto';
import {
  ErreurInvariantModeleSession,
  ModeleSession,
} from '../domain/modele-session';
import { ModeleSessionRepository } from '../domain/modele-session.repository';

export type ResultatCreerModeleSession =
  | { type: 'invalide'; erreur: ErreurInvariantModeleSession }
  | { type: 'cree'; modele: ModeleSession };

export class CreerModeleSession {
  constructor(private readonly repository: ModeleSessionRepository) {}

  async executer(nom: string): Promise<ResultatCreerModeleSession> {
    const resultat = ModeleSession.creer(randomUUID(), nom);
    if (resultat.estEchec) {
      return { type: 'invalide', erreur: resultat.erreur };
    }
    await this.repository.save(resultat.valeur);
    return { type: 'cree', modele: resultat.valeur };
  }
}
