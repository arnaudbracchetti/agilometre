import { ChangeSet } from '../domain/change-set';
import { ReferentielRepository } from '../domain/referentiel.repository';
import {
  ErreurParsingReferentiel,
  parseReferentielYaml,
} from '../infrastructure/referentiel-yaml.parser';

export type ResultatPreview =
  | { type: 'invalide'; erreurs: ErreurParsingReferentiel[] }
  | { type: 'valide'; changeSet: ChangeSet };

export class PreviewImportReferentiel {
  constructor(private readonly repository: ReferentielRepository) {}

  async executer(yamlBrut: string): Promise<ResultatPreview> {
    const resultatParsing = parseReferentielYaml(yamlBrut);
    if (resultatParsing.type === 'invalide') {
      return { type: 'invalide', erreurs: resultatParsing.erreurs };
    }

    const referentiel = await this.repository.charger();
    const changeSet = referentiel.calculerChangements(resultatParsing.themes);
    return { type: 'valide', changeSet };
  }
}
