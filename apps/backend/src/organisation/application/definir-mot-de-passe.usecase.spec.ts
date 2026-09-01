import * as argon2 from 'argon2';
import { Role } from '@agilometre/shared';
import { HacherJetonCompte } from '../domain/jeton-hachage';
import { JetonCompteRepository } from '../domain/jeton-compte.repository';
import { Utilisateur } from '../domain/utilisateur';
import { UtilisateurRepository } from '../domain/utilisateur.repository';
import { DefinirMotDePasse } from './definir-mot-de-passe.usecase';

class JetonCompteRepositoryFake implements JetonCompteRepository {
  private valide = true;
  private utilisateurIdRetourne: string | null = null;

  configurerValide(utilisateurId: string): void {
    this.valide = true;
    this.utilisateurIdRetourne = utilisateurId;
  }

  configurerInvalide(): void {
    this.valide = false;
  }

  save(): Promise<void> {
    return Promise.resolve();
  }

  consommerSiValide(): Promise<string | null> {
    return Promise.resolve(this.valide ? this.utilisateurIdRetourne : null);
  }
}

class UtilisateurRepositoryFake implements UtilisateurRepository {
  constructor(private readonly utilisateurs: Utilisateur[]) {}

  trouverParEmail(): Promise<Utilisateur | null> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }

  trouverParId(id: string): Promise<Utilisateur | null> {
    return Promise.resolve(this.utilisateurs.find((u) => u.id === id) ?? null);
  }

  lister(): Promise<Utilisateur[]> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }

  save(): Promise<void> {
    return Promise.resolve();
  }

  sauvegarderEtPropager(): Promise<void> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }
}

describe('DefinirMotDePasse', () => {
  it('définit le mot de passe pour un jeton valide', async () => {
    const utilisateur = Utilisateur.creer(
      'id-1',
      'ada@example.com',
      'Ada',
      'Lovelace',
      'hash-provisoire',
      Role.Direction,
    ).valeur;
    const jetons = new JetonCompteRepositoryFake();
    jetons.configurerValide('id-1');
    const useCase = new DefinirMotDePasse(
      jetons,
      new UtilisateurRepositoryFake([utilisateur]),
    );

    const resultat = await useCase.executer(
      'jeton-en-clair',
      'nouveau-mot-de-passe',
    );

    expect(resultat).toEqual({ type: 'ok' });
    expect(
      await argon2.verify(utilisateur.motDePasseHash, 'nouveau-mot-de-passe'),
    ).toBe(true);
  });

  it('échoue pour un jeton invalide (introuvable, expiré ou déjà consommé), sans distinction', async () => {
    const jetons = new JetonCompteRepositoryFake();
    jetons.configurerInvalide();
    const useCase = new DefinirMotDePasse(
      jetons,
      new UtilisateurRepositoryFake([]),
    );

    const resultat = await useCase.executer(
      'jeton-en-clair',
      'nouveau-mot-de-passe',
    );

    expect(resultat).toEqual({ type: 'jeton_invalide' });
  });

  it('refuse un mot de passe trop court sans consommer le jeton', async () => {
    const jetons = new JetonCompteRepositoryFake();
    jetons.configurerValide('id-1');
    const consommerSiValide = jest.spyOn(jetons, 'consommerSiValide');
    const useCase = new DefinirMotDePasse(
      jetons,
      new UtilisateurRepositoryFake([]),
    );

    const resultat = await useCase.executer('jeton-en-clair', 'court');

    expect(resultat).toEqual({ type: 'mot_de_passe_trop_court' });
    expect(consommerSiValide).not.toHaveBeenCalled();
  });

  it('hache le jeton avant de le confier au repository — jamais transmis en clair', async () => {
    const jetons = new JetonCompteRepositoryFake();
    jetons.configurerValide('id-1');
    const consommerSiValide = jest.spyOn(jetons, 'consommerSiValide');
    const useCase = new DefinirMotDePasse(
      jetons,
      new UtilisateurRepositoryFake([
        Utilisateur.creer(
          'id-1',
          'ada@example.com',
          'Ada',
          'Lovelace',
          'hash',
          Role.Coach,
        ).valeur,
      ]),
    );

    await useCase.executer('jeton-en-clair', 'nouveau-mot-de-passe');

    expect(consommerSiValide).toHaveBeenCalledWith(
      HacherJetonCompte.executer('jeton-en-clair'),
      expect.any(Date),
    );
  });
});
