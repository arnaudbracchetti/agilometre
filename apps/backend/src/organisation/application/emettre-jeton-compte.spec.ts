import { Role } from '@agilometre/shared';
import { CleTemplateEmail } from '../../mail/domain/cles-templates-email';
import { MailSender } from '../../mail/domain/mail-sender';
import { JetonCompte } from '../domain/jeton-compte';
import { JetonCompteRepository } from '../domain/jeton-compte.repository';
import { Utilisateur } from '../domain/utilisateur';
import { EmettreJetonCompte } from './emettre-jeton-compte';

class JetonCompteRepositoryEnMemoire implements JetonCompteRepository {
  jetons: JetonCompte[] = [];

  save(jeton: JetonCompte): Promise<void> {
    this.jetons.push(jeton);
    return Promise.resolve();
  }

  consommerSiValide(): Promise<string | null> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }
}

interface EmailEnvoye {
  cle: CleTemplateEmail;
  destinataire: string;
  variables: Record<string, string>;
}

class MailSenderEnMemoire implements MailSender {
  messages: EmailEnvoye[] = [];
  echoue = false;

  envoyer(
    cle: CleTemplateEmail,
    destinataire: string,
    variables: Record<string, string>,
  ): Promise<void> {
    if (this.echoue) {
      return Promise.reject(new Error('panne SMTP simulée'));
    }
    this.messages.push({ cle, destinataire, variables });
    return Promise.resolve();
  }
}

function creerUtilisateur(): Utilisateur {
  return Utilisateur.creer(
    'utilisateur-1',
    'ada@example.com',
    'Ada',
    'Lovelace',
    'hash',
    Role.Direction,
  ).valeur;
}

describe('EmettreJetonCompte', () => {
  it('emettrePourInvitation — sauve un Jeton de compte haché et envoie l’email de la clé compte.invitation', async () => {
    const jetons = new JetonCompteRepositoryEnMemoire();
    const mail = new MailSenderEnMemoire();
    const emettre = new EmettreJetonCompte(
      jetons,
      mail,
      'http://localhost:4200',
    );

    await emettre.emettrePourInvitation(creerUtilisateur());

    expect(jetons.jetons).toHaveLength(1);
    expect(jetons.jetons[0].utilisateurId).toBe('utilisateur-1');
    expect(mail.messages).toHaveLength(1);
    expect(mail.messages[0].cle).toBe('compte.invitation');
    expect(mail.messages[0].destinataire).toBe('ada@example.com');
    expect(mail.messages[0].variables.prenom).toBe('Ada');

    const jetonBrut = /jeton=([a-f0-9]+)/.exec(
      mail.messages[0].variables.lien,
    )?.[1];
    expect(jetonBrut).toBeDefined();
    // Le jeton en clair n'apparaît jamais dans ce qui est persisté — seul son hash l'est.
    expect(jetons.jetons[0].tokenHash).not.toBe(jetonBrut);
  });

  it('emettrePourReinitialisation — envoie l’email de la clé compte.mot-de-passe-oublie', async () => {
    const jetons = new JetonCompteRepositoryEnMemoire();
    const mail = new MailSenderEnMemoire();
    const emettre = new EmettreJetonCompte(
      jetons,
      mail,
      'http://localhost:4200',
    );

    await emettre.emettrePourReinitialisation(creerUtilisateur());

    expect(jetons.jetons).toHaveLength(1);
    expect(mail.messages).toHaveLength(1);
    expect(mail.messages[0].cle).toBe('compte.mot-de-passe-oublie');
  });

  it('ne propage pas une panne d’envoi d’email — le jeton reste émis', async () => {
    const jetons = new JetonCompteRepositoryEnMemoire();
    const mail = new MailSenderEnMemoire();
    mail.echoue = true;
    const emettre = new EmettreJetonCompte(
      jetons,
      mail,
      'http://localhost:4200',
    );

    await expect(
      emettre.emettrePourInvitation(creerUtilisateur()),
    ).resolves.toBeUndefined();
    expect(jetons.jetons).toHaveLength(1);
  });
});
