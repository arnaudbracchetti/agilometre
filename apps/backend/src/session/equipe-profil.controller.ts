import {
  BadRequestException,
  Controller,
  DefaultValuePipe,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ProfilEquipeDto } from '@agilometre/shared';
import { ObtenirProfilEquipe } from './application/obtenir-profil-equipe.usecase';
import { versProfilEquipeDto } from './profil-equipe.mapper';
import { Requiert } from '../auth/decorators/requiert.decorator';

/**
 * Route `organisation/equipes/:id/profil`, mais vit dans `session/` (câblé dans `SessionModule`)
 * plutôt que dans `organisation/` : `SessionModule` importe déjà `OrganisationModule`, `ReferentielModule`
 * et `ReponseModule` (ADR-0018, session/ porte l'implémentation du port de scoring) — l'inverse
 * créerait un import circulaire entre modules Nest.
 */
@Requiert('voirProfilEquipe')
@Controller('organisation/equipes')
export class EquipeProfilController {
  constructor(private readonly obtenirProfilEquipe: ObtenirProfilEquipe) {}

  @Get(':id/profil')
  async profil(
    @Param('id') id: string,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ): Promise<ProfilEquipeDto> {
    if (offset < -1) {
      throw new BadRequestException('offset ne peut pas être inférieur à -1');
    }
    const resultat = await this.obtenirProfilEquipe.executer(id, offset);
    if (resultat.type === 'introuvable') {
      throw new NotFoundException(`Équipe ${id} introuvable`);
    }
    return versProfilEquipeDto(
      resultat.periode,
      resultat.equipeNom,
      resultat.seuilPalier,
      resultat.themes,
      resultat.global,
      resultat.aPeriodePrecedente,
      resultat.periodeEnCours,
      resultat.evolutionGlobale,
      resultat.evolutionsParTheme,
    );
  }
}
