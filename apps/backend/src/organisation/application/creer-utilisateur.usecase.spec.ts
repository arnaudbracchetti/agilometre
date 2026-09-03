import * as argon2 from 'argon2';
import { Role } from '@agilometre/shared';
import { CleTemplateEmail } from '../../mail/domain/cles-templates-email';
import { MailSender } from '../../mail/domain/mail-sender';
import { JetonCompte } from '../domain/jeton-compte';
import { JetonCompteRepository } from '../domain/jeton-compte.repository';
import { Utilisateur } from '../domain/utilisateur';
import { UtilisateurRepository } from '../domain/utilisateur.repository';
import { Equipe } from '../domain/equipe';
import { EquipeRepository } from '../domain/equipe.repository';
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

  sauvegarderEtPropager(): Promise<void> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }
}

class EquipeRepositoryFake implements EquipeRepository {
  equipes: Equipe[] = [];

  findById(id: string): Promise<Equipe | null> {
    return Promise.resolve(this.equipes.find((e) => e.id === id) ?? null);
  }

  findByEntiteId(): Promise<Equipe[]> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }

  trouverParNom(): Promise<Equipe | null> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }

  save(equipe: Equipe): Promise<void> {
    const index = this.equipes.findIndex((e) => e.id === equipe.id);
    if (index !== -1) this.equipes[index] = equipe;
    return Promise.resolve();
  }

  remove(): Promise<void> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }

  compterParEntite(): Promise<number> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }

  trouverParEmailMembre(email: string): Promise<Equipe[]> {
    const recherche = email.toLowerCase();
    return Promise.resolve(
      this.equipes.filter((equipe) =>
        equipe.membres.some((m) => m.email.toLowerCase() === recherche),
      ),
    );
  }

  estMembreDe(): Promise<boolean> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }

  aUneEquipeDansLEntite(): Promise<boolean> {
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

interface EmailEnvoye {
  cle: CleTemplateEmail;
  destinataire: string;
  variables: Record<string, string>;
}

class MailSenderFake implements MailSender {
  messages: EmailEnvoye[] = [];

  envoyer(
    cle: CleTemplateEmail,
    destinataire: string,
    variables: Record<string, string>,
  ): Promise<void> {
    this.messages.push({ cle, destinataire, variables });
    return Promise.resolve();
  }
}

function creerUseCase() {
  const utilisateurs = new UtilisateurRepositoryFake();
  const equipes = new EquipeRepositoryFake();
  const jetons = new JetonCompteRepositoryFake();
  const mail = new MailSenderFake();
  const emettreJetonCompte = new EmettreJetonCompte(
    jetons,
    mail,
    'http://localhost:4200',
  );
  return {
    useCase: new CreerUtilisateur(utilisateurs, equipes, emettreJetonCompte),
    utilisateurs,
    equipes,
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

  it('lie le compte créé aux Membres de même email dans deux Équipes différentes', async () => {
    const { useCase, equipes } = creerUseCase();
    const equipeA = Equipe.creer('eq1', 'Alpha', 'e1').valeur;
    equipeA.ajouterMembre('m1', 'Jean D.', null, 'jean@example.com');
    const equipeB = Equipe.creer('eq2', 'Beta', 'e1').valeur;
    equipeB.ajouterMembre('m2', 'J. Dupont', null, 'jean@example.com');
    equipes.equipes.push(equipeA, equipeB);

    const resultat = await useCase.executer(
      'jean@example.com',
      'Jean',
      'Dupont',
      Role.Membre,
    );

    expect(resultat.type).toBe('cree');
    if (resultat.type !== 'cree') throw new Error('unreachable');
    const idCompte = resultat.utilisateur.id;
    expect(equipeA.membres[0].utilisateurId).toBe(idCompte);
    expect(equipeA.membres[0].nom).toBe('Dupont');
    expect(equipeB.membres[0].utilisateurId).toBe(idCompte);
    expect(equipeB.membres[0].nom).toBe('Dupont');
  });

  it('ne lie aucun Membre pour un compte Coach ou Direction', async () => {
    const { useCase, equipes } = creerUseCase();
    const equipe = Equipe.creer('eq1', 'Alpha', 'e1').valeur;
    equipe.ajouterMembre('m1', 'Jean D.', null, 'jean@example.com');
    equipes.equipes.push(equipe);

    const resultat = await useCase.executer(
      'jean@example.com',
      'Jean',
      'Dupont',
      Role.Coach,
    );

    expect(resultat.type).toBe('cree');
    expect(equipe.membres[0].utilisateurId).toBeNull();
  });
});
