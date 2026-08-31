import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@agilometre/shared';
import { Utilisateur } from '../../organisation/domain/utilisateur';
import { UtilisateurRepository } from '../../organisation/domain/utilisateur.repository';
import { SeConnecter } from './se-connecter.usecase';
import { ChargeJetonUtilisateur } from '../jeton-utilisateur';

class UtilisateurRepositoryEnMemoire implements UtilisateurRepository {
  constructor(private readonly utilisateurs: Utilisateur[]) {}

  trouverParEmail(email: string): Promise<Utilisateur | null> {
    return Promise.resolve(
      this.utilisateurs.find(
        (u) => u.email.toLowerCase() === email.toLowerCase(),
      ) ?? null,
    );
  }

  trouverParId(): Promise<Utilisateur | null> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }

  lister(): Promise<Utilisateur[]> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }

  save(): Promise<void> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }
}

describe('SeConnecter', () => {
  const jwt = new JwtService({ secret: 'test-secret' });

  async function creerCompteActif(motDePasse: string): Promise<Utilisateur> {
    const hash = await argon2.hash(motDePasse);
    const resultat = Utilisateur.creer(
      'id-1',
      'coach@example.com',
      'Ada',
      'Lovelace',
      hash,
      Role.Coach,
    );
    if (resultat.estEchec) {
      throw resultat.erreur;
    }
    return resultat.valeur;
  }

  it('signe un jeton pour un compte actif avec le bon mot de passe', async () => {
    const utilisateur = await creerCompteActif('mot-de-passe-correct');
    const seConnecter = new SeConnecter(
      new UtilisateurRepositoryEnMemoire([utilisateur]),
      jwt,
    );

    const resultat = await seConnecter.executer(
      'coach@example.com',
      'mot-de-passe-correct',
    );

    expect(resultat.type).toBe('ok');
    if (resultat.type !== 'ok') return;
    const charge = await jwt.verifyAsync<ChargeJetonUtilisateur>(
      resultat.jeton,
    );
    expect(charge).toMatchObject({
      sub: 'id-1',
      email: 'coach@example.com',
      role: Role.Coach,
    });
  });

  it('échoue si le mot de passe est incorrect', async () => {
    const utilisateur = await creerCompteActif('mot-de-passe-correct');
    const seConnecter = new SeConnecter(
      new UtilisateurRepositoryEnMemoire([utilisateur]),
      jwt,
    );

    const resultat = await seConnecter.executer(
      'coach@example.com',
      'mauvais-mot-de-passe',
    );

    expect(resultat).toEqual({ type: 'echec' });
  });

  it('échoue si aucun compte ne correspond à cet email', async () => {
    const seConnecter = new SeConnecter(
      new UtilisateurRepositoryEnMemoire([]),
      jwt,
    );

    const resultat = await seConnecter.executer(
      'inconnu@example.com',
      'peu importe',
    );

    expect(resultat).toEqual({ type: 'echec' });
  });

  it('échoue si le compte est désactivé, même avec le bon mot de passe', async () => {
    const actif = await creerCompteActif('mot-de-passe-correct');
    const desactive = Utilisateur.reconstituer(
      actif.id,
      actif.email,
      actif.prenom,
      actif.nom,
      actif.motDePasseHash,
      false,
      actif.role,
    );
    const seConnecter = new SeConnecter(
      new UtilisateurRepositoryEnMemoire([desactive]),
      jwt,
    );

    const resultat = await seConnecter.executer(
      'coach@example.com',
      'mot-de-passe-correct',
    );

    expect(resultat).toEqual({ type: 'echec' });
  });

  it('trouve un compte par email indépendamment de la casse', async () => {
    const utilisateur = await creerCompteActif('mot-de-passe-correct');
    const seConnecter = new SeConnecter(
      new UtilisateurRepositoryEnMemoire([utilisateur]),
      jwt,
    );

    const resultat = await seConnecter.executer(
      'COACH@EXAMPLE.COM',
      'mot-de-passe-correct',
    );

    expect(resultat.type).toBe('ok');
  });
});
