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
import { ProfilEntiteDto } from '@agilometre/shared';
import { ObtenirProfilEntite } from './application/obtenir-profil-entite.usecase';
import { versProfilEntiteDto } from './profil-entite.mapper';
import { Requiert } from '../auth/decorators/requiert.decorator';
import { Perimetre } from '../auth/decorators/perimetre.decorator';

/**
 * Route `organisation/entites/:id/profil`, mais vit dans `session/` (câblé dans `SessionModule`)
 * plutôt que dans `organisation/` : `SessionModule` importe déjà `OrganisationModule`, `ReferentielModule`
 * et `ReponseModule` (ADR-0018, session/ porte l'implémentation du port de scoring) — l'inverse
 * créerait un import circulaire entre modules Nest. Même placement que `EquipeProfilController`.
 */
@Requiert('voirProfilEntite')
@Controller('organisation/entites')
export class EntiteProfilController {
  constructor(private readonly obtenirProfilEntite: ObtenirProfilEntite) {}

  @Perimetre('entite')
  @Get(':id/profil')
  async profil(
    @Param('id') id: string,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ): Promise<ProfilEntiteDto> {
    if (offset < -1) {
      throw new BadRequestException('offset ne peut pas être inférieur à -1');
    }
    const resultat = await this.obtenirProfilEntite.executer(id, offset);
    if (resultat.type === 'introuvable') {
      throw new NotFoundException(`Entité ${id} introuvable`);
    }
    return versProfilEntiteDto(
      resultat.periode,
      resultat.entiteNom,
      resultat.seuilPalier,
      resultat.global,
      resultat.aPeriodePrecedente,
      resultat.periodeEnCours,
      resultat.evolutionGlobale,
    );
  }
}
