import { Membre } from './membre';

describe('Membre', () => {
  describe('creer', () => {
    it('crée un Membre avec un nom et un email valides, sans prénom', () => {
      const resultat = Membre.creer(
        'm1',
        'Jean Dupont',
        null,
        'jean.dupont@example.com',
      );

      expect(resultat.estSucces).toBe(true);
      expect(resultat.valeur.nom).toBe('Jean Dupont');
      expect(resultat.valeur.prenom).toBeNull();
      expect(resultat.valeur.email).toBe('jean.dupont@example.com');
      expect(resultat.valeur.utilisateurId).toBeNull();
    });

    it('accepte un prénom facultatif, épuré des espaces superflus', () => {
      const resultat = Membre.creer(
        'm1',
        'Jean Dupont',
        '  Jean  ',
        'jean.dupont@example.com',
      );

      expect(resultat.estSucces).toBe(true);
      expect(resultat.valeur.prenom).toBe('Jean');
    });

    it('traite un prénom vide comme absent', () => {
      const resultat = Membre.creer(
        'm1',
        'Jean Dupont',
        '   ',
        'jean.dupont@example.com',
      );

      expect(resultat.estSucces).toBe(true);
      expect(resultat.valeur.prenom).toBeNull();
    });

    it('rejette un nom vide', () => {
      const resultat = Membre.creer('m1', '', null, 'jean.dupont@example.com');

      expect(resultat.estEchec).toBe(true);
      expect(resultat.erreur.name).toBe('NomMembreInvalideError');
    });

    it('rejette un email vide', () => {
      const resultat = Membre.creer('m1', 'Jean Dupont', null, '');

      expect(resultat.estEchec).toBe(true);
      expect(resultat.erreur.name).toBe('EmailMembreInvalideError');
    });

    it('rejette un email mal formé', () => {
      const resultat = Membre.creer(
        'm1',
        'Jean Dupont',
        null,
        'pas-un-email',
      );

      expect(resultat.estEchec).toBe(true);
      expect(resultat.erreur.name).toBe('EmailMembreInvalideError');
    });
  });

  describe('modifier', () => {
    it('modifie le nom, le prénom et l’email avec des valeurs valides', () => {
      const membre = Membre.creer(
        'm1',
        'Jean Dupont',
        null,
        'jean@example.com',
      ).valeur;

      const resultat = membre.modifier('Jean D.', 'Jean', 'jean.d@example.com');

      expect(resultat.estSucces).toBe(true);
      expect(membre.nom).toBe('Jean D.');
      expect(membre.prenom).toBe('Jean');
      expect(membre.email).toBe('jean.d@example.com');
    });

    it('remet le prénom à null si absent de la modification', () => {
      const membre = Membre.creer(
        'm1',
        'Jean Dupont',
        'Jean',
        'jean@example.com',
      ).valeur;

      membre.modifier('Jean Dupont', null, 'jean@example.com');

      expect(membre.prenom).toBeNull();
    });

    it('rejette un nom vide et laisse le Membre inchangé', () => {
      const membre = Membre.creer(
        'm1',
        'Jean Dupont',
        null,
        'jean@example.com',
      ).valeur;

      const resultat = membre.modifier('', null, 'jean.d@example.com');

      expect(resultat.estEchec).toBe(true);
      expect(membre.nom).toBe('Jean Dupont');
      expect(membre.email).toBe('jean@example.com');
    });

    it('rejette un email mal formé et laisse le Membre inchangé', () => {
      const membre = Membre.creer(
        'm1',
        'Jean Dupont',
        null,
        'jean@example.com',
      ).valeur;

      const resultat = membre.modifier('Jean D.', null, 'pas-un-email');

      expect(resultat.estEchec).toBe(true);
      expect(membre.email).toBe('jean@example.com');
    });
  });

  describe('reconstituer', () => {
    it('recharge un Membre sans revalider, avec son prénom et son utilisateurId', () => {
      const membre = Membre.reconstituer(
        'm1',
        'Jean Dupont',
        'Jean',
        'jean.dupont@example.com',
        'u1',
      );

      expect(membre.id).toBe('m1');
      expect(membre.nom).toBe('Jean Dupont');
      expect(membre.prenom).toBe('Jean');
      expect(membre.email).toBe('jean.dupont@example.com');
      expect(membre.utilisateurId).toBe('u1');
    });
  });

  describe('lierUtilisateur', () => {
    it('fixe utilisateurId et écrase nom/prénom/email avec les valeurs du compte', () => {
      const membre = Membre.creer(
        'm1',
        'Jean Dupont',
        null,
        'jean@example.com',
      ).valeur;

      membre.lierUtilisateur('u1', 'Jean', 'Dupont', 'jean.dupont@compte.com');

      expect(membre.utilisateurId).toBe('u1');
      expect(membre.nom).toBe('Dupont');
      expect(membre.prenom).toBe('Jean');
      expect(membre.email).toBe('jean.dupont@compte.com');
    });

    it('écrase un prénom saisi manuellement à la création — le compte fait autorité', () => {
      const membre = Membre.creer(
        'm1',
        'Jean Dupont',
        'Jeannot',
        'jean@example.com',
      ).valeur;

      membre.lierUtilisateur('u1', 'Jean', 'Dupont', 'jean.dupont@compte.com');

      expect(membre.prenom).toBe('Jean');
    });

    it('rend le Membre en lecture seule sur nom/email', () => {
      const membre = Membre.creer(
        'm1',
        'Jean Dupont',
        null,
        'jean@example.com',
      ).valeur;
      membre.lierUtilisateur('u1', 'Jean', 'Dupont', 'jean.dupont@compte.com');

      const resultat = membre.modifier('Autre nom', null, 'autre@example.com');

      expect(resultat.estEchec).toBe(true);
      expect(resultat.erreur.name).toBe('MembreLieError');
      expect(membre.nom).toBe('Dupont');
      expect(membre.email).toBe('jean.dupont@compte.com');
    });
  });

  describe('delierUtilisateur', () => {
    it('remet utilisateurId à null sans toucher aux autres champs', () => {
      const membre = Membre.creer(
        'm1',
        'Jean Dupont',
        null,
        'jean@example.com',
      ).valeur;
      membre.lierUtilisateur('u1', 'Jean', 'Dupont', 'jean.dupont@compte.com');

      membre.delierUtilisateur();

      expect(membre.utilisateurId).toBeNull();
      expect(membre.nom).toBe('Dupont');
      expect(membre.prenom).toBe('Jean');
      expect(membre.email).toBe('jean.dupont@compte.com');
    });

    it('rend le Membre de nouveau éditable', () => {
      const membre = Membre.creer(
        'm1',
        'Jean Dupont',
        null,
        'jean@example.com',
      ).valeur;
      membre.lierUtilisateur('u1', 'Jean', 'Dupont', 'jean.dupont@compte.com');
      membre.delierUtilisateur();

      const resultat = membre.modifier(
        'Nouveau nom',
        null,
        'nouveau@example.com',
      );

      expect(resultat.estSucces).toBe(true);
      expect(membre.nom).toBe('Nouveau nom');
      expect(membre.email).toBe('nouveau@example.com');
    });
  });
});
