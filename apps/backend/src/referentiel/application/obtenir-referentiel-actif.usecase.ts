import { Theme } from '../domain/theme';
import { ReferentielRepository } from '../domain/referentiel.repository';

export class ObtenirReferentielActif {
  constructor(private readonly repository: ReferentielRepository) {}

  async executer(): Promise<Theme[]> {
    const referentiel = await this.repository.charger();
    return referentiel.themesActifs();
  }
}
