import { UtilisateurDto } from '@agilometre/shared';
import { Utilisateur } from './domain/utilisateur';

export class VersUtilisateurDto {
  static executer(utilisateur: Utilisateur): UtilisateurDto {
    return {
      id: utilisateur.id,
      email: utilisateur.email,
      prenom: utilisateur.prenom,
      nom: utilisateur.nom,
      actif: utilisateur.actif,
      role: utilisateur.role,
    };
  }
}
