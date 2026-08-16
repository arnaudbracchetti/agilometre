import { EquipeRepository } from '../../organisation/domain/equipe.repository';
import { Question } from '../../referentiel/domain/question';
import { ReferentielRepository } from '../../referentiel/domain/referentiel.repository';
import { Theme } from '../../referentiel/domain/theme';
import { Session } from '../domain/session';
import { SessionRepository } from '../domain/session.repository';

export type ResultatObtenirSessionDetail =
  | { type: 'introuvable' }
  | {
      type: 'ok';
      session: Session;
      equipeNom: string;
      selectionEnrichie: Question[];
      themesActifs: Theme[];
    };

export class ObtenirSessionDetail {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly equipes: EquipeRepository,
    private readonly referentiel: ReferentielRepository,
  ) {}

  async executer(id: string): Promise<ResultatObtenirSessionDetail> {
    const session = await this.sessions.findById(id);
    if (!session) {
      return { type: 'introuvable' };
    }
    // L'Équipe est chargée avec succès à la création (CreerSession) ; on ne revalide pas son
    // existence ici — un roster manquant n'empêche pas d'afficher le détail de la Session.
    const equipe = await this.equipes.findById(session.equipeId);
    const referentiel = await this.referentiel.charger();
    const themesActifs = referentiel.themesActifs();
    return {
      type: 'ok',
      session,
      equipeNom: equipe?.nom ?? '',
      selectionEnrichie: session.selectionEnrichie(referentiel),
      themesActifs,
    };
  }
}
