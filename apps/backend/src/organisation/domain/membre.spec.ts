import { Membre } from './membre';

describe('Membre', () => {
  describe('creer', () => {
    it('crée un Membre avec un nom et un email valides', () => {
      const resultat = Membre.creer(
        'm1',
        'Jean Dupont',
        'jean.dupont@example.com',
      );

      expect(resultat.estSucces).toBe(true);
      expect(resultat.valeur.nom).toBe('Jean Dupont');
      expect(resultat.valeur.email).toBe('jean.dupont@example.com');
      expect(resultat.valeur.utilisateurId).toBeNull();
    });

    it('rejette un nom vide', () => {
      const resultat = Membre.creer('m1', '', 'jean.dupont@example.com');

      expect(resultat.estEchec).toBe(true);
      expect(resultat.erreur.name).toBe('NomMembreInvalideError');
    });

    it('rejette un email vide', () => {
      const resultat = Membre.creer('m1', 'Jean Dupont', '');

      expect(resultat.estEchec).toBe(true);
      expect(resultat.erreur.name).toBe('EmailMembreInvalideError');
    });

    it('rejette un email mal formé', () => {
      const resultat = Membre.creer('m1', 'Jean Dupont', 'pas-un-email');

      expect(resultat.estEchec).toBe(true);
      expect(resultat.erreur.name).toBe('EmailMembreInvalideError');
    });
  });

  describe('modifier', () => {
    it('modifie le nom et l’email avec des valeurs valides', () => {
      const membre = Membre.creer(
        'm1',
        'Jean Dupont',
        'jean@example.com',
      ).valeur;

      const resultat = membre.modifier('Jean D.', 'jean.d@example.com');

      expect(resultat.estSucces).toBe(true);
      expect(membre.nom).toBe('Jean D.');
      expect(membre.email).toBe('jean.d@example.com');
    });

    it('rejette un nom vide et laisse le Membre inchangé', () => {
      const membre = Membre.creer(
        'm1',
        'Jean Dupont',
        'jean@example.com',
      ).valeur;

      const resultat = membre.modifier('', 'jean.d@example.com');

      expect(resultat.estEchec).toBe(true);
      expect(membre.nom).toBe('Jean Dupont');
      expect(membre.email).toBe('jean@example.com');
    });

    it('rejette un email mal formé et laisse le Membre inchangé', () => {
      const membre = Membre.creer(
        'm1',
        'Jean Dupont',
        'jean@example.com',
      ).valeur;

      const resultat = membre.modifier('Jean D.', 'pas-un-email');

      expect(resultat.estEchec).toBe(true);
      expect(membre.email).toBe('jean@example.com');
    });
  });

  describe('reconstituer', () => {
    it('recharge un Membre sans revalider, avec son utilisateurId', () => {
      const membre = Membre.reconstituer(
        'm1',
        'Jean Dupont',
        'jean.dupont@example.com',
        'u1',
      );

      expect(membre.id).toBe('m1');
      expect(membre.nom).toBe('Jean Dupont');
      expect(membre.email).toBe('jean.dupont@example.com');
      expect(membre.utilisateurId).toBe('u1');
    });
  });
});
