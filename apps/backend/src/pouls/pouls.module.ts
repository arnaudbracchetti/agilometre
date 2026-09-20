import { Module } from '@nestjs/common';
import { OrganisationModule } from '../organisation/organisation.module';
import { ModeleCollecteModule } from '../modele-collecte/modele-collecte.module';
import { ReferentielModule } from '../referentiel/referentiel.module';
import { PrismaEquipeRepository } from '../organisation/infrastructure/prisma-equipe.repository';
import { PrismaModeleCollecteRepository } from '../modele-collecte/infrastructure/prisma-modele-collecte.repository';
import { PrismaReferentielRepository } from '../referentiel/infrastructure/prisma-referentiel.repository';
import { CreerCampagnePouls } from './application/creer-campagne-pouls.usecase';
import { ObtenirCampagnePoulsEquipe } from './application/obtenir-campagne-pouls-equipe.usecase';
import { PrismaCampagnePoulsRepository } from './infrastructure/prisma-campagne-pouls.repository';
import { PoulsController } from './pouls.controller';

@Module({
  imports: [OrganisationModule, ModeleCollecteModule, ReferentielModule],
  controllers: [PoulsController],
  providers: [
    PrismaCampagnePoulsRepository,
    {
      provide: CreerCampagnePouls,
      useFactory: (
        campagnes: PrismaCampagnePoulsRepository,
        equipes: PrismaEquipeRepository,
        modeles: PrismaModeleCollecteRepository,
      ) => new CreerCampagnePouls(campagnes, equipes, modeles),
      inject: [
        PrismaCampagnePoulsRepository,
        PrismaEquipeRepository,
        PrismaModeleCollecteRepository,
      ],
    },
    {
      provide: ObtenirCampagnePoulsEquipe,
      useFactory: (
        campagnes: PrismaCampagnePoulsRepository,
        referentiel: PrismaReferentielRepository,
      ) => new ObtenirCampagnePoulsEquipe(campagnes, referentiel),
      inject: [PrismaCampagnePoulsRepository, PrismaReferentielRepository],
    },
  ],
})
export class PoulsModule {}
