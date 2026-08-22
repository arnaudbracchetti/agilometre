import { ReponseRepository } from '../../reponse/domain/reponse.repository';
import {
  ReponseScorable,
  SourceReponsesScorables,
} from '../../scoring/domain/source-reponses-scorables';
import { EtatToursQuery } from '../domain/etat-tours.query';
import { Session } from '../domain/session';

/**
 * Implémentation du port "source de Réponses scorables" (ADR-0018) à la Portée Session : le
 * dernier Tour clos par Question (`Session.dernierTourClosParQuestion`, seul point de vérité pour
 * "un revote ne compte jamais double, une Sautée jamais"), dont les Réponses réelles sont
 * obtenues via `reponse/` — jamais un accès direct à Prisma ici.
 */
export class SourceReponsesScorablesSession implements SourceReponsesScorables {
  constructor(
    private readonly session: Session,
    private readonly etatTours: EtatToursQuery,
    private readonly reponses: ReponseRepository,
  ) {}

  async obtenirReponsesScorables(): Promise<ReponseScorable[]> {
    const etats = await this.etatTours.listerEtatsDesToursDeLaSession(
      this.session.id,
    );
    const dernierParQuestion = this.session.dernierTourClosParQuestion(etats);
    const tourIds = [...dernierParQuestion.values()].map((tour) => tour.tourId);
    const reponsesTrouvees = await this.reponses.findByTourIds(tourIds);
    return reponsesTrouvees.map((reponse) => ({
      questionId: reponse.questionId,
      niveau: reponse.niveau,
    }));
  }
}
