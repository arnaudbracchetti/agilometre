import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ProfilEquipeDto } from '@agilometre/shared';
import { ObtenirProfilEquipe } from './application/obtenir-profil-equipe.usecase';
import { versProfilEquipeDto } from './profil-equipe.mapper';

/**
 * Route `organisation/equipes/:id/profil`, mais vit dans `session/` (câblé dans `SessionModule`)
 * plutôt que dans `organisation/` : `SessionModule` importe déjà `OrganisationModule`, `ReferentielModule`
 * et `ReponseModule` (ADR-0018, session/ porte l'implémentation du port de scoring) — l'inverse
 * créerait un import circulaire entre modules Nest.
 */
@Controller('organisation/equipes')
export class EquipeProfilController {
  constructor(private readonly obtenirProfilEquipe: ObtenirProfilEquipe) {}

  @Get(':id/profil')
  async profil(@Param('id') id: string): Promise<ProfilEquipeDto> {
    const resultat = await this.obtenirProfilEquipe.executer(id);
    if (resultat.type === 'introuvable') {
      throw new NotFoundException(`Équipe ${id} introuvable`);
    }
    return versProfilEquipeDto(
      resultat.periode,
      resultat.equipeNom,
      resultat.seuilPalier,
      resultat.themes,
      resultat.global,
    );
  }
}
