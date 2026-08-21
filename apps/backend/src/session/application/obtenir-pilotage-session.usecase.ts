import { JetonSessionRepository } from '../domain/jeton-session.repository';
import { Question } from '../../referentiel/domain/question';
import { ReferentielRepository } from '../../referentiel/domain/referentiel.repository';
import { EtatToursQuery } from '../domain/etat-tours.query';
import { RepartitionTourQuery } from '../domain/repartition-tour.query';
import { Session } from '../domain/session';
import { SessionRepository } from '../domain/session.repository';
import { TourDeVote } from '../domain/tour-de-vote';
import { TourDeVoteRepository } from '../domain/tour-de-vote.repository';
import {
  DernierTourClos,
  resoudreDernierTourClos,
} from './resoudre-dernier-tour-clos';
import {
  HistoriqueTourClos,
  resoudreHistoriqueToursClos,
} from './resoudre-historique-tours-clos';
import { resoudreQuestionCourante } from './resoudre-question-courante';

export type ResultatObtenirPilotageSession =
  | { type: 'introuvable' }
  | {
      type: 'ok';
      session: Session;
      nbDevicesConnectes: number;
      questionCourante: Question | null;
      tourOuvert: TourDeVote | null;
      dernierTourClos: DernierTourClos | null;
      historique: HistoriqueTourClos[];
    };

/**
 * L'écran de pilotage n'existe qu'à partir de l'ouverture (le Code n'existe pas avant) et reste
 * accessible en lecture seule après CLOTUREE (doc/spec/annexes/deroulement-session-animee.md,
 * "Écran de pilotage") — seule PREPAREE compte comme introuvable pour cette lecture.
 */
export class ObtenirPilotageSession {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly jetons: JetonSessionRepository,
    private readonly referentiel: ReferentielRepository,
    private readonly tours: TourDeVoteRepository,
    private readonly etatTours: EtatToursQuery,
    private readonly repartitions: RepartitionTourQuery,
  ) {}

  async executer(id: string): Promise<ResultatObtenirPilotageSession> {
    const session = await this.sessions.findById(id);
    if (!session || session.statut === 'PREPAREE') {
      return { type: 'introuvable' };
    }
    const nbDevicesConnectes = await this.jetons.compterJetonsDeLaSession(id);
    const questionCourante = await resoudreQuestionCourante(
      session,
      this.referentiel,
    );
    const tourOuvert = await this.tours.trouverTourOuvertDeLaSession(id);
    const dernierTourClos = await resoudreDernierTourClos(
      id,
      questionCourante,
      this.etatTours,
      this.repartitions,
    );
    const historique = await resoudreHistoriqueToursClos(
      session,
      this.etatTours,
      this.repartitions,
      this.referentiel,
    );
    return {
      type: 'ok',
      session,
      nbDevicesConnectes,
      questionCourante,
      tourOuvert,
      dernierTourClos,
      historique,
    };
  }
}
