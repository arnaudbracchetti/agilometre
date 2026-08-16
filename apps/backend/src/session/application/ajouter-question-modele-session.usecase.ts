import { ReferentielRepository } from '../../referentiel/domain/referentiel.repository';
import { ModeleSession } from '../domain/modele-session';
import { ModeleSessionRepository } from '../domain/modele-session.repository';
import { QuestionDejaSelectionneeError } from '../domain/selection';
import {
  chargerIdsQuestionsActives,
  positionDansSelectionComplete,
} from './position-affichee';

export type ResultatAjouterQuestionModeleSession =
  | { type: 'introuvable' }
  | { type: 'invalide'; erreur: QuestionDejaSelectionneeError }
  | { type: 'ajoutee'; modele: ModeleSession };

export class AjouterQuestionModeleSession {
  constructor(
    private readonly repository: ModeleSessionRepository,
    private readonly referentiel: ReferentielRepository,
  ) {}

  async executer(
    id: string,
    questionId: string,
    positionAffichee?: number,
  ): Promise<ResultatAjouterQuestionModeleSession> {
    const modele = await this.repository.findById(id);
    if (!modele) {
      return { type: 'introuvable' };
    }
    const idsActifs = await chargerIdsQuestionsActives(this.referentiel);
    const position = positionDansSelectionComplete(
      modele.selection.questionIds,
      idsActifs,
      positionAffichee,
    );
    const resultat = modele.ajouterQuestion(questionId, position);
    if (resultat.estEchec) {
      return { type: 'invalide', erreur: resultat.erreur };
    }
    await this.repository.save(modele);
    return { type: 'ajoutee', modele };
  }
}
