/**
 * Encode un succès ou un échec de validation comme une valeur de retour ordinaire, plutôt que de
 * lever une exception — les erreurs de validation métier sont un cas attendu, pas exceptionnel.
 * Toute factory de domaine qui valide un invariant doit retourner un Result plutôt que throw.
 */
export class Result<T, E = Error> {
  private constructor(
    private readonly succesInterne: boolean,
    private readonly valeurInterne: T | undefined,
    private readonly erreurInterne: E | undefined,
  ) {}

  static succes<T, E = Error>(valeur: T): Result<T, E> {
    return new Result<T, E>(true, valeur, undefined);
  }

  static echec<T, E = Error>(erreur: E): Result<T, E> {
    return new Result<T, E>(false, undefined, erreur);
  }

  get estSucces(): boolean {
    return this.succesInterne;
  }

  get estEchec(): boolean {
    return !this.succesInterne;
  }

  get valeur(): T {
    if (!this.succesInterne) {
      throw new Error('Result.valeur appelé sur un échec');
    }
    return this.valeurInterne as T;
  }

  get erreur(): E {
    if (this.succesInterne) {
      throw new Error('Result.erreur appelé sur un succès');
    }
    return this.erreurInterne as E;
  }
}
