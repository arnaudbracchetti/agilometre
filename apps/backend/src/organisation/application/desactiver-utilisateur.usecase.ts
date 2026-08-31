import { Utilisateur } from '../domain/utilisateur';
import { UtilisateurRepository } from '../domain/utilisateur.repository';

export type ResultatDesactiverUtilisateur =
  { type: 'introuvable' } | { type: 'desactive'; utilisateur: Utilisateur };

/**
 * Réversible, jamais de suppression (gestion-des-droits.md, "Désactivation"). Idempotent : rien
 * n'empêche un Coach de désactiver son propre compte, y compris le dernier — `bootstrap-coach.ts`
 * reste le filet de secours (rejouable avec un email neuf à tout moment), cohérent avec "aucun
 * Rôle admin distinct du Coach" de l'annexe.
 */
export class DesactiverUtilisateur {
  constructor(private readonly utilisateurs: UtilisateurRepository) {}

  async executer(id: string): Promise<ResultatDesactiverUtilisateur> {
    const utilisateur = await this.utilisateurs.trouverParId(id);
    if (!utilisateur) {
      return { type: 'introuvable' };
    }

    utilisateur.desactiver();
    await this.utilisateurs.save(utilisateur);
    return { type: 'desactive', utilisateur };
  }
}
