import { Module } from '@nestjs/common';
import { ReferentielModule } from '../referentiel/referentiel.module';
import { OrganisationModule } from '../organisation/organisation.module';
import { PrismaReferentielRepository } from '../referentiel/infrastructure/prisma-referentiel.repository';
import { PrismaEquipeRepository } from '../organisation/infrastructure/prisma-equipe.repository';
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
import { CreerSession } from './application/creer-session.usecase';
import { AjouterQuestionSession } from './application/ajouter-question-session.usecase';
import { AjouterThemeSession } from './application/ajouter-theme-session.usecase';
import { RetirerQuestionSession } from './application/retirer-question-session.usecase';
import { ReordonnerQuestionSession } from './application/reordonner-question-session.usecase';
import { ListerSessions } from './application/lister-sessions.usecase';
import { ObtenirSessionDetail } from './application/obtenir-session-detail.usecase';
import { ModifierInfosSession } from './application/modifier-infos-session.usecase';
import { ChangerModeleSession } from './application/changer-modele-session.usecase';
import { SupprimerSession } from './application/supprimer-session.usecase';
import { PrismaModeleSessionRepository } from './infrastructure/prisma-modele-session.repository';
import { PrismaModeleSessionBibliothequeQuery } from './infrastructure/prisma-modele-session-bibliotheque.query';
import { PrismaSessionRepository } from './infrastructure/prisma-session.repository';
import { PrismaSessionListeQuery } from './infrastructure/prisma-session-liste.query';
import { SessionController } from './session.controller';
import { SessionAnimeeController } from './session-animee.controller';

@Module({
  imports: [ReferentielModule, OrganisationModule],
  controllers: [SessionController, SessionAnimeeController],
  providers: [
    PrismaModeleSessionRepository,
    PrismaModeleSessionBibliothequeQuery,
    PrismaSessionRepository,
    PrismaSessionListeQuery,
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
    {
      provide: CreerSession,
      useFactory: (
        sessions: PrismaSessionRepository,
        equipes: PrismaEquipeRepository,
        modeles: PrismaModeleSessionRepository,
      ) => new CreerSession(sessions, equipes, modeles),
      inject: [
        PrismaSessionRepository,
        PrismaEquipeRepository,
        PrismaModeleSessionRepository,
      ],
    },
    {
      provide: AjouterQuestionSession,
      useFactory: (
        repository: PrismaSessionRepository,
        referentiel: PrismaReferentielRepository,
      ) => new AjouterQuestionSession(repository, referentiel),
      inject: [PrismaSessionRepository, PrismaReferentielRepository],
    },
    {
      provide: AjouterThemeSession,
      useFactory: (
        repository: PrismaSessionRepository,
        referentiel: PrismaReferentielRepository,
      ) => new AjouterThemeSession(repository, referentiel),
      inject: [PrismaSessionRepository, PrismaReferentielRepository],
    },
    {
      provide: RetirerQuestionSession,
      useFactory: (repository: PrismaSessionRepository) =>
        new RetirerQuestionSession(repository),
      inject: [PrismaSessionRepository],
    },
    {
      provide: ReordonnerQuestionSession,
      useFactory: (
        repository: PrismaSessionRepository,
        referentiel: PrismaReferentielRepository,
      ) => new ReordonnerQuestionSession(repository, referentiel),
      inject: [PrismaSessionRepository, PrismaReferentielRepository],
    },
    {
      provide: ListerSessions,
      useFactory: (query: PrismaSessionListeQuery) => new ListerSessions(query),
      inject: [PrismaSessionListeQuery],
    },
    {
      provide: ObtenirSessionDetail,
      useFactory: (
        sessions: PrismaSessionRepository,
        equipes: PrismaEquipeRepository,
        referentiel: PrismaReferentielRepository,
      ) => new ObtenirSessionDetail(sessions, equipes, referentiel),
      inject: [
        PrismaSessionRepository,
        PrismaEquipeRepository,
        PrismaReferentielRepository,
      ],
    },
    {
      provide: ModifierInfosSession,
      useFactory: (
        sessions: PrismaSessionRepository,
        equipes: PrismaEquipeRepository,
      ) => new ModifierInfosSession(sessions, equipes),
      inject: [PrismaSessionRepository, PrismaEquipeRepository],
    },
    {
      provide: ChangerModeleSession,
      useFactory: (
        sessions: PrismaSessionRepository,
        modeles: PrismaModeleSessionRepository,
      ) => new ChangerModeleSession(sessions, modeles),
      inject: [PrismaSessionRepository, PrismaModeleSessionRepository],
    },
    {
      provide: SupprimerSession,
      useFactory: (sessions: PrismaSessionRepository) =>
        new SupprimerSession(sessions),
      inject: [PrismaSessionRepository],
    },
  ],
})
export class SessionModule {}
