import { Session } from '../domain/session';
import { SessionRepository } from '../domain/session.repository';

export type ResultatRetirerQuestionSession =
  | { type: 'introuvable' }
  | { type: 'question_introuvable' }
  | { type: 'retiree'; session: Session };

/** Toujours permis, même sur une Session verrouillée (docs/design/agregat-session.md §2). */
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
      return { type: 'question_introuvable' };
    }
    await this.repository.save(session);
    return { type: 'retiree', session };
  }
}
