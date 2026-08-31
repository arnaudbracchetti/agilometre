import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { EntiteDto, Role, UtilisateurDto } from '@agilometre/shared';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { jetonCoachDeTest } from './support/jeton-coach';

/**
 * `@Perimetre('entite')` + `PerimetreUtilisateur.peutVoirEntite` pour Direction (#61) — le test
 * matriciel (droits.e2e-spec.ts) ne couvre que la carte statique de capacités, jamais le
 * comportement par ressource (docs/design/agregat-politique-des-droits.md §4).
 */
describe('Périmètre Direction sur le profil d’une Entité (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jwt: JwtService;
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
    jwt = app.get(JwtService);

    prisma = app.get(PrismaService);
    await nettoyer();
  });

  afterEach(async () => {
    await nettoyer();
    await app.close();
  });

  async function nettoyer(): Promise<void> {
    await prisma.habilitation.deleteMany();
    await prisma.jetonCompte.deleteMany();
    await prisma.utilisateur.deleteMany();
    await prisma.equipe.deleteMany();
    await prisma.entite.deleteMany();
  }

  async function creerEntite(nom: string): Promise<EntiteDto> {
    const reponse = await request(app.getHttpServer())
      .post('/api/organisation/entites')
      .set('Authorization', `Bearer ${jetonCoach}`)
      .send({ nom })
      .expect(201);
    return reponse.body as EntiteDto;
  }

  async function creerDirection(): Promise<UtilisateurDto> {
    const reponse = await request(app.getHttpServer())
      .post('/api/comptes')
      .set('Authorization', `Bearer ${jetonCoach}`)
      .send({
        email: 'direction@example.com',
        prenom: 'Ada',
        nom: 'Lovelace',
        role: Role.Direction,
      })
      .expect(201);
    return reponse.body as UtilisateurDto;
  }

  async function habiliter(
    utilisateurId: string,
    entiteId: string,
  ): Promise<void> {
    await request(app.getHttpServer())
      .post(`/api/comptes/${utilisateurId}/habilitations`)
      .set('Authorization', `Bearer ${jetonCoach}`)
      .send({ entiteId })
      .expect(201);
  }

  function jetonDirectionPour(utilisateurId: string): Promise<string> {
    return jwt.signAsync({
      sub: utilisateurId,
      email: 'direction@example.com',
      role: Role.Direction,
    });
  }

  it('laisse une Direction voir le profil d’une Entité sur laquelle elle est habilitée', async () => {
    const entite = await creerEntite('Vente');
    const direction = await creerDirection();
    await habiliter(direction.id, entite.id);
    const jetonDirection = await jetonDirectionPour(direction.id);

    await request(app.getHttpServer())
      .get(`/api/organisation/entites/${entite.id}/profil`)
      .set('Authorization', `Bearer ${jetonDirection}`)
      .expect(200);
  });

  it('refuse en 403 le profil d’une Entité sur laquelle la Direction n’est pas habilitée', async () => {
    const entiteHabilitee = await creerEntite('Vente');
    const autreEntite = await creerEntite('Développement industriel');
    const direction = await creerDirection();
    await habiliter(direction.id, entiteHabilitee.id);
    const jetonDirection = await jetonDirectionPour(direction.id);

    await request(app.getHttpServer())
      .get(`/api/organisation/entites/${autreEntite.id}/profil`)
      .set('Authorization', `Bearer ${jetonDirection}`)
      .expect(403);
  });

  it('retire l’accès dès que l’Habilitation est retirée', async () => {
    const entite = await creerEntite('Vente');
    const direction = await creerDirection();
    await habiliter(direction.id, entite.id);
    const jetonDirection = await jetonDirectionPour(direction.id);
    await request(app.getHttpServer())
      .get(`/api/organisation/entites/${entite.id}/profil`)
      .set('Authorization', `Bearer ${jetonDirection}`)
      .expect(200);

    const reponseComptes = await request(app.getHttpServer())
      .get('/api/comptes')
      .set('Authorization', `Bearer ${jetonCoach}`)
      .expect(200);
    const comptes = reponseComptes.body as UtilisateurDto[];
    const compteAJour = comptes.find((c) => c.id === direction.id)!;
    const habilitationId = compteAJour.habilitations[0].id;
    await request(app.getHttpServer())
      .delete(`/api/comptes/${direction.id}/habilitations/${habilitationId}`)
      .set('Authorization', `Bearer ${jetonCoach}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/organisation/entites/${entite.id}/profil`)
      .set('Authorization', `Bearer ${jetonDirection}`)
      .expect(403);
  });
});

/**
 * Nettoyage transactionnel des Habilitations orphelines (ADR-0006) — vérifié au niveau
 * infrastructure (`PrismaEntiteRepository`/`PrismaEquipeRepository.remove`), pas au niveau des
 * use cases `SupprimerEntite`/`SupprimerEquipe` : ceux-ci ne connaissent plus `UtilisateurRepository`,
 * la transaction Postgres unique (delete + `habilitation.deleteMany`) vit entièrement dans le repository.
 */
describe('Suppression d’Entité/Équipe — nettoyage des Habilitations orphelines (ADR-0006)', () => {
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
    await nettoyer();
  });

  afterEach(async () => {
    await nettoyer();
    await app.close();
  });

  async function nettoyer(): Promise<void> {
    await prisma.habilitation.deleteMany();
    await prisma.jetonCompte.deleteMany();
    await prisma.utilisateur.deleteMany();
    await prisma.equipe.deleteMany();
    await prisma.entite.deleteMany();
  }

  it('supprimer une Entité retire, dans la même opération, l’Habilitation qui la référence', async () => {
    const entite = (
      await request(app.getHttpServer())
        .post('/api/organisation/entites')
        .set('Authorization', `Bearer ${jetonCoach}`)
        .send({ nom: 'Vente' })
        .expect(201)
    ).body as EntiteDto;
    const direction = (
      await request(app.getHttpServer())
        .post('/api/comptes')
        .set('Authorization', `Bearer ${jetonCoach}`)
        .send({
          email: 'direction@example.com',
          prenom: 'Ada',
          nom: 'Lovelace',
          role: Role.Direction,
        })
        .expect(201)
    ).body as UtilisateurDto;
    await request(app.getHttpServer())
      .post(`/api/comptes/${direction.id}/habilitations`)
      .set('Authorization', `Bearer ${jetonCoach}`)
      .send({ entiteId: entite.id })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/api/organisation/entites/${entite.id}`)
      .set('Authorization', `Bearer ${jetonCoach}`)
      .expect(200);

    const habilitations = await prisma.habilitation.findMany({
      where: { utilisateurId: direction.id },
    });
    expect(habilitations).toHaveLength(0);
  });

  it('refuse la suppression d’une Entité encore rattachée à une Équipe, sans toucher l’Habilitation', async () => {
    const entite = (
      await request(app.getHttpServer())
        .post('/api/organisation/entites')
        .set('Authorization', `Bearer ${jetonCoach}`)
        .send({ nom: 'Vente' })
        .expect(201)
    ).body as EntiteDto;
    await request(app.getHttpServer())
      .post('/api/organisation/equipes')
      .set('Authorization', `Bearer ${jetonCoach}`)
      .send({ nom: 'Alpha', entiteId: entite.id })
      .expect(201);
    const direction = (
      await request(app.getHttpServer())
        .post('/api/comptes')
        .set('Authorization', `Bearer ${jetonCoach}`)
        .send({
          email: 'direction@example.com',
          prenom: 'Ada',
          nom: 'Lovelace',
          role: Role.Direction,
        })
        .expect(201)
    ).body as UtilisateurDto;
    await request(app.getHttpServer())
      .post(`/api/comptes/${direction.id}/habilitations`)
      .set('Authorization', `Bearer ${jetonCoach}`)
      .send({ entiteId: entite.id })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/api/organisation/entites/${entite.id}`)
      .set('Authorization', `Bearer ${jetonCoach}`)
      .expect(409);

    const habilitations = await prisma.habilitation.findMany({
      where: { utilisateurId: direction.id },
    });
    expect(habilitations).toHaveLength(1);
  });
});
