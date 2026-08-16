import { Session } from './session';

export interface SessionRepository {
  /** Charge l'agrégat complet, avec sa Sélection. */
  findById(id: string): Promise<Session | null>;
  save(session: Session): Promise<void>;
  remove(id: string): Promise<void>;
}
