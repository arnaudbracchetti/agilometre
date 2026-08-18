import { Session } from './session';

export interface SessionRepository {
  /** Charge l'agrégat complet, avec sa Sélection. */
  findById(id: string): Promise<Session | null>;
  /**
   * Résout une Session par son Code — restreint aux Sessions OUVERTE, seules à porter un Code
   * unique : deux Sessions closes à des dates différentes ont pu partager le même.
   */
  findByCode(code: string): Promise<Session | null>;
  save(session: Session): Promise<void>;
  remove(id: string): Promise<void>;
  /** Unicité du Code parmi les Sessions OUVERTE. */
  existeCodeOuvert(code: string): Promise<boolean>;
}
