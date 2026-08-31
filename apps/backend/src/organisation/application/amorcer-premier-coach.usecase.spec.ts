import * as argon2 from 'argon2';
import { Role } from '@agilometre/shared';
import { Utilisateur } from '../domain/utilisateur';
import { UtilisateurRepository } from '../domain/utilisateur.repository';
import { AmorcerPremierCoach } from './amorcer-premier-coach.usecase';

class UtilisateurRepositoryFake implements UtilisateurRepository {
  utilisateurs: Utilisateur[] = [];

  trouverParEmail(email: string): Promise<Utilisateur | null> {
    const recherche = email.toLowerCase();
    return Promise.resolve(
      this.utilisateurs.find((u) => u.email.toLowerCase() === recherche) ??
        null,
    );
  }

  trouverParId(id: string): Promise<Utilisateur | null> {
    return Promise.resolve(this.utilisateurs.find((u) => u.id === id) ?? null);
  }

  lister(): Promise<Utilisateur[]> {
    return Promise.resolve(this.utilisateurs);
  }

  save(utilisateur: Utilisateur): Promise<void> {
    this.utilisateurs.push(utilisateur);
    return Promise.resolve();
  }
}

describe('AmorcerPremierCoach', () => {
  it('crée un compte Coach actif avec un mot de passe hashé', async () => {
    const repository = new UtilisateurRepositoryFake();
    const useCase = new AmorcerPremierCoach(repository);

    const resultat = await useCase.executer(
      'coach@example.com',
      'Ada',
      'Lovelace',
      'mot-de-passe-en-clair',
    );

    expect(resultat.type).toBe('cree');
    if (resultat.type !== 'cree') throw new Error('unreachable');
    expect(resultat.utilisateur.role).toBe(Role.Coach);
    expect(resultat.utilisateur.actif).toBe(true);
    expect(resultat.utilisateur.motDePasseHash).not.toBe(
      'mot-de-passe-en-clair',
    );
    expect(
      await argon2.verify(
        resultat.utilisateur.motDePasseHash,
        'mot-de-passe-en-clair',
      ),
    ).toBe(true);
    expect(repository.utilisateurs).toHaveLength(1);
  });

  it('échoue si un compte existe déjà avec cet email (insensible à la casse)', async () => {
    const repository = new UtilisateurRepositoryFake();
    await new AmorcerPremierCoach(repository).executer(
      'coach@example.com',
      'Ada',
      'Lovelace',
      'mot-de-passe',
    );

    const resultat = await new AmorcerPremierCoach(repository).executer(
      'COACH@EXAMPLE.COM',
      'Autre',
      'Personne',
      'autre-mot-de-passe',
    );

    expect(resultat).toEqual({ type: 'email_deja_utilise' });
    expect(repository.utilisateurs).toHaveLength(1);
  });

  it('échoue si le mot de passe est trop court', async () => {
    const repository = new UtilisateurRepositoryFake();
    const useCase = new AmorcerPremierCoach(repository);

    const resultat = await useCase.executer(
      'coach@example.com',
      'Ada',
      'Lovelace',
      'court',
    );

    expect(resultat).toEqual({ type: 'mot_de_passe_trop_court' });
    expect(repository.utilisateurs).toHaveLength(0);
  });

  it('échoue avec une erreur de validation pour un email invalide', async () => {
    const repository = new UtilisateurRepositoryFake();
    const useCase = new AmorcerPremierCoach(repository);

    const resultat = await useCase.executer(
      'pas-un-email',
      'Ada',
      'Lovelace',
      'mot-de-passe',
    );

    expect(resultat.type).toBe('invalide');
    expect(repository.utilisateurs).toHaveLength(0);
  });
});
