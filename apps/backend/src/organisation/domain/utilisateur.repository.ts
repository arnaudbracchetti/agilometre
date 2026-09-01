import { Utilisateur } from './utilisateur';

/**
 * Levée par une implémentation de repository quand `save()` viole la contrainte d'unicité d'email
 * en base (filet de sécurité contre une race condition — la garde applicative normale passe par
 * `trouverParEmail`, même patron que `NomEntiteDejaUtiliseError`).
 */
export class EmailUtilisateurDejaUtiliseError extends Error {
  constructor() {
    super('Un compte existe déjà avec cet email');
    this.name = 'EmailUtilisateurDejaUtiliseError';
  }
}

export interface UtilisateurRepository {
  /** Recherche insensible à la casse — garde d'unicité et résolution au moment de la connexion. */
  trouverParEmail(email: string): Promise<Utilisateur | null>;
  /** Agrégat complet, Habilitations incluses (consommé notamment par `PerimetreUtilisateur`). */
  trouverParId(id: string): Promise<Utilisateur | null>;
  /** Écran Comptes (Coach seul) — aucune pagination : le volume de comptes reste faible (une
   * instance par client, un compte par personne habilitée). */
  lister(): Promise<Utilisateur[]>;
  /** @throws {EmailUtilisateurDejaUtiliseError} si la contrainte d'unicité d'email est violée en base. */
  save(utilisateur: Utilisateur): Promise<void>;
  /**
   * Sauvegarde le profil modifié d'un Utilisateur (email/prénom/nom) et propage ces trois champs,
   * dans la même transaction, vers chaque Membre qui le référence à travers tous les rosters —
   * jamais appelé par la création, la désactivation ou les Habilitations, qui ne touchent pas ces
   * champs et n'ont donc rien à propager (voir `ModifierUtilisateur`).
   * @throws {EmailUtilisateurDejaUtiliseError} si la contrainte d'unicité globale d'email est violée.
   * @throws {EmailMembreDejaUtiliseError} sans rien écrire — ni l'Utilisateur, ni aucune ligne —
   * si la propagation créerait un doublon d'email dans l'un des rosters concernés.
   */
  sauvegarderEtPropager(utilisateur: Utilisateur): Promise<void>;
}
