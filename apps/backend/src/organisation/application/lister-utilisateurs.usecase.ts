import { Utilisateur } from '../domain/utilisateur';
import { UtilisateurRepository } from '../domain/utilisateur.repository';

/** Écran Comptes (Coach seul, gestion-des-droits.md, "Matrice écran / Rôle"). */
export class ListerUtilisateurs {
  constructor(private readonly utilisateurs: UtilisateurRepository) {}

  executer(): Promise<Utilisateur[]> {
    return this.utilisateurs.lister();
  }
}
