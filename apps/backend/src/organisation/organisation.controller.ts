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
  Req,
} from '@nestjs/common';
import { EntiteDto, EquipeDto, MembreDto } from '@agilometre/shared';
import { Entite } from './domain/entite';
import { Equipe } from './domain/equipe';
import { Membre } from './domain/membre';
import { CreerEntite } from './application/creer-entite.usecase';
import { RenommerEntite } from './application/renommer-entite.usecase';
import { SupprimerEntite } from './application/supprimer-entite.usecase';
import { ListerEntites } from './application/lister-entites.usecase';
import { CreerEquipe } from './application/creer-equipe.usecase';
import { RenommerEquipe } from './application/renommer-equipe.usecase';
import { SupprimerEquipe } from './application/supprimer-equipe.usecase';
import { ListerEquipesParEntite } from './application/lister-equipes-par-entite.usecase';
import { AjouterMembre } from './application/ajouter-membre.usecase';
import { RetirerMembre } from './application/retirer-membre.usecase';
import { ModifierMembre } from './application/modifier-membre.usecase';
import { CreerEntiteDto, RenommerEntiteDto } from './entite.dto';
import {
  AjouterMembreDto,
  CreerEquipeDto,
  ModifierMembreDto,
  RenommerEquipeDto,
} from './equipe.dto';
import { Requiert } from '../auth/decorators/requiert.decorator';
import type { RequeteAuthentifiee } from '../auth/guards/auth.guard';

function versEntiteDto(entite: Entite): EntiteDto {
  return { id: entite.id, nom: entite.nom };
}

function versEquipeDto(equipe: Equipe): EquipeDto {
  return {
    id: equipe.id,
    nom: equipe.nom,
    entiteId: equipe.entiteId,
    membres: equipe.membres.map(versMembreDto),
  };
}

function versMembreDto(membre: Membre): MembreDto {
  return {
    id: membre.id,
    nom: membre.nom,
    email: membre.email,
    utilisateurId: membre.utilisateurId,
  };
}

@Requiert('gererOrganisation')
@Controller('organisation')
export class OrganisationController {
  constructor(
    private readonly creerEntite: CreerEntite,
    private readonly renommerEntite: RenommerEntite,
    private readonly supprimerEntite: SupprimerEntite,
    private readonly listerEntites: ListerEntites,
    private readonly creerEquipe: CreerEquipe,
    private readonly renommerEquipe: RenommerEquipe,
    private readonly supprimerEquipe: SupprimerEquipe,
    private readonly listerEquipesParEntite: ListerEquipesParEntite,
    private readonly ajouterMembre: AjouterMembre,
    private readonly retirerMembre: RetirerMembre,
    private readonly modifierMembre: ModifierMembre,
  ) {}

  /**
   * Capacité `voirProfilEntite` (Coach + Direction) plutôt que `gererOrganisation` (Coach seul,
   * hérité par le reste de ce contrôleur) : cette liste alimente aussi l'arbre de navigation d'une
   * Direction, filtré par périmètre dans le use case — `PerimetreGuard` ne couvre que les routes à
   * ressource unique, jamais une collection (docs/design/agregat-politique-des-droits.md §3).
   */
  @Requiert('voirProfilEntite')
  @Get('entites')
  async lister(@Req() request: RequeteAuthentifiee): Promise<EntiteDto[]> {
    const entites = await this.listerEntites.executer(request.utilisateur);
    return entites.map(versEntiteDto);
  }

  @Post('entites')
  async creer(@Body() dto: CreerEntiteDto): Promise<EntiteDto> {
    const resultat = await this.creerEntite.executer(dto.nom);
    if (resultat.type === 'invalide') {
      throw new BadRequestException(resultat.erreur.message);
    }
    if (resultat.type === 'doublon') {
      throw new ConflictException('Une Entité porte déjà ce nom');
    }
    return versEntiteDto(resultat.entite);
  }

  @Patch('entites/:id')
  async renommer(
    @Param('id') id: string,
    @Body() dto: RenommerEntiteDto,
  ): Promise<EntiteDto> {
    const resultat = await this.renommerEntite.executer(id, dto.nom);
    if (resultat.type === 'introuvable') {
      throw new NotFoundException(`Entité ${id} introuvable`);
    }
    if (resultat.type === 'invalide') {
      throw new BadRequestException(resultat.erreur.message);
    }
    if (resultat.type === 'doublon') {
      throw new ConflictException('Une Entité porte déjà ce nom');
    }
    return versEntiteDto(resultat.entite);
  }

  @Delete('entites/:id')
  async supprimer(@Param('id') id: string): Promise<void> {
    const resultat = await this.supprimerEntite.executer(id);
    if (resultat.type === 'introuvable') {
      throw new NotFoundException(`Entité ${id} introuvable`);
    }
    if (resultat.type === 'referencee') {
      throw new ConflictException(
        'Cette Entité a encore des Équipes rattachées et ne peut pas être supprimée',
      );
    }
  }

  @Get('entites/:entiteId/equipes')
  async listerEquipes(
    @Param('entiteId') entiteId: string,
  ): Promise<EquipeDto[]> {
    const equipes = await this.listerEquipesParEntite.executer(entiteId);
    return equipes.map(versEquipeDto);
  }

  @Post('equipes')
  async creerEquipeAction(@Body() dto: CreerEquipeDto): Promise<EquipeDto> {
    const resultat = await this.creerEquipe.executer(dto.nom, dto.entiteId);
    if (resultat.type === 'entite_introuvable') {
      throw new NotFoundException(`Entité ${dto.entiteId} introuvable`);
    }
    if (resultat.type === 'invalide') {
      throw new BadRequestException(resultat.erreur.message);
    }
    if (resultat.type === 'doublon') {
      throw new ConflictException('Une Équipe porte déjà ce nom');
    }
    return versEquipeDto(resultat.equipe);
  }

  @Patch('equipes/:id')
  async renommerEquipeAction(
    @Param('id') id: string,
    @Body() dto: RenommerEquipeDto,
  ): Promise<EquipeDto> {
    const resultat = await this.renommerEquipe.executer(id, dto.nom);
    if (resultat.type === 'introuvable') {
      throw new NotFoundException(`Équipe ${id} introuvable`);
    }
    if (resultat.type === 'invalide') {
      throw new BadRequestException(resultat.erreur.message);
    }
    if (resultat.type === 'doublon') {
      throw new ConflictException('Une Équipe porte déjà ce nom');
    }
    return versEquipeDto(resultat.equipe);
  }

  @Delete('equipes/:id')
  async supprimerEquipeAction(@Param('id') id: string): Promise<void> {
    const resultat = await this.supprimerEquipe.executer(id);
    if (resultat.type === 'introuvable') {
      throw new NotFoundException(`Équipe ${id} introuvable`);
    }
    if (resultat.type === 'referencee') {
      throw new ConflictException(
        'Cette Équipe est encore référencée et ne peut pas être supprimée',
      );
    }
  }

  @Post('equipes/:id/membres')
  async ajouterMembreAction(
    @Param('id') id: string,
    @Body() dto: AjouterMembreDto,
  ): Promise<EquipeDto> {
    const resultat = await this.ajouterMembre.executer(id, dto.nom, dto.email);
    if (resultat.type === 'introuvable') {
      throw new NotFoundException(`Équipe ${id} introuvable`);
    }
    if (resultat.type === 'invalide') {
      if (resultat.erreur.name === 'EmailMembreDejaUtiliseError') {
        throw new ConflictException(resultat.erreur.message);
      }
      throw new BadRequestException(resultat.erreur.message);
    }
    return versEquipeDto(resultat.equipe);
  }

  @Patch('equipes/:id/membres/:membreId')
  async modifierMembreAction(
    @Param('id') id: string,
    @Param('membreId') membreId: string,
    @Body() dto: ModifierMembreDto,
  ): Promise<EquipeDto> {
    const resultat = await this.modifierMembre.executer(
      id,
      membreId,
      dto.nom,
      dto.email,
    );
    if (resultat.type === 'introuvable') {
      throw new NotFoundException(`Équipe ${id} introuvable`);
    }
    if (resultat.type === 'membre_introuvable') {
      throw new NotFoundException(`Membre ${membreId} introuvable`);
    }
    if (resultat.type === 'invalide') {
      if (resultat.erreur.name === 'EmailMembreDejaUtiliseError') {
        throw new ConflictException(resultat.erreur.message);
      }
      throw new BadRequestException(resultat.erreur.message);
    }
    return versEquipeDto(resultat.equipe);
  }

  @Delete('equipes/:id/membres/:membreId')
  async retirerMembreAction(
    @Param('id') id: string,
    @Param('membreId') membreId: string,
  ): Promise<EquipeDto> {
    const resultat = await this.retirerMembre.executer(id, membreId);
    if (resultat.type === 'introuvable') {
      throw new NotFoundException(`Équipe ${id} introuvable`);
    }
    if (resultat.type === 'membre_introuvable') {
      throw new NotFoundException(`Membre ${membreId} introuvable`);
    }
    return versEquipeDto(resultat.equipe);
  }
}
