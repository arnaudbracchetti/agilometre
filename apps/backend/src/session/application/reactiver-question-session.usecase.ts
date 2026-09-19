import { QuestionIntrouvableDansSelectionError } from '../../modele-collecte/domain/selection';
import {
  QuestionDejaDepasseeError,
  QuestionNonSauteeError,
  Session,
  SessionNonOuverteError,
} from '../domain/session';
import { SessionRepository } from '../domain/session.repository';

export type ResultatReactiverQuestionSession =
  | { type: 'introuvable' }
  | { type: 'question_introuvable' }
  | {
      type: 'invalide';
      erreur:
        | SessionNonOuverteError
        | QuestionNonSauteeError
        | QuestionDejaDepasseeError;
    }
  | { type: 'ok'; session: Session };

/**
 * Inverse de SauterQuestionSession (addendum "Réactiver", carte #44) : remet une Question Sautée
 * dans le circuit normal. Aucune dépendance à TourDeVoteRepository/EtatToursQuery — une Question
 * réactivable n'a par construction jamais pu avoir de Tour associé (voir Session.reactiverQuestion).
 */
export class ReactiverQuestionSession {
  constructor(private readonly sessions: SessionRepository) {}

  async executer(
    id: string,
    questionId: string,
  ): Promise<ResultatReactiverQuestionSession> {
    const session = await this.sessions.findById(id);
    if (!session) {
      return { type: 'introuvable' };
    }

    const resultat = session.reactiverQuestion(questionId);
    if (resultat.estEchec) {
      if (resultat.erreur instanceof QuestionIntrouvableDansSelectionError) {
        return { type: 'question_introuvable' };
      }
      return { type: 'invalide', erreur: resultat.erreur };
    }

    await this.sessions.save(session);
    return { type: 'ok', session };
  }
}
