import { Result } from '../../shared-kernel/result';

export type OrigineReponse = 'SESSION' | 'POULS';

export class NiveauInvalideError extends Error {
  constructor(niveau: number) {
    super(
      `Le Niveau d'une Réponse doit être un entier entre 1 et 4 (reçu ${niveau})`,
    );
    this.name = 'NiveauInvalideError';
  }
}

export class TourIdInvalidePourOrigineError extends Error {
  constructor() {
    super(
      "Le tourId d'une Réponse ne peut être renseigné que pour l'origine SESSION",
    );
    this.name = 'TourIdInvalidePourOrigineError';
  }
}

export type ErreurInvariantReponse =
  NiveauInvalideError | TourIdInvalidePourOrigineError;

/**
 * Agrégat racine minimal et strictement immuable (docs/design/agregat-tour-de-vote.md §1) : un
 * revote ne mute jamais une Reponse existante, il en crée une nouvelle (TourDeVote.voter). Aucun
 * champ ni méthode ne porte de référence au Jeton ni au Membre (ADR-0001) — l'anonymat est une
 * propriété du modèle de données, pas un filtre d'affichage.
 */
export class Reponse {
  private constructor(
    readonly id: string,
    readonly questionId: string,
    readonly niveau: number,
    readonly equipeId: string,
    readonly horodatage: Date,
    readonly origine: OrigineReponse,
    readonly tourId: string | null,
  ) {}

  static creer(
    id: string,
    questionId: string,
    niveau: number,
    equipeId: string,
    horodatage: Date,
    origine: OrigineReponse,
    tourId: string | null,
  ): Result<Reponse, ErreurInvariantReponse> {
    if (!Number.isInteger(niveau) || niveau < 1 || niveau > 4) {
      return Result.echec(new NiveauInvalideError(niveau));
    }
    // ADR-0002 : tourId n'est renseignable qu'à la création et seulement si origine = SESSION —
    // vérification volontairement à sens unique (une Réponse SESSION sans tourId reste valide).
    if (tourId !== null && origine !== 'SESSION') {
      return Result.echec(new TourIdInvalidePourOrigineError());
    }
    return Result.succes(
      new Reponse(
        id,
        questionId,
        niveau,
        equipeId,
        horodatage,
        origine,
        tourId,
      ),
    );
  }

  /**
   * Recharge une Reponse depuis une source déjà validée (le repository Prisma) — ne revalide pas
   * l'invariant, contrairement à `creer` (cf. CLAUDE.md sur la vigilance requise pour toute
   * factory additionnelle d'une entité déjà validée ailleurs).
   */
  static reconstituer(
    id: string,
    questionId: string,
    niveau: number,
    equipeId: string,
    horodatage: Date,
    origine: OrigineReponse,
    tourId: string | null,
  ): Reponse {
    return new Reponse(
      id,
      questionId,
      niveau,
      equipeId,
      horodatage,
      origine,
      tourId,
    );
  }
}
