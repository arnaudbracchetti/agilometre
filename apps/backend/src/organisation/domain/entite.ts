import { Result } from '../../shared-kernel/result';

export class NomEntiteInvalideError extends Error {
  constructor() {
    super('Le nom d’une Entité ne peut pas être vide');
    this.name = 'NomEntiteInvalideError';
  }
}

export type ErreurInvariantEntite = NomEntiteInvalideError;

export class Entite {
  private constructor(
    readonly id: string,
    private _nom: string,
  ) {}

  static creer(id: string, nom: string): Result<Entite, ErreurInvariantEntite> {
    const validation = Entite.validerNom(nom);
    if (validation.estEchec) {
      return Result.echec(validation.erreur);
    }
    return Result.succes(new Entite(id, nom.trim()));
  }

  /**
   * Recharge une Entité depuis une source déjà validée (le repository Prisma) — ne revalide pas
   * l'invariant, contrairement à `creer` (cf. CLAUDE.md sur la vigilance requise pour toute
   * factory additionnelle d'une entité déjà validée ailleurs).
   */
  static reconstituer(id: string, nom: string): Entite {
    return new Entite(id, nom);
  }

  private static validerNom(nom: string): Result<void, ErreurInvariantEntite> {
    if (nom.trim().length === 0) {
      return Result.echec(new NomEntiteInvalideError());
    }
    return Result.succes(undefined);
  }

  get nom(): string {
    return this._nom;
  }

  renommer(nom: string): Result<void, ErreurInvariantEntite> {
    const validation = Entite.validerNom(nom);
    if (validation.estEchec) {
      return Result.echec(validation.erreur);
    }
    this._nom = nom.trim();
    return Result.succes(undefined);
  }
}
