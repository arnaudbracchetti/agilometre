/**
 * Entité enfant de l'agrégat `Utilisateur` — borne son périmètre à une Entité (Rôle Direction) ou
 * une Équipe (Rôle Manager, invariant porté mais non exploité cette itération). Exactement une des
 * deux cibles est renseignée, garanti par le type de `creer` — pas de validation Result nécessaire
 * ici, la cohérence avec le Rôle du porteur est un invariant de `Utilisateur`, pas de `Habilitation`
 * elle-même (voir doc/spec/annexes/gestion-des-droits.md, "Habilitations").
 */
export class Habilitation {
  private constructor(
    readonly id: string,
    readonly entiteId: string | null,
    readonly equipeId: string | null,
  ) {}

  static creer(
    id: string,
    cible: { entiteId: string } | { equipeId: string },
  ): Habilitation {
    return new Habilitation(
      id,
      'entiteId' in cible ? cible.entiteId : null,
      'equipeId' in cible ? cible.equipeId : null,
    );
  }

  /**
   * Recharge une Habilitation depuis une source déjà validée (le repository Prisma) — ne revalide
   * pas, contrairement à `creer` (cf. CLAUDE.md sur la vigilance requise pour toute factory
   * additionnelle d'une entité déjà validée ailleurs).
   */
  static reconstituer(
    id: string,
    entiteId: string | null,
    equipeId: string | null,
  ): Habilitation {
    return new Habilitation(id, entiteId, equipeId);
  }
}
