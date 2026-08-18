import { JetonSession } from './jeton-session';

export interface JetonSessionRepository {
  /** @throws {SessionNonOuverteError} si la Session cible n'est pas OUVERTE au moment de l'émission. */
  emettre(sessionId: string): Promise<JetonSession>;
  findById(id: string): Promise<JetonSession | null>;
  /** Nombre de Jetons émis depuis l'ouverture — le dénominateur du Compteur de participation. */
  compterPour(sessionId: string): Promise<number>;
}
