import { Question } from './question';

export class Theme {
  private constructor(
    readonly id: string,
    private _libelle: string,
    private _questions: Question[],
    private _retireLe: Date | null,
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

  ajouterQuestion(question: Question): void {
    this._questions.push(question);
  }

  /**
   * Retire physiquement une Question de ce Thème, sans l'archiver — utilisé uniquement par
   * Referentiel.appliquerChangements lors d'une réaffectation, pour déplacer l'objet Question
   * vers le Thème qui la possède désormais. N'est pas une opération de suppression métier (ADR
   * 0004 : archivage, jamais suppression) ; collaboration interne, pas l'API d'intention publique
   * décrite dans docs/design/agregat-referentiel.md §3.
   */
  retirerQuestion(id: string): void {
    const index = this._questions.findIndex((question) => question.id === id);
    if (index === -1) {
      throw new Error(`Question ${id} introuvable dans le Thème ${this.id}`);
    }
    this._questions.splice(index, 1);
  }

  mettreAJourLibelle(libelle: string): void {
    this._libelle = libelle;
  }

  /** `le` est fourni par l'appelant pour que tous les items retirés dans le même import partagent le même instant. */
  retirer(le: Date): void {
    this._retireLe = le;
  }

  reactiver(): void {
    this._retireLe = null;
  }
}
