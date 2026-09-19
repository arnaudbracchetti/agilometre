import { ModeleCollecte } from './modele-collecte';

export interface ModeleCollecteRepository {
  /** Charge l'agrégat complet, avec sa Sélection. */
  findById(id: string): Promise<ModeleCollecte | null>;
  save(modele: ModeleCollecte): Promise<void>;
  /** Suppression toujours permise, même si le Modèle a déjà servi à créer des Sessions (ADR-0009). */
  remove(id: string): Promise<void>;
}
