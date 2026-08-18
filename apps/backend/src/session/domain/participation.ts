/**
 * Entité enfant de TourDeVote : le bookkeeping qui détecte un revote au sein d'un Tour ouvert,
 * sans jamais faire porter cette information par Reponse (docs/design/agregat-tour-de-vote.md §1).
 * Aucun invariant propre : "une seule Participation par Jeton au sein d'un Tour" est garanti par
 * TourDeVote.voter (qui cherche par jetonId avant de créer) et par la clé composite en base.
 */
export class Participation {
  private constructor(
    readonly tourId: string,
    readonly jetonId: string,
    private _reponseId: string,
  ) {}

  static creer(
    tourId: string,
    jetonId: string,
    reponseId: string,
  ): Participation {
    return new Participation(tourId, jetonId, reponseId);
  }

  /** Recharge depuis le repository Prisma — identique à `creer`, distingué pour l'intention. */
  static reconstituer(
    tourId: string,
    jetonId: string,
    reponseId: string,
  ): Participation {
    return new Participation(tourId, jetonId, reponseId);
  }

  get reponseId(): string {
    return this._reponseId;
  }

  /** Un revote remplace la Reponse pointée — Reponse elle-même n'est jamais mutée. */
  remplacerReponse(nouvelleReponseId: string): void {
    this._reponseId = nouvelleReponseId;
  }
}
