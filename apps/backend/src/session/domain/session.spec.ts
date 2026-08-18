import { Niveau } from '../../referentiel/domain/niveau';
import { Option } from '../../referentiel/domain/option';
import { Question } from '../../referentiel/domain/question';
import { Referentiel } from '../../referentiel/domain/referentiel';
import { Theme } from '../../referentiel/domain/theme';
import { GenerateurDeCode } from './generateur-de-code';
import { Selection } from './selection';
import { Session } from './session';

/** Fake du port : un seul Code fixe suffit, l'unicité elle-même n'est pas une préoccupation du domaine. */
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

function referentielAvecDeuxThemes(): Referentiel {
  const themeA = Theme.creer('t1', 'Thème A', [
    question('q1', 't1'),
    question('q2', 't1'),
  ]);
  const themeB = Theme.creer('t2', 'Thème B', [question('q3', 't2')]);
  return Referentiel.reconstituer(new Date('2026-01-01'), [themeA, themeB]);
}

function sessionOuverte(
  questionIds: string[],
  indexCourant: number,
  questionsSautees: string[] = [],
): Session {
  return Session.reconstituer(
    's1',
    'e1',
    new Date('2026-03-01'),
    'OUVERTE',
    'm1',
    Selection.reconstituer(questionIds),
    'AB12',
    indexCourant,
    new Set(questionsSautees),
    generateurDeCode,
  );
}

describe('Session', () => {
  describe('creer', () => {
    it('crée une Session préparée, non verrouillée, avec la Sélection fournie', () => {
      const resultat = Session.creer(
        's1',
        'e1',
        new Date('2026-03-01'),
        'm1',
        Selection.reconstituer(['q1', 'q2']),
        generateurDeCode,
      );

      expect(resultat.estSucces).toBe(true);
      expect(resultat.valeur.equipeId).toBe('e1');
      expect(resultat.valeur.modeleSessionId).toBe('m1');
      expect(resultat.valeur.statut).toBe('PREPAREE');
      expect(resultat.valeur.estVerrouillee()).toBe(false);
      expect(resultat.valeur.selection.questionIds).toEqual(['q1', 'q2']);
      expect(resultat.valeur.code).toBeNull();
      expect(resultat.valeur.indexCourant).toBe(-1);
      expect(resultat.valeur.questionsSautees.size).toBe(0);
    });

    it('rejette une Équipe manquante', () => {
      const resultat = Session.creer(
        's1',
        '   ',
        new Date('2026-03-01'),
        'm1',
        Selection.vide(),
        generateurDeCode,
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
        generateurDeCode,
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
        generateurDeCode,
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
        Selection.reconstituer(['q1']),
        null,
        -1,
        new Set(),
        generateurDeCode,
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

    it('permet retirerQuestion quand la Session n’est pas verrouillée', () => {
      const session = Session.creer(
        's1',
        'e1',
        new Date('2026-03-01'),
        'm1',
        Selection.reconstituer(['q1']),
        generateurDeCode,
      ).valeur;

      const resultat = session.retirerQuestion('q1');

      expect(resultat.estSucces).toBe(true);
      expect(session.selection.questionIds).toEqual([]);
    });

    // ADR-0010 : verrouillée, retirer n'est plus permis (seul Sauter le reste).
    it('rejette retirerQuestion quand la Session est verrouillée', () => {
      const session = Session.reconstituer(
        's1',
        'e1',
        new Date('2026-03-01'),
        'OUVERTE',
        'm1',
        Selection.reconstituer(['q1']),
        null,
        -1,
        new Set(),
        generateurDeCode,
      );

      const resultat = session.retirerQuestion('q1');

      expect(resultat.estEchec).toBe(true);
      expect(resultat.erreur.name).toBe('SessionVerrouilleeError');
      expect(session.selection.questionIds).toEqual(['q1']);
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
        generateurDeCode,
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
        Selection.reconstituer(['q3', 'q1']),
        null,
        -1,
        new Set(),
        generateurDeCode,
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
        generateurDeCode,
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
        Selection.vide(),
        null,
        -1,
        new Set(),
        generateurDeCode,
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
        Selection.vide(),
        null,
        -1,
        new Set(),
        generateurDeCode,
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
        generateurDeCode,
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
        generateurDeCode,
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
        Selection.vide(),
        null,
        -1,
        new Set(),
        generateurDeCode,
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
        Selection.vide(),
        null,
        -1,
        new Set(),
        generateurDeCode,
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
        'PREPAREE',
        'm1',
        Selection.reconstituer(['q1', 'q2']),
        null,
        -1,
        new Set(),
        generateurDeCode,
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
        'PREPAREE',
        'm1',
        Selection.reconstituer(['q1']),
        null,
        -1,
        new Set(),
        generateurDeCode,
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
        Selection.reconstituer(['q1']),
        null,
        -1,
        new Set(),
        generateurDeCode,
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
        Selection.reconstituer(['q1']),
        null,
        -1,
        new Set(),
        generateurDeCode,
      );

      const resultat = session.changerModele(
        'm2',
        Selection.reconstituer(['q3']),
      );

      expect(resultat.estEchec).toBe(true);
      expect(resultat.erreur.name).toBe('SessionNonModifiableError');
    });
  });

  describe('ouvrir', () => {
    it('passe de PREPAREE à OUVERTE, verrouille, réclame le Code au générateur, met en salle d’attente (index -1)', async () => {
      const session = Session.creer(
        's1',
        'e1',
        new Date('2026-03-01'),
        'm1',
        Selection.reconstituer(['q1']),
        generateurDeCode,
      ).valeur;

      const resultat = await session.ouvrir();

      expect(resultat.estSucces).toBe(true);
      expect(session.statut).toBe('OUVERTE');
      expect(session.estVerrouillee()).toBe(true);
      expect(session.code).toBe('AB12');
      expect(session.indexCourant).toBe(-1);
    });

    it('rejette si la Session n’est pas PREPAREE, sans solliciter le générateur', async () => {
      const session = Session.reconstituer(
        's1',
        'e1',
        new Date('2026-03-01'),
        'OUVERTE',
        'm1',
        Selection.vide(),
        'AB12',
        -1,
        new Set(),
        generateurDeCode,
      );

      const resultat = await session.ouvrir();

      expect(resultat.estEchec).toBe(true);
      expect(resultat.erreur.name).toBe('SessionNonPrepareeError');
      expect(session.code).toBe('AB12');
    });
  });

  describe('terminer', () => {
    it('passe de OUVERTE à CLOTUREE', () => {
      const session = Session.reconstituer(
        's1',
        'e1',
        new Date('2026-03-01'),
        'OUVERTE',
        'm1',
        Selection.vide(),
        'AB12',
        -1,
        new Set(),
        generateurDeCode,
      );

      const resultat = session.terminer();

      expect(resultat.estSucces).toBe(true);
      expect(session.statut).toBe('CLOTUREE');
    });

    it('rejette si la Session n’est pas OUVERTE', () => {
      const session = Session.creer(
        's1',
        'e1',
        new Date('2026-03-01'),
        'm1',
        Selection.vide(),
        generateurDeCode,
      ).valeur;

      const resultat = session.terminer();

      expect(resultat.estEchec).toBe(true);
      expect(resultat.erreur.name).toBe('SessionNonOuverteError');
    });
  });

  describe('sauter', () => {
    it('marque la Question sautée sans toucher indexCourant si ce n’est pas l’item courant', () => {
      const session = sessionOuverte(['q1', 'q2', 'q3'], 0);

      const resultat = session.sauter('q3', []);

      expect(resultat.estSucces).toBe(true);
      expect(session.questionsSautees).toEqual(new Set(['q3']));
      expect(session.indexCourant).toBe(0);
    });

    it('avance indexCourant au prochain item non sauté quand l’item courant est sauté', () => {
      const session = sessionOuverte(['q1', 'q2', 'q3'], 0, ['q2']);

      const resultat = session.sauter('q1', []);

      expect(resultat.estSucces).toBe(true);
      expect(session.indexCourant).toBe(2);
    });

    it('avance indexCourant jusqu’à la fin de la Sélection si tout le reste est sauté', () => {
      const session = sessionOuverte(['q1', 'q2'], 0, ['q2']);

      const resultat = session.sauter('q1', []);

      expect(resultat.estSucces).toBe(true);
      expect(session.indexCourant).toBe(2);
    });

    it('rejette si la Question n’est pas dans la Sélection', () => {
      const session = sessionOuverte(['q1'], 0);

      const resultat = session.sauter('inconnue', []);

      expect(resultat.estEchec).toBe(true);
      expect(resultat.erreur.name).toBe(
        'QuestionIntrouvableDansSelectionError',
      );
    });

    it('rejette une Question déjà traitée (Tour clos)', () => {
      const session = sessionOuverte(['q1', 'q2'], 0);

      const resultat = session.sauter('q1', [
        { tourId: 't1', questionId: 'q1', numero: 1, clos: true },
      ]);

      expect(resultat.estEchec).toBe(true);
      expect(resultat.erreur.name).toBe('QuestionDejaTraiteeError');
    });

    it('rejette une Question déjà sautée', () => {
      const session = sessionOuverte(['q1', 'q2'], 0, ['q1']);

      const resultat = session.sauter('q1', []);

      expect(resultat.estEchec).toBe(true);
      expect(resultat.erreur.name).toBe('QuestionDejaSauteeError');
    });

    it('rejette si la Session n’est pas OUVERTE', () => {
      const session = Session.creer(
        's1',
        'e1',
        new Date('2026-03-01'),
        'm1',
        Selection.reconstituer(['q1']),
        generateurDeCode,
      ).valeur;

      const resultat = session.sauter('q1', []);

      expect(resultat.estEchec).toBe(true);
      expect(resultat.erreur.name).toBe('SessionNonOuverteError');
    });
  });

  describe('passerQuestionSuivante', () => {
    it('depuis -1, démarre toujours la séance sur le premier item', () => {
      const session = sessionOuverte(['q1', 'q2'], -1);

      const resultat = session.passerQuestionSuivante([]);

      expect(resultat.estSucces).toBe(true);
      expect(session.indexCourant).toBe(0);
    });

    it('depuis -1, saute automatiquement les items déjà Sautés au démarrage', () => {
      const session = sessionOuverte(['q1', 'q2'], -1, ['q1']);

      const resultat = session.passerQuestionSuivante([]);

      expect(resultat.estSucces).toBe(true);
      expect(session.indexCourant).toBe(1);
    });

    it('avance quand l’item courant a un Tour clos', () => {
      const session = sessionOuverte(['q1', 'q2'], 0);

      const resultat = session.passerQuestionSuivante([
        { tourId: 't1', questionId: 'q1', numero: 1, clos: true },
      ]);

      expect(resultat.estSucces).toBe(true);
      expect(session.indexCourant).toBe(1);
    });

    it('avance quand l’item courant est Sauté', () => {
      const session = sessionOuverte(['q1', 'q2'], 0, ['q1']);

      const resultat = session.passerQuestionSuivante([]);

      expect(resultat.estSucces).toBe(true);
      expect(session.indexCourant).toBe(1);
    });

    it('rejette si l’item courant n’a ni Tour clos ni marquage Sauté', () => {
      const session = sessionOuverte(['q1', 'q2'], 0);

      const resultat = session.passerQuestionSuivante([]);

      expect(resultat.estEchec).toBe(true);
      expect(resultat.erreur.name).toBe('QuestionCouranteNonResolueError');
      expect(session.indexCourant).toBe(0);
    });

    it('rejette un nouvel appel une fois la Sélection épuisée', () => {
      const session = sessionOuverte(['q1'], 1);

      const resultat = session.passerQuestionSuivante([]);

      expect(resultat.estEchec).toBe(true);
      expect(resultat.erreur.name).toBe('QuestionCouranteNonResolueError');
    });

    it('indexCourant ne recule jamais', () => {
      const session = sessionOuverte(['q1', 'q2', 'q3'], 1, ['q2']);

      const resultat = session.passerQuestionSuivante([]);

      expect(resultat.estSucces).toBe(true);
      expect(session.indexCourant).toBe(2);
    });

    it('rejette si la Session n’est pas OUVERTE', () => {
      const session = Session.creer(
        's1',
        'e1',
        new Date('2026-03-01'),
        'm1',
        Selection.reconstituer(['q1']),
        generateurDeCode,
      ).valeur;

      const resultat = session.passerQuestionSuivante([]);

      expect(resultat.estEchec).toBe(true);
      expect(resultat.erreur.name).toBe('SessionNonOuverteError');
    });
  });

  describe('progression', () => {
    it('dérive A_VENIR / COURANTE / TRAITEE / SAUTEE sans muter l’agrégat', () => {
      const session = Session.reconstituer(
        's1',
        'e1',
        new Date('2026-03-01'),
        'OUVERTE',
        'm1',
        Selection.reconstituer(['q1', 'q2', 'q3', 'q4']),
        'AB12',
        1,
        new Set(['q3']),
        generateurDeCode,
      );
      const tours = [{ tourId: 't1', questionId: 'q1', numero: 1, clos: true }];

      const progression = session.progression(tours);

      expect(progression).toEqual([
        { questionId: 'q1', statut: 'TRAITEE' },
        { questionId: 'q2', statut: 'COURANTE' },
        { questionId: 'q3', statut: 'SAUTEE' },
        { questionId: 'q4', statut: 'A_VENIR' },
      ]);
      expect(session.indexCourant).toBe(1);
    });

    it('avec indexCourant = -1, aucune Question n’est COURANTE', () => {
      const session = Session.reconstituer(
        's1',
        'e1',
        new Date('2026-03-01'),
        'OUVERTE',
        'm1',
        Selection.reconstituer(['q1', 'q2']),
        'AB12',
        -1,
        new Set(),
        generateurDeCode,
      );

      const progression = session.progression([]);

      expect(progression).toEqual([
        { questionId: 'q1', statut: 'A_VENIR' },
        { questionId: 'q2', statut: 'A_VENIR' },
      ]);
    });
  });

  describe('reconstituer', () => {
    it('recharge une Session avec son statut, son verrou et son avancement sans revalider', () => {
      const session = Session.reconstituer(
        's1',
        'e1',
        new Date('2026-03-01'),
        'CLOTUREE',
        'm1',
        Selection.reconstituer(['q1', 'q2']),
        'ABCD',
        1,
        new Set(['q1']),
        generateurDeCode,
      );

      expect(session.id).toBe('s1');
      expect(session.statut).toBe('CLOTUREE');
      expect(session.estVerrouillee()).toBe(true);
      expect(session.selection.questionIds).toEqual(['q1', 'q2']);
      expect(session.code).toBe('ABCD');
      expect(session.indexCourant).toBe(1);
      expect(session.questionsSautees).toEqual(new Set(['q1']));
    });
  });
});
