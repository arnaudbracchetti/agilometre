import { Module } from '@nestjs/common';
import { ApplyImportReferentiel } from './application/apply-import-referentiel.usecase';
import { PreviewImportReferentiel } from './application/preview-import-referentiel.usecase';
import { ObtenirReferentielActif } from './application/obtenir-referentiel-actif.usecase';
import { PrismaReferentielRepository } from './infrastructure/prisma-referentiel.repository';
import { ReferentielController } from './referentiel.controller';

@Module({
  controllers: [ReferentielController],
  providers: [
    PrismaReferentielRepository,
    {
      provide: PreviewImportReferentiel,
      useFactory: (repository: PrismaReferentielRepository) =>
        new PreviewImportReferentiel(repository),
      inject: [PrismaReferentielRepository],
    },
    {
      provide: ApplyImportReferentiel,
      useFactory: (repository: PrismaReferentielRepository) =>
        new ApplyImportReferentiel(repository),
      inject: [PrismaReferentielRepository],
    },
    {
      provide: ObtenirReferentielActif,
      useFactory: (repository: PrismaReferentielRepository) =>
        new ObtenirReferentielActif(repository),
      inject: [PrismaReferentielRepository],
    },
  ],
  // Exporté pour que SessionModule puisse résoudre le Référentiel actif lors de la lecture d'un
  // Modèle de session enrichi (ObtenirModeleSessionDetail) — dépendance inter-module explicite.
  exports: [PrismaReferentielRepository],
})
export class ReferentielModule {}
