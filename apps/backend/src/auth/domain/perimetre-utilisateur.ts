import { Role } from '@agilometre/shared';
import { UtilisateurRepository } from '../../organisation/domain/utilisateur.repository';
import { UtilisateurConnecte } from '../jeton-utilisateur';

/**
 * Connaissance dynamique des droits (« cet Utilisateur voit-il cette ressource précise ? »),
 * distincte de la carte statique de capacités — docs/design/agregat-politique-des-droits.md §3.
 * Le "dynamique" est nécessairement une requête (§1 du même document) : pour une Direction, la
 * réponse dépend de ses Habilitations, chargées ici via `UtilisateurRepository` — jamais du JWT
 * (qui ne porte que `{ id, email, role }`, voir jeton-utilisateur.ts), pour que révoquer une
 * Habilitation prenne effet immédiatement, sans attendre le renouvellement du jeton.
 */
export class PerimetreUtilisateur {
  constructor(private readonly utilisateurs: UtilisateurRepository) {}

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
    throw new Error(
      `PerimetreUtilisateur.peutVoirEntite non implémenté pour le Rôle ${utilisateur.role} (voir #61)`,
    );
  }

  // async sans await : signature alignée sur `peutVoirEntite` (même contrat Promise<boolean> côté
  // appelant, PerimetreGuard), en attendant le vrai `await` que #62 ajoutera (dérivation du roster).
  // eslint-disable-next-line @typescript-eslint/require-await
  async peutVoirEquipe(
    utilisateur: UtilisateurConnecte,
    // equipeId : partie de l'interface consommée par #62 (roster), pas encore par le cas Coach.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    equipeId: string,
  ): Promise<boolean> {
    if (utilisateur.role === Role.Coach) {
      return true;
    }
    throw new Error(
      `PerimetreUtilisateur.peutVoirEquipe non implémenté pour le Rôle ${utilisateur.role} (voir #62)`,
    );
  }
}
