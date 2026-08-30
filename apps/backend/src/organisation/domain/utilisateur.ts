import { Role } from '@agilometre/shared';
import { Result } from '../../shared-kernel/result';

export class EmailUtilisateurInvalideError extends Error {
  constructor() {
    super('L’email d’un Utilisateur doit être une adresse valide');
    this.name = 'EmailUtilisateurInvalideError';
  }
}

export class PrenomUtilisateurInvalideError extends Error {
  constructor() {
    super('Le prénom d’un Utilisateur ne peut pas être vide');
    this.name = 'PrenomUtilisateurInvalideError';
  }
}

export class NomUtilisateurInvalideError extends Error {
  constructor() {
    super('Le nom d’un Utilisateur ne peut pas être vide');
    this.name = 'NomUtilisateurInvalideError';
  }
}

export class MotDePasseHashUtilisateurInvalideError extends Error {
  constructor() {
    super('Le hash de mot de passe d’un Utilisateur ne peut pas être vide');
    this.name = 'MotDePasseHashUtilisateurInvalideError';
  }
}

export type ErreurInvariantUtilisateur =
  | EmailUtilisateurInvalideError
  | PrenomUtilisateurInvalideError
  | NomUtilisateurInvalideError
  | MotDePasseHashUtilisateurInvalideError;

const FORMAT_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class Utilisateur {
  private constructor(
    readonly id: string,
    private _email: string,
    private _prenom: string,
    private _nom: string,
    private _motDePasseHash: string,
    private _actif: boolean,
    private _role: Role,
  ) {}

  static creer(
    id: string,
    email: string,
    prenom: string,
    nom: string,
    motDePasseHash: string,
    role: Role,
  ): Result<Utilisateur, ErreurInvariantUtilisateur> {
    const validation = Utilisateur.valider(email, prenom, nom, motDePasseHash);
    if (validation.estEchec) {
      return Result.echec(validation.erreur);
    }
    return Result.succes(
      new Utilisateur(
        id,
        email.trim(),
        prenom.trim(),
        nom.trim(),
        motDePasseHash,
        true,
        role,
      ),
    );
  }

  /**
   * Recharge un Utilisateur depuis une source déjà validée (le repository Prisma, qui ne relit
   * que des lignes déjà passées par `creer`) — ne revalide pas l'invariant volontairement,
   * contrairement à `creer` (cf. CLAUDE.md sur la vigilance requise pour toute factory
   * additionnelle d'une entité déjà validée ailleurs).
   */
  static reconstituer(
    id: string,
    email: string,
    prenom: string,
    nom: string,
    motDePasseHash: string,
    actif: boolean,
    role: Role,
  ): Utilisateur {
    return new Utilisateur(id, email, prenom, nom, motDePasseHash, actif, role);
  }

  private static valider(
    email: string,
    prenom: string,
    nom: string,
    motDePasseHash: string,
  ): Result<void, ErreurInvariantUtilisateur> {
    if (!FORMAT_EMAIL.test(email.trim())) {
      return Result.echec(new EmailUtilisateurInvalideError());
    }
    if (prenom.trim().length === 0) {
      return Result.echec(new PrenomUtilisateurInvalideError());
    }
    if (nom.trim().length === 0) {
      return Result.echec(new NomUtilisateurInvalideError());
    }
    if (motDePasseHash.trim().length === 0) {
      return Result.echec(new MotDePasseHashUtilisateurInvalideError());
    }
    return Result.succes(undefined);
  }

  get email(): string {
    return this._email;
  }

  get prenom(): string {
    return this._prenom;
  }

  get nom(): string {
    return this._nom;
  }

  get motDePasseHash(): string {
    return this._motDePasseHash;
  }

  get actif(): boolean {
    return this._actif;
  }

  get role(): Role {
    return this._role;
  }
}
