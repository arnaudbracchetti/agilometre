/**
 * Jeton de compte (CONTEXT.md) : usage unique, 7 jours, sert à la fois l'invitation initiale et
 * la réinitialisation — même mécanisme, pas de fonction de renvoi distincte. Distinct du
 * `JetonSession` (session/, anonyme, portée toute la Session) et du `Jeton` de Sollicitation
 * (Pouls, usage unique et nominatif). Enregistrement minimal, comme `JetonSession` : rien à
 * valider à la construction (id/hash/dates sont déjà corrects par construction côté appelant),
 * pas de `Result` ici contrairement à `Utilisateur`. L'unique garde métier ("non expiré, non
 * consommé") est portée par `JetonCompteRepository.consommerSiValide`, pas ici — un check puis un
 * write séparés ici seraient racy (même raisonnement que JetonSessionRepository.emettre).
 */
export class JetonCompte {
  static readonly DUREE_VALIDITE_JOURS = 7;

  private constructor(
    readonly id: string,
    readonly utilisateurId: string,
    readonly tokenHash: string,
    readonly creeLe: Date,
    readonly expireLe: Date,
    private _consommeLe: Date | null,
  ) {}

  static creer(
    id: string,
    utilisateurId: string,
    tokenHash: string,
    creeLe: Date,
  ): JetonCompte {
    const expireLe = new Date(
      creeLe.getTime() + JetonCompte.DUREE_VALIDITE_JOURS * 24 * 3600 * 1000,
    );
    return new JetonCompte(
      id,
      utilisateurId,
      tokenHash,
      creeLe,
      expireLe,
      null,
    );
  }

  static reconstituer(
    id: string,
    utilisateurId: string,
    tokenHash: string,
    creeLe: Date,
    expireLe: Date,
    consommeLe: Date | null,
  ): JetonCompte {
    return new JetonCompte(
      id,
      utilisateurId,
      tokenHash,
      creeLe,
      expireLe,
      consommeLe,
    );
  }

  get consommeLe(): Date | null {
    return this._consommeLe;
  }
}
