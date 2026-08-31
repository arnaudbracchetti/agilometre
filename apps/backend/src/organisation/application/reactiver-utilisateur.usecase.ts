import { Utilisateur } from '../domain/utilisateur';
import { UtilisateurRepository } from '../domain/utilisateur.repository';

export type ResultatReactiverUtilisateur =
  { type: 'introuvable' } | { type: 'reactive'; utilisateur: Utilisateur };

/** Réversible (gestion-des-droits.md, "Désactivation") — le mot de passe existant reste valide,
 * `reactiver()` ne touche qu'`actif`. */
export class ReactiverUtilisateur {
  constructor(private readonly utilisateurs: UtilisateurRepository) {}

  async executer(id: string): Promise<ResultatReactiverUtilisateur> {
    const utilisateur = await this.utilisateurs.trouverParId(id);
    if (!utilisateur) {
      return { type: 'introuvable' };
    }

    utilisateur.reactiver();
    await this.utilisateurs.save(utilisateur);
    return { type: 'reactive', utilisateur };
  }
}
