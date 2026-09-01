import { StatutSession } from './session';

export interface LigneListeSession {
  id: string;
  equipeId: string;
  equipeNom: string;
  date: Date;
  statut: StatutSession;
  verrouillee: boolean;
  nbQuestions: number;
  /** `null` si le Modèle source a été supprimé depuis (ADR-0009 : aucune intégrité forte). */
  modeleSessionNom: string | null;
}

/**
 * Read model séparé du repository (même raisonnement que `ModeleSessionBibliothequeQuery`) :
 * requête directe joignant Session/Equipe/ModeleSession, jamais une méthode de SessionRepository
 * qui, lui, ne charge que l'agrégat complet.
 */
export interface SessionListeQuery {
  lister(): Promise<LigneListeSession[]>;
  /**
   * Sessions d'une Équipe déjà ouvertes au moins une fois (exclut `PREPAREE`, même garde que
   * `ObtenirSyntheseSession`) — pour "répartition détaillée des Sessions" d'un Membre d'équipe
   * (#62), qui n'a jamais accès à la bibliothèque Coach (`lister()` ci-dessus, non filtrée).
   */
  listerParEquipe(equipeId: string): Promise<LigneListeSession[]>;
}
