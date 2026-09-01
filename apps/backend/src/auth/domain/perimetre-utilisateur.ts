import { Role } from '@agilometre/shared';
import { UtilisateurRepository } from '../../organisation/domain/utilisateur.repository';
import { EquipeRepository } from '../../organisation/domain/equipe.repository';
import { UtilisateurConnecte } from '../jeton-utilisateur';

/**
 * Connaissance dynamique des droits (« cet Utilisateur voit-il cette ressource précise ? »),
 * distincte de la carte statique de capacités — docs/design/agregat-politique-des-droits.md §3.
 * Le "dynamique" est nécessairement une requête (§1 du même document) : pour une Direction, la
 * réponse dépend de ses Habilitations, chargées ici via `UtilisateurRepository` — jamais du JWT
 * (qui ne porte que `{ id, email, role }`, voir jeton-utilisateur.ts), pour que révoquer une
 * Habilitation prenne effet immédiatement, sans attendre le renouvellement du jeton. Pour un Membre
 * d'équipe, le périmètre est dérivé du roster (`EquipeRepository.estMembreDe`), jamais d'une
 * Habilitation (gestion-des-droits.md, "Le périmètre d'un Membre d'équipe n'est jamais porté par une
 * Habilitation").
 */
export class PerimetreUtilisateur {
  constructor(
    private readonly utilisateurs: UtilisateurRepository,
    private readonly equipes: EquipeRepository,
  ) {}

  async peutVoirEntite(
    utilisateur: UtilisateurConnecte,
    entiteId: string,
  ): Promise<boolean> {
    if (utilisateur.role === Role.Coach) {
      return true;
    }
    if (utilisateur.role === Role.Direction) {
      const compte = await this.utilisateurs.trouverParId(utilisateur.id);
      return (
        compte?.habilitations.some(
          (habilitation) => habilitation.entiteId === entiteId,
        ) ?? false
      );
    }
    if (utilisateur.role === Role.Membre) {
      // `voirProfilEntite` élargi au Membre d'équipe pour l'arbre de navigation partagé : il voit
      // le nom d'une Entité dès qu'une de ses Équipes en dépend — écart assumé, documenté dans
      // packages/shared/src/capacites.ts, qui ouvre aussi le Profil agrégé de cette Entité.
      return this.equipes.aUneEquipeDansLEntite(utilisateur.id, entiteId);
    }
    throw new Error(
      `PerimetreUtilisateur.peutVoirEntite non implémenté pour le Rôle ${utilisateur.role} (voir #61)`,
    );
  }

  async peutVoirEquipe(
    utilisateur: UtilisateurConnecte,
    equipeId: string,
  ): Promise<boolean> {
    if (utilisateur.role === Role.Coach) {
      return true;
    }
    if (utilisateur.role === Role.Membre) {
      return this.equipes.estMembreDe(utilisateur.id, equipeId);
    }
    if (utilisateur.role === Role.Direction) {
      // Jamais d'Équipe visible pour une Direction (gestion-des-droits.md, matrice "Arbre de
      // navigation" : "non dépliable, aucune Équipe visible") — faux déterministe, pas une erreur :
      // ce chemin est désormais atteignable en pratique via `ListerEquipesParEntite` (#62), pas
      // seulement un cas jamais exercé.
      return false;
    }
    throw new Error(
      `PerimetreUtilisateur.peutVoirEquipe non implémenté pour le Rôle ${utilisateur.role} (voir #62)`,
    );
  }
}
