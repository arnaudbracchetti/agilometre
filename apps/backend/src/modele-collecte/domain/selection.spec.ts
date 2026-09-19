import { Selection } from './selection';

describe('Selection', () => {
  describe('vide', () => {
    it('démarre sans aucune Question', () => {
      const selection = Selection.vide();

      expect(selection.questionIds).toEqual([]);
    });
  });

  describe('ajouter', () => {
    it('ajoute une Question en fin de liste par défaut', () => {
      const selection = Selection.vide();
      selection.ajouter('q1');

      const resultat = selection.ajouter('q2');

      expect(resultat.estSucces).toBe(true);
      expect(selection.questionIds).toEqual(['q1', 'q2']);
    });

    it('ajoute une Question à une position donnée', () => {
      const selection = Selection.vide();
      selection.ajouter('q1');
      selection.ajouter('q2');

      const resultat = selection.ajouter('q3', 1);

      expect(resultat.estSucces).toBe(true);
      expect(selection.questionIds).toEqual(['q1', 'q3', 'q2']);
    });

    it('rejette une Question déjà présente, sans modifier la liste', () => {
      const selection = Selection.vide();
      selection.ajouter('q1');

      const resultat = selection.ajouter('q1');

      expect(resultat.estEchec).toBe(true);
      expect(resultat.erreur.name).toBe('QuestionDejaSelectionneeError');
      expect(selection.questionIds).toEqual(['q1']);
    });
  });

  describe('ajouterPlusieurs', () => {
    it('ajoute plusieurs Questions en bloc à une position donnée, en conservant leur ordre', () => {
      const selection = Selection.vide();
      selection.ajouter('q1');
      selection.ajouter('q4');

      const resultat = selection.ajouterPlusieurs(['q2', 'q3'], 1);

      expect(resultat.estSucces).toBe(true);
      expect(selection.questionIds).toEqual(['q1', 'q2', 'q3', 'q4']);
    });

    it('ajoute plusieurs Questions en fin de liste par défaut', () => {
      const selection = Selection.vide();
      selection.ajouter('q1');

      const resultat = selection.ajouterPlusieurs(['q2', 'q3']);

      expect(resultat.estSucces).toBe(true);
      expect(selection.questionIds).toEqual(['q1', 'q2', 'q3']);
    });

    it('rejette le lot entier si une des Questions est déjà présente, sans rien ajouter', () => {
      const selection = Selection.vide();
      selection.ajouter('q1');

      const resultat = selection.ajouterPlusieurs(['q2', 'q1', 'q3']);

      expect(resultat.estEchec).toBe(true);
      expect(resultat.erreur.name).toBe('QuestionDejaSelectionneeError');
      expect(selection.questionIds).toEqual(['q1']);
    });
  });

  describe('retirer', () => {
    it('retire une Question présente', () => {
      const selection = Selection.vide();
      selection.ajouter('q1');
      selection.ajouter('q2');

      const resultat = selection.retirer('q1');

      expect(resultat.estSucces).toBe(true);
      expect(selection.questionIds).toEqual(['q2']);
    });

    it('rejette le retrait d’une Question absente', () => {
      const selection = Selection.vide();

      const resultat = selection.retirer('inconnue');

      expect(resultat.estEchec).toBe(true);
      expect(resultat.erreur.name).toBe(
        'QuestionIntrouvableDansSelectionError',
      );
    });
  });

  describe('reordonner', () => {
    it('déplace une Question vers une nouvelle position', () => {
      const selection = Selection.vide();
      selection.ajouter('q1');
      selection.ajouter('q2');
      selection.ajouter('q3');

      const resultat = selection.reordonner('q3', 0);

      expect(resultat.estSucces).toBe(true);
      expect(selection.questionIds).toEqual(['q3', 'q1', 'q2']);
    });

    it('borne une position hors limites à la dernière position valide', () => {
      const selection = Selection.vide();
      selection.ajouter('q1');
      selection.ajouter('q2');

      const resultat = selection.reordonner('q1', 99);

      expect(resultat.estSucces).toBe(true);
      expect(selection.questionIds).toEqual(['q2', 'q1']);
    });

    it('rejette le réordonnancement d’une Question absente', () => {
      const selection = Selection.vide();
      selection.ajouter('q1');

      const resultat = selection.reordonner('inconnue', 0);

      expect(resultat.estEchec).toBe(true);
      expect(resultat.erreur.name).toBe(
        'QuestionIntrouvableDansSelectionError',
      );
    });
  });

  describe('reconstituer', () => {
    it('recharge une Sélection depuis une source déjà validée, sans revalider', () => {
      const selection = Selection.reconstituer(['q1', 'q2']);

      expect(selection.questionIds).toEqual(['q1', 'q2']);
    });
  });
});
