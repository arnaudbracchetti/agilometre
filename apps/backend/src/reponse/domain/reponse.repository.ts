import { Reponse } from './reponse';

export interface ReponseRepository {
  findById(id: string): Promise<Reponse | null>;
  /**
   * Toutes les Réponses des Tours donnés — utilisé par le scoring (#52, ADR-0018) pour lire les
   * Réponses réelles des derniers Tours clos retenus par une source de Réponses scorables.
   */
  findByTourIds(tourIds: string[]): Promise<Reponse[]>;
  /** Toujours une création : Reponse est immuable, il n'existe pas de scénario de mise à jour. */
  save(reponse: Reponse): Promise<void>;
  /**
   * Utilisé par le futur use case "voter" pour purger l'ancienne Reponse d'un revote — à appeler
   * strictement après que le repointage de la Participation correspondante ait été persisté
   * (TourDeVoteRepository.save), Participation.reponseId étant une FK obligatoire vers Reponse.
   */
  remove(id: string): Promise<void>;
}
