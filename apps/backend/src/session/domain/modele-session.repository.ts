import { ModeleSession } from './modele-session';

export interface ModeleSessionRepository {
  /** Charge l'agrégat complet, avec sa Sélection. */
  findById(id: string): Promise<ModeleSession | null>;
  save(modele: ModeleSession): Promise<void>;
  /** Suppression toujours permise, même si le Modèle a déjà servi à créer des Sessions (ADR-0009). */
  remove(id: string): Promise<void>;
}
