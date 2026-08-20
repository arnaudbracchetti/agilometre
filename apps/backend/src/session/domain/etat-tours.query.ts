import { EtatTour } from './session';

/**
 * Lecture légère de l'état des Tours d'une Session — jamais les agrégats `TourDeVote` complets
 * (avec leurs Participation), cf. docs/design/agregat-tour-de-vote.md §5. Alimente uniquement les
 * règles qui vivent dans `Session` (`passerQuestionSuivante`, `progression`).
 */
export interface EtatToursQuery {
  listerEtatsDesToursDeLaSession(sessionId: string): Promise<EtatTour[]>;
}
