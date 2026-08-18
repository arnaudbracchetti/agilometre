import { JetonSession } from './jeton-session';

export interface JetonSessionRepository {
  /** @throws {SessionNonOuverteError} si la Session cible n'est pas OUVERTE au moment de l'émission. */
  emettre(sessionId: string): Promise<JetonSession>;
  findById(id: string): Promise<JetonSession | null>;
  /**
   * Nombre de Jetons émis depuis l'ouverture et non invalidés — le dénominateur du Compteur de
   * participation. Reste monotone croissant pour toute déconnexion passive (onglet fermé,
   * inactivité) ; seul `invalider` (changement explicite de Session) le fait redescendre.
   */
  compterPour(sessionId: string): Promise<number>;
  /**
   * Marque un Jeton comme remplacé, suite à un changement explicite de Session par son device
   * ("Rejoindre une autre séance") — le sort de `compterPour` pour la Session d'origine. Idempotent
   * et silencieux si l'id est inconnu ou déjà invalidé : jamais consommé avec un id de confiance
   * garantie côté serveur (fourni par le client à partir de son storage local).
   */
  invalider(id: string): Promise<void>;
}
