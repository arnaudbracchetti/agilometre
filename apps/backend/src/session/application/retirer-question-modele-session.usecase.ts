import { ModeleSession } from '../domain/modele-session';
import { ModeleSessionRepository } from '../domain/modele-session.repository';

export type ResultatRetirerQuestionModeleSession =
  | { type: 'introuvable' }
  | { type: 'question_introuvable' }
  | { type: 'retiree'; modele: ModeleSession };

export class RetirerQuestionModeleSession {
  constructor(private readonly repository: ModeleSessionRepository) {}

  async executer(
    id: string,
    questionId: string,
  ): Promise<ResultatRetirerQuestionModeleSession> {
    const modele = await this.repository.findById(id);
    if (!modele) {
      return { type: 'introuvable' };
    }
    const resultat = modele.retirerQuestion(questionId);
    if (resultat.estEchec) {
      return { type: 'question_introuvable' };
    }
    await this.repository.save(modele);
    return { type: 'retiree', modele };
  }
}
