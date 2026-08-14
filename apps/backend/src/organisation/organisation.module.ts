import { Module } from '@nestjs/common';
import { CreerEntite } from './application/creer-entite.usecase';
import { RenommerEntite } from './application/renommer-entite.usecase';
import { ListerEntites } from './application/lister-entites.usecase';
import { PrismaEntiteRepository } from './infrastructure/prisma-entite.repository';
import { OrganisationController } from './organisation.controller';

@Module({
  controllers: [OrganisationController],
  providers: [
    PrismaEntiteRepository,
    {
      provide: CreerEntite,
      useFactory: (repository: PrismaEntiteRepository) =>
        new CreerEntite(repository),
      inject: [PrismaEntiteRepository],
    },
    {
      provide: RenommerEntite,
      useFactory: (repository: PrismaEntiteRepository) =>
        new RenommerEntite(repository),
      inject: [PrismaEntiteRepository],
    },
    {
      provide: ListerEntites,
      useFactory: (repository: PrismaEntiteRepository) =>
        new ListerEntites(repository),
      inject: [PrismaEntiteRepository],
    },
  ],
})
export class OrganisationModule {}
