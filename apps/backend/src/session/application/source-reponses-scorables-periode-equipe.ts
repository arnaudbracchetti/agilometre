import { ReponseRepository } from '../../reponse/domain/reponse.repository';
import {
  ReponseScorable,
  SourceReponsesScorables,
} from '../../scoring/domain/source-reponses-scorables';
import { EtatToursQuery } from '../domain/etat-tours.query';
import { Session } from '../domain/session';
import { SourceReponsesScorablesSession } from './source-reponses-scorables-session';

/**
 * Implémentation du port "source de Réponses scorables" (ADR-0018) à la Portée périodique : délègue
 * à `SourceReponsesScorablesSession` pour chaque Session close, puis concatène les résultats.
 */
export class SourceReponsesScorablesPeriodeEquipe implements SourceReponsesScorables {
  constructor(
    private readonly sessions: readonly Session[],
    private readonly etatTours: EtatToursQuery,
    private readonly reponses: ReponseRepository,
  ) {}

  async obtenirReponsesScorables(): Promise<ReponseScorable[]> {
    const parSession = await Promise.all(
      this.sessions.map((session) =>
        new SourceReponsesScorablesSession(
          session,
          this.etatTours,
          this.reponses,
        ).obtenirReponsesScorables(),
      ),
    );
    return parSession.flat();
  }
}
