import * as argon2 from 'argon2';
import { UtilisateurRepository } from '../domain/utilisateur.repository';
import { VerifierMotDePasseTropCourt } from './politique-mot-de-passe';

export type ResultatChangerMotDePasse =
  | { type: 'ok' }
  | { type: 'mot_de_passe_actuel_incorrect' }
  | { type: 'mot_de_passe_trop_court' }
  | { type: 'introuvable' };

/**
 * Self-service, accessible à tout Rôle connecté (capacité `gererSonCompte`). `utilisateurId` doit
 * toujours venir de `request.utilisateur.id` (JWT), jamais d'un paramètre de route/body — empêche
 * structurellement de changer le mot de passe d'autrui (gestion-des-droits.md, "Le Coach n'a
 * aucun pouvoir sur le mot de passe d'autrui").
 */
export class ChangerMotDePasse {
  constructor(private readonly utilisateurs: UtilisateurRepository) {}

  async executer(
    utilisateurId: string,
    motDePasseActuel: string,
    nouveauMotDePasse: string,
  ): Promise<ResultatChangerMotDePasse> {
    const utilisateur = await this.utilisateurs.trouverParId(utilisateurId);
    if (!utilisateur) {
      // Défensif : JWT valide mais compte disparu — n'arrive jamais dans #60.
      return { type: 'introuvable' };
    }

    if (!(await argon2.verify(utilisateur.motDePasseHash, motDePasseActuel))) {
      return { type: 'mot_de_passe_actuel_incorrect' };
    }

    if (VerifierMotDePasseTropCourt.executer(nouveauMotDePasse)) {
      return { type: 'mot_de_passe_trop_court' };
    }

    utilisateur.definirMotDePasse(await argon2.hash(nouveauMotDePasse));
    await this.utilisateurs.save(utilisateur);
    return { type: 'ok' };
  }
}
