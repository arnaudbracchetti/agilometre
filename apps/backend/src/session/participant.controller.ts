import {
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { JetonSessionDto, MoiParticipantDto } from '@agilometre/shared';
import { RejoindreSession } from './application/rejoindre-session.usecase';
import { ObtenirEtatParticipant } from './application/obtenir-etat-participant.usecase';
import { VoterParticipant } from './application/voter-participant.usecase';
import { RejoindreSessionDto, VoterParticipantDto } from './session.dto';
import { versQuestionCouranteDto } from './question-courante.mapper';
import { JetonParticipantGuard } from './jeton-participant.guard';
import type { RequeteAvecJetonParticipant } from './jeton-participant.guard';

/**
 * Contrôleur séparé de SessionAnimeeController/ProjectionController : routes publiques du
 * participant, regroupées pour qu'un futur guard Coach n'ait jamais à les exclure explicitement
 * — même raisonnement que ProjectionController. `POST /rejoindre` n'a pas encore de Jeton (c'est
 * la route qui en délivre un) : seules `GET /moi` et `POST /voter` passent par
 * `JetonParticipantGuard`. Pas de @SkipThrottle sur `/rejoindre` ni `/voter` : ADR-0012 exonère
 * les lectures de sondage, pas ces écritures — le rate-limit global reste la seule protection
 * contre un essai de Codes/votes en force brute.
 */
@Controller('participant')
export class ParticipantController {
  constructor(
    private readonly rejoindreSession: RejoindreSession,
    private readonly obtenirEtatParticipant: ObtenirEtatParticipant,
    private readonly voterParticipant: VoterParticipant,
  ) {}

  @Post('rejoindre')
  async rejoindre(@Body() dto: RejoindreSessionDto): Promise<JetonSessionDto> {
    const resultat = await this.rejoindreSession.executer(
      dto.code,
      dto.jetonPrecedent,
    );
    if (resultat.type === 'introuvable') {
      throw new NotFoundException('Code de session invalide ou expiré');
    }
    return { sessionId: resultat.sessionId, jeton: resultat.jeton.id };
  }

  @Get('moi')
  @UseGuards(JetonParticipantGuard)
  @SkipThrottle()
  async moi(
    @Req() request: RequeteAvecJetonParticipant,
  ): Promise<MoiParticipantDto> {
    return this.rechargerMoi(request.sessionId, request.jetonId);
  }

  @Post('voter')
  @UseGuards(JetonParticipantGuard)
  async voter(
    @Req() request: RequeteAvecJetonParticipant,
    @Body() dto: VoterParticipantDto,
  ): Promise<MoiParticipantDto> {
    const resultat = await this.voterParticipant.executer(
      request.sessionId,
      request.jetonId,
      dto.optionIndex,
    );
    if (resultat.type === 'aucun_tour_ouvert') {
      throw new ConflictException(
        'Aucun Tour de vote ouvert sur cette Session',
      );
    }
    if (
      resultat.type === 'question_introuvable' ||
      resultat.type === 'option_invalide'
    ) {
      throw new ConflictException('Vote impossible pour cette Option');
    }
    if (resultat.type === 'session_introuvable') {
      throw new NotFoundException('Session introuvable');
    }
    return this.rechargerMoi(request.sessionId, request.jetonId);
  }

  /** Réutilisé par GET /moi et POST /voter — un seul mapping vers MoiParticipantDto. */
  private async rechargerMoi(
    sessionId: string,
    jetonId: string,
  ): Promise<MoiParticipantDto> {
    const etat = await this.obtenirEtatParticipant.executer(sessionId, jetonId);
    return {
      voteOuvert: etat.voteOuvert,
      question: versQuestionCouranteDto(etat.question),
      optionChoisieIndex: etat.optionChoisieIndex,
    };
  }
}
