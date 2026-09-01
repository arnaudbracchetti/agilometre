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
import { LigneListeSessionDto, ProfilEquipeDto } from '@agilometre/shared';
import { ObtenirProfilEquipe } from './application/obtenir-profil-equipe.usecase';
import { ListerSessionsEquipe } from './application/lister-sessions-equipe.usecase';
import { versProfilEquipeDto } from './profil-equipe.mapper';
import { versLigneListeSessionDto } from './ligne-liste-session.mapper';
import { Requiert } from '../auth/decorators/requiert.decorator';
import { Perimetre } from '../auth/decorators/perimetre.decorator';

/**
 * Route `organisation/equipes/:id/profil`, mais vit dans `session/` (câblé dans `SessionModule`)
 * plutôt que dans `organisation/` : `SessionModule` importe déjà `OrganisationModule`, `ReferentielModule`
 * et `ReponseModule` (ADR-0018, session/ porte l'implémentation du port de scoring) — l'inverse
 * créerait un import circulaire entre modules Nest.
 *
 * `@Perimetre('equipe')` sur chaque route à ressource unique (`:id`) : depuis que `voirProfilEquipe`
 * inclut le Rôle Membre d'équipe (#62), la capacité seule ne suffit plus à restreindre à ses
 * propres Équipes — sans ce décorateur, un Membre atteindrait le profil ou les Sessions de
 * n'importe quelle Équipe en devinant son id.
 */
@Requiert('voirProfilEquipe')
@Controller('organisation/equipes')
export class EquipeProfilController {
  constructor(
    private readonly obtenirProfilEquipe: ObtenirProfilEquipe,
    private readonly listerSessionsEquipe: ListerSessionsEquipe,
  ) {}

  @Perimetre('equipe')
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

  /**
   * "Répartition détaillée de toutes les Sessions" d'une Équipe (#62, gestion-des-droits.md) —
   * chaque ligne renvoie vers `GET sessions/:id/synthese`, pas d'accès à la bibliothèque Coach.
   */
  @Perimetre('equipe')
  @Get(':id/sessions')
  async sessions(@Param('id') id: string): Promise<LigneListeSessionDto[]> {
    const lignes = await this.listerSessionsEquipe.executer(id);
    return lignes.map(versLigneListeSessionDto);
  }
}
