import { Role } from '@agilometre/shared';
import { UtilisateurConnecte } from '../jeton-utilisateur';

/**
 * Connaissance dynamique des droits (« cet Utilisateur voit-il cette ressource précise ? »),
 * distincte de la carte statique de capacités — docs/design/agregat-politique-des-droits.md §3.
 * Cette carte #59 ne livre que l'interface et le cas Coach (toujours vrai, portée transversale) :
 * `Direction` sera implémenté par #61 (Habilitation sur `entiteId`), `Membre d'équipe` par #62
 * (dérivé du roster) — voir doc/spec/annexes/gestion-des-droits.md.
 */
export class PerimetreUtilisateur {
  // entiteId : partie de l'interface consommée par #61 (Habilitation), pas encore par le cas Coach.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  peutVoirEntite(utilisateur: UtilisateurConnecte, entiteId: string): boolean {
    if (utilisateur.role === Role.Coach) {
      return true;
    }
    throw new Error(
      `PerimetreUtilisateur.peutVoirEntite non implémenté pour le Rôle ${utilisateur.role} (voir #61)`,
    );
  }

  // equipeId : partie de l'interface consommée par #62 (roster), pas encore par le cas Coach.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  peutVoirEquipe(utilisateur: UtilisateurConnecte, equipeId: string): boolean {
    if (utilisateur.role === Role.Coach) {
      return true;
    }
    throw new Error(
      `PerimetreUtilisateur.peutVoirEquipe non implémenté pour le Rôle ${utilisateur.role} (voir #62)`,
    );
  }
}
