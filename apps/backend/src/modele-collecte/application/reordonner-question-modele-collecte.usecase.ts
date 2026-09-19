import { ReferentielRepository } from '../../referentiel/domain/referentiel.repository';
import { ModeleCollecte } from '../domain/modele-collecte';
import { ModeleCollecteRepository } from '../domain/modele-collecte.repository';
import {
  chargerIdsQuestionsActives,
  positionDansSelectionComplete,
} from '../../shared-kernel/position-affichee';

export type ResultatReordonnerQuestionModeleCollecte =
  | { type: 'introuvable' }
  | { type: 'question_introuvable' }
  | { type: 'reordonnee'; modele: ModeleCollecte };

export class ReordonnerQuestionModeleCollecte {
  constructor(
    private readonly repository: ModeleCollecteRepository,
    private readonly referentiel: ReferentielRepository,
  ) {}

  async executer(
    id: string,
    questionId: string,
    nouvellePositionAffichee: number,
  ): Promise<ResultatReordonnerQuestionModeleCollecte> {
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
