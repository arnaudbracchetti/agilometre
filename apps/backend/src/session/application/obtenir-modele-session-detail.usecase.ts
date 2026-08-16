import { Question } from '../../referentiel/domain/question';
import { ReferentielRepository } from '../../referentiel/domain/referentiel.repository';
import { Theme } from '../../referentiel/domain/theme';
import { ModeleSession } from '../domain/modele-session';
import { ModeleSessionRepository } from '../domain/modele-session.repository';

export type ResultatObtenirModeleSessionDetail =
  | { type: 'introuvable' }
  | {
      type: 'ok';
      modele: ModeleSession;
      selectionEnrichie: Question[];
      themesActifs: Theme[];
    };

export class ObtenirModeleSessionDetail {
  constructor(
    private readonly modeles: ModeleSessionRepository,
    private readonly referentiel: ReferentielRepository,
  ) {}

  async executer(id: string): Promise<ResultatObtenirModeleSessionDetail> {
    const modele = await this.modeles.findById(id);
    if (!modele) {
      return { type: 'introuvable' };
    }
    const referentiel = await this.referentiel.charger();
    const themesActifs = referentiel.themesActifs();
    return {
      type: 'ok',
      modele,
      selectionEnrichie: modele.selectionEnrichie(referentiel),
      themesActifs,
    };
  }
}
