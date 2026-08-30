import { Role } from '@agilometre/shared';

/** Claims du JWT de connexion — auto-porteur, jamais relu en base par requête (voir AuthGuard). */
export interface ChargeJetonUtilisateur {
  sub: string;
  email: string;
  role: Role;
}

/** Attaché à la requête par `AuthGuard` une fois le JWT vérifié — consommé par les use cases qui
 * ont besoin de savoir qui appelle (ex. `PerimetreGuard`, un futur `PerimetreUtilisateur`). */
export interface UtilisateurConnecte {
  id: string;
  email: string;
  role: Role;
}
