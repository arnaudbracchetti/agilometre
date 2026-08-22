import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ReferentielModule } from '../referentiel/referentiel.module';
import { OrganisationModule } from '../organisation/organisation.module';
import { ReponseModule } from '../reponse/reponse.module';
import { PrismaReferentielRepository } from '../referentiel/infrastructure/prisma-referentiel.repository';
import { PrismaEquipeRepository } from '../organisation/infrastructure/prisma-equipe.repository';
import { PrismaReponseRepository } from '../reponse/infrastructure/prisma-reponse.repository';
import { ScoringV1 } from '../scoring/domain/scoring-v1';
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
import { ObtenirSyntheseSession } from './application/obtenir-synthese-session.usecase';
import { PasserQuestionSuivanteSession } from './application/passer-question-suivante-session.usecase';
import { RejoindreSession } from './application/rejoindre-session.usecase';
import { OuvrirTourDeVote } from './application/ouvrir-tour-de-vote.usecase';
import { CloreTourDeVote } from './application/clore-tour-de-vote.usecase';
import { SauterQuestionSession } from './application/sauter-question-session.usecase';
import { ReactiverQuestionSession } from './application/reactiver-question-session.usecase';
import { TerminerPrematurementSession } from './application/terminer-prematurement-session.usecase';
import { TerminerSession } from './application/terminer-session.usecase';
import { VoterParticipant } from './application/voter-participant.usecase';
import { ObtenirEtatParticipant } from './application/obtenir-etat-participant.usecase';
import { ObtenirInfoSessionParticipant } from './application/obtenir-info-session-participant.usecase';
import { PrismaModeleSessionRepository } from './infrastructure/prisma-modele-session.repository';
import { PrismaModeleSessionBibliothequeQuery } from './infrastructure/prisma-modele-session-bibliotheque.query';
import { PrismaSessionRepository } from './infrastructure/prisma-session.repository';
import { PrismaSessionListeQuery } from './infrastructure/prisma-session-liste.query';
import { PrismaTourDeVoteRepository } from './infrastructure/prisma-tour-de-vote.repository';
import { PrismaJetonSessionRepository } from './infrastructure/prisma-jeton-session.repository';
import { PrismaEtatToursQuery } from './infrastructure/prisma-etat-tours.query';
import { PrismaRepartitionTourQuery } from './infrastructure/prisma-repartition-tour.query';
import { CryptoGenerateurDeCode } from './infrastructure/crypto-generateur-de-code';
import { SessionController } from './session.controller';
import { SessionAnimeeController } from './session-animee.controller';
import { ProjectionController } from './projection.controller';
import { ParticipantController } from './participant.controller';
import { JetonParticipantGuard } from './jeton-participant.guard';

@Module({
  imports: [ReferentielModule, OrganisationModule, ReponseModule],
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
    PrismaTourDeVoteRepository,
    PrismaJetonSessionRepository,
    PrismaEtatToursQuery,
    PrismaRepartitionTourQuery,
    JetonParticipantGuard,
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
        referentiel: PrismaReferentielRepository,
        tours: PrismaTourDeVoteRepository,
        etatTours: PrismaEtatToursQuery,
        repartitions: PrismaRepartitionTourQuery,
      ) =>
        new ObtenirProjectionSession(
          sessions,
          jetons,
          referentiel,
          tours,
          etatTours,
          repartitions,
        ),
      inject: [
        PrismaSessionRepository,
        PrismaJetonSessionRepository,
        PrismaReferentielRepository,
        PrismaTourDeVoteRepository,
        PrismaEtatToursQuery,
        PrismaRepartitionTourQuery,
      ],
    },
    {
      provide: ObtenirPilotageSession,
      useFactory: (
        sessions: PrismaSessionRepository,
        jetons: PrismaJetonSessionRepository,
        referentiel: PrismaReferentielRepository,
        tours: PrismaTourDeVoteRepository,
        etatTours: PrismaEtatToursQuery,
        repartitions: PrismaRepartitionTourQuery,
      ) =>
        new ObtenirPilotageSession(
          sessions,
          jetons,
          referentiel,
          tours,
          etatTours,
          repartitions,
        ),
      inject: [
        PrismaSessionRepository,
        PrismaJetonSessionRepository,
        PrismaReferentielRepository,
        PrismaTourDeVoteRepository,
        PrismaEtatToursQuery,
        PrismaRepartitionTourQuery,
      ],
    },
    {
      provide: ObtenirSyntheseSession,
      useFactory: (
        sessions: PrismaSessionRepository,
        referentiel: PrismaReferentielRepository,
        etatTours: PrismaEtatToursQuery,
        reponses: PrismaReponseRepository,
        config: ConfigService,
      ) =>
        new ObtenirSyntheseSession(
          sessions,
          referentiel,
          etatTours,
          reponses,
          new ScoringV1(),
          config.get<number>('SCORING_SEUIL_PALIER')!,
        ),
      inject: [
        PrismaSessionRepository,
        PrismaReferentielRepository,
        PrismaEtatToursQuery,
        PrismaReponseRepository,
        ConfigService,
      ],
    },
    {
      provide: OuvrirTourDeVote,
      useFactory: (
        sessions: PrismaSessionRepository,
        tours: PrismaTourDeVoteRepository,
        etatTours: PrismaEtatToursQuery,
      ) => new OuvrirTourDeVote(sessions, tours, etatTours),
      inject: [
        PrismaSessionRepository,
        PrismaTourDeVoteRepository,
        PrismaEtatToursQuery,
      ],
    },
    {
      provide: CloreTourDeVote,
      useFactory: (tours: PrismaTourDeVoteRepository) =>
        new CloreTourDeVote(tours),
      inject: [PrismaTourDeVoteRepository],
    },
    {
      provide: SauterQuestionSession,
      useFactory: (
        sessions: PrismaSessionRepository,
        tours: PrismaTourDeVoteRepository,
        etatTours: PrismaEtatToursQuery,
      ) => new SauterQuestionSession(sessions, tours, etatTours),
      inject: [
        PrismaSessionRepository,
        PrismaTourDeVoteRepository,
        PrismaEtatToursQuery,
      ],
    },
    {
      provide: ReactiverQuestionSession,
      useFactory: (sessions: PrismaSessionRepository) =>
        new ReactiverQuestionSession(sessions),
      inject: [PrismaSessionRepository],
    },
    {
      provide: TerminerPrematurementSession,
      useFactory: (
        sessions: PrismaSessionRepository,
        tours: PrismaTourDeVoteRepository,
        etatTours: PrismaEtatToursQuery,
      ) => new TerminerPrematurementSession(sessions, tours, etatTours),
      inject: [
        PrismaSessionRepository,
        PrismaTourDeVoteRepository,
        PrismaEtatToursQuery,
      ],
    },
    {
      provide: TerminerSession,
      useFactory: (sessions: PrismaSessionRepository) =>
        new TerminerSession(sessions),
      inject: [PrismaSessionRepository],
    },
    {
      provide: VoterParticipant,
      useFactory: (
        sessions: PrismaSessionRepository,
        tours: PrismaTourDeVoteRepository,
        reponses: PrismaReponseRepository,
        referentiel: PrismaReferentielRepository,
      ) => new VoterParticipant(sessions, tours, reponses, referentiel),
      inject: [
        PrismaSessionRepository,
        PrismaTourDeVoteRepository,
        PrismaReponseRepository,
        PrismaReferentielRepository,
      ],
    },
    {
      provide: ObtenirEtatParticipant,
      useFactory: (
        tours: PrismaTourDeVoteRepository,
        reponses: PrismaReponseRepository,
        referentiel: PrismaReferentielRepository,
      ) => new ObtenirEtatParticipant(tours, reponses, referentiel),
      inject: [
        PrismaTourDeVoteRepository,
        PrismaReponseRepository,
        PrismaReferentielRepository,
      ],
    },
    {
      provide: ObtenirInfoSessionParticipant,
      useFactory: (
        sessions: PrismaSessionRepository,
        equipes: PrismaEquipeRepository,
      ) => new ObtenirInfoSessionParticipant(sessions, equipes),
      inject: [PrismaSessionRepository, PrismaEquipeRepository],
    },
    {
      provide: PasserQuestionSuivanteSession,
      useFactory: (
        sessions: PrismaSessionRepository,
        etatTours: PrismaEtatToursQuery,
      ) => new PasserQuestionSuivanteSession(sessions, etatTours),
      inject: [PrismaSessionRepository, PrismaEtatToursQuery],
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
