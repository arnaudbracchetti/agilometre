import { CranConsensus, ResultatPalier, Scoring } from '../domain/scoring';
import { SourceReponsesScorables } from '../domain/source-reponses-scorables';

export interface QuestionScorable {
  questionId: string;
  themeId: string;
}

export interface SyntheseQuestionResultat {
  questionId: string;
  effectif: number;
  moyenne: number | null;
  consensus: CranConsensus | null;
  /** Clés 1 à 4 toujours toutes présentes (zero-fill), jamais un objet partiel. */
  repartitionParNiveau: Record<1 | 2 | 3 | 4, number>;
}

export interface SyntheseThemeResultat {
  themeId: string;
  resultatPalier: ResultatPalier;
  questions: SyntheseQuestionResultat[];
}

/**
 * Orchestrateur du port "source de Réponses scorables" (ADR-0018) : lit les Réponses via le port,
 * les regroupe par Thème pour le Palier et par Question pour la lecture fine (Moyenne, cran de
 * consensus, répartition), sans jamais connaître l'origine des Réponses ni les libellés
 * (résolus par l'appelant à partir du Référentiel).
 */
export class CalculerSyntheseScoring {
  static async executer(
    scoring: Scoring,
    source: SourceReponsesScorables,
    questions: readonly QuestionScorable[],
    seuilPalier: number,
  ): Promise<SyntheseThemeResultat[]> {
    
    // 1. Regroupe les Réponses par Question (grain le plus fin).
    const reponses = await source.obtenirReponsesScorables();
    const niveauxParQuestion = new Map<string, number[]>();
    for (const reponse of reponses) {
      const niveaux = niveauxParQuestion.get(reponse.questionId) ?? [];
      niveaux.push(reponse.niveau);
      niveauxParQuestion.set(reponse.questionId, niveaux);
    }

    // 2. Regroupe les Questions par Thème.
    const questionIdsParTheme = new Map<string, string[]>();
    for (const question of questions) {
      const questionIds = questionIdsParTheme.get(question.themeId) ?? [];
      questionIds.push(question.questionId);
      questionIdsParTheme.set(question.themeId, questionIds);
    }

    // 3. Palier par Thème (grain Thème, jamais Question — ADR-0016), puis lecture fine par Question.
    const resultats: SyntheseThemeResultat[] = [];
    for (const [themeId, questionIds] of questionIdsParTheme) {
      const niveauxTheme = questionIds.flatMap(
        (questionId) => niveauxParQuestion.get(questionId) ?? [],
      );
      // Thème non traité : absent du résultat, pas de "non évalué" (portée Session, cf. moteur-de-scoring.md).
      if (niveauxTheme.length === 0) {
        continue;
      }
      const resultatPalier = scoring.calculerPalier(niveauxTheme, seuilPalier);
      const syntheseQuestions = questionIds
        .map((questionId) => {
          const niveaux = niveauxParQuestion.get(questionId) ?? [];
          return {
            questionId,
            effectif: niveaux.length,
            moyenne: scoring.calculerMoyenne(niveaux),
            consensus: scoring.calculerDispersion(niveaux),
            repartitionParNiveau: CalculerSyntheseScoring.zeroFill(niveaux),
          };
        })
        // Question sans Réponse : exclue de la lecture fine.
        .filter((question) => question.effectif > 0);
      resultats.push({ themeId, resultatPalier, questions: syntheseQuestions });
    }
    return resultats;
  }

  private static zeroFill(niveaux: number[]): Record<1 | 2 | 3 | 4, number> {
    const comptes: Record<1 | 2 | 3 | 4, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const niveau of niveaux) {
      comptes[niveau as 1 | 2 | 3 | 4]++;
    }
    return comptes;
  }
}
