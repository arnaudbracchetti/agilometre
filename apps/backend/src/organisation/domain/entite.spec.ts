import { Entite } from './entite';

describe('Entite', () => {
  describe('creer', () => {
    it('crée une Entité avec un nom valide', () => {
      const resultat = Entite.creer('e1', 'Direction Numérique');

      expect(resultat.estSucces).toBe(true);
      expect(resultat.valeur.nom).toBe('Direction Numérique');
      expect(resultat.valeur.id).toBe('e1');
    });

    it('rejette un nom vide', () => {
      const resultat = Entite.creer('e1', '');

      expect(resultat.estEchec).toBe(true);
      expect(resultat.erreur.name).toBe('NomEntiteInvalideError');
    });

    it('rejette un nom composé uniquement d’espaces', () => {
      const resultat = Entite.creer('e1', '   ');

      expect(resultat.estEchec).toBe(true);
    });
  });

  describe('renommer', () => {
    it('renomme l’Entité avec un nom valide', () => {
      const entite = Entite.creer('e1', 'DSI').valeur;

      const resultat = entite.renommer('Direction des Systèmes d’Information');

      expect(resultat.estSucces).toBe(true);
      expect(entite.nom).toBe('Direction des Systèmes d’Information');
    });

    it('rejette un nom vide et laisse le nom existant inchangé', () => {
      const entite = Entite.creer('e1', 'DSI').valeur;

      const resultat = entite.renommer('');

      expect(resultat.estEchec).toBe(true);
      expect(entite.nom).toBe('DSI');
    });
  });

  describe('reconstituer', () => {
    it('recharge une Entité sans revalider', () => {
      const entite = Entite.reconstituer('e1', 'Marketing');

      expect(entite.id).toBe('e1');
      expect(entite.nom).toBe('Marketing');
    });
  });
});
