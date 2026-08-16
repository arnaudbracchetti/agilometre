import { ReferentielRepository } from '../../referentiel/domain/referentiel.repository';
import { QuestionDejaSelectionneeError } from '../domain/selection';
import { Session, SessionVerrouilleeError } from '../domain/session';
import { SessionRepository } from '../domain/session.repository';
import {
  chargerIdsQuestionsActives,
  positionDansSelectionComplete,
} from './position-affichee';

export type ResultatAjouterThemeSession =
  | { type: 'introuvable' }
  | {
      type: 'invalide';
      erreur: QuestionDejaSelectionneeError | SessionVerrouilleeError;
    }
  | { type: 'ajoute'; session: Session };

export class AjouterThemeSession {
  constructor(
    private readonly repository: SessionRepository,
    private readonly referentiel: ReferentielRepository,
  ) {}

  async executer(
    id: string,
    questionIds: string[],
    positionAffichee?: number,
  ): Promise<ResultatAjouterThemeSession> {
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
    const resultat = session.ajouterTheme(questionIds, position);
    if (resultat.estEchec) {
      return { type: 'invalide', erreur: resultat.erreur };
    }
    await this.repository.save(session);
    return { type: 'ajoute', session };
  }
}
