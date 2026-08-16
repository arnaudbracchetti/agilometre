import { ReferentielRepository } from '../../referentiel/domain/referentiel.repository';
import { QuestionIntrouvableDansSelectionError } from '../domain/selection';
import { Session, SessionVerrouilleeError } from '../domain/session';
import { SessionRepository } from '../domain/session.repository';
import {
  chargerIdsQuestionsActives,
  positionDansSelectionComplete,
} from './position-affichee';

export type ResultatReordonnerQuestionSession =
  | { type: 'introuvable' }
  | { type: 'question_introuvable' }
  | { type: 'verrouillee'; erreur: SessionVerrouilleeError }
  | { type: 'reordonnee'; session: Session };

export class ReordonnerQuestionSession {
  constructor(
    private readonly repository: SessionRepository,
    private readonly referentiel: ReferentielRepository,
  ) {}

  async executer(
    id: string,
    questionId: string,
    nouvellePositionAffichee: number,
  ): Promise<ResultatReordonnerQuestionSession> {
    const session = await this.repository.findById(id);
    if (!session) {
      return { type: 'introuvable' };
    }
    const idsActifs = await chargerIdsQuestionsActives(this.referentiel);
    // nouvellePositionAffichee est toujours définie (paramètre requis) : positionDansSelectionComplete
    // ne renvoie undefined qu'en réponse à une position affichée elle-même undefined.
    const nouvellePosition = positionDansSelectionComplete(
      session.selection.questionIds,
      idsActifs,
      nouvellePositionAffichee,
    ) as number;
    const resultat = session.reordonnerQuestion(questionId, nouvellePosition);
    if (resultat.estEchec) {
      if (resultat.erreur instanceof QuestionIntrouvableDansSelectionError) {
        return { type: 'question_introuvable' };
      }
      return { type: 'verrouillee', erreur: resultat.erreur };
    }
    await this.repository.save(session);
    return { type: 'reordonnee', session };
  }
}
