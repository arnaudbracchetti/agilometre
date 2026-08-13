import { Referentiel } from './referentiel';

export interface ReferentielRepository {
  charger(): Promise<Referentiel>;
  sauvegarder(referentiel: Referentiel): Promise<void>;
}
