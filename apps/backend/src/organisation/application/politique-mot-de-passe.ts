/** Longueur minimale d'un mot de passe — partagée par `DefinirMotDePasse`, `ChangerMotDePasse` et
 * `AmorcerPremierCoach`, le seul point qui la fixe. */
export const LONGUEUR_MINIMALE_MOT_DE_PASSE = 8;

export class VerifierMotDePasseTropCourt {
  static executer(motDePasse: string): boolean {
    return motDePasse.length < LONGUEUR_MINIMALE_MOT_DE_PASSE;
  }
}
