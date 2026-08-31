import { Role } from '@agilometre/shared';
import { MailSender, MessageEmail } from '../../mail/mail-sender';
import { JetonCompte } from '../domain/jeton-compte';
import { JetonCompteRepository } from '../domain/jeton-compte.repository';
import { Utilisateur } from '../domain/utilisateur';
import { UtilisateurRepository } from '../domain/utilisateur.repository';
import { DemanderReinitialisation } from './demander-reinitialisation.usecase';
import { EmettreJetonCompte } from './emettre-jeton-compte';

class UtilisateurRepositoryFake implements UtilisateurRepository {
  constructor(private readonly utilisateurs: Utilisateur[]) {}

  trouverParEmail(email: string): Promise<Utilisateur | null> {
    const recherche = email.toLowerCase();
    return Promise.resolve(
      this.utilisateurs.find((u) => u.email.toLowerCase() === recherche) ??
        null,
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

class JetonCompteRepositoryFake implements JetonCompteRepository {
  jetons: JetonCompte[] = [];

  save(jeton: JetonCompte): Promise<void> {
    this.jetons.push(jeton);
    return Promise.resolve();
  }

  consommerSiValide(): Promise<string | null> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }
}

class MailSenderFake implements MailSender {
  messages: MessageEmail[] = [];

  envoyer(message: MessageEmail): Promise<void> {
    this.messages.push(message);
    return Promise.resolve();
  }
}

describe('DemanderReinitialisation', () => {
  it('émet un Jeton de compte et envoie un email pour un compte actif connu', async () => {
    const utilisateur = Utilisateur.creer(
      'id-1',
      'ada@example.com',
      'Ada',
      'Lovelace',
      'hash',
      Role.Coach,
    ).valeur;
    const jetons = new JetonCompteRepositoryFake();
    const mail = new MailSenderFake();
    const useCase = new DemanderReinitialisation(
      new UtilisateurRepositoryFake([utilisateur]),
      new EmettreJetonCompte(jetons, mail, 'http://localhost:4200'),
    );

    const resultat = await useCase.executer('ada@example.com');

    expect(resultat).toEqual({ type: 'ok' });
    expect(jetons.jetons).toHaveLength(1);
    expect(mail.messages).toHaveLength(1);
  });

  it('fonctionne aussi pour un compte désactivé (jamais activé), même réponse', async () => {
    const utilisateur = Utilisateur.reconstituer(
      'id-1',
      'ada@example.com',
      'Ada',
      'Lovelace',
      'hash',
      false,
      Role.Membre,
    );
    const jetons = new JetonCompteRepositoryFake();
    const mail = new MailSenderFake();
    const useCase = new DemanderReinitialisation(
      new UtilisateurRepositoryFake([utilisateur]),
      new EmettreJetonCompte(jetons, mail, 'http://localhost:4200'),
    );

    const resultat = await useCase.executer('ada@example.com');

    expect(resultat).toEqual({ type: 'ok' });
    expect(jetons.jetons).toHaveLength(1);
  });

  it('renvoie la même réponse pour un email inconnu, sans émettre de jeton ni d’email', async () => {
    const jetons = new JetonCompteRepositoryFake();
    const mail = new MailSenderFake();
    const useCase = new DemanderReinitialisation(
      new UtilisateurRepositoryFake([]),
      new EmettreJetonCompte(jetons, mail, 'http://localhost:4200'),
    );

    const resultat = await useCase.executer('inconnu@example.com');

    expect(resultat).toEqual({ type: 'ok' });
    expect(jetons.jetons).toHaveLength(0);
    expect(mail.messages).toHaveLength(0);
  });
});
