import { Question } from '../../referentiel/domain/question';
import { ReferentielRepository } from '../../referentiel/domain/referentiel.repository';
import { Theme } from '../../referentiel/domain/theme';
import { CampagnePouls } from '../domain/campagne-pouls';
import { CampagnePoulsRepository } from '../domain/campagne-pouls.repository';

export type ResultatObtenirCampagnePoulsEquipe =
  | { type: 'aucune_campagne' }
  | {
      type: 'ok';
      campagne: CampagnePouls;
      panelEnrichi: Question[];
      themesActifs: Theme[];
    };

export class ObtenirCampagnePoulsEquipe {
  constructor(
    private readonly campagnes: CampagnePoulsRepository,
    private readonly referentiel: ReferentielRepository,
  ) {}

  async executer(
    equipeId: string,
  ): Promise<ResultatObtenirCampagnePoulsEquipe> {
    const campagne = await this.campagnes.findParEquipe(equipeId);
    if (!campagne) {
      return { type: 'aucune_campagne' };
    }
    const referentiel = await this.referentiel.charger();
    return {
      type: 'ok',
      campagne,
      panelEnrichi: campagne.panelEnrichi(referentiel),
      themesActifs: referentiel.themesActifs(),
    };
  }
}
