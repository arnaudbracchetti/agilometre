import { Role } from './roles';

/**
 * Une entrée par ligne de la matrice écran/rôle de
 * doc/spec/annexes/gestion-des-droits.md — voir docs/design/agregat-politique-des-droits.md §2.
 */
export type Capacite =
  | 'gererComptes'
  | 'gererOrganisation'
  | 'gererReferentiel'
  | 'voirProfilEntite'
  | 'voirProfilEquipe'
  | 'voirSyntheseSession'
  | 'voirMurDeBadges'
  | 'gererSessions'
  | 'gererModelesSession'
  | 'gererCampagnesPouls';

// Chaque capacité ne liste ici que Role.Coach : Direction et Membre d'équipe n'ont encore ni
// compte constructible ni PerimetreUtilisateur implémenté (issue #59, tranches 3/4 à venir — #61,
// #62). Élargir cette liste au fil de ces tranches, jamais par anticipation.
export const CAPACITES: Record<Capacite, Role[]> = {
  gererComptes: [Role.Coach],
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
