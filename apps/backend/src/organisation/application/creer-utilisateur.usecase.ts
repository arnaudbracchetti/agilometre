import { randomBytes, randomUUID } from 'node:crypto';
import * as argon2 from 'argon2';
import { Role } from '@agilometre/shared';
import { ErreurInvariantUtilisateur, Utilisateur } from '../domain/utilisateur';
import {
  EmailUtilisateurDejaUtiliseError,
  UtilisateurRepository,
} from '../domain/utilisateur.repository';
import { EmettreJetonCompte } from './emettre-jeton-compte';

export type ResultatCreerUtilisateur =
  | { type: 'role_non_creable' }
  | { type: 'invalide'; erreur: ErreurInvariantUtilisateur }
  | { type: 'email_deja_utilise' }
  | { type: 'cree'; utilisateur: Utilisateur };

/**
 * Le Coach seul crée des comptes (doc/spec/annexes/gestion-des-droits.md, "Création") — appliqué
 * par `@Requiert('gererComptes')` sur la route, pas ici. Aucun compte `Manager d'équipe` n'est
 * créable cette itération : la valeur reste dans l'enum `Role`, mais est refusée en création.
 */
export class CreerUtilisateur {
  constructor(
    private readonly utilisateurs: UtilisateurRepository,
    private readonly emettreJetonCompte: EmettreJetonCompte,
  ) {}

  async executer(
    email: string,
    prenom: string,
    nom: string,
    role: Role,
  ): Promise<ResultatCreerUtilisateur> {
    if (role === Role.Manager) {
      return { type: 'role_non_creable' };
    }

    const existant = await this.utilisateurs.trouverParEmail(email);
    if (existant) {
      return { type: 'email_deja_utilise' };
    }

    // Mot de passe provisoire : aléa jamais communiqué à personne, y compris le Coach — le compte
    // n'est utilisable qu'après avoir défini son mot de passe via le Jeton de compte envoyé par
    // email (gestion-des-droits.md, "Le Coach n'a aucun pouvoir sur le mot de passe d'autrui").
    const motDePasseHashProvisoire = await argon2.hash(
      randomBytes(32).toString('hex'),
    );
    const resultat = Utilisateur.creer(
      randomUUID(),
      email,
      prenom,
      nom,
      motDePasseHashProvisoire,
      role,
    );
    if (resultat.estEchec) {
      return { type: 'invalide', erreur: resultat.erreur };
    }

    try {
      await this.utilisateurs.save(resultat.valeur);
    } catch (erreur) {
      if (erreur instanceof EmailUtilisateurDejaUtiliseError) {
        return { type: 'email_deja_utilise' };
      }
      throw erreur;
    }

    await this.emettreJetonCompte.executer(resultat.valeur);
    return { type: 'cree', utilisateur: resultat.valeur };
  }
}
