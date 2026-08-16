import { Result } from '../../shared-kernel/result';

export class QuestionDejaSelectionneeError extends Error {
  constructor() {
    super('Cette Question fait déjà partie de la Sélection');
    this.name = 'QuestionDejaSelectionneeError';
  }
}

export class QuestionIntrouvableDansSelectionError extends Error {
  constructor() {
    super('Cette Question ne fait pas partie de la Sélection');
    this.name = 'QuestionIntrouvableDansSelectionError';
  }
}

/**
 * Value Object — liste ordonnée de QuestionId, sans identité propre ni repository. Réutilisée en
 * composition par ModeleSession (et plus tard Session) : chaque instance est indépendante, jamais
 * partagée (ADR-0009, "copie figée"). Le tableau interne est mutable (comme Equipe._membres) ;
 * `questionIds` expose une copie défensive.
 */
export class Selection {
  private constructor(private readonly _questionIds: string[]) {}

  static vide(): Selection {
    return new Selection([]);
  }

  /**
   * Recharge une Sélection depuis une source déjà validée (le repository Prisma) — ne revalide
   * pas l'invariant d'unicité, contrairement à `ajouter`/`ajouterPlusieurs` (cf. CLAUDE.md sur la
   * vigilance requise pour toute factory additionnelle d'un agrégat/VO déjà validé ailleurs).
   */
  static reconstituer(questionIds: string[]): Selection {
    return new Selection([...questionIds]);
  }

  get questionIds(): readonly string[] {
    return [...this._questionIds];
  }

  ajouter(
    questionId: string,
    position?: number,
  ): Result<void, QuestionDejaSelectionneeError> {
    if (this._questionIds.includes(questionId)) {
      return Result.echec(new QuestionDejaSelectionneeError());
    }
    this._questionIds.splice(this.clamp(position), 0, questionId);
    return Result.succes(undefined);
  }

  ajouterPlusieurs(
    questionIds: string[],
    position?: number,
  ): Result<void, QuestionDejaSelectionneeError> {
    const doublon = questionIds.some((id) => this._questionIds.includes(id));
    if (doublon) {
      return Result.echec(new QuestionDejaSelectionneeError());
    }
    this._questionIds.splice(this.clamp(position), 0, ...questionIds);
    return Result.succes(undefined);
  }

  retirer(
    questionId: string,
  ): Result<void, QuestionIntrouvableDansSelectionError> {
    const index = this._questionIds.indexOf(questionId);
    if (index === -1) {
      return Result.echec(new QuestionIntrouvableDansSelectionError());
    }
    this._questionIds.splice(index, 1);
    return Result.succes(undefined);
  }

  reordonner(
    questionId: string,
    nouvellePosition: number,
  ): Result<void, QuestionIntrouvableDansSelectionError> {
    const index = this._questionIds.indexOf(questionId);
    if (index === -1) {
      return Result.echec(new QuestionIntrouvableDansSelectionError());
    }
    this._questionIds.splice(index, 1);
    this._questionIds.splice(this.clamp(nouvellePosition), 0, questionId);
    return Result.succes(undefined);
  }

  private clamp(position: number | undefined): number {
    if (position === undefined) {
      return this._questionIds.length;
    }
    return Math.max(0, Math.min(position, this._questionIds.length));
  }
}
