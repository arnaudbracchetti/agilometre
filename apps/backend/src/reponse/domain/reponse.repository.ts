import { Reponse } from './reponse';

export interface ReponseRepository {
  findById(id: string): Promise<Reponse | null>;
  /** Toujours une création : Reponse est immuable, il n'existe pas de scénario de mise à jour. */
  save(reponse: Reponse): Promise<void>;
  /**
   * Utilisé par le futur use case "voter" pour purger l'ancienne Reponse d'un revote — à appeler
   * strictement après que le repointage de la Participation correspondante ait été persisté
   * (TourDeVoteRepository.save), Participation.reponseId étant une FK obligatoire vers Reponse.
   */
  remove(id: string): Promise<void>;
}
