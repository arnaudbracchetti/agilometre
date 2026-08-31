import * as argon2 from 'argon2';
import { JetonCompteRepository } from '../domain/jeton-compte.repository';
import { HacherJetonCompte } from '../domain/jeton-hachage';
import { UtilisateurRepository } from '../domain/utilisateur.repository';
import { VerifierMotDePasseTropCourt } from './politique-mot-de-passe';

export type ResultatDefinirMotDePasse =
  | { type: 'ok' }
  | { type: 'jeton_invalide' }
  | { type: 'mot_de_passe_trop_court' };

/**
 * Invitation initiale et réinitialisation partagent ce seul use case (gestion-des-droits.md,
 * "Authentification") : `consommerSiValide` renvoie déjà `null` indifféremment pour un jeton
 * introuvable, expiré ou déjà consommé — c'est ce choix, au niveau repository, qui rend ce use
 * case volontairement non distinctif ("message clair" ne veut pas dire "code d'erreur distinct").
 */
export class DefinirMotDePasse {
  constructor(
    private readonly jetons: JetonCompteRepository,
    private readonly utilisateurs: UtilisateurRepository,
  ) {}

  async executer(
    tokenBrut: string,
    nouveauMotDePasse: string,
  ): Promise<ResultatDefinirMotDePasse> {
    if (VerifierMotDePasseTropCourt.executer(nouveauMotDePasse)) {
      return { type: 'mot_de_passe_trop_court' };
    }

    const utilisateurId = await this.jetons.consommerSiValide(
      HacherJetonCompte.executer(tokenBrut),
      new Date(),
    );
    if (!utilisateurId) {
      return { type: 'jeton_invalide' };
    }

    const utilisateur = await this.utilisateurs.trouverParId(utilisateurId);
    if (!utilisateur) {
      // Défensif : jamais atteint dans #60, aucune suppression de compte n'existe.
      return { type: 'jeton_invalide' };
    }

    utilisateur.definirMotDePasse(await argon2.hash(nouveauMotDePasse));
    await this.utilisateurs.save(utilisateur);
    return { type: 'ok' };
  }
}
