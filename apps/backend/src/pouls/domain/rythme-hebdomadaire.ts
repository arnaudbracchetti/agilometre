import { Result } from '../../shared-kernel/result';

export class JoursEnvoiInvalidesError extends Error {
  constructor() {
    super(
      'Les jours d’envoi doivent être non vides, compris entre 1 et 7, sans doublon',
    );
    this.name = 'JoursEnvoiInvalidesError';
  }
}

export class HeureEnvoiInvalideError extends Error {
  constructor() {
    super('L’heure d’envoi doit être comprise entre 0 et 1439 minutes');
    this.name = 'HeureEnvoiInvalideError';
  }
}

export type ErreurInvariantRythme =
  JoursEnvoiInvalidesError | HeureEnvoiInvalideError;

/**
 * Value Object — jours de la semaine cochés (1 à 7, sans doublon) et heure d'envoi (minutes
 * depuis minuit, heure locale du serveur — un seul fuseau pertinent par déploiement on-premise,
 * docs/design/agregat-campagne-de-pouls.md §1).
 */
export class RythmeHebdomadaire {
  private constructor(
    private readonly _joursEnvoi: number[],
    private readonly _heureEnvoi: number,
  ) {}

  static creer(
    joursEnvoi: number[],
    heureEnvoi: number,
  ): Result<RythmeHebdomadaire, ErreurInvariantRythme> {
    const validationJours = RythmeHebdomadaire.validerJours(joursEnvoi);
    if (validationJours.estEchec) {
      return Result.echec(validationJours.erreur);
    }
    const validationHeure = RythmeHebdomadaire.validerHeure(heureEnvoi);
    if (validationHeure.estEchec) {
      return Result.echec(validationHeure.erreur);
    }
    return Result.succes(new RythmeHebdomadaire([...joursEnvoi], heureEnvoi));
  }

  /**
   * Recharge un Rythme depuis une source déjà validée (le repository Prisma) — ne revalide pas
   * l'invariant, contrairement à `creer` (cf. CLAUDE.md sur la vigilance requise pour toute
   * factory additionnelle d'un VO déjà validé ailleurs).
   */
  static reconstituer(
    joursEnvoi: number[],
    heureEnvoi: number,
  ): RythmeHebdomadaire {
    return new RythmeHebdomadaire([...joursEnvoi], heureEnvoi);
  }

  private static validerJours(
    joursEnvoi: number[],
  ): Result<void, JoursEnvoiInvalidesError> {
    const sansDoublon = new Set(joursEnvoi).size === joursEnvoi.length;
    const dansLaPlage = joursEnvoi.every((jour) => jour >= 1 && jour <= 7);
    if (joursEnvoi.length === 0 || !sansDoublon || !dansLaPlage) {
      return Result.echec(new JoursEnvoiInvalidesError());
    }
    return Result.succes(undefined);
  }

  private static validerHeure(
    heureEnvoi: number,
  ): Result<void, HeureEnvoiInvalideError> {
    if (heureEnvoi < 0 || heureEnvoi > 1439) {
      return Result.echec(new HeureEnvoiInvalideError());
    }
    return Result.succes(undefined);
  }

  get joursEnvoi(): readonly number[] {
    return [...this._joursEnvoi];
  }

  get heureEnvoi(): number {
    return this._heureEnvoi;
  }
}
