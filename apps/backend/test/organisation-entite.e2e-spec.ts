import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { EntiteDto } from '@agilometre/shared';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Organisation — Entité (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

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

    prisma = app.get(PrismaService);
    await prisma.entite.deleteMany();
  });

  afterEach(async () => {
    await prisma.entite.deleteMany();
    await app.close();
  });

  it('POST /api/organisation/entites — crée puis GET la retrouve', async () => {
    const creation = await request(app.getHttpServer())
      .post('/api/organisation/entites')
      .send({ nom: 'Direction Numérique' })
      .expect(201);
    const entiteCreee = creation.body as EntiteDto;

    expect(entiteCreee).toMatchObject({ nom: 'Direction Numérique' });
    expect(entiteCreee.id).toEqual(expect.any(String));

    const liste = await request(app.getHttpServer())
      .get('/api/organisation/entites')
      .expect(200);

    expect(liste.body).toEqual([
      { id: entiteCreee.id, nom: 'Direction Numérique' },
    ]);
  });

  it('POST /api/organisation/entites — 400 pour un nom vide', () => {
    return request(app.getHttpServer())
      .post('/api/organisation/entites')
      .send({ nom: '' })
      .expect(400);
  });

  it('PATCH /api/organisation/entites/:id — renomme puis GET recharge le nouveau nom', async () => {
    const creation = await request(app.getHttpServer())
      .post('/api/organisation/entites')
      .send({ nom: 'DSI' })
      .expect(201);
    const entiteCreee = creation.body as EntiteDto;

    await request(app.getHttpServer())
      .patch(`/api/organisation/entites/${entiteCreee.id}`)
      .send({ nom: 'Direction des Systèmes d’Information' })
      .expect(200);

    const liste = await request(app.getHttpServer())
      .get('/api/organisation/entites')
      .expect(200);

    expect(liste.body).toEqual([
      { id: entiteCreee.id, nom: 'Direction des Systèmes d’Information' },
    ]);
  });

  it('PATCH /api/organisation/entites/:id — 404 pour un id inconnu', () => {
    return request(app.getHttpServer())
      .patch('/api/organisation/entites/inconnu')
      .send({ nom: 'X' })
      .expect(404);
  });

  it('POST /api/organisation/entites — 409 si le nom existe déjà (insensible à la casse)', async () => {
    await request(app.getHttpServer())
      .post('/api/organisation/entites')
      .send({ nom: 'DSI' })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/organisation/entites')
      .send({ nom: 'dsi' })
      .expect(409);

    const liste = await request(app.getHttpServer())
      .get('/api/organisation/entites')
      .expect(200);
    expect(liste.body).toHaveLength(1);
  });

  it('PATCH /api/organisation/entites/:id — 409 si une autre Entité porte déjà ce nom', async () => {
    await request(app.getHttpServer())
      .post('/api/organisation/entites')
      .send({ nom: 'DSI' })
      .expect(201);
    const marketing = await request(app.getHttpServer())
      .post('/api/organisation/entites')
      .send({ nom: 'Marketing' })
      .expect(201);
    const entiteMarketing = marketing.body as EntiteDto;

    await request(app.getHttpServer())
      .patch(`/api/organisation/entites/${entiteMarketing.id}`)
      .send({ nom: 'dsi' })
      .expect(409);
  });

  it('PATCH /api/organisation/entites/:id — autorise à garder son propre nom (à la casse près)', async () => {
    const creation = await request(app.getHttpServer())
      .post('/api/organisation/entites')
      .send({ nom: 'DSI' })
      .expect(201);
    const entiteCreee = creation.body as EntiteDto;

    await request(app.getHttpServer())
      .patch(`/api/organisation/entites/${entiteCreee.id}`)
      .send({ nom: 'dsi' })
      .expect(200);
  });

  it('POST /api/organisation/entites — une seule des deux créations concurrentes de même nom réussit', async () => {
    const [premiere, seconde] = await Promise.all([
      request(app.getHttpServer())
        .post('/api/organisation/entites')
        .send({ nom: 'Concurrence' }),
      request(app.getHttpServer())
        .post('/api/organisation/entites')
        .send({ nom: 'Concurrence' }),
    ]);

    const statuts = [premiere.status, seconde.status].sort();
    expect(statuts).toEqual([201, 409]);

    const liste = await request(app.getHttpServer())
      .get('/api/organisation/entites')
      .expect(200);
    expect(liste.body).toHaveLength(1);
  });
});
