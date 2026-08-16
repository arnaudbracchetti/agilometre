import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
} from '@nestjs/common';
import { ReferentielDto, ThemeReferentielDto } from '@agilometre/shared';
import { Theme } from './domain/theme';
import { ApplyImportReferentiel } from './application/apply-import-referentiel.usecase';
import { PreviewImportReferentiel } from './application/preview-import-referentiel.usecase';
import { ObtenirReferentielActif } from './application/obtenir-referentiel-actif.usecase';

function versThemeDto(theme: Theme): ThemeReferentielDto {
  return {
    id: theme.id,
    libelle: theme.libelle,
    questions: theme.questions.map((question) => ({
      id: question.id,
      libelle: question.libelle,
      themeId: question.themeId,
      options: question.options.map((option) => ({
        libelle: option.libelle,
        niveau: option.niveau.valeur,
      })),
    })),
  };
}

@Controller('referentiel')
export class ReferentielController {
  constructor(
    private readonly previewImportReferentiel: PreviewImportReferentiel,
    private readonly applyImportReferentiel: ApplyImportReferentiel,
    private readonly obtenirReferentielActif: ObtenirReferentielActif,
  ) {}

  @Get()
  async obtenir(): Promise<ReferentielDto> {
    const themes = await this.obtenirReferentielActif.executer();
    return { themes: themes.map(versThemeDto) };
  }

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
