import * as argon2 from 'argon2';
import { Role } from '@agilometre/shared';
import { MailSender, MessageEmail } from '../../mail/mail-sender';
import { JetonCompte } from '../domain/jeton-compte';
import { JetonCompteRepository } from '../domain/jeton-compte.repository';
import { Utilisateur } from '../domain/utilisateur';
import { UtilisateurRepository } from '../domain/utilisateur.repository';
import { CreerUtilisateur } from './creer-utilisateur.usecase';
import { EmettreJetonCompte } from './emettre-jeton-compte';

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

function creerUseCase() {
  const utilisateurs = new UtilisateurRepositoryFake();
  const jetons = new JetonCompteRepositoryFake();
  const mail = new MailSenderFake();
  const emettreJetonCompte = new EmettreJetonCompte(
    jetons,
    mail,
    'http://localhost:4200',
  );
  return {
    useCase: new CreerUtilisateur(utilisateurs, emettreJetonCompte),
    utilisateurs,
    jetons,
    mail,
  };
}

describe('CreerUtilisateur', () => {
  it('crée un compte Direction actif avec un mot de passe provisoire, et envoie une invitation', async () => {
    const { useCase, utilisateurs, mail } = creerUseCase();

    const resultat = await useCase.executer(
      'direction@example.com',
      'Simone',
      'Weil',
      Role.Direction,
    );

    expect(resultat.type).toBe('cree');
    if (resultat.type !== 'cree') throw new Error('unreachable');
    expect(resultat.utilisateur.role).toBe(Role.Direction);
    expect(resultat.utilisateur.actif).toBe(true);
    expect(utilisateurs.utilisateurs).toHaveLength(1);
    expect(mail.messages).toHaveLength(1);
    expect(mail.messages[0].destinataire).toBe('direction@example.com');
  });

  it('génère un mot de passe provisoire jamais devinable, distinct pour chaque compte', async () => {
    const { useCase } = creerUseCase();

    const r1 = await useCase.executer('a@example.com', 'A', 'A', Role.Membre);
    const r2 = await useCase.executer('b@example.com', 'B', 'B', Role.Membre);
    if (r1.type !== 'cree' || r2.type !== 'cree')
      throw new Error('unreachable');

    expect(r1.utilisateur.motDePasseHash).not.toBe(
      r2.utilisateur.motDePasseHash,
    );
    // Aucun mot de passe candidat trivial (vide, nom, email...) ne doit correspondre au hash.
    for (const candidat of ['', 'a@example.com', 'motdepasse', 'A']) {
      expect(await argon2.verify(r1.utilisateur.motDePasseHash, candidat)).toBe(
        false,
      );
    }
  });

  it('refuse la création d’un compte Manager d’équipe', async () => {
    const { useCase, utilisateurs, mail } = creerUseCase();

    const resultat = await useCase.executer(
      'manager@example.com',
      'Max',
      'Weber',
      Role.Manager,
    );

    expect(resultat).toEqual({ type: 'role_non_creable' });
    expect(utilisateurs.utilisateurs).toHaveLength(0);
    expect(mail.messages).toHaveLength(0);
  });

  it('échoue si un compte existe déjà avec cet email (insensible à la casse)', async () => {
    const { useCase, utilisateurs, mail } = creerUseCase();
    await useCase.executer('coach@example.com', 'Ada', 'Lovelace', Role.Coach);

    const resultat = await useCase.executer(
      'COACH@EXAMPLE.COM',
      'Autre',
      'Personne',
      Role.Coach,
    );

    expect(resultat).toEqual({ type: 'email_deja_utilise' });
    expect(utilisateurs.utilisateurs).toHaveLength(1);
    expect(mail.messages).toHaveLength(1);
  });

  it('échoue avec une erreur de validation pour un email invalide, sans envoyer d’email', async () => {
    const { useCase, mail } = creerUseCase();

    const resultat = await useCase.executer(
      'pas-un-email',
      'Ada',
      'Lovelace',
      Role.Coach,
    );

    expect(resultat.type).toBe('invalide');
    expect(mail.messages).toHaveLength(0);
  });
});
