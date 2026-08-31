import {
  BadRequestException,
  Body,
  Controller,
  ConflictException,
  GoneException,
  Post,
  Req,
} from '@nestjs/common';
import { DemanderReinitialisation } from './application/demander-reinitialisation.usecase';
import { DefinirMotDePasse } from './application/definir-mot-de-passe.usecase';
import { ChangerMotDePasse } from './application/changer-mot-de-passe.usecase';
import {
  ChangerMotDePasseDto,
  DefinirMotDePasseDto,
  DemanderReinitialisationDto,
} from './mot-de-passe.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Requiert } from '../auth/decorators/requiert.decorator';
import type { RequeteAuthentifiee } from '../auth/guards/auth.guard';

/**
 * Un seul mécanisme de jeton pour l'invitation et la réinitialisation
 * (doc/spec/annexes/gestion-des-droits.md, "Authentification") : pas de fonction de renvoi
 * distincte, "mot de passe oublié" fonctionne pour un compte activé ou non.
 */
@Controller('mot-de-passe')
export class MotDePasseController {
  constructor(
    private readonly demanderReinitialisation: DemanderReinitialisation,
    private readonly definirMotDePasse: DefinirMotDePasse,
    private readonly changerMotDePasse: ChangerMotDePasse,
  ) {}

  @Public()
  @Post('oubli')
  async oubli(@Body() dto: DemanderReinitialisationDto): Promise<void> {
    // Réponse toujours identique, qu'un compte corresponde ou non à cet email — anti-oracle
    // (gestion-des-droits.md).
    await this.demanderReinitialisation.executer(dto.email);
  }

  @Public()
  @Post('definir')
  async definir(@Body() dto: DefinirMotDePasseDto): Promise<void> {
    const resultat = await this.definirMotDePasse.executer(
      dto.jeton,
      dto.motDePasse,
    );
    // 410 (jeton périmé/consommé/introuvable) distinct de 400 (mot de passe trop court) : le
    // premier renvoie vers "mot de passe oublié", le second laisse réessayer sur le même écran.
    if (resultat.type === 'jeton_invalide') {
      throw new GoneException('Lien invalide ou expiré');
    }
    if (resultat.type === 'mot_de_passe_trop_court') {
      throw new BadRequestException(
        'Le mot de passe doit contenir au moins 8 caractères',
      );
    }
  }

  @Requiert('gererSonCompte')
  @Post('changer')
  async changer(
    @Req() request: RequeteAuthentifiee,
    @Body() dto: ChangerMotDePasseDto,
  ): Promise<void> {
    const resultat = await this.changerMotDePasse.executer(
      request.utilisateur.id,
      dto.motDePasseActuel,
      dto.nouveauMotDePasse,
    );
    if (resultat.type === 'mot_de_passe_actuel_incorrect') {
      throw new BadRequestException('Mot de passe actuel incorrect');
    }
    if (resultat.type === 'mot_de_passe_trop_court') {
      throw new BadRequestException(
        'Le mot de passe doit contenir au moins 8 caractères',
      );
    }
    if (resultat.type === 'introuvable') {
      // Défensif : JWT valide mais compte disparu — n'arrive jamais dans #60.
      throw new ConflictException('Compte introuvable');
    }
  }
}
