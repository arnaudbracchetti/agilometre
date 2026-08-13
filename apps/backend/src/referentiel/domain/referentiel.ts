import { ChangeSet, ChangementQuestion, ChangementTheme } from './change-set';
import { Question } from './question';
import { Theme } from './theme';

export interface EntreeQuestionImport {
  id: string;
  libelle: string;
  options: { libelle: string; niveau: number }[];
}

export interface EntreeThemeImport {
  id: string;
  libelle: string;
  questions: EntreeQuestionImport[];
}

export class Referentiel {
  private constructor(
    private readonly _derniereMajLe: Date | null,
    private readonly _themes: Theme[],
  ) {}

  static vide(): Referentiel {
    return new Referentiel(null, []);
  }

  static reconstituer(derniereMajLe: Date, themes: Theme[]): Referentiel {
    return new Referentiel(derniereMajLe, themes);
  }

  get derniereMajLe(): Date | null {
    return this._derniereMajLe;
  }

  themesActifs(): Theme[] {
    return this._themes.filter((theme) => theme.retireLe === null);
  }

  /**
   * Pure : ne mute rien. Compare par Clé stable (id) l'état actuel de l'agrégat à des entrées
   * d'import. Sur une base vide, tout est nécessairement en "création" — la comparaison par Map
   * reste générique pour que maj/réaffectation/archivage/réactivation (#13) s'y ajoutent sans
   * réécrire cette méthode.
   */
  calculerChangements(entreesThemes: EntreeThemeImport[]): ChangeSet {
    const themesExistants = new Map<string, Theme>(
      this._themes.map((theme) => [theme.id, theme]),
    );
    const questionsExistantes = new Map<string, Question>(
      this._themes.flatMap((theme) =>
        theme.questions.map((question) => [question.id, question] as const),
      ),
    );

    const changementsThemes: ChangementTheme[] = [];
    const changementsQuestions: ChangementQuestion[] = [];

    for (const entreeTheme of entreesThemes) {
      const themeExistant = themesExistants.get(entreeTheme.id);
      if (!themeExistant) {
        changementsThemes.push({
          type: 'creation',
          id: entreeTheme.id,
          avant: null,
          apres: { libelle: entreeTheme.libelle },
        });
      }

      for (const entreeQuestion of entreeTheme.questions) {
        const questionExistante = questionsExistantes.get(entreeQuestion.id);
        if (!questionExistante) {
          changementsQuestions.push({
            type: 'creation',
            id: entreeQuestion.id,
            avant: null,
            apres: {
              libelle: entreeQuestion.libelle,
              themeId: entreeTheme.id,
              options: entreeQuestion.options.map((option) => ({
                libelle: option.libelle,
                niveau: option.niveau,
              })),
            },
          });
        }
      }
    }

    return ChangeSet.creer(changementsThemes, changementsQuestions);
  }
}
