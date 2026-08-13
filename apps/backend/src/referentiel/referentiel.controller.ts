import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { PreviewImportReferentiel } from './application/preview-import-referentiel.usecase';

@Controller('referentiel')
export class ReferentielController {
  constructor(
    private readonly previewImportReferentiel: PreviewImportReferentiel,
  ) {}

  @Post('import/apercu')
  async previewImport(@Body() yaml: string) {
    const resultat = await this.previewImportReferentiel.executer(yaml);
    if (resultat.type === 'invalide') {
      throw new BadRequestException({ erreurs: resultat.erreurs });
    }
    return resultat.changeSet;
  }
}
