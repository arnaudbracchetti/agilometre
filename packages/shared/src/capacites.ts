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

// La plupart des capacités ne listent que Role.Coach. `gererSonCompte` fait exception dès #60 :
// "Mon compte (changer son mot de passe)" est accessible à tout Rôle porteur d'un compte, sans
// dépendre d'une Habilitation ni d'un périmètre. `voirProfilEntite` fait de même exception dès
// #61 : Direction y accède désormais, restreinte par `PerimetreUtilisateur.peutVoirEntite` (ses
// Habilitations) plutôt que par la carte statique, qui ne sait dire que *si* elle y accède, jamais
// *à quelle* Entité précise. `voirProfilEquipe`/`voirSyntheseSession` élargissent de même à
// Role.Membre dès #62, restreint par `PerimetreUtilisateur.peutVoirEquipe` (son roster, jamais une
// Habilitation). `voirProfilEntite` s'élargit une seconde fois, au même Rôle, pour que l'arbre de
// navigation partagé (Coach/Direction/Membre) puisse afficher les noms d'Entités contenant ses
// Équipes — accepté avec la conséquence assumée qu'un Membre peut alors aussi ouvrir le Profil
// agrégé de cette Entité (écart délibéré à la matrice initiale de gestion-des-droits.md, tranché en
// aparté de la carte #62).
export const CAPACITES: Record<Capacite, Role[]> = {
  gererComptes: [Role.Coach],
  gererSonCompte: [Role.Coach, Role.Direction, Role.Membre],
  gererOrganisation: [Role.Coach],
  gererReferentiel: [Role.Coach],
  voirProfilEntite: [Role.Coach, Role.Direction, Role.Membre],
  voirProfilEquipe: [Role.Coach, Role.Membre],
  voirSyntheseSession: [Role.Coach, Role.Membre],
  voirMurDeBadges: [Role.Coach],
  gererSessions: [Role.Coach],
  gererModelesSession: [Role.Coach],
  gererCampagnesPouls: [Role.Coach],
};
