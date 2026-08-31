import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { JetonUtilisateurDto, Role, UtilisateurDto } from '@agilometre/shared';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { jetonCoachDeTest } from './support/jeton-coach';

const MAILPIT_URL = 'http://localhost:8025';

interface MessageMailpit {
  ID: string;
  To: { Address: string }[];
}

async function viderMailpit(): Promise<void> {
  await fetch(`${MAILPIT_URL}/api/v1/messages`, { method: 'DELETE' });
}

/** Récupère le corps texte du dernier email reçu par cette adresse et en extrait le Jeton de
 * compte en clair — preuve que le câblage SMTP réel (nodemailer → Mailpit) fonctionne de bout en
 * bout, pas seulement que le use case a appelé un `MailSender` fake. */
async function jetonRecuParEmail(destinataire: string): Promise<string> {
  const liste = (await (
    await fetch(`${MAILPIT_URL}/api/v1/messages`)
  ).json()) as {
    messages: MessageMailpit[];
  };
  const message = liste.messages.find((m) =>
    m.To.some((to) => to.Address === destinataire),
  );
  if (!message) throw new Error(`Aucun email reçu pour ${destinataire}`);

  const details = (await (
    await fetch(`${MAILPIT_URL}/api/v1/message/${message.ID}`)
  ).json()) as { Text: string };
  const jeton = /jeton=([a-f0-9]+)/.exec(details.Text)?.[1];
  if (!jeton) throw new Error('Aucun jeton trouvé dans le corps de l’email');
  return jeton;
}

describe('Mot de passe — invitation, réinitialisation, self-service (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jetonCoach: string;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    jetonCoach = await jetonCoachDeTest(app);

    prisma = app.get(PrismaService);
    await prisma.jetonCompte.deleteMany();
    await prisma.utilisateur.deleteMany();
    await viderMailpit();
  });

  afterEach(async () => {
    await prisma.jetonCompte.deleteMany();
    await prisma.utilisateur.deleteMany();
    await app.close();
  });

  async function creerCompte(
    email: string,
    role: Role = Role.Membre,
  ): Promise<UtilisateurDto> {
    const creation = await request(app.getHttpServer())
      .post('/api/comptes')
      .set('Authorization', `Bearer ${jetonCoach}`)
      .send({ email, prenom: 'Ada', nom: 'Lovelace', role })
      .expect(201);
    return creation.body as UtilisateurDto;
  }

  it('invitation → définir le mot de passe → se connecter', async () => {
    await creerCompte('ada@example.com');
    const jeton = await jetonRecuParEmail('ada@example.com');

    await request(app.getHttpServer())
      .post('/api/mot-de-passe/definir')
      .send({ jeton, motDePasse: 'mot-de-passe-solide' })
      .expect(201);

    const connexion = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'ada@example.com', motDePasse: 'mot-de-passe-solide' })
      .expect(201);
    expect((connexion.body as JetonUtilisateurDto).jeton).toEqual(
      expect.any(String),
    );
  });

  it('un jeton déjà consommé est refusé une seconde fois (410)', async () => {
    await creerCompte('ada@example.com');
    const jeton = await jetonRecuParEmail('ada@example.com');

    await request(app.getHttpServer())
      .post('/api/mot-de-passe/definir')
      .send({ jeton, motDePasse: 'mot-de-passe-solide' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/mot-de-passe/definir')
      .send({ jeton, motDePasse: 'autre-mot-de-passe' })
      .expect(410);
  });

  it('un jeton expiré est refusé (410)', async () => {
    await creerCompte('ada@example.com');
    const jeton = await jetonRecuParEmail('ada@example.com');

    await prisma.jetonCompte.updateMany({
      data: { expireLe: new Date(Date.now() - 1000) },
    });

    await request(app.getHttpServer())
      .post('/api/mot-de-passe/definir')
      .send({ jeton, motDePasse: 'mot-de-passe-solide' })
      .expect(410);
  });

  it('un mot de passe trop court est refusé (400) sans consommer le jeton', async () => {
    await creerCompte('ada@example.com');
    const jeton = await jetonRecuParEmail('ada@example.com');

    await request(app.getHttpServer())
      .post('/api/mot-de-passe/definir')
      .send({ jeton, motDePasse: 'court' })
      .expect(400);

    // Le jeton reste utilisable ensuite — la tentative précédente ne l'a pas consommé.
    await request(app.getHttpServer())
      .post('/api/mot-de-passe/definir')
      .send({ jeton, motDePasse: 'mot-de-passe-solide' })
      .expect(201);
  });

  it('« mot de passe oublié » répond identiquement pour un email connu et un email inconnu', async () => {
    await creerCompte('ada@example.com');

    const connu = await request(app.getHttpServer())
      .post('/api/mot-de-passe/oubli')
      .send({ email: 'ada@example.com' });
    const inconnu = await request(app.getHttpServer())
      .post('/api/mot-de-passe/oubli')
      .send({ email: 'inconnu@example.com' });

    expect(connu.status).toBe(inconnu.status);
    expect(connu.body).toEqual(inconnu.body);
  });

  it('« mot de passe oublié » fonctionne pour un compte désactivé', async () => {
    const compte = await creerCompte('ada@example.com');
    await request(app.getHttpServer())
      .post(`/api/comptes/${compte.id}/desactiver`)
      .set('Authorization', `Bearer ${jetonCoach}`)
      .expect(201);
    await viderMailpit();

    await request(app.getHttpServer())
      .post('/api/mot-de-passe/oubli')
      .send({ email: 'ada@example.com' })
      .expect(201);

    const jeton = await jetonRecuParEmail('ada@example.com');
    await request(app.getHttpServer())
      .post('/api/mot-de-passe/definir')
      .send({ jeton, motDePasse: 'mot-de-passe-solide' })
      .expect(201);
  });

  it('ChangerMotDePasse — self-service, refuse un mauvais mot de passe actuel', async () => {
    await creerCompte('ada@example.com', Role.Direction);
    const jetonCompte = await jetonRecuParEmail('ada@example.com');
    await request(app.getHttpServer())
      .post('/api/mot-de-passe/definir')
      .send({ jeton: jetonCompte, motDePasse: 'mot-de-passe-initial' })
      .expect(201);
    const connexion = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'ada@example.com', motDePasse: 'mot-de-passe-initial' })
      .expect(201);
    const jetonSession = (connexion.body as JetonUtilisateurDto).jeton;

    await request(app.getHttpServer())
      .post('/api/mot-de-passe/changer')
      .set('Authorization', `Bearer ${jetonSession}`)
      .send({
        motDePasseActuel: 'mauvais-mot-de-passe',
        nouveauMotDePasse: 'nouveau-mot-de-passe',
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/mot-de-passe/changer')
      .set('Authorization', `Bearer ${jetonSession}`)
      .send({
        motDePasseActuel: 'mot-de-passe-initial',
        nouveauMotDePasse: 'nouveau-mot-de-passe',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'ada@example.com', motDePasse: 'nouveau-mot-de-passe' })
      .expect(201);
  });

  it('GET /api/mon-compte renvoie les informations du compte connecté', async () => {
    const compte = await creerCompte('ada@example.com', Role.Direction);
    const jetonCompte = await jetonRecuParEmail('ada@example.com');
    await request(app.getHttpServer())
      .post('/api/mot-de-passe/definir')
      .send({ jeton: jetonCompte, motDePasse: 'mot-de-passe-solide' })
      .expect(201);
    const connexion = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'ada@example.com', motDePasse: 'mot-de-passe-solide' })
      .expect(201);
    const jetonSession = (connexion.body as JetonUtilisateurDto).jeton;

    const reponse = await request(app.getHttpServer())
      .get('/api/mon-compte')
      .set('Authorization', `Bearer ${jetonSession}`)
      .expect(200);

    expect(reponse.body).toMatchObject({
      id: compte.id,
      email: 'ada@example.com',
      prenom: 'Ada',
      nom: 'Lovelace',
      role: Role.Direction,
      actif: true,
    });
  });
});
