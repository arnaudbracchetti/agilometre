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
import { OuvrirSession } from './application/ouvrir-session.usecase';
import { ObtenirProjectionSession } from './application/obtenir-projection-session.usecase';
import { ObtenirPilotageSession } from './application/obtenir-pilotage-session.usecase';
import { RejoindreSession } from './application/rejoindre-session.usecase';
import { PrismaModeleSessionRepository } from './infrastructure/prisma-modele-session.repository';
import { PrismaModeleSessionBibliothequeQuery } from './infrastructure/prisma-modele-session-bibliotheque.query';
import { PrismaSessionRepository } from './infrastructure/prisma-session.repository';
import { PrismaSessionListeQuery } from './infrastructure/prisma-session-liste.query';
import { PrismaTourDeVoteRepository } from './infrastructure/prisma-tour-de-vote.repository';
import { PrismaReponseRepository } from './infrastructure/prisma-reponse.repository';
import { PrismaJetonSessionRepository } from './infrastructure/prisma-jeton-session.repository';
import { CryptoGenerateurDeCode } from './infrastructure/crypto-generateur-de-code';
import { SessionController } from './session.controller';
import { SessionAnimeeController } from './session-animee.controller';
import { ProjectionController } from './projection.controller';
import { ParticipantController } from './participant.controller';

@Module({
  imports: [ReferentielModule, OrganisationModule],
  controllers: [
    SessionController,
    SessionAnimeeController,
    ProjectionController,
    ParticipantController,
  ],
  providers: [
    PrismaModeleSessionRepository,
    PrismaModeleSessionBibliothequeQuery,
    CryptoGenerateurDeCode,
    PrismaSessionRepository,
    PrismaSessionListeQuery,
    // Aucun use case ne consomme encore PrismaTourDeVoteRepository/PrismaReponseRepository (#33
    // est un enabler technique, "pas d'écran") — prêts pour la carte "voter" qui les injectera
    // (même patron que SessionRepository.existeCodeOuvert ajouté par la carte #32).
    // PrismaJetonSessionRepository, lui, est désormais consommé par ObtenirProjectionSession (#35).
    PrismaTourDeVoteRepository,
    PrismaReponseRepository,
    PrismaJetonSessionRepository,
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
        generateurDeCode: CryptoGenerateurDeCode,
      ) => new CreerSession(sessions, equipes, modeles, generateurDeCode),
      inject: [
        PrismaSessionRepository,
        PrismaEquipeRepository,
        PrismaModeleSessionRepository,
        CryptoGenerateurDeCode,
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
    {
      provide: OuvrirSession,
      useFactory: (sessions: PrismaSessionRepository) =>
        new OuvrirSession(sessions),
      inject: [PrismaSessionRepository],
    },
    {
      provide: ObtenirProjectionSession,
      useFactory: (
        sessions: PrismaSessionRepository,
        jetons: PrismaJetonSessionRepository,
      ) => new ObtenirProjectionSession(sessions, jetons),
      inject: [PrismaSessionRepository, PrismaJetonSessionRepository],
    },
    {
      provide: ObtenirPilotageSession,
      useFactory: (sessions: PrismaSessionRepository) =>
        new ObtenirPilotageSession(sessions),
      inject: [PrismaSessionRepository],
    },
    {
      provide: RejoindreSession,
      useFactory: (
        sessions: PrismaSessionRepository,
        jetons: PrismaJetonSessionRepository,
      ) => new RejoindreSession(sessions, jetons),
      inject: [PrismaSessionRepository, PrismaJetonSessionRepository],
    },
  ],
})
export class SessionModule {}
