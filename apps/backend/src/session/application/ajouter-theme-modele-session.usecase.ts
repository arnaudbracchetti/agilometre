import { ReferentielRepository } from '../../referentiel/domain/referentiel.repository';
import { ModeleSession } from '../domain/modele-session';
import { ModeleSessionRepository } from '../domain/modele-session.repository';
import { QuestionDejaSelectionneeError } from '../domain/selection';
import {
  chargerIdsQuestionsActives,
  positionDansSelectionComplete,
} from './position-affichee';

export type ResultatAjouterThemeModeleSession =
  | { type: 'introuvable' }
  | { type: 'invalide'; erreur: QuestionDejaSelectionneeError }
  | { type: 'ajoute'; modele: ModeleSession };

export class AjouterThemeModeleSession {
  constructor(
    private readonly repository: ModeleSessionRepository,
    private readonly referentiel: ReferentielRepository,
  ) {}

  async executer(
    id: string,
    questionIds: string[],
    positionAffichee?: number,
  ): Promise<ResultatAjouterThemeModeleSession> {
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
    const resultat = modele.ajouterTheme(questionIds, position);
    if (resultat.estEchec) {
      return { type: 'invalide', erreur: resultat.erreur };
    }
    await this.repository.save(modele);
    return { type: 'ajoute', modele };
  }
}
