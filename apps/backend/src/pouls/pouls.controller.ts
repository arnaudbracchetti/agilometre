import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { CampagnePoulsDto, SelectionQuestionDto } from '@agilometre/shared';
import { Question } from '../referentiel/domain/question';
import { Theme } from '../referentiel/domain/theme';
import { CampagnePouls } from './domain/campagne-pouls';
import { CreerCampagnePouls } from './application/creer-campagne-pouls.usecase';
import { ObtenirCampagnePoulsEquipe } from './application/obtenir-campagne-pouls-equipe.usecase';
import { CreerCampagnePoulsDto } from './pouls.dto';
import { Requiert } from '../auth/decorators/requiert.decorator';

function versCampagnePoulsDto(
  campagne: CampagnePouls,
  panelEnrichi: Question[],
  themesActifs: Theme[],
): CampagnePoulsDto {
  const libelleParThemeId = new Map(
    themesActifs.map((theme) => [theme.id, theme.libelle] as const),
  );
  const panel: SelectionQuestionDto[] = panelEnrichi.map((question) => ({
    questionId: question.id,
    libelle: question.libelle,
    themeId: question.themeId,
    themeLibelle: libelleParThemeId.get(question.themeId) ?? '',
  }));
  return {
    id: campagne.id,
    equipeId: campagne.equipeId,
    statut: campagne.statut,
    modeleCollecteId: campagne.modeleCollecteId,
    joursEnvoi: [...campagne.rythme.joursEnvoi],
    heureEnvoi: campagne.rythme.heureEnvoi,
    questionsParEnvoi: campagne.questionsParEnvoi,
    panel,
  };
}

@Requiert('gererCampagnesPouls')
@Controller('organisation/equipes/:equipeId/campagne-pouls')
export class PoulsController {
  constructor(
    private readonly creerCampagnePouls: CreerCampagnePouls,
    private readonly obtenirCampagnePoulsEquipe: ObtenirCampagnePoulsEquipe,
  ) {}

  @Post()
  async creer(
    @Param('equipeId') equipeId: string,
    @Body() dto: CreerCampagnePoulsDto,
  ): Promise<CampagnePoulsDto> {
    const resultat = await this.creerCampagnePouls.executer(
      equipeId,
      dto.modeleCollecteId,
      dto.joursEnvoi,
      dto.heureEnvoi,
      dto.questionsParEnvoi,
    );
    if (resultat.type === 'equipe_introuvable') {
      throw new NotFoundException(`Équipe ${equipeId} introuvable`);
    }
    if (resultat.type === 'modele_introuvable') {
      throw new NotFoundException(
        `Modèle de collecte ${dto.modeleCollecteId} introuvable`,
      );
    }
    if (resultat.type === 'campagne_existante') {
      throw new ConflictException(
        `Une Campagne de pouls non-Terminée existe déjà pour l'Équipe ${equipeId}`,
      );
    }
    if (resultat.type === 'invalide') {
      throw new BadRequestException(resultat.erreur.message);
    }
    // La Campagne vient d'être créée avec succès : le détail existe forcément.
    return (await this.rechargerDetail(equipeId))!;
  }

  @Get()
  async obtenir(
    @Param('equipeId') equipeId: string,
  ): Promise<CampagnePoulsDto | null> {
    return this.rechargerDetail(equipeId);
  }

  /** Recharge le détail enrichi (Panel résolu contre le Référentiel actif) après une mutation. */
  private async rechargerDetail(
    equipeId: string,
  ): Promise<CampagnePoulsDto | null> {
    const resultat = await this.obtenirCampagnePoulsEquipe.executer(equipeId);
    if (resultat.type === 'aucune_campagne') {
      return null;
    }
    return versCampagnePoulsDto(
      resultat.campagne,
      resultat.panelEnrichi,
      resultat.themesActifs,
    );
  }
}
