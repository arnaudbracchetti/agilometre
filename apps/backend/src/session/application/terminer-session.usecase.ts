import { Session } from '../domain/session';
import { SessionRepository } from '../domain/session.repository';

export type ResultatTerminerSession =
  | { type: 'introuvable' }
  | { type: 'non_ouverte' }
  | { type: 'ok'; session: Session };

/**
 * Clôture finale (carte G1, #46) : `OUVERTE → CLOTUREE`, action explicite du Coach depuis l'écran
 * de synthèse. Contrairement à `TerminerPrematurementSession` (carte F3), portée par la Racine
 * seule (docs/design/agregat-tour-de-vote.md §3) — pas de boucle sur les Questions restantes, le
 * Code et le lien de projection deviennent inopérants comme simple conséquence du filtre
 * `statut = 'OUVERTE'` déjà appliqué par leurs lectures respectives.
 */
export class TerminerSession {
  constructor(private readonly sessions: SessionRepository) {}

  async executer(id: string): Promise<ResultatTerminerSession> {
    const session = await this.sessions.findById(id);
    if (!session) {
      return { type: 'introuvable' };
    }
    const resultat = session.terminer();
    if (resultat.estEchec) {
      return { type: 'non_ouverte' };
    }
    await this.sessions.save(session);
    return { type: 'ok', session };
  }
}
