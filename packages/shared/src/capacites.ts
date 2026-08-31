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

// La plupart des capacités ne listent que Role.Coach : Membre d'équipe n'a encore ni
// PerimetreUtilisateur implémenté côté roster (issue #59, tranche 4 à venir — #62). Élargir cette
// liste au fil de cette tranche, jamais par anticipation. `gererSonCompte` fait exception dès #60 :
// "Mon compte (changer son mot de passe)" est accessible à tout Rôle porteur d'un compte, sans
// dépendre d'une Habilitation ni d'un périmètre. `voirProfilEntite` fait de même exception dès
// #61 : Direction y accède désormais, restreinte par `PerimetreUtilisateur.peutVoirEntite` (ses
// Habilitations) plutôt que par la carte statique, qui ne sait dire que *si* elle y accède, jamais
// *à quelle* Entité précise.
export const CAPACITES: Record<Capacite, Role[]> = {
  gererComptes: [Role.Coach],
  gererSonCompte: [Role.Coach, Role.Direction, Role.Membre],
  gererOrganisation: [Role.Coach],
  gererReferentiel: [Role.Coach],
  voirProfilEntite: [Role.Coach, Role.Direction],
  voirProfilEquipe: [Role.Coach],
  voirSyntheseSession: [Role.Coach],
  voirMurDeBadges: [Role.Coach],
  gererSessions: [Role.Coach],
  gererModelesSession: [Role.Coach],
  gererCampagnesPouls: [Role.Coach],
};
