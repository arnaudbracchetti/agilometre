/**
 * Lecture dédiée à la répartition des votes d'un ou plusieurs Tours clos
 * (docs/design/agregat-tour-de-vote.md §4) — jamais les agrégats `TourDeVote`/`Reponse` complets.
 * Accepte plusieurs `tourId` pour couvrir aussi bien l'affichage du dernier Tour clos que
 * l'historique de plusieurs Tours, sans deux implémentations divergentes de la même lecture.
 */
export interface RepartitionTour {
  tourId: string;
  /** Clés 1 à 4 toujours toutes présentes (zero-fill), jamais un objet partiel. */
  comptesParNiveau: Record<number, number>;
}

export interface RepartitionTourQuery {
  listerRepartitionsDesTours(tourIds: string[]): Promise<RepartitionTour[]>;
}
