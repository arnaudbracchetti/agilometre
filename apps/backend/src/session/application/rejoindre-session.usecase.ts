import { JetonSession } from '../domain/jeton-session';
import { JetonSessionRepository } from '../domain/jeton-session.repository';
import { SessionNonOuverteError } from '../domain/session';
import { SessionRepository } from '../domain/session.repository';

export type ResultatRejoindreSession =
  | { type: 'introuvable' }
  | { type: 'ok'; sessionId: string; jeton: JetonSession };

/**
 * Jointure d'un participant par Code (doc/spec/annexes/deroulement-session-animee.md, "Jointure
 * d'un participant") : un Code inconnu et une Session pas/plus OUVERTE partagent la même issue
 * "introuvable" — le front n'a pas à distinguer les deux cas.
 */
export class RejoindreSession {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly jetons: JetonSessionRepository,
  ) {}

  /**
   * `jetonPrecedentId` : Jeton de la Session quittée, si le device en tenait déjà un ("Rejoindre
   * une autre séance") — invalidé seulement une fois la nouvelle jointure confirmée, pour ne
   * jamais faire perdre sa place au device sur un Code invalide ou une Session close entre-temps.
   */
  async executer(
    code: string,
    jetonPrecedentId?: string,
  ): Promise<ResultatRejoindreSession> {
    const session = await this.sessions.findByCode(code);
    if (!session) {
      return { type: 'introuvable' };
    }
    try {
      const jeton = await this.jetons.emettre(session.id);
      if (jetonPrecedentId) {
        await this.jetons.invalider(jetonPrecedentId);
      }
      return { type: 'ok', sessionId: session.id, jeton };
    } catch (erreur) {
      // Fenêtre de course entre la résolution du Code et l'émission (INSERT atomique côté
      // adaptateur) : une clôture entre-temps doit rester indiscernable d'un Code invalide.
      if (erreur instanceof SessionNonOuverteError) {
        return { type: 'introuvable' };
      }
      throw erreur;
    }
  }
}
