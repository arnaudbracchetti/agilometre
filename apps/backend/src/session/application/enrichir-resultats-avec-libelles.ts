import { SyntheseThemeResultat } from '../../scoring/application/calculer-synthese-scoring';

export interface QuestionAvecLibelles {
  questionId: string;
  libelleQuestion: string;
  themeId: string;
  libelleTheme: string;
}

export interface SyntheseQuestionAvecLibelle {
  questionId: string;
  libelle: string;
  effectif: number;
  moyenne: number | null;
  consensus: SyntheseThemeResultat['questions'][number]['consensus'];
  repartitionParNiveau: SyntheseThemeResultat['questions'][number]['repartitionParNiveau'];
}

export interface SyntheseThemeAvecLibelle {
  themeId: string;
  libelle: string;
  resultatPalier: SyntheseThemeResultat['resultatPalier'];
  questions: SyntheseQuestionAvecLibelle[];
}

/** Zippe un résultat de `CalculerSyntheseScoring` (ignorant des libellés) avec les libellés Thème/Question résolus par l'appelant. */
export class EnrichirResultatsAvecLibelles {
  static executer(
    resultatsParTheme: readonly SyntheseThemeResultat[],
    questions: readonly QuestionAvecLibelles[],
  ): SyntheseThemeAvecLibelle[] {
    const libelleTheme = new Map(
      questions.map((q) => [q.themeId, q.libelleTheme] as const),
    );
    const libelleQuestion = new Map(
      questions.map((q) => [q.questionId, q.libelleQuestion] as const),
    );
    return resultatsParTheme.map((theme) => ({
      themeId: theme.themeId,
      libelle: libelleTheme.get(theme.themeId)!,
      resultatPalier: theme.resultatPalier,
      questions: theme.questions.map((question) => ({
        ...question,
        libelle: libelleQuestion.get(question.questionId)!,
      })),
    }));
  }
}
