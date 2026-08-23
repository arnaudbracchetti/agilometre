import { ScoringV1 } from '../domain/scoring-v1';
import {
  ReponseScorable,
  SourceReponsesScorables,
} from '../domain/source-reponses-scorables';
import { CalculerSyntheseScoring } from './calculer-synthese-scoring';

class SourceReponsesScorablesFake implements SourceReponsesScorables {
  constructor(private readonly reponses: ReponseScorable[]) {}
  obtenirReponsesScorables(): Promise<ReponseScorable[]> {
    return Promise.resolve(this.reponses);
  }
}

describe('CalculerSyntheseScoring', () => {
  const scoring = new ScoringV1();

  it('regroupe les Réponses par Thème pour le Palier, par Question pour la Moyenne/Dispersion/répartition', async () => {
    const source = new SourceReponsesScorablesFake([
      { questionId: 'q1', niveau: 1 },
      { questionId: 'q1', niveau: 1 },
      { questionId: 'q1', niveau: 2 },
      { questionId: 'q1', niveau: 3 },
      { questionId: 'q2', niveau: 4 },
      { questionId: 'q2', niveau: 4 },
    ]);

    const resultat = await CalculerSyntheseScoring.executer(
      scoring,
      source,
      [
        { questionId: 'q1', themeId: 't1' },
        { questionId: 'q2', themeId: 't1' },
        { questionId: 'q3', themeId: 't2' },
      ],
      0.6,
    );

    expect(resultat).toHaveLength(2);
    const [theme, themeSansReponse] = resultat;
    expect(theme.themeId).toBe('t1');
    expect(theme.resultatPalier).toEqual({
      effectif: 6,
      palier: 2,
      tauxApproche: 0.5 / 0.6,
      margeAvantDescente: (4 / 6 - 0.6) / (1 - 0.6),
    });
    expect(themeSansReponse).toEqual({
      themeId: 't2',
      resultatPalier: { effectif: 0 },
      questions: [],
    });

    expect(theme.questions).toEqual([
      {
        questionId: 'q1',
        effectif: 4,
        moyenne: 1.75,
        consensus: 'MODERE',
        repartitionParNiveau: { 1: 2, 2: 1, 3: 1, 4: 0 },
      },
      {
        questionId: 'q2',
        effectif: 2,
        moyenne: 4,
        consensus: 'FORT',
        repartitionParNiveau: { 1: 0, 2: 0, 3: 0, 4: 2 },
      },
    ]);
  });

  it("exclut du Thème une Question qui n'a reçu aucune Réponse", async () => {
    const source = new SourceReponsesScorablesFake([
      { questionId: 'q1', niveau: 2 },
    ]);

    const resultat = await CalculerSyntheseScoring.executer(
      scoring,
      source,
      [
        { questionId: 'q1', themeId: 't1' },
        { questionId: 'q2', themeId: 't1' },
      ],
      0.6,
    );

    expect(resultat).toHaveLength(1);
    expect(resultat[0].questions.map((q) => q.questionId)).toEqual(['q1']);
  });

  it('sans aucune Réponse, renvoie le Thème avec un effectif nul', async () => {
    const source = new SourceReponsesScorablesFake([]);

    const resultat = await CalculerSyntheseScoring.executer(
      scoring,
      source,
      [{ questionId: 'q1', themeId: 't1' }],
      0.6,
    );

    expect(resultat).toEqual([
      { themeId: 't1', resultatPalier: { effectif: 0 }, questions: [] },
    ]);
  });

  it("préserve l'ordre de première apparition des Thèmes", async () => {
    const source = new SourceReponsesScorablesFake([
      { questionId: 'q2', niveau: 1 },
      { questionId: 'q1', niveau: 1 },
    ]);

    const resultat = await CalculerSyntheseScoring.executer(
      scoring,
      source,
      [
        { questionId: 'q1', themeId: 't1' },
        { questionId: 'q2', themeId: 't2' },
      ],
      0.6,
    );

    expect(resultat.map((t) => t.themeId)).toEqual(['t1', 't2']);
  });
});
