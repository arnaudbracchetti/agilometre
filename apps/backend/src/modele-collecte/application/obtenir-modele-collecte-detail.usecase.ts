import { Question } from '../../referentiel/domain/question';
import { ReferentielRepository } from '../../referentiel/domain/referentiel.repository';
import { Theme } from '../../referentiel/domain/theme';
import { ModeleCollecte } from '../domain/modele-collecte';
import { ModeleCollecteRepository } from '../domain/modele-collecte.repository';

export type ResultatObtenirModeleCollecteDetail =
  | { type: 'introuvable' }
  | {
      type: 'ok';
      modele: ModeleCollecte;
      selectionEnrichie: Question[];
      themesActifs: Theme[];
    };

export class ObtenirModeleCollecteDetail {
  constructor(
    private readonly modeles: ModeleCollecteRepository,
    private readonly referentiel: ReferentielRepository,
  ) {}

  async executer(id: string): Promise<ResultatObtenirModeleCollecteDetail> {
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
