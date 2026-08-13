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

  resume(): string {
    const sections = [
      this.resumeSection(
        'Thèmes',
        this.themes,
        ['creation', 'maj', 'archivage', 'reactivation'],
        (theme) => this.ligneTheme(theme),
      ),
      this.resumeSection(
        'Questions',
        this.questions,
        ['creation', 'maj', 'reaffectation', 'archivage', 'reactivation'],
        (question) => this.ligneQuestion(question),
      ),
    ].filter((section): section is string => section !== null);

    return sections.length > 0
      ? sections.join('\n\n')
      : 'Aucun changement détecté.';
  }

  private resumeSection<T extends { type: string }>(
    titre: string,
    items: T[],
    ordreTypes: string[],
    ligne: (item: T) => string,
  ): string | null {
    if (items.length === 0) return null;

    const entete = ordreTypes
      .map((type) => ({ type, nombre: this.compter(items, type) }))
      .filter(({ nombre }) => nombre > 0)
      .map(({ type, nombre }) => this.libelleCompte(type, nombre))
      .join(', ');

    const lignes = ordreTypes.flatMap((type) =>
      items.filter((item) => item.type === type).map(ligne),
    );

    return `${titre} (${entete})\n${lignes.join('\n')}`;
  }

  private libelleCompte(type: string, nombre: number): string {
    const libelles: Record<string, [string, string]> = {
      creation: ['création', 'créations'],
      maj: ['mise à jour', 'mises à jour'],
      reaffectation: ['réaffectation', 'réaffectations'],
      archivage: ['archivage', 'archivages'],
      reactivation: ['réactivation', 'réactivations'],
    };
    const [singulier, pluriel] = libelles[type];
    return `${nombre} ${nombre > 1 ? pluriel : singulier}`;
  }

  private ligneTheme(changement: ChangementTheme): string {
    switch (changement.type) {
      case 'creation':
        return `- Création : « ${changement.apres.libelle} »`;
      case 'maj':
        return this.ligneMaj(changement.avant, changement.apres);
      case 'archivage':
        return `- Archivage : « ${changement.apres.libelle} »`;
      case 'reactivation':
        return `- Réactivation : « ${changement.apres.libelle} »`;
    }
  }

  private ligneQuestion(changement: ChangementQuestion): string {
    switch (changement.type) {
      case 'creation':
        return `- Création : « ${changement.apres.libelle} »`;
      case 'maj':
        return this.ligneMaj(changement.avant, changement.apres);
      case 'reaffectation':
        return `- Réaffectation : « ${changement.apres.libelle} »`;
      case 'archivage':
        return `- Archivage : « ${changement.apres.libelle} »`;
      case 'reactivation':
        return `- Réactivation : « ${changement.apres.libelle} »`;
    }
  }

  private ligneMaj(
    avant: EtatTheme | EtatQuestion | null,
    apres: EtatTheme | EtatQuestion,
  ): string {
    if (avant && avant.libelle !== apres.libelle) {
      return `- Mise à jour : « ${avant.libelle} » → « ${apres.libelle} »`;
    }
    return `- Mise à jour : « ${apres.libelle} » (options modifiées)`;
  }
}
