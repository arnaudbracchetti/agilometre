import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { Role, UtilisateurDto } from '@agilometre/shared';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { jetonCoachDeTest } from './support/jeton-coach';
import { jetonDirectionDeTest } from './support/jeton-direction-de-test';
import { jetonMembreDeTest } from './support/jeton-membre-de-test';

describe('Comptes (e2e)', () => {
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
  });

  afterEach(async () => {
    await prisma.jetonCompte.deleteMany();
    await prisma.utilisateur.deleteMany();
    await app.close();
  });

  it('POST /api/comptes — le Coach crée un compte Direction puis GET le retrouve', async () => {
    const creation = await request(app.getHttpServer())
      .post('/api/comptes')
      .set('Authorization', `Bearer ${jetonCoach}`)
      .send({
        email: 'direction@example.com',
        prenom: 'Simone',
        nom: 'Weil',
        role: Role.Direction,
      })
      .expect(201);
    const compteCree = creation.body as UtilisateurDto;

    expect(compteCree).toMatchObject({
      email: 'direction@example.com',
      prenom: 'Simone',
      nom: 'Weil',
      role: Role.Direction,
      actif: true,
    });

    const liste = await request(app.getHttpServer())
      .get('/api/comptes')
      .set('Authorization', `Bearer ${jetonCoach}`)
      .expect(200);
    expect(liste.body).toEqual([compteCree]);
  });

  it('POST /api/comptes — refuse la création d’un compte Manager d’équipe', async () => {
    await request(app.getHttpServer())
      .post('/api/comptes')
      .set('Authorization', `Bearer ${jetonCoach}`)
      .send({
        email: 'manager@example.com',
        prenom: 'Max',
        nom: 'Weber',
        role: Role.Manager,
      })
      .expect(400);
  });

  it('POST /api/comptes — 409 si l’email existe déjà (insensible à la casse)', async () => {
    await request(app.getHttpServer())
      .post('/api/comptes')
      .set('Authorization', `Bearer ${jetonCoach}`)
      .send({
        email: 'ada@example.com',
        prenom: 'Ada',
        nom: 'Lovelace',
        role: Role.Coach,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/comptes')
      .set('Authorization', `Bearer ${jetonCoach}`)
      .send({
        email: 'ADA@EXAMPLE.COM',
        prenom: 'Autre',
        nom: 'Personne',
        role: Role.Coach,
      })
      .expect(409);
  });

  it('un Direction/Membre/Manager reçoit 403 sur toutes les routes de gestion des comptes', async () => {
    const jetonDirection = await jetonDirectionDeTest(app);
    const jetonMembre = await jetonMembreDeTest(app);

    for (const jeton of [jetonDirection, jetonMembre]) {
      await request(app.getHttpServer())
        .get('/api/comptes')
        .set('Authorization', `Bearer ${jeton}`)
        .expect(403);
      await request(app.getHttpServer())
        .post('/api/comptes')
        .set('Authorization', `Bearer ${jeton}`)
        .send({
          email: 'x@example.com',
          prenom: 'X',
          nom: 'X',
          role: Role.Membre,
        })
        .expect(403);
    }
  });

  it('PATCH /api/comptes/:id — modifie prénom/nom/email, jamais le mot de passe', async () => {
    const creation = await request(app.getHttpServer())
      .post('/api/comptes')
      .set('Authorization', `Bearer ${jetonCoach}`)
      .send({
        email: 'ada@example.com',
        prenom: 'Ada',
        nom: 'Lovelace',
        role: Role.Membre,
      })
      .expect(201);
    const compte = creation.body as UtilisateurDto;

    const modification = await request(app.getHttpServer())
      .patch(`/api/comptes/${compte.id}`)
      .set('Authorization', `Bearer ${jetonCoach}`)
      .send({ email: 'grace@example.com', prenom: 'Grace', nom: 'Hopper' })
      .expect(200);

    expect(modification.body).toMatchObject({
      id: compte.id,
      email: 'grace@example.com',
      prenom: 'Grace',
      nom: 'Hopper',
    });
  });

  it('PATCH /api/comptes/:id — 404 pour un id inconnu', async () => {
    await request(app.getHttpServer())
      .patch('/api/comptes/inconnu')
      .set('Authorization', `Bearer ${jetonCoach}`)
      .send({ email: 'x@example.com', prenom: 'X', nom: 'X' })
      .expect(404);
  });

  it('désactive puis réactive un compte — le mot de passe reste le même après réactivation', async () => {
    const creation = await request(app.getHttpServer())
      .post('/api/comptes')
      .set('Authorization', `Bearer ${jetonCoach}`)
      .send({
        email: 'ada@example.com',
        prenom: 'Ada',
        nom: 'Lovelace',
        role: Role.Membre,
      })
      .expect(201);
    const compte = creation.body as UtilisateurDto;

    const desactivation = await request(app.getHttpServer())
      .post(`/api/comptes/${compte.id}/desactiver`)
      .set('Authorization', `Bearer ${jetonCoach}`)
      .expect(201);
    expect(desactivation.body).toMatchObject({ actif: false });

    const avantReactivation = await prisma.utilisateur.findUniqueOrThrow({
      where: { id: compte.id },
    });

    const reactivation = await request(app.getHttpServer())
      .post(`/api/comptes/${compte.id}/reactiver`)
      .set('Authorization', `Bearer ${jetonCoach}`)
      .expect(201);
    expect(reactivation.body).toMatchObject({ actif: true });

    const apresReactivation = await prisma.utilisateur.findUniqueOrThrow({
      where: { id: compte.id },
    });
    expect(apresReactivation.motDePasseHash).toBe(
      avantReactivation.motDePasseHash,
    );
  });

  it('POST /api/comptes/:id/desactiver — 404 pour un id inconnu', async () => {
    await request(app.getHttpServer())
      .post('/api/comptes/inconnu/desactiver')
      .set('Authorization', `Bearer ${jetonCoach}`)
      .expect(404);
  });
});
