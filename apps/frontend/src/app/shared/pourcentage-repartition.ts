/** Partagé entre synthese-page et lecture-fine-page. % arrondi d'un Niveau dans la répartition d'une Question — 0 sur un effectif nul. */
export class PourcentageRepartition {
  static executer(compte: number, effectif: number): number {
    return effectif === 0 ? 0 : Math.round((compte / effectif) * 100);
  }
}
