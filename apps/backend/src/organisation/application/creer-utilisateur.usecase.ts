import { randomBytes, randomUUID } from 'node:crypto';
import * as argon2 from 'argon2';
import { Role } from '@agilometre/shared';
import { ErreurInvariantUtilisateur, Utilisateur } from '../domain/utilisateur';
import {
  EmailUtilisateurDejaUtiliseError,
  UtilisateurRepository,
} from '../domain/utilisateur.repository';
import { EquipeRepository } from '../domain/equipe.repository';
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
    private readonly equipes: EquipeRepository,
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

    if (role === Role.Membre) {
      await this.lierRostersExistants(resultat.valeur);
    }

    await this.emettreJetonCompte.executer(resultat.valeur);
    return { type: 'cree', utilisateur: resultat.valeur };
  }

  /**
   * Premier déclenchement du rattachement automatique par email
   * (doc/spec/annexes/gestion-des-droits.md, "Rattachement automatique") : lie ce compte tout
   * juste créé à chaque ligne de roster de même email, dans tous les rosters où elle apparaît. Le
   * filtre `utilisateurId === null` est une garde défensive, pas une nécessité stricte : l'email
   * d'un Utilisateur est unique globalement, donc un Membre déjà lié porte forcément l'email de
   * *son* compte, jamais celui d'un compte tout juste créé.
   */
  private async lierRostersExistants(compte: Utilisateur): Promise<void> {
    const equipes = await this.equipes.trouverParEmailMembre(compte.email);
    for (const equipe of equipes) {
      const membre = equipe.membres.find(
        (m) =>
          m.email.toLowerCase() === compte.email.toLowerCase() &&
          m.utilisateurId === null,
      );
      if (!membre) {
        continue;
      }
      // Résultat volontairement non vérifié : `membre` vient de `equipe.membres.find(...)`
      // ci-dessus (id garanti présent dans ce même roster) avec l'email de `compte` — aucun autre
      // Membre de ce roster ne peut déjà porter cet email (invariant d'unicité par roster) — ni
      // MembreIntrouvableError ni EmailMembreDejaUtiliseError ne peuvent se produire ici.
      equipe.lierUtilisateur(
        membre.id,
        compte.id,
        compte.prenom,
        compte.nom,
        compte.email,
      );
      await this.equipes.save(equipe);
    }
  }
}
