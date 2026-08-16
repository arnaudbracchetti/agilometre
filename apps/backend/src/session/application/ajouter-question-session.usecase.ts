import { ReferentielRepository } from '../../referentiel/domain/referentiel.repository';
import { QuestionDejaSelectionneeError } from '../domain/selection';
import { Session, SessionVerrouilleeError } from '../domain/session';
import { SessionRepository } from '../domain/session.repository';
import {
  chargerIdsQuestionsActives,
  positionDansSelectionComplete,
} from './position-affichee';

export type ResultatAjouterQuestionSession =
  | { type: 'introuvable' }
  | {
      type: 'invalide';
      erreur: QuestionDejaSelectionneeError | SessionVerrouilleeError;
    }
  | { type: 'ajoutee'; session: Session };

export class AjouterQuestionSession {
  constructor(
    private readonly repository: SessionRepository,
    private readonly referentiel: ReferentielRepository,
  ) {}

  async executer(
    id: string,
    questionId: string,
    positionAffichee?: number,
  ): Promise<ResultatAjouterQuestionSession> {
    const session = await this.repository.findById(id);
    if (!session) {
      return { type: 'introuvable' };
    }
    const idsActifs = await chargerIdsQuestionsActives(this.referentiel);
    const position = positionDansSelectionComplete(
      session.selection.questionIds,
      idsActifs,
      positionAffichee,
    );
    const resultat = session.ajouterQuestion(questionId, position);
    if (resultat.estEchec) {
      return { type: 'invalide', erreur: resultat.erreur };
    }
    await this.repository.save(session);
    return { type: 'ajoutee', session };
  }
}
