import { ReferentielRepository } from '../../referentiel/domain/referentiel.repository';
import { ModeleCollecte } from '../domain/modele-collecte';
import { ModeleCollecteRepository } from '../domain/modele-collecte.repository';
import { QuestionDejaSelectionneeError } from '../domain/selection';
import {
  chargerIdsQuestionsActives,
  positionDansSelectionComplete,
} from '../../shared-kernel/position-affichee';

export type ResultatAjouterQuestionModeleCollecte =
  | { type: 'introuvable' }
  | { type: 'invalide'; erreur: QuestionDejaSelectionneeError }
  | { type: 'ajoutee'; modele: ModeleCollecte };

export class AjouterQuestionModeleCollecte {
  constructor(
    private readonly repository: ModeleCollecteRepository,
    private readonly referentiel: ReferentielRepository,
  ) {}

  async executer(
    id: string,
    questionId: string,
    positionAffichee?: number,
  ): Promise<ResultatAjouterQuestionModeleCollecte> {
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
