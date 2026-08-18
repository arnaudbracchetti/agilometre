import { JetonSessionRepository } from '../domain/jeton-session.repository';
import { Session } from '../domain/session';
import { SessionRepository } from '../domain/session.repository';

export type ResultatObtenirPilotageSession =
  | { type: 'introuvable' }
  | { type: 'ok'; session: Session; nbDevicesConnectes: number };

/**
 * L'écran de pilotage n'existe qu'à partir de l'ouverture (le Code n'existe pas avant) et reste
 * accessible en lecture seule après CLOTUREE (doc/spec/annexes/deroulement-session-animee.md,
 * "Écran de pilotage") — seule PREPAREE compte comme introuvable pour cette lecture.
 */
export class ObtenirPilotageSession {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly jetons: JetonSessionRepository,
  ) {}

  async executer(id: string): Promise<ResultatObtenirPilotageSession> {
    const session = await this.sessions.findById(id);
    if (!session || session.statut === 'PREPAREE') {
      return { type: 'introuvable' };
    }
    const nbDevicesConnectes = await this.jetons.compterPour(id);
    return { type: 'ok', session, nbDevicesConnectes };
  }
}
