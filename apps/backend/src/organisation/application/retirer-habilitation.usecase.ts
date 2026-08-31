import { Utilisateur } from '../domain/utilisateur';
import { UtilisateurRepository } from '../domain/utilisateur.repository';

export type ResultatRetirerHabilitation =
  | { type: 'introuvable' }
  | { type: 'habilitation_introuvable' }
  | { type: 'retiree'; utilisateur: Utilisateur };

/** Le Coach seul retire des Habilitations (`@Requiert('gererComptes')`, posé sur la route). */
export class RetirerHabilitation {
  constructor(private readonly utilisateurs: UtilisateurRepository) {}

  async executer(
    utilisateurId: string,
    habilitationId: string,
  ): Promise<ResultatRetirerHabilitation> {
    const utilisateur = await this.utilisateurs.trouverParId(utilisateurId);
    if (!utilisateur) {
      return { type: 'introuvable' };
    }

    const resultat = utilisateur.retirerHabilitation(habilitationId);
    if (resultat.estEchec) {
      return { type: 'habilitation_introuvable' };
    }

    await this.utilisateurs.save(utilisateur);
    return { type: 'retiree', utilisateur };
  }
}
