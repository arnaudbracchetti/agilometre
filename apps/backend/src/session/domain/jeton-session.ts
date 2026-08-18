/**
 * Enregistrement anonyme minimal — pas un agrégat riche, aucun invariant ni comportement propre
 * (docs/design/agregat-tour-de-vote.md §1). L'unique règle ("émis pour une Session OUVERTE") vit
 * dans JetonSessionRepository.emettre, pas ici. Une seule factory : rien ne distingue une
 * construction fraîche d'une reconstitution Prisma puisqu'il n'y a rien à valider (même choix
 * que Option, cf. apps/backend/src/referentiel/domain/option.ts).
 */
export class JetonSession {
  private constructor(
    readonly id: string,
    readonly sessionId: string,
    readonly creeLe: Date,
  ) {}

  static creer(id: string, sessionId: string, creeLe: Date): JetonSession {
    return new JetonSession(id, sessionId, creeLe);
  }
}
