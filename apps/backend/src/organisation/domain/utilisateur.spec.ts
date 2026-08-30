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

  it('reconstituer — ne revalide pas et restitue un compte désactivé tel quel', () => {
    const utilisateur = Utilisateur.reconstituer(
      'id-1',
      'coach@example.com',
      'Ada',
      'Lovelace',
      'hash',
      false,
      Role.Direction,
    );

    expect(utilisateur.actif).toBe(false);
    expect(utilisateur.role).toBe(Role.Direction);
  });
});
