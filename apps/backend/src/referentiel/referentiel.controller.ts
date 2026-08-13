import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { ApplyImportReferentiel } from './application/apply-import-referentiel.usecase';
import { PreviewImportReferentiel } from './application/preview-import-referentiel.usecase';

@Controller('referentiel')
export class ReferentielController {
  constructor(
    private readonly previewImportReferentiel: PreviewImportReferentiel,
    private readonly applyImportReferentiel: ApplyImportReferentiel,
  ) {}

  @Post('import/apercu')
  async previewImport(@Body() yaml: string) {
    const resultat = await this.previewImportReferentiel.executer(yaml);
    if (resultat.type === 'invalide') {
      throw new BadRequestException({ erreurs: resultat.erreurs });
    }
    return { changeSet: resultat.changeSet, resume: resultat.resume };
  }

  @Post('import/application')
  async applyImport(@Body() yaml: string) {
    const resultat = await this.applyImportReferentiel.executer(yaml);
    if (resultat.type === 'invalide') {
      throw new BadRequestException({ erreurs: resultat.erreurs });
    }
    return resultat.changeSet;
  }
}
