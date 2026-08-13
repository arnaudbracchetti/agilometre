import { Result } from '../../shared-kernel/result';
import { Option } from './option';

export class NombreOptionsInvalideError extends Error {
  constructor(nombreRecu: number) {
    super(
      `Une Question doit porter exactement ${Question.NOMBRE_OPTIONS_REQUIS} Options (reçu ${nombreRecu})`,
    );
    this.name = 'NombreOptionsInvalideError';
  }
}

export class NiveauxIncoherentsError extends Error {
  constructor(niveaux: number[]) {
    super(
      `Les Niveaux des Options doivent couvrir 1..${Question.NOMBRE_OPTIONS_REQUIS} sans trou ni doublon (reçu ${niveaux.join(', ')})`,
    );
    this.name = 'NiveauxIncoherentsError';
  }
}

export type ErreurInvariantQuestion =
  NombreOptionsInvalideError | NiveauxIncoherentsError;

export class Question {
  static readonly NOMBRE_OPTIONS_REQUIS = 4;

  private constructor(
    readonly id: string,
    private readonly _libelle: string,
    private readonly _themeId: string,
    private readonly _options: Option[],
    private readonly _retireeLe: Date | null,
  ) {}

  static creer(
    id: string,
    libelle: string,
    themeId: string,
    options: Option[],
  ): Result<Question, ErreurInvariantQuestion> {
    const validation = Question.validerOptions(options);
    if (validation.estEchec) {
      return Result.echec(validation.erreur);
    }
    return Result.succes(new Question(id, libelle, themeId, options, null));
  }

  /**
   * Recharge une Question depuis une source déjà validée (le repository Prisma, qui ne lit que
   * des Options écrites par un import ayant lui-même passé `creer`) — ne revalide pas l'invariant
   * volontairement, contrairement à `creer`. Si une nouvelle voie de reconstitution apparaît un
   * jour depuis une source non garantie, elle doit passer par `validerOptions` explicitement.
   */
  static reconstituer(
    id: string,
    libelle: string,
    themeId: string,
    options: Option[],
    retireeLe: Date | null,
  ): Question {
    return new Question(id, libelle, themeId, options, retireeLe);
  }

  private static validerOptions(
    options: Option[],
  ): Result<void, ErreurInvariantQuestion> {
    if (options.length !== Question.NOMBRE_OPTIONS_REQUIS) {
      return Result.echec(new NombreOptionsInvalideError(options.length));
    }
    const niveaux = options
      .map((option) => option.niveau.valeur)
      .sort((a, b) => a - b);
    const niveauxAttendus = Array.from(
      { length: Question.NOMBRE_OPTIONS_REQUIS },
      (_, index) => index + 1,
    );
    const estValide = niveaux.every(
      (niveau, index) => niveau === niveauxAttendus[index],
    );
    if (!estValide) {
      return Result.echec(new NiveauxIncoherentsError(niveaux));
    }
    return Result.succes(undefined);
  }

  get libelle(): string {
    return this._libelle;
  }

  get themeId(): string {
    return this._themeId;
  }

  get options(): Option[] {
    return [...this._options];
  }

  get retireeLe(): Date | null {
    return this._retireeLe;
  }
}
