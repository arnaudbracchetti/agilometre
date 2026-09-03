import { UtilisateurRepository } from '../domain/utilisateur.repository';
import { EmettreJetonCompte } from './emettre-jeton-compte';

export type ResultatDemanderReinitialisation = { type: 'ok' };

/**
 * Remplace le renvoi d'invitation (gestion-des-droits.md, "Authentification") : fonctionne pour
 * n'importe quel compte, activé ou non, et renvoie toujours le même résultat qu'une adresse
 * corresponde ou non à un compte — anti-oracle porté par le type lui-même, jamais un branchement
 * possible côté appelant.
 */
export class DemanderReinitialisation {
  constructor(
    private readonly utilisateurs: UtilisateurRepository,
    private readonly emettreJetonCompte: EmettreJetonCompte,
  ) {}

  async executer(email: string): Promise<ResultatDemanderReinitialisation> {
    const utilisateur = await this.utilisateurs.trouverParEmail(email);
    if (utilisateur) {
      await this.emettreJetonCompte.emettrePourReinitialisation(utilisateur);
    }
    return { type: 'ok' };
  }
}
