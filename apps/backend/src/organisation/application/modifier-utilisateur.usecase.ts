import { ErreurInvariantUtilisateur, Utilisateur } from '../domain/utilisateur';
import {
  EmailUtilisateurDejaUtiliseError,
  UtilisateurRepository,
} from '../domain/utilisateur.repository';

export type ResultatModifierUtilisateur =
  | { type: 'introuvable' }
  | { type: 'invalide'; erreur: ErreurInvariantUtilisateur }
  | { type: 'email_deja_utilise' }
  | { type: 'modifie'; utilisateur: Utilisateur };

/**
 * Le Coach modifie prénom/nom/email d'un compte — jamais le Rôle ni le mot de passe
 * (doc/spec/annexes/gestion-des-droits.md). Changer le Rôle relève de la cohérence
 * Rôle/Habilitation (tranche #61, `Utilisateur.ajouterHabilitation()`), pas de cette carte.
 */
export class ModifierUtilisateur {
  constructor(private readonly utilisateurs: UtilisateurRepository) {}

  async executer(
    id: string,
    email: string,
    prenom: string,
    nom: string,
  ): Promise<ResultatModifierUtilisateur> {
    const utilisateur = await this.utilisateurs.trouverParId(id);
    if (!utilisateur) {
      return { type: 'introuvable' };
    }

    if (email.toLowerCase() !== utilisateur.email.toLowerCase()) {
      const existant = await this.utilisateurs.trouverParEmail(email);
      if (existant) {
        return { type: 'email_deja_utilise' };
      }
    }

    const resultat = utilisateur.modifierProfil(email, prenom, nom);
    if (resultat.estEchec) {
      return { type: 'invalide', erreur: resultat.erreur };
    }

    try {
      await this.utilisateurs.save(utilisateur);
    } catch (erreur) {
      if (erreur instanceof EmailUtilisateurDejaUtiliseError) {
        return { type: 'email_deja_utilise' };
      }
      throw erreur;
    }

    return { type: 'modifie', utilisateur };
  }
}
