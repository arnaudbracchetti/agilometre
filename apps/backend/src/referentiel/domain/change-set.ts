export type TypeChangementTheme =
  'creation' | 'maj' | 'archivage' | 'reactivation';
export type TypeChangementQuestion =
  'creation' | 'maj' | 'reaffectation' | 'archivage' | 'reactivation';

export interface EtatTheme {
  libelle: string;
}

export interface EtatQuestion {
  libelle: string;
  themeId: string;
  options: { libelle: string; niveau: number }[];
}

export interface ChangementTheme {
  type: TypeChangementTheme;
  id: string;
  avant: EtatTheme | null;
  apres: EtatTheme;
}

export interface ChangementQuestion {
  type: TypeChangementQuestion;
  id: string;
  avant: EtatQuestion | null;
  apres: EtatQuestion;
}

export interface SyntheseParType {
  creations: number;
  majs: number;
  archivages: number;
  reactivations: number;
}

export interface SyntheseParTypeQuestion extends SyntheseParType {
  reaffectations: number;
}

export class ChangeSet {
  private constructor(
    readonly themes: ChangementTheme[],
    readonly questions: ChangementQuestion[],
  ) {}

  static creer(
    themes: ChangementTheme[],
    questions: ChangementQuestion[],
  ): ChangeSet {
    return new ChangeSet(themes, questions);
  }

  synthese(): { themes: SyntheseParType; questions: SyntheseParTypeQuestion } {
    return {
      themes: {
        creations: this.compter(this.themes, 'creation'),
        majs: this.compter(this.themes, 'maj'),
        archivages: this.compter(this.themes, 'archivage'),
        reactivations: this.compter(this.themes, 'reactivation'),
      },
      questions: {
        creations: this.compter(this.questions, 'creation'),
        majs: this.compter(this.questions, 'maj'),
        reaffectations: this.compter(this.questions, 'reaffectation'),
        archivages: this.compter(this.questions, 'archivage'),
        reactivations: this.compter(this.questions, 'reactivation'),
      },
    };
  }

  private compter(items: { type: string }[], type: string): number {
    return items.filter((item) => item.type === type).length;
  }
}
