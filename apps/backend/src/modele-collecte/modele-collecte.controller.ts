import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  LigneBibliothequeModeleCollecteDto,
  ModeleCollecteDto,
  SelectionQuestionDto,
} from '@agilometre/shared';
import { ModeleCollecte } from './domain/modele-collecte';
import { Question } from '../referentiel/domain/question';
import { Theme } from '../referentiel/domain/theme';
import { CreerModeleCollecte } from './application/creer-modele-collecte.usecase';
import { RenommerModeleCollecte } from './application/renommer-modele-collecte.usecase';
import { AjouterQuestionModeleCollecte } from './application/ajouter-question-modele-collecte.usecase';
import { AjouterThemeModeleCollecte } from './application/ajouter-theme-modele-collecte.usecase';
import { RetirerQuestionModeleCollecte } from './application/retirer-question-modele-collecte.usecase';
import { ReordonnerQuestionModeleCollecte } from './application/reordonner-question-modele-collecte.usecase';
import { DupliquerModeleCollecte } from './application/dupliquer-modele-collecte.usecase';
import { SupprimerModeleCollecte } from './application/supprimer-modele-collecte.usecase';
import { ListerModelesCollecte } from './application/lister-modeles-collecte.usecase';
import {
  ObtenirModeleCollecteDetail,
  ResultatObtenirModeleCollecteDetail,
} from './application/obtenir-modele-collecte-detail.usecase';
import {
  AjouterQuestionModeleCollecteDto,
  AjouterThemeModeleCollecteDto,
  CreerModeleCollecteDto,
  RenommerModeleCollecteDto,
  ReordonnerQuestionModeleCollecteDto,
} from './modele-collecte.dto';
import { Requiert } from '../auth/decorators/requiert.decorator';

/**
 * `selectionEnrichie` porte déjà les Questions actives dans l'ordre de la Sélection
 * (ModeleCollecte.selectionEnrichie) — pas besoin de re-parcourir modele.selection.questionIds ici.
 */
function versModeleCollecteDto(
  modele: ModeleCollecte,
  selectionEnrichie: Question[],
  themesActifs: Theme[],
): ModeleCollecteDto {
  const libelleParThemeId = new Map(
    themesActifs.map((theme) => [theme.id, theme.libelle] as const),
  );
  const selection: SelectionQuestionDto[] = selectionEnrichie.map(
    (question) => ({
      questionId: question.id,
      libelle: question.libelle,
      themeId: question.themeId,
      themeLibelle: libelleParThemeId.get(question.themeId) ?? '',
    }),
  );
  return {
    id: modele.id,
    nom: modele.nom,
    selection,
  };
}

@Requiert('gererModelesCollecte')
@Controller('modeles-collecte')
export class ModeleCollecteController {
  constructor(
    private readonly creerModeleCollecte: CreerModeleCollecte,
    private readonly renommerModeleCollecte: RenommerModeleCollecte,
    private readonly ajouterQuestionModeleCollecte: AjouterQuestionModeleCollecte,
    private readonly ajouterThemeModeleCollecte: AjouterThemeModeleCollecte,
    private readonly retirerQuestionModeleCollecte: RetirerQuestionModeleCollecte,
    private readonly reordonnerQuestionModeleCollecte: ReordonnerQuestionModeleCollecte,
    private readonly dupliquerModeleCollecte: DupliquerModeleCollecte,
    private readonly supprimerModeleCollecte: SupprimerModeleCollecte,
    private readonly listerModelesCollecte: ListerModelesCollecte,
    private readonly obtenirModeleCollecteDetail: ObtenirModeleCollecteDetail,
  ) {}

  @Get()
  async lister(): Promise<LigneBibliothequeModeleCollecteDto[]> {
    const lignes = await this.listerModelesCollecte.executer();
    return lignes.map((ligne) => ({
      id: ligne.id,
      nom: ligne.nom,
      nbQuestionsActives: ligne.nbQuestionsActives,
      themesCouverts: ligne.themesCouverts,
      misAJourLe: ligne.misAJourLe.toISOString(),
    }));
  }

  @Post()
  async creer(@Body() dto: CreerModeleCollecteDto): Promise<ModeleCollecteDto> {
    const resultat = await this.creerModeleCollecte.executer(dto.nom);
    if (resultat.type === 'invalide') {
      throw new BadRequestException(resultat.erreur.message);
    }
    return this.rechargerDetail(resultat.modele.id);
  }

  @Get(':id')
  async obtenir(@Param('id') id: string): Promise<ModeleCollecteDto> {
    const resultat = await this.obtenirModeleCollecteDetail.executer(id);
    return this.versDtoOuIntrouvable(id, resultat);
  }

  @Patch(':id')
  async renommer(
    @Param('id') id: string,
    @Body() dto: RenommerModeleCollecteDto,
  ): Promise<ModeleCollecteDto> {
    const resultat = await this.renommerModeleCollecte.executer(id, dto.nom);
    if (resultat.type === 'introuvable') {
      throw new NotFoundException(`Modèle de collecte ${id} introuvable`);
    }
    if (resultat.type === 'invalide') {
      throw new BadRequestException(resultat.erreur.message);
    }
    return this.rechargerDetail(id);
  }

  @Post(':id/questions')
  async ajouterQuestion(
    @Param('id') id: string,
    @Body() dto: AjouterQuestionModeleCollecteDto,
  ): Promise<ModeleCollecteDto> {
    const resultat = await this.ajouterQuestionModeleCollecte.executer(
      id,
      dto.questionId,
      dto.position,
    );
    if (resultat.type === 'introuvable') {
      throw new NotFoundException(`Modèle de collecte ${id} introuvable`);
    }
    if (resultat.type === 'invalide') {
      throw new ConflictException(resultat.erreur.message);
    }
    return this.rechargerDetail(id);
  }

  @Post(':id/themes')
  async ajouterTheme(
    @Param('id') id: string,
    @Body() dto: AjouterThemeModeleCollecteDto,
  ): Promise<ModeleCollecteDto> {
    const resultat = await this.ajouterThemeModeleCollecte.executer(
      id,
      dto.questionIds,
      dto.position,
    );
    if (resultat.type === 'introuvable') {
      throw new NotFoundException(`Modèle de collecte ${id} introuvable`);
    }
    if (resultat.type === 'invalide') {
      throw new ConflictException(resultat.erreur.message);
    }
    return this.rechargerDetail(id);
  }

  @Delete(':id/questions/:questionId')
  async retirerQuestion(
    @Param('id') id: string,
    @Param('questionId') questionId: string,
  ): Promise<ModeleCollecteDto> {
    const resultat = await this.retirerQuestionModeleCollecte.executer(
      id,
      questionId,
    );
    if (resultat.type === 'introuvable') {
      throw new NotFoundException(`Modèle de collecte ${id} introuvable`);
    }
    if (resultat.type === 'question_introuvable') {
      throw new NotFoundException(
        `Question ${questionId} absente de la Sélection`,
      );
    }
    return this.rechargerDetail(id);
  }

  @Patch(':id/questions/:questionId')
  async reordonnerQuestion(
    @Param('id') id: string,
    @Param('questionId') questionId: string,
    @Body() dto: ReordonnerQuestionModeleCollecteDto,
  ): Promise<ModeleCollecteDto> {
    const resultat = await this.reordonnerQuestionModeleCollecte.executer(
      id,
      questionId,
      dto.position,
    );
    if (resultat.type === 'introuvable') {
      throw new NotFoundException(`Modèle de collecte ${id} introuvable`);
    }
    if (resultat.type === 'question_introuvable') {
      throw new NotFoundException(
        `Question ${questionId} absente de la Sélection`,
      );
    }
    return this.rechargerDetail(id);
  }

  @Post(':id/dupliquer')
  async dupliquer(@Param('id') id: string): Promise<ModeleCollecteDto> {
    const resultat = await this.dupliquerModeleCollecte.executer(id);
    if (resultat.type === 'introuvable') {
      throw new NotFoundException(`Modèle de collecte ${id} introuvable`);
    }
    return this.rechargerDetail(resultat.modele.id);
  }

  @Delete(':id')
  async supprimer(@Param('id') id: string): Promise<void> {
    const resultat = await this.supprimerModeleCollecte.executer(id);
    if (resultat.type === 'introuvable') {
      throw new NotFoundException(`Modèle de collecte ${id} introuvable`);
    }
  }

  /** Recharge le détail enrichi après une mutation, pour renvoyer une Sélection à jour et complète. */
  private async rechargerDetail(id: string): Promise<ModeleCollecteDto> {
    const resultat = await this.obtenirModeleCollecteDetail.executer(id);
    return this.versDtoOuIntrouvable(id, resultat);
  }

  private versDtoOuIntrouvable(
    id: string,
    resultat: ResultatObtenirModeleCollecteDetail,
  ): ModeleCollecteDto {
    if (resultat.type === 'introuvable') {
      throw new NotFoundException(`Modèle de collecte ${id} introuvable`);
    }
    return versModeleCollecteDto(
      resultat.modele,
      resultat.selectionEnrichie,
      resultat.themesActifs,
    );
  }
}
