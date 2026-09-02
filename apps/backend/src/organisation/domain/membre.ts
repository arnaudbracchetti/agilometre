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

/**
 * Levée par `modifier` : un Membre lié à un Utilisateur est en lecture seule sur nom/prénom/email,
 * ces informations ne se modifient plus qu'en modifiant le compte (propagation descendante, voir
 * doc/spec/annexes/gestion-des-droits.md, "Propagation descendante sur le Membre lié").
 */
export class MembreLieError extends Error {
  constructor() {
    super(
      'Ce Membre est lié à un compte : modifiez le compte pour changer ces informations',
    );
    this.name = 'MembreLieError';
  }
}

export type ErreurInvariantMembre =
  NomMembreInvalideError | EmailMembreInvalideError | MembreLieError;

const FORMAT_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class Membre {
  private constructor(
    readonly id: string,
    private _nom: string,
    private _prenom: string | null,
    private _email: string,
    private _utilisateurId: string | null,
  ) {}

  static creer(
    id: string,
    nom: string,
    prenom: string | null,
    email: string,
  ): Result<Membre, ErreurInvariantMembre> {
    const validation = Membre.valider(nom, email);
    if (validation.estEchec) {
      return Result.echec(validation.erreur);
    }
    // `prenom` est une précision facultative du Membre, jamais requise : `nom` et
    // `email` suffisent à identifier un Membre sans compte. Un rattachement ultérieur (voir
    // `lierUtilisateur`) l'écrase de toute façon avec celui du compte, qui fait autorité.
    return Result.succes(
      new Membre(id, nom.trim(), prenom?.trim() || null, email.trim(), null),
    );
  }

  /**
   * Recharge un Membre depuis une source déjà validée (le repository Prisma) — ne revalide pas
   * l'invariant, contrairement à `creer` (cf. CLAUDE.md sur la vigilance requise pour toute
   * factory additionnelle d'une entité déjà validée ailleurs).
   */
  static reconstituer(
    id: string,
    nom: string,
    prenom: string | null,
    email: string,
    utilisateurId: string | null,
  ): Membre {
    return new Membre(id, nom, prenom, email, utilisateurId);
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

  get prenom(): string | null {
    return this._prenom;
  }

  get email(): string {
    return this._email;
  }

  get utilisateurId(): string | null {
    return this._utilisateurId;
  }

  modifier(
    nom: string,
    prenom: string | null,
    email: string,
  ): Result<void, ErreurInvariantMembre> {
    if (this._utilisateurId !== null) {
      return Result.echec(new MembreLieError());
    }
    const validation = Membre.valider(nom, email);
    if (validation.estEchec) {
      return Result.echec(validation.erreur);
    }
    this._nom = nom.trim();
    this._prenom = prenom?.trim() || null;
    this._email = email.trim();
    return Result.succes(undefined);
  }

  /**
   * Rattachement (automatique par email, ou explicite) à un Utilisateur — les valeurs viennent
   * d'un Utilisateur déjà validé par `Utilisateur.creer`/`modifierProfil`, pas de revalidation ici
   * (même logique que `reconstituer`). Écrase nom/prénom/email : au rattachement, le compte fait
   * autorité (gestion-des-droits.md, "Rattachement automatique").
   */
  lierUtilisateur(
    utilisateurId: string,
    prenom: string,
    nom: string,
    email: string,
  ): void {
    this._utilisateurId = utilisateurId;
    this._prenom = prenom;
    this._nom = nom;
    this._email = email;
  }

  /**
   * Rien à recopier : les valeurs sont déjà à jour par propagation descendante — le Membre
   * redevient simplement éditable (gestion-des-droits.md, "le déliage n'a rien à recopier").
   */
  delierUtilisateur(): void {
    this._utilisateurId = null;
  }
}
