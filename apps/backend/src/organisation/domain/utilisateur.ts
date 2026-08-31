import { Role } from '@agilometre/shared';
import { Result } from '../../shared-kernel/result';
import { Habilitation } from './habilitation';

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

/**
 * Levée par `ajouterHabilitation` quand la cible (Entité/Équipe) n'est pas de la nature attendue
 * pour le Rôle du porteur — doc/spec/annexes/gestion-des-droits.md, "Habilitations" : `entiteId`
 * seul si `DIRECTION`, `equipeId` seul si `MANAGER`, aucune Habilitation si `COACH` ni `MEMBRE`
 * (le périmètre d'un Membre est dérivé du roster, jamais d'une Habilitation).
 */
export class HabilitationIncompatibleAvecRoleError extends Error {
  constructor() {
    super(
      'Cette Habilitation n’est pas compatible avec le Rôle de cet Utilisateur',
    );
    this.name = 'HabilitationIncompatibleAvecRoleError';
  }
}

export class HabilitationEnDoublonError extends Error {
  constructor() {
    super('Cette Habilitation existe déjà pour cet Utilisateur');
    this.name = 'HabilitationEnDoublonError';
  }
}

export class HabilitationIntrouvableError extends Error {
  constructor() {
    super('Cette Habilitation n’existe pas pour cet Utilisateur');
    this.name = 'HabilitationIntrouvableError';
  }
}

/**
 * Levée par `changerRole` : pas de vidage silencieux des Habilitations existantes devenues
 * incohérentes avec le nouveau Rôle — l'opérateur doit les retirer explicitement d'abord
 * (doc/spec/annexes/gestion-des-droits.md, "Habilitations").
 */
export class RoleIncoherentAvecHabilitationsError extends Error {
  constructor() {
    super(
      'Ce changement de Rôle rendrait des Habilitations existantes incohérentes',
    );
    this.name = 'RoleIncoherentAvecHabilitationsError';
  }
}

export type ErreurAjoutHabilitation =
  HabilitationIncompatibleAvecRoleError | HabilitationEnDoublonError;

type CibleHabilitation = { entiteId: string } | { equipeId: string };

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
    private readonly _habilitations: Habilitation[],
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
        [],
      ),
    );
  }

  /**
   * Recharge un Utilisateur (avec ses Habilitations) depuis une source déjà validée (le repository
   * Prisma, qui ne relit que des lignes déjà passées par `creer`/`ajouterHabilitation`) — ne
   * revalide pas l'invariant volontairement, contrairement à `creer` (cf. CLAUDE.md sur la
   * vigilance requise pour toute factory additionnelle d'une entité déjà validée ailleurs).
   */
  static reconstituer(
    id: string,
    email: string,
    prenom: string,
    nom: string,
    motDePasseHash: string,
    actif: boolean,
    role: Role,
    habilitations: Habilitation[],
  ): Utilisateur {
    return new Utilisateur(
      id,
      email,
      prenom,
      nom,
      motDePasseHash,
      actif,
      role,
      habilitations,
    );
  }

  private static valider(
    email: string,
    prenom: string,
    nom: string,
    motDePasseHash: string,
  ): Result<void, ErreurInvariantUtilisateur> {
    const email_ = Utilisateur.validerEmail(email);
    if (email_.estEchec) return Result.echec(email_.erreur);
    const prenom_ = Utilisateur.validerPrenom(prenom);
    if (prenom_.estEchec) return Result.echec(prenom_.erreur);
    const nom_ = Utilisateur.validerNom(nom);
    if (nom_.estEchec) return Result.echec(nom_.erreur);
    const hash_ = Utilisateur.validerMotDePasseHash(motDePasseHash);
    if (hash_.estEchec) return Result.echec(hash_.erreur);
    return Result.succes(undefined);
  }

  private static validerEmail(
    email: string,
  ): Result<void, EmailUtilisateurInvalideError> {
    if (!FORMAT_EMAIL.test(email.trim())) {
      return Result.echec(new EmailUtilisateurInvalideError());
    }
    return Result.succes(undefined);
  }

  private static validerPrenom(
    prenom: string,
  ): Result<void, PrenomUtilisateurInvalideError> {
    if (prenom.trim().length === 0) {
      return Result.echec(new PrenomUtilisateurInvalideError());
    }
    return Result.succes(undefined);
  }

  private static validerNom(
    nom: string,
  ): Result<void, NomUtilisateurInvalideError> {
    if (nom.trim().length === 0) {
      return Result.echec(new NomUtilisateurInvalideError());
    }
    return Result.succes(undefined);
  }

  private static validerMotDePasseHash(
    motDePasseHash: string,
  ): Result<void, MotDePasseHashUtilisateurInvalideError> {
    if (motDePasseHash.trim().length === 0) {
      return Result.echec(new MotDePasseHashUtilisateurInvalideError());
    }
    return Result.succes(undefined);
  }

  /**
   * Coach : modifie prénom/nom/email d'un compte — jamais le mot de passe
   * (doc/spec/annexes/gestion-des-droits.md, "Le Coach n'a aucun pouvoir sur le mot de passe
   * d'autrui"). Réutilise les mêmes validations unitaires que `creer`.
   */
  modifierProfil(
    email: string,
    prenom: string,
    nom: string,
  ): Result<void, ErreurInvariantUtilisateur> {
    const email_ = Utilisateur.validerEmail(email);
    if (email_.estEchec) return Result.echec(email_.erreur);
    const prenom_ = Utilisateur.validerPrenom(prenom);
    if (prenom_.estEchec) return Result.echec(prenom_.erreur);
    const nom_ = Utilisateur.validerNom(nom);
    if (nom_.estEchec) return Result.echec(nom_.erreur);

    this._email = email.trim();
    this._prenom = prenom.trim();
    this._nom = nom.trim();
    return Result.succes(undefined);
  }

  /**
   * Seul point d'entrée qui touche `_motDePasseHash` — consommé par `DefinirMotDePasse`
   * (invitation/réinitialisation) et `ChangerMotDePasse` (self-service), jamais par le Coach pour
   * le compte d'autrui.
   */
  definirMotDePasse(
    motDePasseHash: string,
  ): Result<void, MotDePasseHashUtilisateurInvalideError> {
    const hash_ = Utilisateur.validerMotDePasseHash(motDePasseHash);
    if (hash_.estEchec) return Result.echec(hash_.erreur);

    this._motDePasseHash = motDePasseHash;
    return Result.succes(undefined);
  }

  /** Réversible, jamais de suppression (gestion-des-droits.md, "Désactivation") — idempotent,
   * aucun invariant à violer. */
  desactiver(): void {
    this._actif = false;
  }

  reactiver(): void {
    this._actif = true;
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

  get habilitations(): readonly Habilitation[] {
    return [...this._habilitations];
  }

  /**
   * Coach seul, réservé aux comptes `DIRECTION`/`MANAGER` — `COACH` et `MEMBRE` n'ont jamais
   * d'Habilitation, leur périmètre respectif est transversal ou dérivé du roster
   * (doc/spec/annexes/gestion-des-droits.md, "Habilitations").
   */
  ajouterHabilitation(
    id: string,
    cible: CibleHabilitation,
  ): Result<void, ErreurAjoutHabilitation> {
    if (!Utilisateur.cibleCoherenteAvecRole(cible, this._role)) {
      return Result.echec(new HabilitationIncompatibleAvecRoleError());
    }
    const doublon = this._habilitations.some((habilitation) =>
      'entiteId' in cible
        ? habilitation.entiteId === cible.entiteId
        : habilitation.equipeId === cible.equipeId,
    );
    if (doublon) {
      return Result.echec(new HabilitationEnDoublonError());
    }
    this._habilitations.push(Habilitation.creer(id, cible));
    return Result.succes(undefined);
  }

  retirerHabilitation(id: string): Result<void, HabilitationIntrouvableError> {
    const index = this._habilitations.findIndex(
      (habilitation) => habilitation.id === id,
    );
    if (index === -1) {
      return Result.echec(new HabilitationIntrouvableError());
    }
    this._habilitations.splice(index, 1);
    return Result.succes(undefined);
  }

  /**
   * Pas de vidage silencieux : rejeté si une Habilitation existante ne serait plus cohérente avec
   * le nouveau Rôle — l'opérateur doit d'abord la retirer explicitement.
   */
  changerRole(role: Role): Result<void, RoleIncoherentAvecHabilitationsError> {
    const incoherente = this._habilitations.some(
      (habilitation) =>
        !Utilisateur.cibleCoherenteAvecRole(
          habilitation.entiteId !== null
            ? { entiteId: habilitation.entiteId }
            : { equipeId: habilitation.equipeId! },
          role,
        ),
    );
    if (incoherente) {
      return Result.echec(new RoleIncoherentAvecHabilitationsError());
    }
    this._role = role;
    return Result.succes(undefined);
  }

  private static cibleCoherenteAvecRole(
    cible: CibleHabilitation,
    role: Role,
  ): boolean {
    return 'entiteId' in cible
      ? role === Role.Direction
      : role === Role.Manager;
  }
}
