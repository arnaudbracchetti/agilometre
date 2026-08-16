export interface LigneBibliothequeModeleSession {
  id: string;
  nom: string;
  nbQuestionsActives: number;
  themesCouverts: string[];
  misAJourLe: Date;
}

/**
 * Read model séparé du repository (docs/design/agregat-session.md §4) : requête directe joignant
 * ModeleSession/SelectionItem et Référentiel, jamais une méthode de ModeleSessionRepository qui,
 * lui, ne charge que l'agrégat complet.
 */
export interface ModeleSessionBibliothequeQuery {
  lister(): Promise<LigneBibliothequeModeleSession[]>;
}
