import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { EntiteDto } from '@agilometre/shared';
import { Entite } from './domain/entite';
import { CreerEntite } from './application/creer-entite.usecase';
import { RenommerEntite } from './application/renommer-entite.usecase';
import { ListerEntites } from './application/lister-entites.usecase';
import { CreerEntiteDto, RenommerEntiteDto } from './entite.dto';

function versDto(entite: Entite): EntiteDto {
  return { id: entite.id, nom: entite.nom };
}

@Controller('organisation')
export class OrganisationController {
  constructor(
    private readonly creerEntite: CreerEntite,
    private readonly renommerEntite: RenommerEntite,
    private readonly listerEntites: ListerEntites,
  ) {}

  @Get('entites')
  async lister(): Promise<EntiteDto[]> {
    const entites = await this.listerEntites.executer();
    return entites.map(versDto);
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
    return versDto(resultat.entite);
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
    return versDto(resultat.entite);
  }
}
