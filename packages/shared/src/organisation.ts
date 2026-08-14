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
