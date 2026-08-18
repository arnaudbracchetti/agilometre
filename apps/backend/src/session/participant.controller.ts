import { Body, Controller, NotFoundException, Post } from '@nestjs/common';
import { JetonSessionDto } from '@agilometre/shared';
import { RejoindreSession } from './application/rejoindre-session.usecase';
import { RejoindreSessionDto } from './session.dto';

/**
 * Contrôleur séparé de SessionAnimeeController/ProjectionController : routes publiques du
 * participant (jointure ici, `GET /participant/moi` à venir #37), regroupées pour qu'un futur
 * guard Coach n'ait jamais à les exclure explicitement — même raisonnement que ProjectionController.
 * Pas de @SkipThrottle ici : ADR-0012 exonère les lectures de sondage, pas cette écriture — le
 * rate-limit global reste la seule protection contre un essai de Codes en force brute.
 */
@Controller('participant')
export class ParticipantController {
  constructor(private readonly rejoindreSession: RejoindreSession) {}

  @Post('rejoindre')
  async rejoindre(@Body() dto: RejoindreSessionDto): Promise<JetonSessionDto> {
    const resultat = await this.rejoindreSession.executer(dto.code);
    if (resultat.type === 'introuvable') {
      throw new NotFoundException('Code de session invalide ou expiré');
    }
    return { sessionId: resultat.sessionId, jeton: resultat.jeton.id };
  }
}
