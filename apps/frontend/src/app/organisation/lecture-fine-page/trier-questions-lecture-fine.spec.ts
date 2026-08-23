import { SyntheseQuestionDto } from '@agilometre/shared';
import { TrierQuestionsLectureFine } from './trier-questions-lecture-fine';

function question(partiel: Partial<SyntheseQuestionDto> & { questionId: string }): SyntheseQuestionDto {
  return {
    libelle: partiel.questionId,
    effectif: 1,
    moyenne: null,
    consensus: null,
    repartition: { 1: 0, 2: 0, 3: 0, 4: 0 },
    ...partiel,
  };
}

describe('TrierQuestionsLectureFine', () => {
  it('trie par Moyenne croissante', () => {
    const questions = [
      question({ questionId: 'q1', moyenne: 3 }),
      question({ questionId: 'q2', moyenne: 1 }),
      question({ questionId: 'q3', moyenne: 2 }),
    ];

    const resultat = TrierQuestionsLectureFine.executer(questions, 'moyenne');

    expect(resultat.map((q) => q.questionId)).toEqual(['q2', 'q3', 'q1']);
  });

  it('relègue les Moyennes null en fin de liste', () => {
    const questions = [
      question({ questionId: 'q1', moyenne: null }),
      question({ questionId: 'q2', moyenne: 2 }),
    ];

    const resultat = TrierQuestionsLectureFine.executer(questions, 'moyenne');

    expect(resultat.map((q) => q.questionId)).toEqual(['q2', 'q1']);
  });

  it('trie par dispersion décroissante — FAIBLE (désaccord le plus fort) en premier, FORT (accord) en dernier', () => {
    const questions = [
      question({ questionId: 'q1', consensus: 'FORT' }),
      question({ questionId: 'q2', consensus: 'FAIBLE' }),
      question({ questionId: 'q3', consensus: 'MODERE' }),
    ];

    const resultat = TrierQuestionsLectureFine.executer(questions, 'dispersion');

    expect(resultat.map((q) => q.questionId)).toEqual(['q2', 'q3', 'q1']);
  });

  it('relègue les dispersions null en fin de liste', () => {
    const questions = [
      question({ questionId: 'q1', consensus: null }),
      question({ questionId: 'q2', consensus: 'FAIBLE' }),
    ];

    const resultat = TrierQuestionsLectureFine.executer(questions, 'dispersion');

    expect(resultat.map((q) => q.questionId)).toEqual(['q2', 'q1']);
  });

  it('ne modifie pas le tableau reçu', () => {
    const questions = [question({ questionId: 'q1', moyenne: 2 }), question({ questionId: 'q2', moyenne: 1 })];

    TrierQuestionsLectureFine.executer(questions, 'moyenne');

    expect(questions.map((q) => q.questionId)).toEqual(['q1', 'q2']);
  });
});
