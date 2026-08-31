import { Role } from '@agilometre/shared';
import { Utilisateur } from '../domain/utilisateur';
import { UtilisateurRepository } from '../domain/utilisateur.repository';
import { ListerUtilisateurs } from './lister-utilisateurs.usecase';

class UtilisateurRepositoryFake implements UtilisateurRepository {
  constructor(private readonly utilisateurs: Utilisateur[]) {}

  trouverParEmail(): Promise<Utilisateur | null> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }

  trouverParId(): Promise<Utilisateur | null> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }

  lister(): Promise<Utilisateur[]> {
    return Promise.resolve(this.utilisateurs);
  }

  save(): Promise<void> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }
}

describe('ListerUtilisateurs', () => {
  it('renvoie tous les comptes', async () => {
    const utilisateur = Utilisateur.creer(
      'id-1',
      'ada@example.com',
      'Ada',
      'Lovelace',
      'hash',
      Role.Coach,
    ).valeur;
    const useCase = new ListerUtilisateurs(
      new UtilisateurRepositoryFake([utilisateur]),
    );

    const resultat = await useCase.executer();

    expect(resultat).toEqual([utilisateur]);
  });
});
