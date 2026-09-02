import { randomUUID } from 'node:crypto';
import { Role } from '@agilometre/shared';
import { Equipe, ErreurAjoutMembre } from '../domain/equipe';
import { EquipeRepository } from '../domain/equipe.repository';
import { UtilisateurRepository } from '../domain/utilisateur.repository';

export type ResultatAjouterMembre =
  | { type: 'introuvable' }
  | { type: 'invalide'; erreur: ErreurAjoutMembre }
  | { type: 'ajoute'; equipe: Equipe };

/**
 * Second déclenchement du rattachement automatique par email
 * (doc/spec/annexes/gestion-des-droits.md, "Rattachement automatique") : si un compte `Rôle=MEMBRE`
 * existe déjà avec cet email, le Membre tout juste ajouté y est lié immédiatement — sans lien
 * manuel à deux temps. Un compte trouvé d'un autre Rôle est ignoré silencieusement (lier vers un
 * compte non-MEMBRE est refusé) : le Membre est quand même ajouté au roster, juste sans lien.
 */
export class AjouterMembre {
  constructor(
    private readonly repository: EquipeRepository,
    private readonly utilisateurs: UtilisateurRepository,
  ) {}

  async executer(
    equipeId: string,
    nom: string,
    prenom: string | null,
    email: string,
  ): Promise<ResultatAjouterMembre> {
    const equipe = await this.repository.findById(equipeId);
    if (!equipe) {
      return { type: 'introuvable' };
    }
    const resultat = equipe.ajouterMembre(randomUUID(), nom, prenom, email);
    if (resultat.estEchec) {
      return { type: 'invalide', erreur: resultat.erreur };
    }

    const compte = await this.utilisateurs.trouverParEmail(email);
    if (compte && compte.role === Role.Membre) {
      // Résultat volontairement non vérifié : `resultat.valeur` est le Membre tout juste ajouté à
      // ce même roster (id garanti présent) avec l'email de `compte` (garanti sans doublon, unicité
      // déjà vérifiée par `equipe.ajouterMembre` ci-dessus) — ni MembreIntrouvableError ni
      // EmailMembreDejaUtiliseError ne peuvent se produire sur cet appel précis.
      equipe.lierUtilisateur(
        resultat.valeur.id,
        compte.id,
        compte.prenom,
        compte.nom,
        compte.email,
      );
    }

    await this.repository.save(equipe);
    return { type: 'ajoute', equipe };
  }
}
