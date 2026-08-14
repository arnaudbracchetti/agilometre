import { Result } from '../../shared-kernel/result';

export class NomMembreInvalideError extends Error {
  constructor() {
    super('Le nom d’un Membre ne peut pas être vide');
    this.name = 'NomMembreInvalideError';
  }
}

export class EmailMembreInvalideError extends Error {
  constructor() {
    super('L’email d’un Membre doit être une adresse valide');
    this.name = 'EmailMembreInvalideError';
  }
}

export type ErreurInvariantMembre =
  NomMembreInvalideError | EmailMembreInvalideError;

const FORMAT_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class Membre {
  private constructor(
    readonly id: string,
    private _nom: string,
    private _email: string,
    private _utilisateurId: string | null,
  ) {}

  static creer(
    id: string,
    nom: string,
    email: string,
  ): Result<Membre, ErreurInvariantMembre> {
    const validation = Membre.valider(nom, email);
    if (validation.estEchec) {
      return Result.echec(validation.erreur);
    }
    return Result.succes(new Membre(id, nom.trim(), email.trim(), null));
  }

  /**
   * Recharge un Membre depuis une source déjà validée (le repository Prisma) — ne revalide pas
   * l'invariant, contrairement à `creer` (cf. CLAUDE.md sur la vigilance requise pour toute
   * factory additionnelle d'une entité déjà validée ailleurs).
   */
  static reconstituer(
    id: string,
    nom: string,
    email: string,
    utilisateurId: string | null,
  ): Membre {
    return new Membre(id, nom, email, utilisateurId);
  }

  private static valider(
    nom: string,
    email: string,
  ): Result<void, ErreurInvariantMembre> {
    if (nom.trim().length === 0) {
      return Result.echec(new NomMembreInvalideError());
    }
    if (!FORMAT_EMAIL.test(email.trim())) {
      return Result.echec(new EmailMembreInvalideError());
    }
    return Result.succes(undefined);
  }

  get nom(): string {
    return this._nom;
  }

  get email(): string {
    return this._email;
  }

  get utilisateurId(): string | null {
    return this._utilisateurId;
  }

  modifier(nom: string, email: string): Result<void, ErreurInvariantMembre> {
    const validation = Membre.valider(nom, email);
    if (validation.estEchec) {
      return Result.echec(validation.erreur);
    }
    this._nom = nom.trim();
    this._email = email.trim();
    return Result.succes(undefined);
  }
}
