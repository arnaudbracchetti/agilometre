import { Equipe } from './equipe';

/**
 * Levée par une implémentation de repository quand `save()` viole la contrainte d'unicité de nom
 * en base (filet de sécurité contre une race condition — la garde principale passe par
 * `trouverParNom` dans les use cases, voir docs/design/agregat-organisation.md).
 */
export class NomEquipeDejaUtiliseError extends Error {
  constructor() {
    super('Une Équipe porte déjà ce nom');
    this.name = 'NomEquipeDejaUtiliseError';
  }
}

/**
 * Levée par une implémentation de repository quand `remove()` échoue parce que l'Équipe est
 * encore référencée ailleurs (ex. Session, Campagne de pouls).
 */
export class EquipeReferenceeError extends Error {
  constructor() {
    super('Cette Équipe est encore référencée et ne peut pas être supprimée');
    this.name = 'EquipeReferenceeError';
  }
}

export interface EquipeRepository {
  /** Charge l'agrégat complet, avec ses Membres. */
  findById(id: string): Promise<Equipe | null>;
  /** Charge les Équipes d'une Entité, agrégats complets (Membres inclus). */
  findByEntiteId(entiteId: string): Promise<Equipe[]>;
  /** Recherche insensible à la casse, globale à l'Organisation — garde d'unicité pour CreerEquipe/RenommerEquipe. */
  trouverParNom(nom: string): Promise<Equipe | null>;
  /** @throws {NomEquipeDejaUtiliseError} si la contrainte d'unicité de nom est violée en base. */
  save(equipe: Equipe): Promise<void>;
  /** @throws {EquipeReferenceeError} si l'Équipe est encore référencée ailleurs en base. */
  remove(id: string): Promise<void>;
  /** Nombre d'Équipes rattachées à une Entité — garde de suppression d'Entité (#25). */
  compterParEntite(entiteId: string): Promise<number>;
  /** Équipes ayant au moins un Membre portant cet email (insensible à la casse) — rattachement
   * automatique par email à la création d'un Utilisateur (#62), pas une recherche générale. */
  trouverParEmailMembre(email: string): Promise<Equipe[]>;
  /** Dérivation du périmètre Membre d'équipe (`PerimetreUtilisateur.peutVoirEquipe`, #62) - évite
   * de charger l'agrégat Équipe complet pour une simple question d'appartenance à l'Équipe. */
  estMembreDe(utilisateurId: string, equipeId: string): Promise<boolean>;
  /** Dérivation du périmètre Membre d'équipe côté Entité (`PerimetreUtilisateur.peutVoirEntite`) :
   * vrai si au moins une Équipe de cette Entité compte cet Utilisateur comme Membre - sert à
   * afficher les noms d'Entités dans l'arbre de navigation, pas à charger quoi que ce soit de plus. */
  aUneEquipeDansLEntite(
    utilisateurId: string,
    entiteId: string,
  ): Promise<boolean>;
}
