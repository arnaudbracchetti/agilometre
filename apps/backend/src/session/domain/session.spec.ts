import { Niveau } from '../../referentiel/domain/niveau';
import { Option } from '../../referentiel/domain/option';
import { Question } from '../../referentiel/domain/question';
import { Referentiel } from '../../referentiel/domain/referentiel';
import { Theme } from '../../referentiel/domain/theme';
import { Selection } from './selection';
import { Session } from './session';

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

describe('Session', () => {
  describe('creer', () => {
    it('crée une Session ouverte, non verrouillée, avec la Sélection fournie', () => {
      const resultat = Session.creer(
        's1',
        'e1',
        new Date('2026-03-01'),
        'm1',
        Selection.reconstituer(['q1', 'q2']),
      );

      expect(resultat.estSucces).toBe(true);
      expect(resultat.valeur.equipeId).toBe('e1');
      expect(resultat.valeur.modeleSessionId).toBe('m1');
      expect(resultat.valeur.statut).toBe('OUVERTE');
      expect(resultat.valeur.estVerrouillee()).toBe(false);
      expect(resultat.valeur.selection.questionIds).toEqual(['q1', 'q2']);
    });

    it('rejette une Équipe manquante', () => {
      const resultat = Session.creer(
        's1',
        '   ',
        new Date('2026-03-01'),
        'm1',
        Selection.vide(),
      );

      expect(resultat.estEchec).toBe(true);
      expect(resultat.erreur.name).toBe('EquipeManquanteError');
    });

    it('rejette un Modèle manquant', () => {
      const resultat = Session.creer(
        's1',
        'e1',
        new Date('2026-03-01'),
        '',
        Selection.vide(),
      );

      expect(resultat.estEchec).toBe(true);
      expect(resultat.erreur.name).toBe('ModeleManquantError');
    });
  });

  describe('ajouterQuestion / ajouterTheme / reordonnerQuestion — verrouillage', () => {
    it('délègue à la Sélection interne quand la Session n’est pas verrouillée', () => {
      const session = Session.creer(
        's1',
        'e1',
        new Date('2026-03-01'),
        'm1',
        Selection.vide(),
      ).valeur;

      expect(session.ajouterQuestion('q1').estSucces).toBe(true);
      expect(session.ajouterTheme(['q2', 'q3']).estSucces).toBe(true);
      expect(session.reordonnerQuestion('q3', 0).estSucces).toBe(true);
      expect(session.selection.questionIds).toEqual(['q3', 'q1', 'q2']);
    });

    it('rejette ajouterQuestion, ajouterTheme et reordonnerQuestion quand la Session est verrouillée', () => {
      const session = Session.reconstituer(
        's1',
        'e1',
        new Date('2026-03-01'),
        'OUVERTE',
        'm1',
        true,
        Selection.reconstituer(['q1']),
      );

      const resultatAjout = session.ajouterQuestion('q2');
      const resultatAjoutTheme = session.ajouterTheme(['q3']);
      const resultatReordre = session.reordonnerQuestion('q1', 0);

      expect(resultatAjout.estEchec).toBe(true);
      expect(resultatAjout.erreur.name).toBe('SessionVerrouilleeError');
      expect(resultatAjoutTheme.estEchec).toBe(true);
      expect(resultatReordre.estEchec).toBe(true);
      expect(session.selection.questionIds).toEqual(['q1']);
    });

    it('autorise toujours retirerQuestion, même verrouillée', () => {
      const session = Session.reconstituer(
        's1',
        'e1',
        new Date('2026-03-01'),
        'OUVERTE',
        'm1',
        true,
        Selection.reconstituer(['q1']),
      );

      const resultat = session.retirerQuestion('q1');

      expect(resultat.estSucces).toBe(true);
      expect(session.selection.questionIds).toEqual([]);
    });
  });

  describe('selection', () => {
    it('expose une copie défensive, indépendante de la Sélection interne', () => {
      const session = Session.creer(
        's1',
        'e1',
        new Date('2026-03-01'),
        'm1',
        Selection.vide(),
      ).valeur;
      session.ajouterQuestion('q1');

      const selectionLue = session.selection;
      session.ajouterQuestion('q2');

      expect(selectionLue.questionIds).toEqual(['q1']);
    });
  });

  describe('selectionEnrichie', () => {
    it('résout les Questions actives, dans l’ordre de la Sélection', () => {
      const session = Session.reconstituer(
        's1',
        'e1',
        new Date('2026-03-01'),
        'OUVERTE',
        'm1',
        false,
        Selection.reconstituer(['q3', 'q1']),
      );

      const enrichie = session.selectionEnrichie(referentielAvecDeuxThemes());

      expect(enrichie.map((q) => q.id)).toEqual(['q3', 'q1']);
    });
  });

  describe('estModifiable', () => {
    it('vrai pour une Session ouverte et non verrouillée', () => {
      const session = Session.creer(
        's1',
        'e1',
        new Date('2026-03-01'),
        'm1',
        Selection.vide(),
      ).valeur;

      expect(session.estModifiable()).toBe(true);
    });

    it('faux si verrouillée', () => {
      const session = Session.reconstituer(
        's1',
        'e1',
        new Date('2026-03-01'),
        'OUVERTE',
        'm1',
        true,
        Selection.vide(),
      );

      expect(session.estModifiable()).toBe(false);
    });

    it('faux si clôturée', () => {
      const session = Session.reconstituer(
        's1',
        'e1',
        new Date('2026-03-01'),
        'CLOTUREE',
        'm1',
        false,
        Selection.vide(),
      );

      expect(session.estModifiable()).toBe(false);
    });
  });

  describe('modifierInfos', () => {
    it('remplace Équipe et Date quand la Session n’est pas verrouillée ni clôturée', () => {
      const session = Session.creer(
        's1',
        'e1',
        new Date('2026-03-01'),
        'm1',
        Selection.vide(),
      ).valeur;

      const resultat = session.modifierInfos('e2', new Date('2026-04-01'));

      expect(resultat.estSucces).toBe(true);
      expect(session.equipeId).toBe('e2');
      expect(session.date).toEqual(new Date('2026-04-01'));
    });

    it('rejette une Équipe manquante', () => {
      const session = Session.creer(
        's1',
        'e1',
        new Date('2026-03-01'),
        'm1',
        Selection.vide(),
      ).valeur;

      const resultat = session.modifierInfos('   ', new Date('2026-04-01'));

      expect(resultat.estEchec).toBe(true);
      expect(resultat.erreur.name).toBe('EquipeManquanteError');
      expect(session.equipeId).toBe('e1');
    });

    it('rejette la modification quand la Session est verrouillée', () => {
      const session = Session.reconstituer(
        's1',
        'e1',
        new Date('2026-03-01'),
        'OUVERTE',
        'm1',
        true,
        Selection.vide(),
      );

      const resultat = session.modifierInfos('e2', new Date('2026-04-01'));

      expect(resultat.estEchec).toBe(true);
      expect(resultat.erreur.name).toBe('SessionNonModifiableError');
      expect(session.equipeId).toBe('e1');
    });

    it('rejette la modification quand la Session est clôturée', () => {
      const session = Session.reconstituer(
        's1',
        'e1',
        new Date('2026-03-01'),
        'CLOTUREE',
        'm1',
        false,
        Selection.vide(),
      );

      const resultat = session.modifierInfos('e2', new Date('2026-04-01'));

      expect(resultat.estEchec).toBe(true);
      expect(resultat.erreur.name).toBe('SessionNonModifiableError');
    });
  });

  describe('changerModele', () => {
    it('remplace le Modèle et réinitialise entièrement la Sélection', () => {
      const session = Session.reconstituer(
        's1',
        'e1',
        new Date('2026-03-01'),
        'OUVERTE',
        'm1',
        false,
        Selection.reconstituer(['q1', 'q2']),
      );

      const resultat = session.changerModele(
        'm2',
        Selection.reconstituer(['q3']),
      );

      expect(resultat.estSucces).toBe(true);
      expect(session.modeleSessionId).toBe('m2');
      expect(session.selection.questionIds).toEqual(['q3']);
    });

    it('rejette un Modèle manquant', () => {
      const session = Session.reconstituer(
        's1',
        'e1',
        new Date('2026-03-01'),
        'OUVERTE',
        'm1',
        false,
        Selection.reconstituer(['q1']),
      );

      const resultat = session.changerModele('', Selection.vide());

      expect(resultat.estEchec).toBe(true);
      expect(resultat.erreur.name).toBe('ModeleManquantError');
      expect(session.modeleSessionId).toBe('m1');
      expect(session.selection.questionIds).toEqual(['q1']);
    });

    it('rejette le changement quand la Session est verrouillée', () => {
      const session = Session.reconstituer(
        's1',
        'e1',
        new Date('2026-03-01'),
        'OUVERTE',
        'm1',
        true,
        Selection.reconstituer(['q1']),
      );

      const resultat = session.changerModele(
        'm2',
        Selection.reconstituer(['q3']),
      );

      expect(resultat.estEchec).toBe(true);
      expect(resultat.erreur.name).toBe('SessionNonModifiableError');
      expect(session.modeleSessionId).toBe('m1');
    });

    it('rejette le changement quand la Session est clôturée', () => {
      const session = Session.reconstituer(
        's1',
        'e1',
        new Date('2026-03-01'),
        'CLOTUREE',
        'm1',
        false,
        Selection.reconstituer(['q1']),
      );

      const resultat = session.changerModele(
        'm2',
        Selection.reconstituer(['q3']),
      );

      expect(resultat.estEchec).toBe(true);
      expect(resultat.erreur.name).toBe('SessionNonModifiableError');
    });
  });

  describe('reconstituer', () => {
    it('recharge une Session avec son statut et son verrou sans revalider', () => {
      const session = Session.reconstituer(
        's1',
        'e1',
        new Date('2026-03-01'),
        'CLOTUREE',
        'm1',
        true,
        Selection.reconstituer(['q1']),
      );

      expect(session.id).toBe('s1');
      expect(session.statut).toBe('CLOTUREE');
      expect(session.estVerrouillee()).toBe(true);
      expect(session.selection.questionIds).toEqual(['q1']);
    });
  });
});
