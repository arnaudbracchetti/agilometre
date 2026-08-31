import { randomUUID } from 'node:crypto';
import * as argon2 from 'argon2';
import { Role } from '@agilometre/shared';
import { ErreurInvariantUtilisateur, Utilisateur } from '../domain/utilisateur';
import {
  EmailUtilisateurDejaUtiliseError,
  UtilisateurRepository,
} from '../domain/utilisateur.repository';
import { VerifierMotDePasseTropCourt } from './politique-mot-de-passe';

export type ResultatAmorcerPremierCoach =
  | { type: 'invalide'; erreur: ErreurInvariantUtilisateur }
  | { type: 'email_deja_utilise' }
  | { type: 'mot_de_passe_trop_court' }
  | { type: 'cree'; utilisateur: Utilisateur };

/**
 * Commande d'amorçage explicite (doc/spec/annexes/gestion-des-droits.md, "Cycle de vie d'un
 * compte") : crée le premier compte Coach, jamais rejouée au démarrage du serveur — voir le
 * script `bootstrap-coach.ts`, simple point d'entrée CLI autour de ce use case.
 */
export class AmorcerPremierCoach {
  constructor(private readonly repository: UtilisateurRepository) {}

  async executer(
    email: string,
    prenom: string,
    nom: string,
    motDePasse: string,
  ): Promise<ResultatAmorcerPremierCoach> {
    const existant = await this.repository.trouverParEmail(email);
    if (existant) {
      return { type: 'email_deja_utilise' };
    }
    if (VerifierMotDePasseTropCourt.executer(motDePasse)) {
      return { type: 'mot_de_passe_trop_court' };
    }

    const motDePasseHash = await argon2.hash(motDePasse);
    const resultat = Utilisateur.creer(
      randomUUID(),
      email,
      prenom,
      nom,
      motDePasseHash,
      Role.Coach,
    );
    if (resultat.estEchec) {
      return { type: 'invalide', erreur: resultat.erreur };
    }

    try {
      await this.repository.save(resultat.valeur);
    } catch (erreur) {
      // Filet de sécurité contre une race condition entre la vérification ci-dessus et
      // l'écriture (index unique en base) — traduit en le même résultat que la garde applicative.
      if (erreur instanceof EmailUtilisateurDejaUtiliseError) {
        return { type: 'email_deja_utilise' };
      }
      throw erreur;
    }
    return { type: 'cree', utilisateur: resultat.valeur };
  }
}
