import { Session } from '../domain/session';
import { SessionRepository } from '../domain/session.repository';

export type ResultatObtenirPilotageSession =
  { type: 'introuvable' } | { type: 'ok'; session: Session };

/**
 * L'écran de pilotage n'existe qu'à partir de l'ouverture (le Code n'existe pas avant) et reste
 * accessible en lecture seule après CLOTUREE (doc/spec/annexes/deroulement-session-animee.md,
 * "Écran de pilotage") — seule PREPAREE compte comme introuvable pour cette lecture.
 */
export class ObtenirPilotageSession {
  constructor(private readonly sessions: SessionRepository) {}

  async executer(id: string): Promise<ResultatObtenirPilotageSession> {
    const session = await this.sessions.findById(id);
    if (!session || session.statut === 'PREPAREE') {
      return { type: 'introuvable' };
    }
    return { type: 'ok', session };
  }
}
