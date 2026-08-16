import { ReferentielRepository } from '../../referentiel/domain/referentiel.repository';
import { ModeleSession } from '../domain/modele-session';
import { ModeleSessionRepository } from '../domain/modele-session.repository';
import {
  chargerIdsQuestionsActives,
  positionDansSelectionComplete,
} from './position-affichee';

export type ResultatReordonnerQuestionModeleSession =
  | { type: 'introuvable' }
  | { type: 'question_introuvable' }
  | { type: 'reordonnee'; modele: ModeleSession };

export class ReordonnerQuestionModeleSession {
  constructor(
    private readonly repository: ModeleSessionRepository,
    private readonly referentiel: ReferentielRepository,
  ) {}

  async executer(
    id: string,
    questionId: string,
    nouvellePositionAffichee: number,
  ): Promise<ResultatReordonnerQuestionModeleSession> {
    const modele = await this.repository.findById(id);
    if (!modele) {
      return { type: 'introuvable' };
    }
    const idsActifs = await chargerIdsQuestionsActives(this.referentiel);
    // nouvellePositionAffichee est toujours définie (paramètre requis) : positionDansSelectionComplete
    // ne renvoie undefined qu'en réponse à une position affichée elle-même undefined.
    const nouvellePosition = positionDansSelectionComplete(
      modele.selection.questionIds,
      idsActifs,
      nouvellePositionAffichee,
    ) as number;
    const resultat = modele.reordonnerQuestion(questionId, nouvellePosition);
    if (resultat.estEchec) {
      return { type: 'question_introuvable' };
    }
    await this.repository.save(modele);
    return { type: 'reordonnee', modele };
  }
}
