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
  LigneListeSessionDto,
  SelectionQuestionDto,
  SessionDto,
  StatutSession as StatutSessionDto,
} from '@agilometre/shared';
import { Question } from '../referentiel/domain/question';
import { Theme } from '../referentiel/domain/theme';
import { Session, StatutSession } from './domain/session';
import { LigneListeSession } from './domain/session-liste.query';
import { CreerSession } from './application/creer-session.usecase';
import { AjouterQuestionSession } from './application/ajouter-question-session.usecase';
import { AjouterThemeSession } from './application/ajouter-theme-session.usecase';
import { RetirerQuestionSession } from './application/retirer-question-session.usecase';
import { ReordonnerQuestionSession } from './application/reordonner-question-session.usecase';
import { ListerSessions } from './application/lister-sessions.usecase';
import {
  ObtenirSessionDetail,
  ResultatObtenirSessionDetail,
} from './application/obtenir-session-detail.usecase';
import {
  AjouterQuestionSessionDto,
  AjouterThemeSessionDto,
  CreerSessionDto,
  ReordonnerQuestionSessionDto,
} from './session.dto';

/** Le domaine ignore délibérément `@agilometre/shared` (frontière API) — mapping explicite ici. */
const STATUT_VERS_DTO: Record<StatutSession, StatutSessionDto> = {
  OUVERTE: StatutSessionDto.Ouverte,
  CLOTUREE: StatutSessionDto.Cloturee,
};

/**
 * `selectionEnrichie` porte déjà les Questions actives dans l'ordre de la Sélection
 * (Session.selectionEnrichie) — pas besoin de re-parcourir session.selection.questionIds ici.
 */
function versSessionDto(
  session: Session,
  equipeNom: string,
  selectionEnrichie: Question[],
  themesActifs: Theme[],
): SessionDto {
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
    id: session.id,
    equipeId: session.equipeId,
    equipeNom,
    date: session.date.toISOString(),
    statut: STATUT_VERS_DTO[session.statut],
    modeleSessionId: session.modeleSessionId,
    verrouillee: session.estVerrouillee(),
    selection,
  };
}

@Controller('sessions')
export class SessionAnimeeController {
  constructor(
    private readonly creerSession: CreerSession,
    private readonly ajouterQuestionSession: AjouterQuestionSession,
    private readonly ajouterThemeSession: AjouterThemeSession,
    private readonly retirerQuestionSession: RetirerQuestionSession,
    private readonly reordonnerQuestionSession: ReordonnerQuestionSession,
    private readonly listerSessions: ListerSessions,
    private readonly obtenirSessionDetail: ObtenirSessionDetail,
  ) {}

  @Get()
  async lister(): Promise<LigneListeSessionDto[]> {
    const lignes = await this.listerSessions.executer();
    return lignes.map((ligne: LigneListeSession) => ({
      id: ligne.id,
      equipeNom: ligne.equipeNom,
      date: ligne.date.toISOString(),
      statut: STATUT_VERS_DTO[ligne.statut],
      nbQuestions: ligne.nbQuestions,
      modeleSessionNom: ligne.modeleSessionNom,
    }));
  }

  @Post()
  async creer(@Body() dto: CreerSessionDto): Promise<SessionDto> {
    const resultat = await this.creerSession.executer(
      dto.equipeId,
      new Date(dto.date),
      dto.modeleSessionId,
    );
    if (resultat.type === 'equipe_introuvable') {
      throw new NotFoundException(`Équipe ${dto.equipeId} introuvable`);
    }
    if (resultat.type === 'modele_introuvable') {
      throw new NotFoundException(
        `Modèle de session ${dto.modeleSessionId} introuvable`,
      );
    }
    if (resultat.type === 'invalide') {
      throw new BadRequestException(resultat.erreur.message);
    }
    return this.rechargerDetail(resultat.session.id);
  }

  @Get(':id')
  async obtenir(@Param('id') id: string): Promise<SessionDto> {
    const resultat = await this.obtenirSessionDetail.executer(id);
    return this.versDtoOuIntrouvable(id, resultat);
  }

  @Post(':id/questions')
  async ajouterQuestion(
    @Param('id') id: string,
    @Body() dto: AjouterQuestionSessionDto,
  ): Promise<SessionDto> {
    const resultat = await this.ajouterQuestionSession.executer(
      id,
      dto.questionId,
      dto.position,
    );
    if (resultat.type === 'introuvable') {
      throw new NotFoundException(`Session ${id} introuvable`);
    }
    if (resultat.type === 'invalide') {
      throw new ConflictException(resultat.erreur.message);
    }
    return this.rechargerDetail(id);
  }

  @Post(':id/themes')
  async ajouterTheme(
    @Param('id') id: string,
    @Body() dto: AjouterThemeSessionDto,
  ): Promise<SessionDto> {
    const resultat = await this.ajouterThemeSession.executer(
      id,
      dto.questionIds,
      dto.position,
    );
    if (resultat.type === 'introuvable') {
      throw new NotFoundException(`Session ${id} introuvable`);
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
  ): Promise<SessionDto> {
    const resultat = await this.retirerQuestionSession.executer(id, questionId);
    if (resultat.type === 'introuvable') {
      throw new NotFoundException(`Session ${id} introuvable`);
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
    @Body() dto: ReordonnerQuestionSessionDto,
  ): Promise<SessionDto> {
    const resultat = await this.reordonnerQuestionSession.executer(
      id,
      questionId,
      dto.position,
    );
    if (resultat.type === 'introuvable') {
      throw new NotFoundException(`Session ${id} introuvable`);
    }
    if (resultat.type === 'question_introuvable') {
      throw new NotFoundException(
        `Question ${questionId} absente de la Sélection`,
      );
    }
    if (resultat.type === 'verrouillee') {
      throw new ConflictException(resultat.erreur.message);
    }
    return this.rechargerDetail(id);
  }

  /** Recharge le détail enrichi après une mutation, pour renvoyer une Sélection à jour et complète. */
  private async rechargerDetail(id: string): Promise<SessionDto> {
    const resultat = await this.obtenirSessionDetail.executer(id);
    return this.versDtoOuIntrouvable(id, resultat);
  }

  private versDtoOuIntrouvable(
    id: string,
    resultat: ResultatObtenirSessionDetail,
  ): SessionDto {
    if (resultat.type === 'introuvable') {
      throw new NotFoundException(`Session ${id} introuvable`);
    }
    return versSessionDto(
      resultat.session,
      resultat.equipeNom,
      resultat.selectionEnrichie,
      resultat.themesActifs,
    );
  }
}
