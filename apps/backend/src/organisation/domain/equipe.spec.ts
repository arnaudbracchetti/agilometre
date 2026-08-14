import { Equipe } from './equipe';
import { Membre } from './membre';

describe('Equipe', () => {
  describe('creer', () => {
    it('crée une Équipe avec un nom valide, sans Membre', () => {
      const resultat = Equipe.creer('eq1', 'Équipe Alpha', 'e1');

      expect(resultat.estSucces).toBe(true);
      expect(resultat.valeur.nom).toBe('Équipe Alpha');
      expect(resultat.valeur.entiteId).toBe('e1');
      expect(resultat.valeur.membres).toEqual([]);
    });

    it('rejette un nom vide', () => {
      const resultat = Equipe.creer('eq1', '', 'e1');

      expect(resultat.estEchec).toBe(true);
      expect(resultat.erreur.name).toBe('NomEquipeInvalideError');
    });
  });

  describe('renommer', () => {
    it('renomme l’Équipe avec un nom valide', () => {
      const equipe = Equipe.creer('eq1', 'Alpha', 'e1').valeur;

      const resultat = equipe.renommer('Beta');

      expect(resultat.estSucces).toBe(true);
      expect(equipe.nom).toBe('Beta');
    });

    it('rejette un nom vide et laisse le nom existant inchangé', () => {
      const equipe = Equipe.creer('eq1', 'Alpha', 'e1').valeur;

      const resultat = equipe.renommer('');

      expect(resultat.estEchec).toBe(true);
      expect(equipe.nom).toBe('Alpha');
    });
  });

  describe('ajouterMembre', () => {
    it('ajoute un Membre valide au roster', () => {
      const equipe = Equipe.creer('eq1', 'Alpha', 'e1').valeur;

      const resultat = equipe.ajouterMembre(
        'm1',
        'Jean Dupont',
        'jean@example.com',
      );

      expect(resultat.estSucces).toBe(true);
      expect(equipe.membres).toHaveLength(1);
      expect(equipe.membres[0].nom).toBe('Jean Dupont');
    });

    it('rejette un nom ou un email invalide sans modifier le roster', () => {
      const equipe = Equipe.creer('eq1', 'Alpha', 'e1').valeur;

      const resultat = equipe.ajouterMembre('m1', '', 'jean@example.com');

      expect(resultat.estEchec).toBe(true);
      expect(equipe.membres).toHaveLength(0);
    });

    it('rejette un doublon d’email dans le même roster, insensible à la casse', () => {
      const equipe = Equipe.creer('eq1', 'Alpha', 'e1').valeur;
      equipe.ajouterMembre('m1', 'Jean Dupont', 'Jean@Example.com');

      const resultat = equipe.ajouterMembre(
        'm2',
        'Jean D.',
        'jean@example.com',
      );

      expect(resultat.estEchec).toBe(true);
      expect(resultat.erreur.name).toBe('EmailMembreDejaUtiliseError');
      expect(equipe.membres).toHaveLength(1);
    });

    it('autorise le même email dans deux Équipes différentes', () => {
      const equipeA = Equipe.creer('eq1', 'Alpha', 'e1').valeur;
      const equipeB = Equipe.creer('eq2', 'Beta', 'e1').valeur;
      equipeA.ajouterMembre('m1', 'Jean Dupont', 'jean@example.com');

      const resultat = equipeB.ajouterMembre(
        'm2',
        'Jean Dupont',
        'jean@example.com',
      );

      expect(resultat.estSucces).toBe(true);
    });
  });

  describe('retirerMembre', () => {
    it('retire un Membre existant du roster', () => {
      const equipe = Equipe.creer('eq1', 'Alpha', 'e1').valeur;
      equipe.ajouterMembre('m1', 'Jean Dupont', 'jean@example.com');

      const resultat = equipe.retirerMembre('m1');

      expect(resultat.estSucces).toBe(true);
      expect(equipe.membres).toHaveLength(0);
    });

    it('rejette le retrait d’un Membre inconnu', () => {
      const equipe = Equipe.creer('eq1', 'Alpha', 'e1').valeur;

      const resultat = equipe.retirerMembre('inconnu');

      expect(resultat.estEchec).toBe(true);
      expect(resultat.erreur.name).toBe('MembreIntrouvableError');
    });
  });

  describe('modifierMembre', () => {
    it('modifie le nom et l’email d’un Membre existant', () => {
      const equipe = Equipe.creer('eq1', 'Alpha', 'e1').valeur;
      equipe.ajouterMembre('m1', 'Jean Dupont', 'jean@example.com');

      const resultat = equipe.modifierMembre(
        'm1',
        'Jean D.',
        'jean.d@example.com',
      );

      expect(resultat.estSucces).toBe(true);
      expect(equipe.membres[0].nom).toBe('Jean D.');
      expect(equipe.membres[0].email).toBe('jean.d@example.com');
    });

    it('rejette la modification d’un Membre inconnu', () => {
      const equipe = Equipe.creer('eq1', 'Alpha', 'e1').valeur;

      const resultat = equipe.modifierMembre(
        'inconnu',
        'Jean D.',
        'jean.d@example.com',
      );

      expect(resultat.estEchec).toBe(true);
      expect(resultat.erreur.name).toBe('MembreIntrouvableError');
    });

    it('rejette un nom ou un email invalide sans modifier le Membre', () => {
      const equipe = Equipe.creer('eq1', 'Alpha', 'e1').valeur;
      equipe.ajouterMembre('m1', 'Jean Dupont', 'jean@example.com');

      const resultat = equipe.modifierMembre('m1', '', 'jean.d@example.com');

      expect(resultat.estEchec).toBe(true);
      expect(equipe.membres[0].nom).toBe('Jean Dupont');
    });

    it('rejette un email déjà utilisé par un autre Membre du roster', () => {
      const equipe = Equipe.creer('eq1', 'Alpha', 'e1').valeur;
      equipe.ajouterMembre('m1', 'Jean Dupont', 'jean@example.com');
      equipe.ajouterMembre('m2', 'Marie Curie', 'marie@example.com');

      const resultat = equipe.modifierMembre(
        'm2',
        'Marie C.',
        'jean@example.com',
      );

      expect(resultat.estEchec).toBe(true);
      expect(resultat.erreur.name).toBe('EmailMembreDejaUtiliseError');
      expect(equipe.membres[1].email).toBe('marie@example.com');
    });

    it('autorise à garder son propre email inchangé', () => {
      const equipe = Equipe.creer('eq1', 'Alpha', 'e1').valeur;
      equipe.ajouterMembre('m1', 'Jean Dupont', 'jean@example.com');

      const resultat = equipe.modifierMembre(
        'm1',
        'Jean D.',
        'jean@example.com',
      );

      expect(resultat.estSucces).toBe(true);
      expect(equipe.membres[0].nom).toBe('Jean D.');
    });
  });

  describe('reconstituer', () => {
    it('recharge une Équipe avec son roster sans revalider', () => {
      const membre = Membre.reconstituer(
        'm1',
        'Jean Dupont',
        'jean@example.com',
        null,
      );

      const equipe = Equipe.reconstituer('eq1', 'Alpha', 'e1', [membre]);

      expect(equipe.id).toBe('eq1');
      expect(equipe.membres).toHaveLength(1);
      expect(equipe.membres[0].id).toBe('m1');
    });
  });
});
