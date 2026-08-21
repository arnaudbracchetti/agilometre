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
import { SkipThrottle } from '@nestjs/throttler';
import {
  LigneListeSessionDto,
  PilotageSessionDto,
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
import { ModifierInfosSession } from './application/modifier-infos-session.usecase';
import { ChangerModeleSession } from './application/changer-modele-session.usecase';
import { SupprimerSession } from './application/supprimer-session.usecase';
import { OuvrirSession } from './application/ouvrir-session.usecase';
import { ObtenirPilotageSession } from './application/obtenir-pilotage-session.usecase';
import { PasserQuestionSuivanteSession } from './application/passer-question-suivante-session.usecase';
import { OuvrirTourDeVote } from './application/ouvrir-tour-de-vote.usecase';
import { CloreTourDeVote } from './application/clore-tour-de-vote.usecase';
import { SauterQuestionSession } from './application/sauter-question-session.usecase';
import { ReactiverQuestionSession } from './application/reactiver-question-session.usecase';
import { TerminerPrematurementSession } from './application/terminer-prematurement-session.usecase';
import {
  versHistoriqueDto,
  versProgressionDto,
  versQuestionCouranteDto,
  versTourClosDto,
  versTourOuvertDto,
} from './question-courante.mapper';
import {
  AjouterQuestionSessionDto,
  AjouterThemeSessionDto,
  ChangerModeleSessionDto,
  CreerSessionDto,
  ModifierInfosSessionDto,
  ReordonnerQuestionSessionDto,
} from './session.dto';

/** Le domaine ignore délibérément `@agilometre/shared` (frontière API) — mapping explicite ici. */
const STATUT_VERS_DTO: Record<StatutSession, StatutSessionDto> = {
  PREPAREE: StatutSessionDto.Preparee,
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
  entiteId: string,
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
    entiteId,
    date: session.date.toISOString(),
    statut: STATUT_VERS_DTO[session.statut],
    modeleSessionId: session.modeleSessionId,
    verrouillee: session.estVerrouillee(),
    code: session.code,
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
    private readonly modifierInfosSession: ModifierInfosSession,
    private readonly changerModeleSession: ChangerModeleSession,
    private readonly supprimerSession: SupprimerSession,
    private readonly ouvrirSession: OuvrirSession,
    private readonly obtenirPilotageSession: ObtenirPilotageSession,
    private readonly passerQuestionSuivanteSession: PasserQuestionSuivanteSession,
    private readonly ouvrirTourDeVote: OuvrirTourDeVote,
    private readonly cloreTourDeVote: CloreTourDeVote,
    private readonly sauterQuestionSession: SauterQuestionSession,
    private readonly reactiverQuestionSession: ReactiverQuestionSession,
    private readonly terminerPrematurementSession: TerminerPrematurementSession,
  ) {}

  @Get()
  async lister(): Promise<LigneListeSessionDto[]> {
    const lignes = await this.listerSessions.executer();
    return lignes.map((ligne: LigneListeSession) => ({
      id: ligne.id,
      equipeNom: ligne.equipeNom,
      date: ligne.date.toISOString(),
      statut: STATUT_VERS_DTO[ligne.statut],
      verrouillee: ligne.verrouillee,
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

  @Post(':id/ouvrir')
  async ouvrir(@Param('id') id: string): Promise<SessionDto> {
    const resultat = await this.ouvrirSession.executer(id);
    if (resultat.type === 'introuvable') {
      throw new NotFoundException(`Session ${id} introuvable`);
    }
    if (resultat.type === 'non_preparee') {
      throw new ConflictException(resultat.erreur.message);
    }
    return this.rechargerDetail(id);
  }

  @Get(':id/pilotage')
  @SkipThrottle()
  async pilotage(@Param('id') id: string): Promise<PilotageSessionDto> {
    return this.rechargerPilotage(id);
  }

  @Post(':id/passer-question-suivante')
  async passerQuestionSuivante(
    @Param('id') id: string,
  ): Promise<PilotageSessionDto> {
    const resultat = await this.passerQuestionSuivanteSession.executer(id);
    if (resultat.type === 'introuvable') {
      throw new NotFoundException(`Session ${id} introuvable`);
    }
    if (resultat.type === 'non_ouverte') {
      throw new ConflictException('La Session doit être ouverte pour avancer');
    }
    if (resultat.type === 'question_courante_non_resolue') {
      throw new ConflictException(
        'La Question courante doit être clôturée ou sautée avant de passer à la suivante',
      );
    }
    return this.rechargerPilotage(id);
  }

  @Post(':id/ouvrir-tour')
  async ouvrirTour(@Param('id') id: string): Promise<PilotageSessionDto> {
    const resultat = await this.ouvrirTourDeVote.executer(id);
    if (resultat.type === 'introuvable') {
      throw new NotFoundException(`Session ${id} introuvable`);
    }
    if (resultat.type === 'non_ouverte') {
      throw new ConflictException(
        'La Session doit être ouverte pour ouvrir un Tour',
      );
    }
    if (resultat.type === 'aucune_question_courante') {
      throw new ConflictException(
        'Aucune Question courante : lancez la Question avant d’ouvrir le vote',
      );
    }
    if (resultat.type === 'tour_deja_ouvert') {
      throw new ConflictException(
        'Un Tour de vote est déjà ouvert sur cette Session',
      );
    }
    return this.rechargerPilotage(id);
  }

  @Post(':id/clore-tour')
  async clorerTour(@Param('id') id: string): Promise<PilotageSessionDto> {
    const resultat = await this.cloreTourDeVote.executer(id);
    if (resultat.type === 'aucun_tour_ouvert') {
      throw new ConflictException(
        'Aucun Tour de vote ouvert sur cette Session',
      );
    }
    return this.rechargerPilotage(id);
  }

  @Post(':id/questions/:questionId/sauter')
  async sauterQuestion(
    @Param('id') id: string,
    @Param('questionId') questionId: string,
  ): Promise<PilotageSessionDto> {
    const resultat = await this.sauterQuestionSession.executer(id, questionId);
    if (resultat.type === 'introuvable') {
      throw new NotFoundException(`Session ${id} introuvable`);
    }
    if (resultat.type === 'question_introuvable') {
      throw new NotFoundException(
        `Question ${questionId} absente de la Sélection`,
      );
    }
    if (resultat.type === 'invalide') {
      throw new ConflictException(resultat.erreur.message);
    }
    return this.rechargerPilotage(id);
  }

  @Post(':id/questions/:questionId/reactiver')
  async reactiverQuestion(
    @Param('id') id: string,
    @Param('questionId') questionId: string,
  ): Promise<PilotageSessionDto> {
    const resultat = await this.reactiverQuestionSession.executer(
      id,
      questionId,
    );
    if (resultat.type === 'introuvable') {
      throw new NotFoundException(`Session ${id} introuvable`);
    }
    if (resultat.type === 'question_introuvable') {
      throw new NotFoundException(
        `Question ${questionId} absente de la Sélection`,
      );
    }
    if (resultat.type === 'invalide') {
      throw new ConflictException(resultat.erreur.message);
    }
    return this.rechargerPilotage(id);
  }

  @Post(':id/terminer-prematurement')
  async terminerPrematurement(
    @Param('id') id: string,
  ): Promise<PilotageSessionDto> {
    const resultat = await this.terminerPrematurementSession.executer(id);
    if (resultat.type === 'introuvable') {
      throw new NotFoundException(`Session ${id} introuvable`);
    }
    if (resultat.type === 'non_ouverte') {
      throw new ConflictException(
        'La Session doit être ouverte pour être terminée prématurément',
      );
    }
    return this.rechargerPilotage(id);
  }

  /** Réutilisé par GET :id/pilotage et les routes qui font évoluer la séance — un seul mapping. */
  private async rechargerPilotage(id: string): Promise<PilotageSessionDto> {
    const resultat = await this.obtenirPilotageSession.executer(id);
    if (resultat.type === 'introuvable') {
      throw new NotFoundException(
        `Aucun pilotage accessible pour la Session ${id}`,
      );
    }
    return {
      statut: STATUT_VERS_DTO[resultat.session.statut],
      code: resultat.session.code as string,
      nbDevicesConnectes: resultat.nbDevicesConnectes,
      questionCourante: versQuestionCouranteDto(resultat.questionCourante),
      tourOuvert: versTourOuvertDto(resultat.tourOuvert),
      dernierTourClos: versTourClosDto(resultat.dernierTourClos),
      historique: versHistoriqueDto(resultat.historique),
      progression: versProgressionDto(resultat.progression),
    };
  }

  @Patch(':id')
  async modifierInfos(
    @Param('id') id: string,
    @Body() dto: ModifierInfosSessionDto,
  ): Promise<SessionDto> {
    const resultat = await this.modifierInfosSession.executer(
      id,
      dto.equipeId,
      new Date(dto.date),
    );
    if (resultat.type === 'introuvable') {
      throw new NotFoundException(`Session ${id} introuvable`);
    }
    if (resultat.type === 'equipe_introuvable') {
      throw new NotFoundException(`Équipe ${dto.equipeId} introuvable`);
    }
    if (resultat.type === 'invalide') {
      throw new BadRequestException(resultat.erreur.message);
    }
    if (resultat.type === 'non_modifiable') {
      throw new ConflictException(resultat.erreur.message);
    }
    return this.rechargerDetail(id);
  }

  @Patch(':id/modele')
  async changerModele(
    @Param('id') id: string,
    @Body() dto: ChangerModeleSessionDto,
  ): Promise<SessionDto> {
    const resultat = await this.changerModeleSession.executer(
      id,
      dto.modeleSessionId,
    );
    if (resultat.type === 'introuvable') {
      throw new NotFoundException(`Session ${id} introuvable`);
    }
    if (resultat.type === 'modele_introuvable') {
      throw new NotFoundException(
        `Modèle de session ${dto.modeleSessionId} introuvable`,
      );
    }
    if (resultat.type === 'non_modifiable') {
      throw new ConflictException(resultat.erreur.message);
    }
    return this.rechargerDetail(id);
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
    if (resultat.type === 'invalide') {
      throw new ConflictException(resultat.erreur.message);
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

  @Delete(':id')
  async supprimer(@Param('id') id: string): Promise<void> {
    const resultat = await this.supprimerSession.executer(id);
    if (resultat.type === 'introuvable') {
      throw new NotFoundException(`Session ${id} introuvable`);
    }
    if (resultat.type === 'non_supprimable') {
      throw new ConflictException(
        'Cette Session ne peut plus être supprimée : elle est verrouillée ou clôturée',
      );
    }
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
      resultat.entiteId,
      resultat.selectionEnrichie,
      resultat.themesActifs,
    );
  }
}
