import { ChangeSet } from '../domain/change-set';
import { ReferentielRepository } from '../domain/referentiel.repository';
import {
  ErreurParsingReferentiel,
  parseReferentielYaml,
} from '../infrastructure/referentiel-yaml.parser';

export type ResultatApply =
  | { type: 'invalide'; erreurs: ErreurParsingReferentiel[] }
  | { type: 'applique'; changeSet: ChangeSet };

export class ApplyImportReferentiel {
  constructor(private readonly repository: ReferentielRepository) {}

  async executer(yamlBrut: string): Promise<ResultatApply> {
    const resultatParsing = parseReferentielYaml(yamlBrut);
    if (resultatParsing.type === 'invalide') {
      return { type: 'invalide', erreurs: resultatParsing.erreurs };
    }

    const referentiel = await this.repository.charger();
    const changeSet = referentiel.calculerChangements(resultatParsing.themes);
    referentiel.appliquerChangements(changeSet);
    await this.repository.sauvegarder(referentiel);
    return { type: 'applique', changeSet };
  }
}
