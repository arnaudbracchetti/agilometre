import { TourDeVote } from '../domain/tour-de-vote';
import { TourDeVoteRepository } from '../domain/tour-de-vote.repository';

export type ResultatCloreTourDeVote =
  { type: 'aucun_tour_ouvert' } | { type: 'ok'; tour: TourDeVote };

/** Clôture du Tour ouvert de la Session — purge ses Participation (jamais les Reponse). */
export class CloreTourDeVote {
  constructor(private readonly tours: TourDeVoteRepository) {}

  async executer(sessionId: string): Promise<ResultatCloreTourDeVote> {
    const tour = await this.tours.trouverTourOuvertDeLaSession(sessionId);
    if (!tour) {
      return { type: 'aucun_tour_ouvert' };
    }
    // clore() ne peut échouer que si le Tour est déjà clos — impossible ici puisqu'il vient
    // d'être résolu comme "ouvert" par trouverTourOuvertDeLaSession.
    tour.clore(new Date());
    await this.tours.save(tour);
    return { type: 'ok', tour };
  }
}
