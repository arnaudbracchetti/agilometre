import { Module } from '@nestjs/common';
import { CreerEntite } from './application/creer-entite.usecase';
import { RenommerEntite } from './application/renommer-entite.usecase';
import { ListerEntites } from './application/lister-entites.usecase';
import { CreerEquipe } from './application/creer-equipe.usecase';
import { RenommerEquipe } from './application/renommer-equipe.usecase';
import { SupprimerEquipe } from './application/supprimer-equipe.usecase';
import { ListerEquipesParEntite } from './application/lister-equipes-par-entite.usecase';
import { AjouterMembre } from './application/ajouter-membre.usecase';
import { RetirerMembre } from './application/retirer-membre.usecase';
import { ModifierMembre } from './application/modifier-membre.usecase';
import { PrismaEntiteRepository } from './infrastructure/prisma-entite.repository';
import { PrismaEquipeRepository } from './infrastructure/prisma-equipe.repository';
import { OrganisationController } from './organisation.controller';

@Module({
  controllers: [OrganisationController],
  exports: [PrismaEquipeRepository],
  providers: [
    PrismaEntiteRepository,
    PrismaEquipeRepository,
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
    {
      provide: CreerEquipe,
      useFactory: (
        equipes: PrismaEquipeRepository,
        entites: PrismaEntiteRepository,
      ) => new CreerEquipe(equipes, entites),
      inject: [PrismaEquipeRepository, PrismaEntiteRepository],
    },
    {
      provide: RenommerEquipe,
      useFactory: (repository: PrismaEquipeRepository) =>
        new RenommerEquipe(repository),
      inject: [PrismaEquipeRepository],
    },
    {
      provide: SupprimerEquipe,
      useFactory: (repository: PrismaEquipeRepository) =>
        new SupprimerEquipe(repository),
      inject: [PrismaEquipeRepository],
    },
    {
      provide: ListerEquipesParEntite,
      useFactory: (repository: PrismaEquipeRepository) =>
        new ListerEquipesParEntite(repository),
      inject: [PrismaEquipeRepository],
    },
    {
      provide: AjouterMembre,
      useFactory: (repository: PrismaEquipeRepository) =>
        new AjouterMembre(repository),
      inject: [PrismaEquipeRepository],
    },
    {
      provide: RetirerMembre,
      useFactory: (repository: PrismaEquipeRepository) =>
        new RetirerMembre(repository),
      inject: [PrismaEquipeRepository],
    },
    {
      provide: ModifierMembre,
      useFactory: (repository: PrismaEquipeRepository) =>
        new ModifierMembre(repository),
      inject: [PrismaEquipeRepository],
    },
  ],
})
export class OrganisationModule {}
