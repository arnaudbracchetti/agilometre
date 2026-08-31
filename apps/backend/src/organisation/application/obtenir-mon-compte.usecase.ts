import { Utilisateur } from '../domain/utilisateur';
import { UtilisateurRepository } from '../domain/utilisateur.repository';

/**
 * Self-service, accessible à tout Rôle connecté (capacité `gererSonCompte`) — `utilisateurId` doit
 * toujours venir de `request.utilisateur.id` (JWT), même garde que `ChangerMotDePasse`.
 */
export class ObtenirMonCompte {
  constructor(private readonly utilisateurs: UtilisateurRepository) {}

  executer(utilisateurId: string): Promise<Utilisateur | null> {
    return this.utilisateurs.trouverParId(utilisateurId);
  }
}
