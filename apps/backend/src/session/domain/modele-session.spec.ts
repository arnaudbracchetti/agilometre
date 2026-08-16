import { Niveau } from '../../referentiel/domain/niveau';
import { Option } from '../../referentiel/domain/option';
import { Question } from '../../referentiel/domain/question';
import { Referentiel } from '../../referentiel/domain/referentiel';
import { Theme } from '../../referentiel/domain/theme';
import { ModeleSession } from './modele-session';
import { Selection } from './selection';

function optionsValides(): Option[] {
  return [1, 2, 3, 4].map((niveau) =>
    Option.creer(`Option ${niveau}`, Niveau.creer(niveau).valeur),
  );
}

function question(id: string, themeId: string): Question {
  return Question.creer(id, `Libellé ${id}`, themeId, optionsValides()).valeur;
}

function referentielAvecDeuxThemes(): Referentiel {
  const themeA = Theme.creer('t1', 'Thème A', [
    question('q1', 't1'),
    question('q2', 't1'),
  ]);
  const themeB = Theme.creer('t2', 'Thème B', [question('q3', 't2')]);
  return Referentiel.reconstituer(new Date('2026-01-01'), [themeA, themeB]);
}

describe('ModeleSession', () => {
  describe('creer', () => {
    it('crée un Modèle avec un nom valide et une Sélection vide', () => {
      const resultat = ModeleSession.creer('m1', 'Diagnostic complet');

      expect(resultat.estSucces).toBe(true);
      expect(resultat.valeur.nom).toBe('Diagnostic complet');
      expect(resultat.valeur.selection.questionIds).toEqual([]);
    });

    it('rejette un nom vide', () => {
      const resultat = ModeleSession.creer('m1', '   ');

      expect(resultat.estEchec).toBe(true);
      expect(resultat.erreur.name).toBe('NomModeleSessionInvalideError');
    });
  });

  describe('renommer', () => {
    it('renomme le Modèle avec un nom valide', () => {
      const modele = ModeleSession.creer('m1', 'Alpha').valeur;

      const resultat = modele.renommer('Beta');

      expect(resultat.estSucces).toBe(true);
      expect(modele.nom).toBe('Beta');
    });

    it('rejette un nom vide et laisse le nom existant inchangé', () => {
      const modele = ModeleSession.creer('m1', 'Alpha').valeur;

      const resultat = modele.renommer('');

      expect(resultat.estEchec).toBe(true);
      expect(modele.nom).toBe('Alpha');
    });
  });

  describe('ajouterQuestion / ajouterTheme / retirerQuestion / reordonnerQuestion', () => {
    it('délègue à la Sélection interne', () => {
      const modele = ModeleSession.creer('m1', 'Alpha').valeur;

      expect(modele.ajouterQuestion('q1').estSucces).toBe(true);
      expect(modele.ajouterTheme(['q2', 'q3']).estSucces).toBe(true);
      expect(modele.selection.questionIds).toEqual(['q1', 'q2', 'q3']);

      expect(modele.reordonnerQuestion('q3', 0).estSucces).toBe(true);
      expect(modele.selection.questionIds).toEqual(['q3', 'q1', 'q2']);

      expect(modele.retirerQuestion('q1').estSucces).toBe(true);
      expect(modele.selection.questionIds).toEqual(['q3', 'q2']);
    });

    it('rejette l’ajout d’une Question déjà sélectionnée', () => {
      const modele = ModeleSession.creer('m1', 'Alpha').valeur;
      modele.ajouterQuestion('q1');

      const resultat = modele.ajouterQuestion('q1');

      expect(resultat.estEchec).toBe(true);
      expect(resultat.erreur.name).toBe('QuestionDejaSelectionneeError');
    });
  });

  describe('selection', () => {
    it('expose une copie défensive, indépendante de la Sélection interne', () => {
      const modele = ModeleSession.creer('m1', 'Alpha').valeur;
      modele.ajouterQuestion('q1');

      const selectionLue = modele.selection;
      modele.ajouterQuestion('q2');

      expect(selectionLue.questionIds).toEqual(['q1']);
    });
  });

  describe('selectionEnrichie', () => {
    it('résout les Questions actives, dans l’ordre de la Sélection', () => {
      const modele = ModeleSession.reconstituer(
        'm1',
        'Alpha',
        Selection.reconstituer(['q3', 'q1']),
      );

      const enrichie = modele.selectionEnrichie(referentielAvecDeuxThemes());

      expect(enrichie.map((q) => q.id)).toEqual(['q3', 'q1']);
    });

    it('ignore un id de Question archivée ou introuvable dans le Référentiel', () => {
      const modele = ModeleSession.reconstituer(
        'm1',
        'Alpha',
        Selection.reconstituer(['q1', 'inconnue', 'q2']),
      );
      const referentiel = referentielAvecDeuxThemes();
      referentiel.themes[0].questions[1].retirer(new Date('2026-02-01')); // archive q2

      const enrichie = modele.selectionEnrichie(referentiel);

      expect(enrichie.map((q) => q.id)).toEqual(['q1']);
    });
  });

  describe('reconstituer', () => {
    it('recharge un Modèle avec sa Sélection sans revalider', () => {
      const modele = ModeleSession.reconstituer(
        'm1',
        'Alpha',
        Selection.reconstituer(['q1']),
      );

      expect(modele.id).toBe('m1');
      expect(modele.selection.questionIds).toEqual(['q1']);
    });
  });
});
