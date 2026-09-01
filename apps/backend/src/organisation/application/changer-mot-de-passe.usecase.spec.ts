import * as argon2 from 'argon2';
import { Role } from '@agilometre/shared';
import { Utilisateur } from '../domain/utilisateur';
import { UtilisateurRepository } from '../domain/utilisateur.repository';
import { ChangerMotDePasse } from './changer-mot-de-passe.usecase';

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

async function creerUtilisateur(motDePasse: string): Promise<Utilisateur> {
  const hash = await argon2.hash(motDePasse);
  return Utilisateur.creer(
    'id-1',
    'ada@example.com',
    'Ada',
    'Lovelace',
    hash,
    Role.Membre,
  ).valeur;
}

describe('ChangerMotDePasse', () => {
  it('change le mot de passe si l’ancien est correct', async () => {
    const utilisateur = await creerUtilisateur('ancien-mot-de-passe');
    const useCase = new ChangerMotDePasse(
      new UtilisateurRepositoryFake([utilisateur]),
    );

    const resultat = await useCase.executer(
      'id-1',
      'ancien-mot-de-passe',
      'nouveau-mot-de-passe',
    );

    expect(resultat).toEqual({ type: 'ok' });
    expect(
      await argon2.verify(utilisateur.motDePasseHash, 'nouveau-mot-de-passe'),
    ).toBe(true);
  });

  it('échoue si l’ancien mot de passe est incorrect', async () => {
    const utilisateur = await creerUtilisateur('ancien-mot-de-passe');
    const useCase = new ChangerMotDePasse(
      new UtilisateurRepositoryFake([utilisateur]),
    );

    const resultat = await useCase.executer(
      'id-1',
      'mauvais-mot-de-passe',
      'nouveau-mot-de-passe',
    );

    expect(resultat).toEqual({ type: 'mot_de_passe_actuel_incorrect' });
  });

  it('refuse un nouveau mot de passe trop court', async () => {
    const utilisateur = await creerUtilisateur('ancien-mot-de-passe');
    const useCase = new ChangerMotDePasse(
      new UtilisateurRepositoryFake([utilisateur]),
    );

    const resultat = await useCase.executer(
      'id-1',
      'ancien-mot-de-passe',
      'court',
    );

    expect(resultat).toEqual({ type: 'mot_de_passe_trop_court' });
  });

  it('agit toujours sur l’utilisateurId fourni, jamais sur un autre compte', async () => {
    const utilisateur = await creerUtilisateur('ancien-mot-de-passe');
    const useCase = new ChangerMotDePasse(
      new UtilisateurRepositoryFake([utilisateur]),
    );

    const resultat = await useCase.executer(
      'un-autre-id',
      'peu importe',
      'nouveau-mot-de-passe',
    );

    expect(resultat).toEqual({ type: 'introuvable' });
  });
});
