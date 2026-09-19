import { ReferentielRepository } from '../../referentiel/domain/referentiel.repository';
import { ModeleCollecte } from '../domain/modele-collecte';
import { ModeleCollecteRepository } from '../domain/modele-collecte.repository';
import { QuestionDejaSelectionneeError } from '../domain/selection';
import {
  chargerIdsQuestionsActives,
  positionDansSelectionComplete,
} from '../../shared-kernel/position-affichee';

export type ResultatAjouterThemeModeleCollecte =
  | { type: 'introuvable' }
  | { type: 'invalide'; erreur: QuestionDejaSelectionneeError }
  | { type: 'ajoute'; modele: ModeleCollecte };

export class AjouterThemeModeleCollecte {
  constructor(
    private readonly repository: ModeleCollecteRepository,
    private readonly referentiel: ReferentielRepository,
  ) {}

  async executer(
    id: string,
    questionIds: string[],
    positionAffichee?: number,
  ): Promise<ResultatAjouterThemeModeleCollecte> {
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
