import { Module } from '@nestjs/common';
import { ReferentielModule } from '../referentiel/referentiel.module';
import { PrismaReferentielRepository } from '../referentiel/infrastructure/prisma-referentiel.repository';
import { CreerModeleCollecte } from './application/creer-modele-collecte.usecase';
import { RenommerModeleCollecte } from './application/renommer-modele-collecte.usecase';
import { AjouterQuestionModeleCollecte } from './application/ajouter-question-modele-collecte.usecase';
import { AjouterThemeModeleCollecte } from './application/ajouter-theme-modele-collecte.usecase';
import { RetirerQuestionModeleCollecte } from './application/retirer-question-modele-collecte.usecase';
import { ReordonnerQuestionModeleCollecte } from './application/reordonner-question-modele-collecte.usecase';
import { DupliquerModeleCollecte } from './application/dupliquer-modele-collecte.usecase';
import { SupprimerModeleCollecte } from './application/supprimer-modele-collecte.usecase';
import { ListerModelesCollecte } from './application/lister-modeles-collecte.usecase';
import { ObtenirModeleCollecteDetail } from './application/obtenir-modele-collecte-detail.usecase';
import { PrismaModeleCollecteRepository } from './infrastructure/prisma-modele-collecte.repository';
import { PrismaModeleCollecteBibliothequeQuery } from './infrastructure/prisma-modele-collecte-bibliotheque.query';
import { ModeleCollecteController } from './modele-collecte.controller';

@Module({
  imports: [ReferentielModule],
  controllers: [ModeleCollecteController],
  providers: [
    PrismaModeleCollecteRepository,
    PrismaModeleCollecteBibliothequeQuery,
    {
      provide: CreerModeleCollecte,
      useFactory: (repository: PrismaModeleCollecteRepository) =>
        new CreerModeleCollecte(repository),
      inject: [PrismaModeleCollecteRepository],
    },
    {
      provide: RenommerModeleCollecte,
      useFactory: (repository: PrismaModeleCollecteRepository) =>
        new RenommerModeleCollecte(repository),
      inject: [PrismaModeleCollecteRepository],
    },
    {
      provide: AjouterQuestionModeleCollecte,
      useFactory: (
        repository: PrismaModeleCollecteRepository,
        referentiel: PrismaReferentielRepository,
      ) => new AjouterQuestionModeleCollecte(repository, referentiel),
      inject: [PrismaModeleCollecteRepository, PrismaReferentielRepository],
    },
    {
      provide: AjouterThemeModeleCollecte,
      useFactory: (
        repository: PrismaModeleCollecteRepository,
        referentiel: PrismaReferentielRepository,
      ) => new AjouterThemeModeleCollecte(repository, referentiel),
      inject: [PrismaModeleCollecteRepository, PrismaReferentielRepository],
    },
    {
      provide: RetirerQuestionModeleCollecte,
      useFactory: (repository: PrismaModeleCollecteRepository) =>
        new RetirerQuestionModeleCollecte(repository),
      inject: [PrismaModeleCollecteRepository],
    },
    {
      provide: ReordonnerQuestionModeleCollecte,
      useFactory: (
        repository: PrismaModeleCollecteRepository,
        referentiel: PrismaReferentielRepository,
      ) => new ReordonnerQuestionModeleCollecte(repository, referentiel),
      inject: [PrismaModeleCollecteRepository, PrismaReferentielRepository],
    },
    {
      provide: DupliquerModeleCollecte,
      useFactory: (repository: PrismaModeleCollecteRepository) =>
        new DupliquerModeleCollecte(repository),
      inject: [PrismaModeleCollecteRepository],
    },
    {
      provide: SupprimerModeleCollecte,
      useFactory: (repository: PrismaModeleCollecteRepository) =>
        new SupprimerModeleCollecte(repository),
      inject: [PrismaModeleCollecteRepository],
    },
    {
      provide: ListerModelesCollecte,
      useFactory: (query: PrismaModeleCollecteBibliothequeQuery) =>
        new ListerModelesCollecte(query),
      inject: [PrismaModeleCollecteBibliothequeQuery],
    },
    {
      provide: ObtenirModeleCollecteDetail,
      useFactory: (
        modeles: PrismaModeleCollecteRepository,
        referentiel: PrismaReferentielRepository,
      ) => new ObtenirModeleCollecteDetail(modeles, referentiel),
      inject: [PrismaModeleCollecteRepository, PrismaReferentielRepository],
    },
  ],
  // PrismaModeleCollecteRepository : exporté pour que SessionModule puisse résoudre le Modèle de
  // collecte lors de la création d'une Session (CreerSession) et du changement de Modèle en cours
  // de Session (ChangerModeleCollecte) — même pattern que ReferentielModule pour SessionModule.
  exports: [PrismaModeleCollecteRepository],
})
export class ModeleCollecteModule {}
