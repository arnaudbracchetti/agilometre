import { SyntheseThemeDto } from './session';

export interface EntiteDto {
  id: string;
  nom: string;
}

export interface MembreDto {
  id: string;
  nom: string;
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
}
