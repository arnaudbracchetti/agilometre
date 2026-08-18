import { QuestionIntrouvableDansSelectionError } from '../domain/selection';
import { Session, SessionVerrouilleeError } from '../domain/session';
import { SessionRepository } from '../domain/session.repository';

export type ResultatRetirerQuestionSession =
  | { type: 'introuvable' }
  | { type: 'question_introuvable' }
  | { type: 'invalide'; erreur: SessionVerrouilleeError }
  | { type: 'retiree'; session: Session };

/** Rejeté une fois verrouillée, cf. `Session.retirerQuestion` (ADR-0010). */
export class RetirerQuestionSession {
  constructor(private readonly repository: SessionRepository) {}

  async executer(
    id: string,
    questionId: string,
  ): Promise<ResultatRetirerQuestionSession> {
    const session = await this.repository.findById(id);
    if (!session) {
      return { type: 'introuvable' };
    }
    const resultat = session.retirerQuestion(questionId);
    if (resultat.estEchec) {
      if (resultat.erreur instanceof QuestionIntrouvableDansSelectionError) {
        return { type: 'question_introuvable' };
      }
      return { type: 'invalide', erreur: resultat.erreur };
    }
    await this.repository.save(session);
    return { type: 'retiree', session };
  }
}
