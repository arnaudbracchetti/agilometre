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
import { Role, UtilisateurDto } from '@agilometre/shared';
import { CreerUtilisateur } from './application/creer-utilisateur.usecase';
import { ModifierUtilisateur } from './application/modifier-utilisateur.usecase';
import { DesactiverUtilisateur } from './application/desactiver-utilisateur.usecase';
import { ReactiverUtilisateur } from './application/reactiver-utilisateur.usecase';
import { ListerUtilisateurs } from './application/lister-utilisateurs.usecase';
import { AjouterHabilitation } from './application/ajouter-habilitation.usecase';
import { RetirerHabilitation } from './application/retirer-habilitation.usecase';
import { ChangerRoleUtilisateur } from './application/changer-role-utilisateur.usecase';
import {
  AjouterHabilitationDto,
  ChangerRoleUtilisateurDto,
  CreerUtilisateurDto,
  ModifierUtilisateurDto,
} from './comptes.dto';
import { Requiert } from '../auth/decorators/requiert.decorator';
import { VersUtilisateurDto } from './utilisateur.mapper';

/**
 * Le Coach seul crée, modifie et (dés)active des comptes — doc/spec/annexes/gestion-des-droits.md,
 * "Création". Aucun compte Manager d'équipe n'est créable cette itération.
 */
@Requiert('gererComptes')
@Controller('comptes')
export class ComptesController {
  constructor(
    private readonly listerUtilisateurs: ListerUtilisateurs,
    private readonly creerUtilisateur: CreerUtilisateur,
    private readonly modifierUtilisateur: ModifierUtilisateur,
    private readonly desactiverUtilisateur: DesactiverUtilisateur,
    private readonly reactiverUtilisateur: ReactiverUtilisateur,
    private readonly ajouterHabilitation: AjouterHabilitation,
    private readonly retirerHabilitation: RetirerHabilitation,
    private readonly changerRoleUtilisateur: ChangerRoleUtilisateur,
  ) {}

  @Get()
  async lister(): Promise<UtilisateurDto[]> {
    const utilisateurs = await this.listerUtilisateurs.executer();
    return utilisateurs.map((utilisateur) =>
      VersUtilisateurDto.executer(utilisateur),
    );
  }

  @Post()
  async creer(@Body() dto: CreerUtilisateurDto): Promise<UtilisateurDto> {
    const resultat = await this.creerUtilisateur.executer(
      dto.email,
      dto.prenom,
      dto.nom,
      dto.role,
    );
    if (resultat.type === 'role_non_creable') {
      throw new BadRequestException(
        `Aucun compte ${Role.Manager} ne peut être créé`,
      );
    }
    if (resultat.type === 'invalide') {
      throw new BadRequestException(resultat.erreur.message);
    }
    if (resultat.type === 'email_deja_utilise') {
      throw new ConflictException('Un compte existe déjà avec cet email');
    }
    return VersUtilisateurDto.executer(resultat.utilisateur);
  }

  @Patch(':id')
  async modifier(
    @Param('id') id: string,
    @Body() dto: ModifierUtilisateurDto,
  ): Promise<UtilisateurDto> {
    const resultat = await this.modifierUtilisateur.executer(
      id,
      dto.email,
      dto.prenom,
      dto.nom,
    );
    if (resultat.type === 'introuvable') {
      throw new NotFoundException(`Compte ${id} introuvable`);
    }
    if (resultat.type === 'invalide') {
      throw new BadRequestException(resultat.erreur.message);
    }
    if (resultat.type === 'email_deja_utilise') {
      throw new ConflictException('Un compte existe déjà avec cet email');
    }
    return VersUtilisateurDto.executer(resultat.utilisateur);
  }

  @Post(':id/desactiver')
  async desactiver(@Param('id') id: string): Promise<UtilisateurDto> {
    const resultat = await this.desactiverUtilisateur.executer(id);
    if (resultat.type === 'introuvable') {
      throw new NotFoundException(`Compte ${id} introuvable`);
    }
    return VersUtilisateurDto.executer(resultat.utilisateur);
  }

  @Post(':id/reactiver')
  async reactiver(@Param('id') id: string): Promise<UtilisateurDto> {
    const resultat = await this.reactiverUtilisateur.executer(id);
    if (resultat.type === 'introuvable') {
      throw new NotFoundException(`Compte ${id} introuvable`);
    }
    return VersUtilisateurDto.executer(resultat.utilisateur);
  }

  @Patch(':id/role')
  async changerRole(
    @Param('id') id: string,
    @Body() dto: ChangerRoleUtilisateurDto,
  ): Promise<UtilisateurDto> {
    const resultat = await this.changerRoleUtilisateur.executer(id, dto.role);
    if (resultat.type === 'introuvable') {
      throw new NotFoundException(`Compte ${id} introuvable`);
    }
    if (resultat.type === 'invalide') {
      throw new ConflictException(resultat.erreur.message);
    }
    return VersUtilisateurDto.executer(resultat.utilisateur);
  }

  @Post(':id/habilitations')
  async ajouterHabilitationAction(
    @Param('id') id: string,
    @Body() dto: AjouterHabilitationDto,
  ): Promise<UtilisateurDto> {
    const resultat = await this.ajouterHabilitation.executer(id, {
      entiteId: dto.entiteId,
    });
    if (resultat.type === 'introuvable') {
      throw new NotFoundException(`Compte ${id} introuvable`);
    }
    if (resultat.type === 'invalide') {
      throw new ConflictException(resultat.erreur.message);
    }
    return VersUtilisateurDto.executer(resultat.utilisateur);
  }

  @Delete(':id/habilitations/:habilitationId')
  async retirerHabilitationAction(
    @Param('id') id: string,
    @Param('habilitationId') habilitationId: string,
  ): Promise<UtilisateurDto> {
    const resultat = await this.retirerHabilitation.executer(
      id,
      habilitationId,
    );
    if (resultat.type === 'introuvable') {
      throw new NotFoundException(`Compte ${id} introuvable`);
    }
    if (resultat.type === 'habilitation_introuvable') {
      throw new NotFoundException(`Habilitation ${habilitationId} introuvable`);
    }
    return VersUtilisateurDto.executer(resultat.utilisateur);
  }
}
