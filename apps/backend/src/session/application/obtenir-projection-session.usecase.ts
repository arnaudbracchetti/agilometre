import { JetonSessionRepository } from '../domain/jeton-session.repository';
import { Question } from '../../referentiel/domain/question';
import { ReferentielRepository } from '../../referentiel/domain/referentiel.repository';
import { Session } from '../domain/session';
import { SessionRepository } from '../domain/session.repository';
import { TourDeVote } from '../domain/tour-de-vote';
import { TourDeVoteRepository } from '../domain/tour-de-vote.repository';
import { resoudreQuestionCourante } from './resoudre-question-courante';

export type ResultatObtenirProjectionSession =
  | { type: 'introuvable' }
  | {
      type: 'ok';
      session: Session;
      nbDevicesConnectes: number;
      questionCourante: Question | null;
      tourOuvert: TourDeVote | null;
    };

/**
 * L'écran de projection n'est accessible qu'entre l'ouverture (le Code n'existe pas avant) et la
 * clôture finale (doc/spec/annexes/deroulement-session-animee.md, "Écran de projection") — toute
 * autre Session compte comme introuvable pour cette lecture publique.
 */
export class ObtenirProjectionSession {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly jetons: JetonSessionRepository,
    private readonly referentiel: ReferentielRepository,
    private readonly tours: TourDeVoteRepository,
  ) {}

  async executer(id: string): Promise<ResultatObtenirProjectionSession> {
    const session = await this.sessions.findById(id);
    if (!session || session.statut !== 'OUVERTE') {
      return { type: 'introuvable' };
    }
    const nbDevicesConnectes = await this.jetons.compterJetonsDeLaSession(id);
    const questionCourante = await resoudreQuestionCourante(
      session,
      this.referentiel,
    );
    const tourOuvert = await this.tours.trouverTourOuvertDeLaSession(id);
    return {
      type: 'ok',
      session,
      nbDevicesConnectes,
      questionCourante,
      tourOuvert,
    };
  }
}
