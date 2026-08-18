import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import {
  ProjectionSessionDto,
  StatutSession as StatutSessionDto,
} from '@agilometre/shared';
import { ObtenirProjectionSession } from './application/obtenir-projection-session.usecase';

/**
 * Contrôleur séparé de SessionAnimeeController : route publique, sans compte, accessible tant que
 * la Session est OUVERTE (ADR-0012, ADR-0013) — un futur guard Coach n'aura jamais à l'exclure
 * explicitement puisqu'il ne s'appliquera qu'aux contrôleurs qui le déclarent.
 */
@Controller('projection')
export class ProjectionController {
  constructor(
    private readonly obtenirProjectionSession: ObtenirProjectionSession,
  ) {}

  @Get(':sessionId')
  @SkipThrottle()
  async obtenir(
    @Param('sessionId') sessionId: string,
  ): Promise<ProjectionSessionDto> {
    const resultat = await this.obtenirProjectionSession.executer(sessionId);
    if (resultat.type === 'introuvable') {
      throw new NotFoundException(
        `Aucune projection accessible pour la Session ${sessionId}`,
      );
    }
    return {
      // Toujours OUVERTE ici : ObtenirProjectionSession ne renvoie 'ok' que dans ce cas.
      statut: StatutSessionDto.Ouverte,
      code: resultat.session.code as string,
      nbDevicesConnectes: resultat.nbDevicesConnectes,
    };
  }
}
