import { Session, SessionNonPrepareeError } from '../domain/session';
import { SessionRepository } from '../domain/session.repository';

export type ResultatOuvrirSession =
  | { type: 'introuvable' }
  | { type: 'non_preparee'; erreur: SessionNonPrepareeError }
  | { type: 'ouverte'; session: Session };

export class OuvrirSession {
  constructor(private readonly sessions: SessionRepository) {}

  async executer(id: string): Promise<ResultatOuvrirSession> {
    const session = await this.sessions.findById(id);
    if (!session) {
      return { type: 'introuvable' };
    }
    const resultat = await session.ouvrir();
    if (resultat.estEchec) {
      return { type: 'non_preparee', erreur: resultat.erreur };
    }
    await this.sessions.save(session);
    return { type: 'ouverte', session };
  }
}
