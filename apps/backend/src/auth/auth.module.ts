import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { OrganisationModule } from '../organisation/organisation.module';
import { PrismaUtilisateurRepository } from '../organisation/infrastructure/prisma-utilisateur.repository';
import { PerimetreUtilisateur } from './domain/perimetre-utilisateur';
import { SeConnecter } from './application/se-connecter.usecase';
import { AuthController } from './auth.controller';
import { AuthGuard } from './guards/auth.guard';
import { PerimetreGuard } from './guards/perimetre.guard';

@Module({
  imports: [
    OrganisationModule,
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET')!,
        // Session à renouvellement glissant : chaque requête authentifiée réémet un jeton avec
        // cette même expiration par défaut (voir AuthGuard) — un seul endroit fixe la durée.
        // En secondes (pas une chaîne "12h") : évite le typage `StringValue` restrictif de jsonwebtoken.
        signOptions: {
          expiresIn: config.get<number>('SESSION_DUREE_HEURES')! * 3600,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  exports: [AuthGuard, PerimetreGuard],
  providers: [
    PerimetreUtilisateur,
    AuthGuard,
    PerimetreGuard,
    {
      provide: SeConnecter,
      useFactory: (repository: PrismaUtilisateurRepository, jwt: JwtService) =>
        new SeConnecter(repository, jwt),
      inject: [PrismaUtilisateurRepository, JwtService],
    },
  ],
})
export class AuthModule {}
