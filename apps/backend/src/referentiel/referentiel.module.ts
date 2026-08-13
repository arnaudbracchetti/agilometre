import { Module } from '@nestjs/common';
import { PreviewImportReferentiel } from './application/preview-import-referentiel.usecase';
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
  ],
})
export class ReferentielModule {}
