import { JetonSessionRepository } from '../domain/jeton-session.repository';
import { Session } from '../domain/session';
import { SessionRepository } from '../domain/session.repository';

export type ResultatObtenirProjectionSession =
  | { type: 'introuvable' }
  | { type: 'ok'; session: Session; nbDevicesConnectes: number };

/**
 * L'écran de projection n'est accessible qu'entre l'ouverture (le Code n'existe pas avant) et la
 * clôture finale (doc/spec/annexes/deroulement-session-animee.md, "Écran de projection") — toute
 * autre Session compte comme introuvable pour cette lecture publique.
 */
export class ObtenirProjectionSession {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly jetons: JetonSessionRepository,
  ) {}

  async executer(id: string): Promise<ResultatObtenirProjectionSession> {
    const session = await this.sessions.findById(id);
    if (!session || session.statut !== 'OUVERTE') {
      return { type: 'introuvable' };
    }
    const nbDevicesConnectes = await this.jetons.compterPour(id);
    return { type: 'ok', session, nbDevicesConnectes };
  }
}
