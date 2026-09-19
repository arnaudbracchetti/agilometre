export interface LigneBibliothequeModeleCollecte {
  id: string;
  nom: string;
  nbQuestionsActives: number;
  themesCouverts: string[];
  misAJourLe: Date;
}

/**
 * Read model séparé du repository (docs/design/agregat-session.md §4) : requête directe joignant
 * ModeleCollecte/SelectionItem et Référentiel, jamais une méthode de ModeleCollecteRepository qui,
 * lui, ne charge que l'agrégat complet.
 */
export interface ModeleCollecteBibliothequeQuery {
  lister(): Promise<LigneBibliothequeModeleCollecte[]>;
}
