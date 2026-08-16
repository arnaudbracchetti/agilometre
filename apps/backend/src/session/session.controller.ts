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
  LigneBibliothequeModeleSessionDto,
  ModeleSessionDto,
  SelectionQuestionDto,
} from '@agilometre/shared';
import { ModeleSession } from './domain/modele-session';
import { Question } from '../referentiel/domain/question';
import { Theme } from '../referentiel/domain/theme';
import { CreerModeleSession } from './application/creer-modele-session.usecase';
import { RenommerModeleSession } from './application/renommer-modele-session.usecase';
import { AjouterQuestionModeleSession } from './application/ajouter-question-modele-session.usecase';
import { AjouterThemeModeleSession } from './application/ajouter-theme-modele-session.usecase';
import { RetirerQuestionModeleSession } from './application/retirer-question-modele-session.usecase';
import { ReordonnerQuestionModeleSession } from './application/reordonner-question-modele-session.usecase';
import { DupliquerModeleSession } from './application/dupliquer-modele-session.usecase';
import { SupprimerModeleSession } from './application/supprimer-modele-session.usecase';
import { ListerModelesSession } from './application/lister-modeles-session.usecase';
import {
  ObtenirModeleSessionDetail,
  ResultatObtenirModeleSessionDetail,
} from './application/obtenir-modele-session-detail.usecase';
import {
  AjouterQuestionModeleSessionDto,
  AjouterThemeModeleSessionDto,
  CreerModeleSessionDto,
  RenommerModeleSessionDto,
  ReordonnerQuestionModeleSessionDto,
} from './modele-session.dto';

/**
 * `selectionEnrichie` porte déjà les Questions actives dans l'ordre de la Sélection
 * (ModeleSession.selectionEnrichie) — pas besoin de re-parcourir modele.selection.questionIds ici.
 */
function versModeleSessionDto(
  modele: ModeleSession,
  selectionEnrichie: Question[],
  themesActifs: Theme[],
): ModeleSessionDto {
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

@Controller('modeles-session')
export class SessionController {
  constructor(
    private readonly creerModeleSession: CreerModeleSession,
    private readonly renommerModeleSession: RenommerModeleSession,
    private readonly ajouterQuestionModeleSession: AjouterQuestionModeleSession,
    private readonly ajouterThemeModeleSession: AjouterThemeModeleSession,
    private readonly retirerQuestionModeleSession: RetirerQuestionModeleSession,
    private readonly reordonnerQuestionModeleSession: ReordonnerQuestionModeleSession,
    private readonly dupliquerModeleSession: DupliquerModeleSession,
    private readonly supprimerModeleSession: SupprimerModeleSession,
    private readonly listerModelesSession: ListerModelesSession,
    private readonly obtenirModeleSessionDetail: ObtenirModeleSessionDetail,
  ) {}

  @Get()
  async lister(): Promise<LigneBibliothequeModeleSessionDto[]> {
    const lignes = await this.listerModelesSession.executer();
    return lignes.map((ligne) => ({
      id: ligne.id,
      nom: ligne.nom,
      nbQuestionsActives: ligne.nbQuestionsActives,
      themesCouverts: ligne.themesCouverts,
      misAJourLe: ligne.misAJourLe.toISOString(),
    }));
  }

  @Post()
  async creer(@Body() dto: CreerModeleSessionDto): Promise<ModeleSessionDto> {
    const resultat = await this.creerModeleSession.executer(dto.nom);
    if (resultat.type === 'invalide') {
      throw new BadRequestException(resultat.erreur.message);
    }
    return this.rechargerDetail(resultat.modele.id);
  }

  @Get(':id')
  async obtenir(@Param('id') id: string): Promise<ModeleSessionDto> {
    const resultat = await this.obtenirModeleSessionDetail.executer(id);
    return this.versDtoOuIntrouvable(id, resultat);
  }

  @Patch(':id')
  async renommer(
    @Param('id') id: string,
    @Body() dto: RenommerModeleSessionDto,
  ): Promise<ModeleSessionDto> {
    const resultat = await this.renommerModeleSession.executer(id, dto.nom);
    if (resultat.type === 'introuvable') {
      throw new NotFoundException(`Modèle de session ${id} introuvable`);
    }
    if (resultat.type === 'invalide') {
      throw new BadRequestException(resultat.erreur.message);
    }
    return this.rechargerDetail(id);
  }

  @Post(':id/questions')
  async ajouterQuestion(
    @Param('id') id: string,
    @Body() dto: AjouterQuestionModeleSessionDto,
  ): Promise<ModeleSessionDto> {
    const resultat = await this.ajouterQuestionModeleSession.executer(
      id,
      dto.questionId,
      dto.position,
    );
    if (resultat.type === 'introuvable') {
      throw new NotFoundException(`Modèle de session ${id} introuvable`);
    }
    if (resultat.type === 'invalide') {
      throw new ConflictException(resultat.erreur.message);
    }
    return this.rechargerDetail(id);
  }

  @Post(':id/themes')
  async ajouterTheme(
    @Param('id') id: string,
    @Body() dto: AjouterThemeModeleSessionDto,
  ): Promise<ModeleSessionDto> {
    const resultat = await this.ajouterThemeModeleSession.executer(
      id,
      dto.questionIds,
      dto.position,
    );
    if (resultat.type === 'introuvable') {
      throw new NotFoundException(`Modèle de session ${id} introuvable`);
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
  ): Promise<ModeleSessionDto> {
    const resultat = await this.retirerQuestionModeleSession.executer(
      id,
      questionId,
    );
    if (resultat.type === 'introuvable') {
      throw new NotFoundException(`Modèle de session ${id} introuvable`);
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
    @Body() dto: ReordonnerQuestionModeleSessionDto,
  ): Promise<ModeleSessionDto> {
    const resultat = await this.reordonnerQuestionModeleSession.executer(
      id,
      questionId,
      dto.position,
    );
    if (resultat.type === 'introuvable') {
      throw new NotFoundException(`Modèle de session ${id} introuvable`);
    }
    if (resultat.type === 'question_introuvable') {
      throw new NotFoundException(
        `Question ${questionId} absente de la Sélection`,
      );
    }
    return this.rechargerDetail(id);
  }

  @Post(':id/dupliquer')
  async dupliquer(@Param('id') id: string): Promise<ModeleSessionDto> {
    const resultat = await this.dupliquerModeleSession.executer(id);
    if (resultat.type === 'introuvable') {
      throw new NotFoundException(`Modèle de session ${id} introuvable`);
    }
    return this.rechargerDetail(resultat.modele.id);
  }

  @Delete(':id')
  async supprimer(@Param('id') id: string): Promise<void> {
    const resultat = await this.supprimerModeleSession.executer(id);
    if (resultat.type === 'introuvable') {
      throw new NotFoundException(`Modèle de session ${id} introuvable`);
    }
  }

  /** Recharge le détail enrichi après une mutation, pour renvoyer une Sélection à jour et complète. */
  private async rechargerDetail(id: string): Promise<ModeleSessionDto> {
    const resultat = await this.obtenirModeleSessionDetail.executer(id);
    return this.versDtoOuIntrouvable(id, resultat);
  }

  private versDtoOuIntrouvable(
    id: string,
    resultat: ResultatObtenirModeleSessionDetail,
  ): ModeleSessionDto {
    if (resultat.type === 'introuvable') {
      throw new NotFoundException(`Modèle de session ${id} introuvable`);
    }
    return versModeleSessionDto(
      resultat.modele,
      resultat.selectionEnrichie,
      resultat.themesActifs,
    );
  }
}
