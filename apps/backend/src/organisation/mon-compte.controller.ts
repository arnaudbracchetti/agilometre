import { ConflictException, Controller, Get, Req } from '@nestjs/common';
import { UtilisateurDto } from '@agilometre/shared';
import { ObtenirMonCompte } from './application/obtenir-mon-compte.usecase';
import { VersUtilisateurDto } from './utilisateur.mapper';
import { Requiert } from '../auth/decorators/requiert.decorator';
import type { RequeteAuthentifiee } from '../auth/guards/auth.guard';

/** Self-service, accessible à tout Rôle connecté (capacité `gererSonCompte`). */
@Requiert('gererSonCompte')
@Controller('mon-compte')
export class MonCompteController {
  constructor(private readonly obtenirMonCompte: ObtenirMonCompte) {}

  @Get()
  async obtenir(@Req() request: RequeteAuthentifiee): Promise<UtilisateurDto> {
    const utilisateur = await this.obtenirMonCompte.executer(
      request.utilisateur.id,
    );
    if (!utilisateur) {
      // Défensif : JWT valide mais compte disparu — n'arrive jamais dans #60.
      throw new ConflictException('Compte introuvable');
    }
    return VersUtilisateurDto.executer(utilisateur);
  }
}
