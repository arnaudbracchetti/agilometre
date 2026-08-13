import { Question } from './question';

export class Theme {
  private constructor(
    readonly id: string,
    private readonly _libelle: string,
    private readonly _questions: Question[],
    private readonly _retireLe: Date | null,
  ) {}

  static creer(id: string, libelle: string, questions: Question[]): Theme {
    return new Theme(id, libelle, questions, null);
  }

  static reconstituer(
    id: string,
    libelle: string,
    questions: Question[],
    retireLe: Date | null,
  ): Theme {
    return new Theme(id, libelle, questions, retireLe);
  }

  get libelle(): string {
    return this._libelle;
  }

  get questions(): Question[] {
    return [...this._questions];
  }

  get retireLe(): Date | null {
    return this._retireLe;
  }
}
