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
}
