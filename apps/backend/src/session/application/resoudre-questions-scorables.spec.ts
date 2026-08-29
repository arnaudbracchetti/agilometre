import { Niveau } from '../../referentiel/domain/niveau';
import { Option } from '../../referentiel/domain/option';
import { Question } from '../../referentiel/domain/question';
import { Referentiel } from '../../referentiel/domain/referentiel';
import { Theme } from '../../referentiel/domain/theme';
import { GenerateurDeCode } from '../domain/generateur-de-code';
import { Selection } from '../domain/selection';
import { Session } from '../domain/session';
import { ResoudreQuestionsScorables } from './resoudre-questions-scorables';

const generateurDeCode: GenerateurDeCode = {
  generer: () => Promise.resolve('AB12'),
};

function optionsValides(): Option[] {
  return [1, 2, 3, 4].map((niveau) =>
    Option.creer(`Option ${niveau}`, Niveau.creer(niveau).valeur),
  );
}

function question(id: string, themeId: string): Question {
  return Question.creer(id, `Libellé ${id}`, themeId, optionsValides()).valeur;
}

function sessionAvecSelection(questionIds: string[]): Session {
  return Session.reconstituer(
    's1',
    'e1',
    new Date('2026-03-01'),
    'OUVERTE',
    'm1',
    Selection.reconstituer(questionIds),
    'AB12',
    0,
    new Set(),
    generateurDeCode,
  );
}

describe('ResoudreQuestionsScorables', () => {
  it("résout les Questions de la Sélection dans l'ordre, avec libellés de Thème et de Question", () => {
    const themeA = Theme.creer('t1', 'Thème A', [
      question('q1', 't1'),
      question('q2', 't1'),
    ]);
    const themeB = Theme.creer('t2', 'Thème B', [question('q3', 't2')]);
    const referentiel = Referentiel.reconstituer(new Date('2026-01-01'), [
      themeA,
      themeB,
    ]);
    const session = sessionAvecSelection(['q3', 'q1']);

    const resultat = ResoudreQuestionsScorables.executer(session, referentiel);

    expect(resultat).toEqual([
      {
        questionId: 'q3',
        libelleQuestion: 'Libellé q3',
        themeId: 't2',
        libelleTheme: 'Thème B',
        positionTheme: 1,
      },
      {
        questionId: 'q1',
        libelleQuestion: 'Libellé q1',
        themeId: 't1',
        libelleTheme: 'Thème A',
        positionTheme: 0,
      },
    ]);
  });

  it('inclut une Question dont le Thème a depuis été archivé (ADR-0015)', () => {
    const themeArchive = Theme.creer('t1', 'Thème archivé', [
      question('q1', 't1'),
    ]);
    themeArchive.retirer(new Date('2026-02-01'));
    const referentiel = Referentiel.reconstituer(new Date('2026-01-01'), [
      themeArchive,
    ]);
    const session = sessionAvecSelection(['q1']);

    const resultat = ResoudreQuestionsScorables.executer(session, referentiel);

    expect(resultat).toEqual([
      {
        questionId: 'q1',
        libelleQuestion: 'Libellé q1',
        themeId: 't1',
        libelleTheme: 'Thème archivé',
        positionTheme: 0,
      },
    ]);
  });

  it('inclut une Question elle-même archivée alors que son Thème reste actif (ADR-0015)', () => {
    const questionArchivee = question('q1', 't1');
    const theme = Theme.creer('t1', 'Thème A', [
      questionArchivee,
      question('q2', 't1'),
    ]);
    theme.retirerQuestion('q1');
    // Reconstruit le Thème avec la Question retirée-du-thème-mais-toujours-référencée dans le
    // Référentiel comme une Question réellement archivée (retireeLe non nul) — cf. Question.reconstituer.
    const questionReconstituee = Question.reconstituer(
      'q1',
      'Libellé q1',
      't1',
      optionsValides(),
      new Date('2026-02-01'),
    );
    theme.ajouterQuestion(questionReconstituee);
    const referentiel = Referentiel.reconstituer(new Date('2026-01-01'), [
      theme,
    ]);
    const session = sessionAvecSelection(['q1']);

    const resultat = ResoudreQuestionsScorables.executer(session, referentiel);

    expect(resultat).toEqual([
      {
        questionId: 'q1',
        libelleQuestion: 'Libellé q1',
        themeId: 't1',
        libelleTheme: 'Thème A',
        positionTheme: 0,
      },
    ]);
  });

  it('ignore un questionId de la Sélection introuvable dans le Référentiel', () => {
    const theme = Theme.creer('t1', 'Thème A', [question('q1', 't1')]);
    const referentiel = Referentiel.reconstituer(new Date('2026-01-01'), [
      theme,
    ]);
    const session = sessionAvecSelection(['q1', 'q-inconnue']);

    const resultat = ResoudreQuestionsScorables.executer(session, referentiel);

    expect(resultat.map((q) => q.questionId)).toEqual(['q1']);
  });
});
