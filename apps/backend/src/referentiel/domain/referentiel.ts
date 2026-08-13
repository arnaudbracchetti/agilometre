import { ChangeSet, ChangementQuestion, ChangementTheme } from './change-set';
import { Niveau } from './niveau';
import { Option } from './option';
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
    private _derniereMajLe: Date | null,
    private _themes: Theme[],
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

  /** Tous les Thèmes, actifs et archivés confondus — réservé à l'infrastructure (persistance). */
  get themes(): Theme[] {
    return [...this._themes];
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

  /**
   * Mute l'agrégat en mémoire à partir d'un ChangeSet déjà calculé par `calculerChangements`.
   * Ne gère aujourd'hui que le type 'creation' — maj/réaffectation/archivage/réactivation ne
   * peuvent pas encore être produits par `calculerChangements` (#13) ; les autres types lèvent
   * volontairement plutôt que d'être ignorés en silence, pour ne jamais laisser croire qu'un
   * changement a été appliqué alors qu'il ne l'a pas été.
   */
  appliquerChangements(changeSet: ChangeSet): void {
    const themesParId = new Map(this._themes.map((theme) => [theme.id, theme]));

    for (const changementTheme of changeSet.themes) {
      if (changementTheme.type !== 'creation') {
        throw new Error(
          `Type de changement Thème non supporté : ${changementTheme.type}`,
        );
      }
      themesParId.set(
        changementTheme.id,
        Theme.creer(changementTheme.id, changementTheme.apres.libelle, []),
      );
    }

    for (const changementQuestion of changeSet.questions) {
      if (changementQuestion.type !== 'creation') {
        throw new Error(
          `Type de changement Question non supporté : ${changementQuestion.type}`,
        );
      }
      const theme = themesParId.get(changementQuestion.apres.themeId);
      if (!theme) {
        throw new Error(
          `Thème introuvable (${changementQuestion.apres.themeId}) pour la Question ${changementQuestion.id}`,
        );
      }
      // Options/Niveaux déjà validés par le parseur YAML en amont (mêmes règles que
      // Question.creer/Niveau.creer) : un échec ici signalerait une incohérence entre le
      // parseur et calculerChangements, pas une entrée utilisateur.
      const options = changementQuestion.apres.options.map((option) =>
        Option.creer(option.libelle, Niveau.creer(option.niveau).valeur),
      );
      const question = Question.creer(
        changementQuestion.id,
        changementQuestion.apres.libelle,
        changementQuestion.apres.themeId,
        options,
      );
      if (question.estEchec) {
        throw question.erreur;
      }
      theme.ajouterQuestion(question.valeur);
    }

    this._themes = Array.from(themesParId.values());
    this._derniereMajLe = new Date();
  }
}
