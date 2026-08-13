import { Niveau } from './niveau';

export class Option {
  private constructor(
    readonly libelle: string,
    readonly niveau: Niveau,
  ) {}

  static creer(libelle: string, niveau: Niveau): Option {
    return new Option(libelle, niveau);
  }
}
