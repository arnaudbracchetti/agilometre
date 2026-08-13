import {
  ChangeSet,
  ChangementQuestion,
  ChangementTheme,
  EtatQuestion,
  EtatTheme,
} from './change-set';
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

  /**
   * Filtre centralisé ici (plutôt que laissé à chaque consommateur) : exclut les Thèmes
   * archivés, et au sein des Thèmes actifs restants, exclut aussi les Questions archivées
   * individuellement (possible depuis #16 — une Question peut être retirée sans que son Thème
   * le soit).
   */
  themesActifs(): Theme[] {
    return this._themes
      .filter((theme) => theme.retireLe === null)
      .map((theme) =>
        Theme.reconstituer(
          theme.id,
          theme.libelle,
          theme.questions.filter((question) => question.retireeLe === null),
          theme.retireLe,
        ),
      );
  }

  /**
   * Pure : ne mute rien. Compare par Clé stable (id) l'état actuel de l'agrégat à des entrées
   * d'import et classe chaque Thème/Question rencontré(e) en création, mise à jour, réaffectation
   * (Question seulement), archivage ou réactivation. Un item retrouvé identique à l'existant
   * (même libellé, même Thème, mêmes Options) n'apparaît pas dans le ChangeSet — sans quoi
   * réimporter deux fois le même fichier produirait un "diff" non vide.
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

    const idsThemesVus = new Set<string>();
    const idsQuestionsVus = new Set<string>();
    const changementsThemes: ChangementTheme[] = [];
    const changementsQuestions: ChangementQuestion[] = [];

    for (const entreeTheme of entreesThemes) {
      idsThemesVus.add(entreeTheme.id);
      const changementTheme = this.calculerChangementTheme(
        entreeTheme,
        themesExistants.get(entreeTheme.id),
      );
      if (changementTheme) changementsThemes.push(changementTheme);

      for (const entreeQuestion of entreeTheme.questions) {
        idsQuestionsVus.add(entreeQuestion.id);
        const changementQuestion = this.calculerChangementQuestion(
          entreeTheme.id,
          entreeQuestion,
          questionsExistantes.get(entreeQuestion.id),
        );
        if (changementQuestion) changementsQuestions.push(changementQuestion);
      }
    }

    // Le drapeau "vu" est global, pas scopé au Thème d'origine : une Question réaffectée à un
    // autre Thème est "vue" même quand on l'atteint ici via son ancien Thème, donc elle n'est
    // jamais archivée avec lui.
    for (const theme of this._themes) {
      if (!idsThemesVus.has(theme.id) && theme.retireLe === null) {
        changementsThemes.push({
          type: 'archivage',
          id: theme.id,
          avant: { libelle: theme.libelle },
          apres: { libelle: theme.libelle },
        });
      }
      for (const question of theme.questions) {
        if (!idsQuestionsVus.has(question.id) && question.retireeLe === null) {
          const etat = this.etatQuestion(question);
          changementsQuestions.push({
            type: 'archivage',
            id: question.id,
            avant: etat,
            apres: etat,
          });
        }
      }
    }

    return ChangeSet.creer(changementsThemes, changementsQuestions);
  }

  private calculerChangementTheme(
    entree: EntreeThemeImport,
    existant: Theme | undefined,
  ): ChangementTheme | null {
    const apres: EtatTheme = { libelle: entree.libelle };
    if (!existant) {
      return { type: 'creation', id: entree.id, avant: null, apres };
    }
    const avant: EtatTheme = { libelle: existant.libelle };
    if (existant.retireLe !== null) {
      return { type: 'reactivation', id: entree.id, avant, apres };
    }
    if (existant.libelle !== entree.libelle) {
      return { type: 'maj', id: entree.id, avant, apres };
    }
    return null;
  }

  private calculerChangementQuestion(
    themeId: string,
    entree: EntreeQuestionImport,
    existante: Question | undefined,
  ): ChangementQuestion | null {
    const apres: EtatQuestion = {
      libelle: entree.libelle,
      themeId,
      options: entree.options.map((option) => ({
        libelle: option.libelle,
        niveau: option.niveau,
      })),
    };
    if (!existante) {
      return { type: 'creation', id: entree.id, avant: null, apres };
    }
    const avant = this.etatQuestion(existante);
    if (existante.retireeLe !== null) {
      return { type: 'reactivation', id: entree.id, avant, apres };
    }
    if (existante.themeId !== themeId) {
      return { type: 'reaffectation', id: entree.id, avant, apres };
    }
    if (
      existante.libelle !== entree.libelle ||
      !this.optionsIdentiques(existante.options, apres.options)
    ) {
      return { type: 'maj', id: entree.id, avant, apres };
    }
    return null;
  }

  private etatQuestion(question: Question): EtatQuestion {
    return {
      libelle: question.libelle,
      themeId: question.themeId,
      options: question.options.map((option) => ({
        libelle: option.libelle,
        niveau: option.niveau.valeur,
      })),
    };
  }

  private optionsIdentiques(
    existantes: Option[],
    nouvelles: { libelle: string; niveau: number }[],
  ): boolean {
    if (existantes.length !== nouvelles.length) return false;
    return existantes.every(
      (option, index) =>
        option.libelle === nouvelles[index].libelle &&
        option.niveau.valeur === nouvelles[index].niveau,
    );
  }

  /**
   * Mute l'agrégat en mémoire à partir d'un ChangeSet déjà calculé par `calculerChangements`,
   * en déléguant à chaque Thème/Question concerné(e) (jamais de mutation directe hors de
   * l'entité propriétaire). `apres` porte toujours l'état complet de la cible, quel que soit le
   * type rapporté : pour 'maj'/'reaffectation'/'reactivation', on l'applique donc intégralement
   * plutôt que de rebrancher sur le type exact, ce qui couvre pour libre les combinaisons
   * (ex. une Question réactivée en même temps que réaffectée et renommée) sans cas particulier.
   * Un seul instant `maintenant`, partagé par tous les items archivés dans cet appel.
   */
  appliquerChangements(changeSet: ChangeSet): void {
    const maintenant = new Date();
    const themesParId = new Map(this._themes.map((theme) => [theme.id, theme]));
    const questionsParId = new Map<string, Question>();
    const themeIdParQuestionId = new Map<string, string>();
    for (const theme of this._themes) {
      for (const question of theme.questions) {
        questionsParId.set(question.id, question);
        themeIdParQuestionId.set(question.id, theme.id);
      }
    }

    for (const changement of changeSet.themes) {
      if (changement.type === 'creation') {
        themesParId.set(
          changement.id,
          Theme.creer(changement.id, changement.apres.libelle, []),
        );
        continue;
      }
      const theme = themesParId.get(changement.id);
      if (!theme) {
        throw new Error(
          `Thème introuvable (${changement.id}) pour un changement de type ${changement.type}`,
        );
      }
      if (changement.type === 'archivage') {
        theme.retirer(maintenant);
        continue;
      }
      if (changement.type === 'reactivation') {
        theme.reactiver();
      }
      theme.mettreAJourLibelle(changement.apres.libelle);
    }

    for (const changement of changeSet.questions) {
      if (changement.type === 'creation') {
        const theme = themesParId.get(changement.apres.themeId);
        if (!theme) {
          throw new Error(
            `Thème introuvable (${changement.apres.themeId}) pour la Question ${changement.id}`,
          );
        }
        // Options/Niveaux déjà validés par le parseur YAML en amont (mêmes règles que
        // Question.creer/Niveau.creer) : un échec ici signalerait une incohérence entre le
        // parseur et calculerChangements, pas une entrée utilisateur.
        const options = changement.apres.options.map((option) =>
          Option.creer(option.libelle, Niveau.creer(option.niveau).valeur),
        );
        const resultat = Question.creer(
          changement.id,
          changement.apres.libelle,
          changement.apres.themeId,
          options,
        );
        if (resultat.estEchec) {
          throw resultat.erreur;
        }
        theme.ajouterQuestion(resultat.valeur);
        questionsParId.set(changement.id, resultat.valeur);
        themeIdParQuestionId.set(changement.id, theme.id);
        continue;
      }

      const question = questionsParId.get(changement.id);
      const themeActuelId = themeIdParQuestionId.get(changement.id);
      if (!question || !themeActuelId) {
        throw new Error(
          `Question introuvable (${changement.id}) pour un changement de type ${changement.type}`,
        );
      }
      if (changement.type === 'archivage') {
        question.retirer(maintenant);
        continue;
      }

      if (changement.type === 'reactivation') {
        question.reactiver();
      }
      const options = changement.apres.options.map((option) =>
        Option.creer(option.libelle, Niveau.creer(option.niveau).valeur),
      );
      const resultat = question.mettreAJourLibelleEtOptions(
        changement.apres.libelle,
        options,
      );
      if (resultat.estEchec) {
        throw resultat.erreur;
      }

      if (changement.apres.themeId !== themeActuelId) {
        const themeActuel = themesParId.get(themeActuelId)!;
        const themeCible = themesParId.get(changement.apres.themeId);
        if (!themeCible) {
          throw new Error(
            `Thème cible introuvable (${changement.apres.themeId}) pour la réaffectation de la Question ${changement.id}`,
          );
        }
        themeActuel.retirerQuestion(changement.id);
        question.reaffecterVers(changement.apres.themeId);
        themeCible.ajouterQuestion(question);
        themeIdParQuestionId.set(changement.id, themeCible.id);
      }
    }

    this._themes = Array.from(themesParId.values());
    this._derniereMajLe = maintenant;
  }
}
