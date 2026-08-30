import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';
import { JetonUtilisateurDto } from '@agilometre/shared';
import { Public } from './decorators/public.decorator';
import { SeConnecter } from './application/se-connecter.usecase';
import { SeConnecterDto } from './auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly seConnecter: SeConnecter) {}

  @Public()
  @Post('login')
  async login(@Body() dto: SeConnecterDto): Promise<JetonUtilisateurDto> {
    const resultat = await this.seConnecter.executer(dto.email, dto.motDePasse);
    if (resultat.type === 'echec') {
      throw new UnauthorizedException('Identifiants invalides');
    }
    return { jeton: resultat.jeton };
  }
}
