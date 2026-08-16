import { Module } from '@nestjs/common';
import { ReferentielModule } from '../referentiel/referentiel.module';
import { PrismaReferentielRepository } from '../referentiel/infrastructure/prisma-referentiel.repository';
import { CreerModeleSession } from './application/creer-modele-session.usecase';
import { RenommerModeleSession } from './application/renommer-modele-session.usecase';
import { AjouterQuestionModeleSession } from './application/ajouter-question-modele-session.usecase';
import { AjouterThemeModeleSession } from './application/ajouter-theme-modele-session.usecase';
import { RetirerQuestionModeleSession } from './application/retirer-question-modele-session.usecase';
import { ReordonnerQuestionModeleSession } from './application/reordonner-question-modele-session.usecase';
import { DupliquerModeleSession } from './application/dupliquer-modele-session.usecase';
import { SupprimerModeleSession } from './application/supprimer-modele-session.usecase';
import { ListerModelesSession } from './application/lister-modeles-session.usecase';
import { ObtenirModeleSessionDetail } from './application/obtenir-modele-session-detail.usecase';
import { PrismaModeleSessionRepository } from './infrastructure/prisma-modele-session.repository';
import { PrismaModeleSessionBibliothequeQuery } from './infrastructure/prisma-modele-session-bibliotheque.query';
import { SessionController } from './session.controller';

@Module({
  imports: [ReferentielModule],
  controllers: [SessionController],
  providers: [
    PrismaModeleSessionRepository,
    PrismaModeleSessionBibliothequeQuery,
    {
      provide: CreerModeleSession,
      useFactory: (repository: PrismaModeleSessionRepository) =>
        new CreerModeleSession(repository),
      inject: [PrismaModeleSessionRepository],
    },
    {
      provide: RenommerModeleSession,
      useFactory: (repository: PrismaModeleSessionRepository) =>
        new RenommerModeleSession(repository),
      inject: [PrismaModeleSessionRepository],
    },
    {
      provide: AjouterQuestionModeleSession,
      useFactory: (
        repository: PrismaModeleSessionRepository,
        referentiel: PrismaReferentielRepository,
      ) => new AjouterQuestionModeleSession(repository, referentiel),
      inject: [PrismaModeleSessionRepository, PrismaReferentielRepository],
    },
    {
      provide: AjouterThemeModeleSession,
      useFactory: (
        repository: PrismaModeleSessionRepository,
        referentiel: PrismaReferentielRepository,
      ) => new AjouterThemeModeleSession(repository, referentiel),
      inject: [PrismaModeleSessionRepository, PrismaReferentielRepository],
    },
    {
      provide: RetirerQuestionModeleSession,
      useFactory: (repository: PrismaModeleSessionRepository) =>
        new RetirerQuestionModeleSession(repository),
      inject: [PrismaModeleSessionRepository],
    },
    {
      provide: ReordonnerQuestionModeleSession,
      useFactory: (
        repository: PrismaModeleSessionRepository,
        referentiel: PrismaReferentielRepository,
      ) => new ReordonnerQuestionModeleSession(repository, referentiel),
      inject: [PrismaModeleSessionRepository, PrismaReferentielRepository],
    },
    {
      provide: DupliquerModeleSession,
      useFactory: (repository: PrismaModeleSessionRepository) =>
        new DupliquerModeleSession(repository),
      inject: [PrismaModeleSessionRepository],
    },
    {
      provide: SupprimerModeleSession,
      useFactory: (repository: PrismaModeleSessionRepository) =>
        new SupprimerModeleSession(repository),
      inject: [PrismaModeleSessionRepository],
    },
    {
      provide: ListerModelesSession,
      useFactory: (query: PrismaModeleSessionBibliothequeQuery) =>
        new ListerModelesSession(query),
      inject: [PrismaModeleSessionBibliothequeQuery],
    },
    {
      provide: ObtenirModeleSessionDetail,
      useFactory: (
        modeles: PrismaModeleSessionRepository,
        referentiel: PrismaReferentielRepository,
      ) => new ObtenirModeleSessionDetail(modeles, referentiel),
      inject: [PrismaModeleSessionRepository, PrismaReferentielRepository],
    },
  ],
})
export class SessionModule {}
