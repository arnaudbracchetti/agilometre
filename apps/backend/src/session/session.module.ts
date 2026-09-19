import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ReferentielModule } from '../referentiel/referentiel.module';
import { OrganisationModule } from '../organisation/organisation.module';
import { ReponseModule } from '../reponse/reponse.module';
import { PrismaReferentielRepository } from '../referentiel/infrastructure/prisma-referentiel.repository';
import { PrismaEquipeRepository } from '../organisation/infrastructure/prisma-equipe.repository';
import { PrismaEntiteRepository } from '../organisation/infrastructure/prisma-entite.repository';
import { PrismaUtilisateurRepository } from '../organisation/infrastructure/prisma-utilisateur.repository';
import { PrismaReponseRepository } from '../reponse/infrastructure/prisma-reponse.repository';
import { ScoringV1 } from '../scoring/domain/scoring-v1';
import { PerimetreUtilisateur } from '../auth/domain/perimetre-utilisateur';
import { ModeleCollecteModule } from '../modele-collecte/modele-collecte.module';
import { PrismaModeleCollecteRepository } from '../modele-collecte/infrastructure/prisma-modele-collecte.repository';
import { CreerSession } from './application/creer-session.usecase';
import { AjouterQuestionSession } from './application/ajouter-question-session.usecase';
import { AjouterThemeSession } from './application/ajouter-theme-session.usecase';
import { RetirerQuestionSession } from './application/retirer-question-session.usecase';
import { ReordonnerQuestionSession } from './application/reordonner-question-session.usecase';
import { ListerSessions } from './application/lister-sessions.usecase';
import { ObtenirSessionDetail } from './application/obtenir-session-detail.usecase';
import { ModifierInfosSession } from './application/modifier-infos-session.usecase';
import { ChangerModeleCollecte } from './application/changer-modele-collecte.usecase';
import { SupprimerSession } from './application/supprimer-session.usecase';
import { OuvrirSession } from './application/ouvrir-session.usecase';
import { ObtenirProjectionSession } from './application/obtenir-projection-session.usecase';
import { ObtenirPilotageSession } from './application/obtenir-pilotage-session.usecase';
import { ObtenirSyntheseSession } from './application/obtenir-synthese-session.usecase';
import { ListerSessionsEquipe } from './application/lister-sessions-equipe.usecase';
import { ObtenirProfilEquipe } from './application/obtenir-profil-equipe.usecase';
import { ObtenirProfilEntite } from './application/obtenir-profil-entite.usecase';
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
import { ObtenirApercuSession } from './application/obtenir-apercu-session.usecase';
import { PrismaSessionRepository } from './infrastructure/prisma-session.repository';
import { PrismaSessionListeQuery } from './infrastructure/prisma-session-liste.query';
import { PrismaTourDeVoteRepository } from './infrastructure/prisma-tour-de-vote.repository';
import { PrismaJetonSessionRepository } from './infrastructure/prisma-jeton-session.repository';
import { PrismaEtatToursQuery } from './infrastructure/prisma-etat-tours.query';
import { PrismaRepartitionTourQuery } from './infrastructure/prisma-repartition-tour.query';
import { CryptoGenerateurDeCode } from './infrastructure/crypto-generateur-de-code';
import { SessionAnimeeController } from './session-animee.controller';
import { ProjectionController } from './projection.controller';
import { ParticipantController } from './participant.controller';
import { EquipeProfilController } from './equipe-profil.controller';
import { EntiteProfilController } from './entite-profil.controller';
import { JetonParticipantGuard } from './jeton-participant.guard';

@Module({
  imports: [
    ReferentielModule,
    OrganisationModule,
    ReponseModule,
    ModeleCollecteModule,
  ],
  controllers: [
    SessionAnimeeController,
    ProjectionController,
    ParticipantController,
    EquipeProfilController,
    EntiteProfilController,
  ],
  providers: [
    CryptoGenerateurDeCode,
    PrismaSessionRepository,
    PrismaSessionListeQuery,
    PrismaTourDeVoteRepository,
    PrismaJetonSessionRepository,
    PrismaEtatToursQuery,
    PrismaRepartitionTourQuery,
    JetonParticipantGuard,
    {
      provide: CreerSession,
      useFactory: (
        sessions: PrismaSessionRepository,
        equipes: PrismaEquipeRepository,
        modeles: PrismaModeleCollecteRepository,
        generateurDeCode: CryptoGenerateurDeCode,
      ) => new CreerSession(sessions, equipes, modeles, generateurDeCode),
      inject: [
        PrismaSessionRepository,
        PrismaEquipeRepository,
        PrismaModeleCollecteRepository,
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
      provide: ChangerModeleCollecte,
      useFactory: (
        sessions: PrismaSessionRepository,
        modeles: PrismaModeleCollecteRepository,
      ) => new ChangerModeleCollecte(sessions, modeles),
      inject: [PrismaSessionRepository, PrismaModeleCollecteRepository],
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
      // `PerimetreUtilisateur` instancié ici directement, pas injecté depuis `AuthModule` : même
      // contournement de cycle de modules que `OrganisationModule` pour `ListerEntites`
      // (`SessionModule` importe déjà `OrganisationModule`, jamais `AuthModule`) — voir le
      // commentaire équivalent dans organisation.module.ts.
      provide: ObtenirSyntheseSession,
      useFactory: (
        sessions: PrismaSessionRepository,
        equipes: PrismaEquipeRepository,
        referentiel: PrismaReferentielRepository,
        etatTours: PrismaEtatToursQuery,
        reponses: PrismaReponseRepository,
        config: ConfigService,
        utilisateurs: PrismaUtilisateurRepository,
      ) =>
        new ObtenirSyntheseSession(
          sessions,
          equipes,
          referentiel,
          etatTours,
          reponses,
          new ScoringV1(),
          config.get<number>('SCORING_SEUIL_PALIER')!,
          new PerimetreUtilisateur(utilisateurs, equipes),
        ),
      inject: [
        PrismaSessionRepository,
        PrismaEquipeRepository,
        PrismaReferentielRepository,
        PrismaEtatToursQuery,
        PrismaReponseRepository,
        ConfigService,
        PrismaUtilisateurRepository,
      ],
    },
    {
      provide: ListerSessionsEquipe,
      useFactory: (query: PrismaSessionListeQuery) =>
        new ListerSessionsEquipe(query),
      inject: [PrismaSessionListeQuery],
    },
    {
      provide: ObtenirProfilEquipe,
      useFactory: (
        equipes: PrismaEquipeRepository,
        sessions: PrismaSessionRepository,
        referentiel: PrismaReferentielRepository,
        etatTours: PrismaEtatToursQuery,
        reponses: PrismaReponseRepository,
        config: ConfigService,
      ) =>
        new ObtenirProfilEquipe(
          equipes,
          sessions,
          referentiel,
          etatTours,
          reponses,
          new ScoringV1(),
          config.get<number>('SCORING_SEUIL_PALIER')!,
          config.get<number>('SCORING_DUREE_PERIODE_MOIS')!,
        ),
      inject: [
        PrismaEquipeRepository,
        PrismaSessionRepository,
        PrismaReferentielRepository,
        PrismaEtatToursQuery,
        PrismaReponseRepository,
        ConfigService,
      ],
    },
    {
      provide: ObtenirProfilEntite,
      useFactory: (
        entites: PrismaEntiteRepository,
        equipes: PrismaEquipeRepository,
        sessions: PrismaSessionRepository,
        referentiel: PrismaReferentielRepository,
        etatTours: PrismaEtatToursQuery,
        reponses: PrismaReponseRepository,
        config: ConfigService,
      ) =>
        new ObtenirProfilEntite(
          entites,
          equipes,
          sessions,
          referentiel,
          etatTours,
          reponses,
          new ScoringV1(),
          config.get<number>('SCORING_SEUIL_PALIER')!,
          config.get<number>('SCORING_DUREE_PERIODE_MOIS')!,
        ),
      inject: [
        PrismaEntiteRepository,
        PrismaEquipeRepository,
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
      provide: ObtenirApercuSession,
      useFactory: (
        sessions: PrismaSessionRepository,
        equipes: PrismaEquipeRepository,
      ) => new ObtenirApercuSession(sessions, equipes),
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
