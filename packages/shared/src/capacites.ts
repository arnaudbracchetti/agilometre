import { Role } from './roles';

/**
 * Une entrée par ligne de la matrice écran/rôle de
 * doc/spec/annexes/gestion-des-droits.md — voir docs/design/agregat-politique-des-droits.md §2.
 */
export type Capacite =
  | 'gererComptes'
  | 'gererSonCompte'
  | 'gererOrganisation'
  | 'gererReferentiel'
  | 'voirProfilEntite'
  | 'voirProfilEquipe'
  | 'voirSyntheseSession'
  | 'voirMurDeBadges'
  | 'gererSessions'
  | 'gererModelesSession'
  | 'gererCampagnesPouls';

// La plupart des capacités ne listent que Role.Coach : Direction et Membre d'équipe n'ont encore
// ni Habilitation/PerimetreUtilisateur implémenté (issue #59, tranches 3/4 à venir — #61, #62).
// Élargir cette liste au fil de ces tranches, jamais par anticipation. `gererSonCompte` fait
// exception dès #60 : "Mon compte (changer son mot de passe)" est accessible à tout Rôle porteur
// d'un compte, sans dépendre d'une Habilitation ni d'un périmètre — c'est précisément ce que #60
// rend possible pour Direction et Membre d'équipe.
export const CAPACITES: Record<Capacite, Role[]> = {
  gererComptes: [Role.Coach],
  gererSonCompte: [Role.Coach, Role.Direction, Role.Membre],
  gererOrganisation: [Role.Coach],
  gererReferentiel: [Role.Coach],
  voirProfilEntite: [Role.Coach],
  voirProfilEquipe: [Role.Coach],
  voirSyntheseSession: [Role.Coach],
  voirMurDeBadges: [Role.Coach],
  gererSessions: [Role.Coach],
  gererModelesSession: [Role.Coach],
  gererCampagnesPouls: [Role.Coach],
};
