import { createHash } from 'node:crypto';

/**
 * Hash déterministe (SHA-256), pas argon2 : argon2 est volontairement lent et salé aléatoirement
 * (parfait contre le brute-force d'un mot de passe humain), donc inutilisable pour une recherche
 * par égalité (`WHERE tokenHash = ?`) — deux appels à `argon2.hash()` sur la même entrée ne
 * produisent jamais le même résultat. Le jeton brut, lui, est déjà un aléa cryptographique de 256
 * bits (`randomBytes(32)`) : un SHA-256 déterministe suffit à la fois à l'indexation et à la
 * résistance au vol de base (un attaquant qui lit la table ne peut pas remonter au jeton brut).
 */
export class HacherJetonCompte {
  static executer(tokenBrut: string): string {
    return createHash('sha256').update(tokenBrut).digest('hex');
  }
}
