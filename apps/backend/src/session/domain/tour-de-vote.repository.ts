import { TourDeVote } from './tour-de-vote';

export interface TourDeVoteRepository {
  findById(id: string): Promise<TourDeVote | null>;
  /** Invariant "un seul Tour non clos par Session" — vérifié ici, jamais par l'agrégat lui-même. */
  trouverOuvertPour(sessionId: string): Promise<TourDeVote | null>;
  /** Persiste le Tour et remplace intégralement ses Participation (jamais les Reponse). */
  save(tourDeVote: TourDeVote): Promise<void>;
}
