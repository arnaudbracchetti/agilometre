import { JetonCompte } from './jeton-compte';

export interface JetonCompteRepository {
  save(jeton: JetonCompte): Promise<void>;

  /**
   * Vérifie ET consomme atomiquement (même geste, UPDATE conditionnel) — évite un TOCTOU entre
   * "est-il valide ?" et "le marquer consommé" (même patron que
   * PrismaJetonSessionRepository.emettre). Renvoie l'`utilisateurId` si le jeton haché était
   * valide (existant, non expiré, non consommé), `null` sinon — la cause précise (introuvable /
   * expiré / déjà consommé) n'est délibérément jamais distinguée en sortie :
   * `DefinirMotDePasse` renvoie un seul résultat générique dans les trois cas
   * (doc/spec/annexes/gestion-des-droits.md, écran "lien invalide ou expiré").
   */
  consommerSiValide(
    tokenHash: string,
    maintenant: Date,
  ): Promise<string | null>;
}
