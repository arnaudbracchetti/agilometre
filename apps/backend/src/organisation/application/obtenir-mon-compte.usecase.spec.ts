import * as argon2 from 'argon2';
import { Role } from '@agilometre/shared';
import { Utilisateur } from '../domain/utilisateur';
import { UtilisateurRepository } from '../domain/utilisateur.repository';
import { ObtenirMonCompte } from './obtenir-mon-compte.usecase';

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
}

async function creerUtilisateur(): Promise<Utilisateur> {
  const hash = await argon2.hash('mot-de-passe');
  return Utilisateur.creer(
    'id-1',
    'ada@example.com',
    'Ada',
    'Lovelace',
    hash,
    Role.Membre,
  ).valeur;
}

describe('ObtenirMonCompte', () => {
  it('renvoie le compte correspondant à l’utilisateurId fourni', async () => {
    const utilisateur = await creerUtilisateur();
    const useCase = new ObtenirMonCompte(
      new UtilisateurRepositoryFake([utilisateur]),
    );

    const resultat = await useCase.executer('id-1');

    expect(resultat).toBe(utilisateur);
  });

  it('renvoie null si le compte est introuvable', async () => {
    const utilisateur = await creerUtilisateur();
    const useCase = new ObtenirMonCompte(
      new UtilisateurRepositoryFake([utilisateur]),
    );

    const resultat = await useCase.executer('un-autre-id');

    expect(resultat).toBeNull();
  });
});
