import { Role } from '@agilometre/shared';
import {
  EmailUtilisateurInvalideError,
  MotDePasseHashUtilisateurInvalideError,
  NomUtilisateurInvalideError,
  PrenomUtilisateurInvalideError,
  Utilisateur,
} from './utilisateur';

describe('Utilisateur', () => {
  it('creer — succès avec des champs valides, actif par défaut', () => {
    const resultat = Utilisateur.creer(
      'id-1',
      'coach@example.com',
      'Ada',
      'Lovelace',
      'hash-argon2',
      Role.Coach,
    );

    expect(resultat.estSucces).toBe(true);
    const utilisateur = resultat.valeur;
    expect(utilisateur.email).toBe('coach@example.com');
    expect(utilisateur.prenom).toBe('Ada');
    expect(utilisateur.nom).toBe('Lovelace');
    expect(utilisateur.motDePasseHash).toBe('hash-argon2');
    expect(utilisateur.actif).toBe(true);
    expect(utilisateur.role).toBe(Role.Coach);
  });

  it('creer — recadre les espaces superflus sur email/prénom/nom', () => {
    const resultat = Utilisateur.creer(
      'id-1',
      '  coach@example.com  ',
      '  Ada  ',
      '  Lovelace  ',
      'hash',
      Role.Coach,
    );

    expect(resultat.estSucces).toBe(true);
    expect(resultat.valeur.email).toBe('coach@example.com');
    expect(resultat.valeur.prenom).toBe('Ada');
    expect(resultat.valeur.nom).toBe('Lovelace');
  });

  it('creer — échoue avec un email invalide', () => {
    const resultat = Utilisateur.creer(
      'id-1',
      'pas-un-email',
      'Ada',
      'Lovelace',
      'hash',
      Role.Coach,
    );

    expect(resultat.estEchec).toBe(true);
    expect(resultat.erreur).toBeInstanceOf(EmailUtilisateurInvalideError);
  });

  it('creer — échoue avec un prénom vide', () => {
    const resultat = Utilisateur.creer(
      'id-1',
      'coach@example.com',
      '   ',
      'Lovelace',
      'hash',
      Role.Coach,
    );

    expect(resultat.estEchec).toBe(true);
    expect(resultat.erreur).toBeInstanceOf(PrenomUtilisateurInvalideError);
  });

  it('creer — échoue avec un nom vide', () => {
    const resultat = Utilisateur.creer(
      'id-1',
      'coach@example.com',
      'Ada',
      '   ',
      'hash',
      Role.Coach,
    );

    expect(resultat.estEchec).toBe(true);
    expect(resultat.erreur).toBeInstanceOf(NomUtilisateurInvalideError);
  });

  it('creer — échoue avec un hash de mot de passe vide', () => {
    const resultat = Utilisateur.creer(
      'id-1',
      'coach@example.com',
      'Ada',
      'Lovelace',
      '   ',
      Role.Coach,
    );

    expect(resultat.estEchec).toBe(true);
    expect(resultat.erreur).toBeInstanceOf(
      MotDePasseHashUtilisateurInvalideError,
    );
  });

  it('modifierProfil — succès, met à jour email/prénom/nom, jamais le mot de passe', () => {
    const resultat = Utilisateur.creer(
      'id-1',
      'coach@example.com',
      'Ada',
      'Lovelace',
      'hash-initial',
      Role.Coach,
    );
    const utilisateur = resultat.valeur;

    const modification = utilisateur.modifierProfil(
      'ada@example.com',
      'Grace',
      'Hopper',
    );

    expect(modification.estSucces).toBe(true);
    expect(utilisateur.email).toBe('ada@example.com');
    expect(utilisateur.prenom).toBe('Grace');
    expect(utilisateur.nom).toBe('Hopper');
    expect(utilisateur.motDePasseHash).toBe('hash-initial');
  });

  it('modifierProfil — échoue avec un email invalide, ne modifie rien', () => {
    const utilisateur = Utilisateur.creer(
      'id-1',
      'coach@example.com',
      'Ada',
      'Lovelace',
      'hash',
      Role.Coach,
    ).valeur;

    const modification = utilisateur.modifierProfil(
      'pas-un-email',
      'Grace',
      'Hopper',
    );

    expect(modification.estEchec).toBe(true);
    expect(modification.erreur).toBeInstanceOf(EmailUtilisateurInvalideError);
    expect(utilisateur.email).toBe('coach@example.com');
  });

  it('definirMotDePasse — succès, remplace le hash', () => {
    const utilisateur = Utilisateur.creer(
      'id-1',
      'coach@example.com',
      'Ada',
      'Lovelace',
      'hash-initial',
      Role.Coach,
    ).valeur;

    const resultat = utilisateur.definirMotDePasse('nouveau-hash');

    expect(resultat.estSucces).toBe(true);
    expect(utilisateur.motDePasseHash).toBe('nouveau-hash');
  });

  it('definirMotDePasse — échoue avec un hash vide, ne modifie rien', () => {
    const utilisateur = Utilisateur.creer(
      'id-1',
      'coach@example.com',
      'Ada',
      'Lovelace',
      'hash-initial',
      Role.Coach,
    ).valeur;

    const resultat = utilisateur.definirMotDePasse('   ');

    expect(resultat.estEchec).toBe(true);
    expect(resultat.erreur).toBeInstanceOf(
      MotDePasseHashUtilisateurInvalideError,
    );
    expect(utilisateur.motDePasseHash).toBe('hash-initial');
  });

  it('desactiver / reactiver — bascule actif, idempotent', () => {
    const utilisateur = Utilisateur.creer(
      'id-1',
      'coach@example.com',
      'Ada',
      'Lovelace',
      'hash',
      Role.Coach,
    ).valeur;

    utilisateur.desactiver();
    expect(utilisateur.actif).toBe(false);
    utilisateur.desactiver();
    expect(utilisateur.actif).toBe(false);

    utilisateur.reactiver();
    expect(utilisateur.actif).toBe(true);
    utilisateur.reactiver();
    expect(utilisateur.actif).toBe(true);
  });

  it('reconstituer — ne revalide pas et restitue un compte désactivé tel quel', () => {
    const utilisateur = Utilisateur.reconstituer(
      'id-1',
      'coach@example.com',
      'Ada',
      'Lovelace',
      'hash',
      false,
      Role.Direction,
      [],
    );

    expect(utilisateur.actif).toBe(false);
    expect(utilisateur.role).toBe(Role.Direction);
    expect(utilisateur.habilitations).toEqual([]);
  });

  describe('ajouterHabilitation', () => {
    function creerDirection() {
      return Utilisateur.creer(
        'u1',
        'direction@example.com',
        'Ada',
        'Lovelace',
        'hash',
        Role.Direction,
      ).valeur;
    }

    it('accepte un entiteId pour une Direction', () => {
      const utilisateur = creerDirection();

      const resultat = utilisateur.ajouterHabilitation('h1', {
        entiteId: 'e1',
      });

      expect(resultat.estSucces).toBe(true);
      expect(utilisateur.habilitations).toHaveLength(1);
      expect(utilisateur.habilitations[0].entiteId).toBe('e1');
    });

    it('rejette un equipeId pour une Direction', () => {
      const utilisateur = creerDirection();

      const resultat = utilisateur.ajouterHabilitation('h1', {
        equipeId: 'eq1',
      });

      expect(resultat.estEchec).toBe(true);
      expect(resultat.erreur.name).toBe(
        'HabilitationIncompatibleAvecRoleError',
      );
      expect(utilisateur.habilitations).toHaveLength(0);
    });

    it('rejette toute Habilitation pour un Coach', () => {
      const utilisateur = Utilisateur.creer(
        'u1',
        'coach@example.com',
        'Ada',
        'Lovelace',
        'hash',
        Role.Coach,
      ).valeur;

      const resultat = utilisateur.ajouterHabilitation('h1', {
        entiteId: 'e1',
      });

      expect(resultat.estEchec).toBe(true);
      expect(resultat.erreur.name).toBe(
        'HabilitationIncompatibleAvecRoleError',
      );
    });

    it('rejette toute Habilitation pour un Membre d’équipe (périmètre dérivé des Équipes où il est Membre)', () => {
      const utilisateur = Utilisateur.creer(
        'u1',
        'membre@example.com',
        'Ada',
        'Lovelace',
        'hash',
        Role.Membre,
      ).valeur;

      const resultat = utilisateur.ajouterHabilitation('h1', {
        entiteId: 'e1',
      });

      expect(resultat.estEchec).toBe(true);
      expect(resultat.erreur.name).toBe(
        'HabilitationIncompatibleAvecRoleError',
      );
    });

    it('accepte un equipeId pour un Manager d’équipe (invariant porté, non exploité)', () => {
      const utilisateur = Utilisateur.creer(
        'u1',
        'manager@example.com',
        'Ada',
        'Lovelace',
        'hash',
        Role.Manager,
      ).valeur;

      const resultat = utilisateur.ajouterHabilitation('h1', {
        equipeId: 'eq1',
      });

      expect(resultat.estSucces).toBe(true);
    });

    it('rejette un doublon sur la même Entité', () => {
      const utilisateur = creerDirection();
      utilisateur.ajouterHabilitation('h1', { entiteId: 'e1' });

      const resultat = utilisateur.ajouterHabilitation('h2', {
        entiteId: 'e1',
      });

      expect(resultat.estEchec).toBe(true);
      expect(resultat.erreur.name).toBe('HabilitationEnDoublonError');
      expect(utilisateur.habilitations).toHaveLength(1);
    });

    it('accepte plusieurs Habilitations sur des Entités différentes', () => {
      const utilisateur = creerDirection();
      utilisateur.ajouterHabilitation('h1', { entiteId: 'e1' });

      const resultat = utilisateur.ajouterHabilitation('h2', {
        entiteId: 'e2',
      });

      expect(resultat.estSucces).toBe(true);
      expect(utilisateur.habilitations).toHaveLength(2);
    });
  });

  describe('retirerHabilitation', () => {
    it('retire une Habilitation existante', () => {
      const utilisateur = Utilisateur.creer(
        'u1',
        'direction@example.com',
        'Ada',
        'Lovelace',
        'hash',
        Role.Direction,
      ).valeur;
      utilisateur.ajouterHabilitation('h1', { entiteId: 'e1' });

      const resultat = utilisateur.retirerHabilitation('h1');

      expect(resultat.estSucces).toBe(true);
      expect(utilisateur.habilitations).toHaveLength(0);
    });

    it('rejette le retrait d’une Habilitation inconnue', () => {
      const utilisateur = Utilisateur.creer(
        'u1',
        'direction@example.com',
        'Ada',
        'Lovelace',
        'hash',
        Role.Direction,
      ).valeur;

      const resultat = utilisateur.retirerHabilitation('inconnue');

      expect(resultat.estEchec).toBe(true);
      expect(resultat.erreur.name).toBe('HabilitationIntrouvableError');
    });
  });

  describe('changerRole', () => {
    it('change le Rôle quand aucune Habilitation n’existe', () => {
      const utilisateur = Utilisateur.creer(
        'u1',
        'coach@example.com',
        'Ada',
        'Lovelace',
        'hash',
        Role.Coach,
      ).valeur;

      const resultat = utilisateur.changerRole(Role.Direction);

      expect(resultat.estSucces).toBe(true);
      expect(utilisateur.role).toBe(Role.Direction);
    });

    it('rejette le changement si une Habilitation existante devient incohérente', () => {
      const utilisateur = Utilisateur.creer(
        'u1',
        'direction@example.com',
        'Ada',
        'Lovelace',
        'hash',
        Role.Direction,
      ).valeur;
      utilisateur.ajouterHabilitation('h1', { entiteId: 'e1' });

      const resultat = utilisateur.changerRole(Role.Coach);

      expect(resultat.estEchec).toBe(true);
      expect(resultat.erreur.name).toBe('RoleIncoherentAvecHabilitationsError');
      expect(utilisateur.role).toBe(Role.Direction);
    });

    it('autorise le changement une fois les Habilitations retirées', () => {
      const utilisateur = Utilisateur.creer(
        'u1',
        'direction@example.com',
        'Ada',
        'Lovelace',
        'hash',
        Role.Direction,
      ).valeur;
      utilisateur.ajouterHabilitation('h1', { entiteId: 'e1' });
      utilisateur.retirerHabilitation('h1');

      const resultat = utilisateur.changerRole(Role.Coach);

      expect(resultat.estSucces).toBe(true);
      expect(utilisateur.role).toBe(Role.Coach);
    });
  });
});
