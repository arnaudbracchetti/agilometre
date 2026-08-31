import { Role } from '@agilometre/shared';
import {
  RoleIncoherentAvecHabilitationsError,
  Utilisateur,
} from '../domain/utilisateur';
import { UtilisateurRepository } from '../domain/utilisateur.repository';

export type ResultatChangerRoleUtilisateur =
  | { type: 'introuvable' }
  | { type: 'invalide'; erreur: RoleIncoherentAvecHabilitationsError }
  | { type: 'change'; utilisateur: Utilisateur };

/** Le Coach seul change le Rôle d'un compte (`@Requiert('gererComptes')`, posé sur la route). */
export class ChangerRoleUtilisateur {
  constructor(private readonly utilisateurs: UtilisateurRepository) {}

  async executer(
    id: string,
    role: Role,
  ): Promise<ResultatChangerRoleUtilisateur> {
    const utilisateur = await this.utilisateurs.trouverParId(id);
    if (!utilisateur) {
      return { type: 'introuvable' };
    }

    const resultat = utilisateur.changerRole(role);
    if (resultat.estEchec) {
      return { type: 'invalide', erreur: resultat.erreur };
    }

    await this.utilisateurs.save(utilisateur);
    return { type: 'change', utilisateur };
  }
}
