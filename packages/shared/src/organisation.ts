import { Evolution, SyntheseThemeDto } from './session';
import { Role } from './roles';

export interface HabilitationDto {
  id: string;
  entiteId: string | null;
  equipeId: string | null;
}

export interface UtilisateurDto {
  id: string;
  email: string;
  prenom: string;
  nom: string;
  actif: boolean;
  role: Role;
  habilitations: HabilitationDto[];
}

export interface EntiteDto {
  id: string;
  nom: string;
}

export interface MembreDto {
  id: string;
  nom: string;
  /** `null` tant qu'aucun compte n'est lié — reporté depuis l'Utilisateur une fois rattaché (#62). */
  prenom: string | null;
  email: string;
  utilisateurId: string | null;
}

export interface EquipeDto {
  id: string;
  nom: string;
  entiteId: string;
  membres: MembreDto[];
}

export interface ProfilEquipeDto {
  equipeNom: string;
  periodeDebut: string; // ISO
  periodeFin: string; // ISO
  seuilPalier: number;
  themes: SyntheseThemeDto[];
  palierGlobal: 1 | 2 | 3 | 4 | null;
  tauxApprocheGlobal: number | null;
  margeAvantDescenteGlobal: number | null;
  effectifGlobal: number;
  aPeriodePrecedente: boolean;
  /** Période encore ouverte : le calcul ne porte que sur les Sessions déjà closes à ce jour. */
  periodeEnCours: boolean;
  /** Mouvement du Palier global vs. la Période immédiatement précédente. */
  evolutionGlobale: Evolution | null;
}

/**
 * Palier agrégé d'une Entité (PRD §"Agrégation entité / BU") : mêmes champs globaux que
 * `ProfilEquipeDto`, mais sans `themes` — la vue Direction ne montre jamais le détail par Thème.
 */
export interface ProfilEntiteDto {
  entiteNom: string;
  periodeDebut: string; // ISO
  periodeFin: string; // ISO
  seuilPalier: number;
  palierGlobal: 1 | 2 | 3 | 4 | null;
  tauxApprocheGlobal: number | null;
  margeAvantDescenteGlobal: number | null;
  effectifGlobal: number;
  aPeriodePrecedente: boolean;
  /** Période encore ouverte : le calcul ne porte que sur les Sessions déjà closes à ce jour. */
  periodeEnCours: boolean;
  /** Mouvement du Palier global vs. la Période immédiatement précédente. */
  evolutionGlobale: Evolution | null;
}
