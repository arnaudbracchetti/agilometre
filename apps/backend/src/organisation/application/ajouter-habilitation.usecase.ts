import { randomUUID } from 'node:crypto';
import { ErreurAjoutHabilitation, Utilisateur } from '../domain/utilisateur';
import { UtilisateurRepository } from '../domain/utilisateur.repository';

export type ResultatAjouterHabilitation =
  | { type: 'introuvable' }
  | { type: 'invalide'; erreur: ErreurAjoutHabilitation }
  | { type: 'ajoutee'; utilisateur: Utilisateur };

/** Le Coach seul accorde des Habilitations (`@Requiert('gererComptes')`, posé sur la route). */
export class AjouterHabilitation {
  constructor(private readonly utilisateurs: UtilisateurRepository) {}

  async executer(
    utilisateurId: string,
    cible: { entiteId: string } | { equipeId: string },
  ): Promise<ResultatAjouterHabilitation> {
    const utilisateur = await this.utilisateurs.trouverParId(utilisateurId);
    if (!utilisateur) {
      return { type: 'introuvable' };
    }

    const resultat = utilisateur.ajouterHabilitation(randomUUID(), cible);
    if (resultat.estEchec) {
      return { type: 'invalide', erreur: resultat.erreur };
    }

    await this.utilisateurs.save(utilisateur);
    return { type: 'ajoutee', utilisateur };
  }
}
