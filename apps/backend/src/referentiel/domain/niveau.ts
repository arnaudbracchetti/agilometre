import { Result } from '../../shared-kernel/result';

export class NiveauInvalideError extends Error {
  constructor(valeur: number) {
    super(
      `Niveau invalide : ${valeur} (doit être un entier entre ${Niveau.MIN} et ${Niveau.MAX})`,
    );
    this.name = 'NiveauInvalideError';
  }
}

export class Niveau {
  static readonly MIN = 1;
  static readonly MAX = 4;

  private constructor(readonly valeur: number) {}

  static creer(valeur: number): Result<Niveau, NiveauInvalideError> {
    if (
      !Number.isInteger(valeur) ||
      valeur < Niveau.MIN ||
      valeur > Niveau.MAX
    ) {
      return Result.echec(new NiveauInvalideError(valeur));
    }
    return Result.succes(new Niveau(valeur));
  }
}
