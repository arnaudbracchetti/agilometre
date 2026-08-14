import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { EntiteDto, EquipeDto } from '@agilometre/shared';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Organisation — Équipe (e2e)', () => {
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
    await prisma.equipe.deleteMany();
    await prisma.entite.deleteMany();
  });

  afterEach(async () => {
    await prisma.equipe.deleteMany();
    await prisma.entite.deleteMany();
    await app.close();
  });

  async function creerEntite(nom: string): Promise<EntiteDto> {
    const reponse = await request(app.getHttpServer())
      .post('/api/organisation/entites')
      .send({ nom })
      .expect(201);
    return reponse.body as EntiteDto;
  }

  it('POST /api/organisation/equipes — crée une Équipe rattachée à une Entité, puis GET la retrouve', async () => {
    const entite = await creerEntite('DSI');

    const creation = await request(app.getHttpServer())
      .post('/api/organisation/equipes')
      .send({ nom: 'Équipe Alpha', entiteId: entite.id })
      .expect(201);
    const equipeCreee = creation.body as EquipeDto;

    expect(equipeCreee).toMatchObject({
      nom: 'Équipe Alpha',
      entiteId: entite.id,
      membres: [],
    });

    const liste = await request(app.getHttpServer())
      .get(`/api/organisation/entites/${entite.id}/equipes`)
      .expect(200);

    expect(liste.body).toEqual([equipeCreee]);
  });

  it('POST /api/organisation/equipes — 404 si l’Entité est inconnue', () => {
    return request(app.getHttpServer())
      .post('/api/organisation/equipes')
      .send({ nom: 'Équipe Alpha', entiteId: 'inconnue' })
      .expect(404);
  });

  it('POST /api/organisation/equipes — 400 pour un nom vide', async () => {
    const entite = await creerEntite('DSI');

    return request(app.getHttpServer())
      .post('/api/organisation/equipes')
      .send({ nom: '', entiteId: entite.id })
      .expect(400);
  });

  it('POST /api/organisation/equipes — 409 si le nom existe déjà, même dans une autre Entité', async () => {
    const dsi = await creerEntite('DSI');
    const marketing = await creerEntite('Marketing');
    await request(app.getHttpServer())
      .post('/api/organisation/equipes')
      .send({ nom: 'Alpha', entiteId: dsi.id })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/organisation/equipes')
      .send({ nom: 'alpha', entiteId: marketing.id })
      .expect(409);
  });

  it('PATCH /api/organisation/equipes/:id — renomme l’Équipe', async () => {
    const entite = await creerEntite('DSI');
    const creation = await request(app.getHttpServer())
      .post('/api/organisation/equipes')
      .send({ nom: 'Alpha', entiteId: entite.id })
      .expect(201);
    const equipe = creation.body as EquipeDto;

    await request(app.getHttpServer())
      .patch(`/api/organisation/equipes/${equipe.id}`)
      .send({ nom: 'Beta' })
      .expect(200);

    const liste = await request(app.getHttpServer())
      .get(`/api/organisation/entites/${entite.id}/equipes`)
      .expect(200);
    expect((liste.body as EquipeDto[])[0].nom).toBe('Beta');
  });

  it('PATCH /api/organisation/equipes/:id — 404 pour un id inconnu', () => {
    return request(app.getHttpServer())
      .patch('/api/organisation/equipes/inconnue')
      .send({ nom: 'X' })
      .expect(404);
  });

  it('POST/DELETE .../membres — ajoute puis retire un Membre du roster', async () => {
    const entite = await creerEntite('DSI');
    const creationEquipe = await request(app.getHttpServer())
      .post('/api/organisation/equipes')
      .send({ nom: 'Alpha', entiteId: entite.id })
      .expect(201);
    const equipe = creationEquipe.body as EquipeDto;

    const ajout = await request(app.getHttpServer())
      .post(`/api/organisation/equipes/${equipe.id}/membres`)
      .send({ nom: 'Jean Dupont', email: 'jean.dupont@example.com' })
      .expect(201);
    const equipeAvecMembre = ajout.body as EquipeDto;
    expect(equipeAvecMembre.membres).toHaveLength(1);
    const membre = equipeAvecMembre.membres[0];
    expect(membre).toMatchObject({
      nom: 'Jean Dupont',
      email: 'jean.dupont@example.com',
      utilisateurId: null,
    });

    const retrait = await request(app.getHttpServer())
      .delete(`/api/organisation/equipes/${equipe.id}/membres/${membre.id}`)
      .expect(200);
    expect((retrait.body as EquipeDto).membres).toHaveLength(0);
  });

  it('PATCH .../membres/:membreId — modifie le nom et l’email d’un Membre', async () => {
    const entite = await creerEntite('DSI');
    const creationEquipe = await request(app.getHttpServer())
      .post('/api/organisation/equipes')
      .send({ nom: 'Alpha', entiteId: entite.id })
      .expect(201);
    const equipe = creationEquipe.body as EquipeDto;
    const ajout = await request(app.getHttpServer())
      .post(`/api/organisation/equipes/${equipe.id}/membres`)
      .send({ nom: 'Jean Dupont', email: 'jean.dupont@example.com' })
      .expect(201);
    const membre = (ajout.body as EquipeDto).membres[0];

    const modification = await request(app.getHttpServer())
      .patch(`/api/organisation/equipes/${equipe.id}/membres/${membre.id}`)
      .send({ nom: 'Jean D.', email: 'jean.d@example.com' })
      .expect(200);

    expect((modification.body as EquipeDto).membres[0]).toMatchObject({
      nom: 'Jean D.',
      email: 'jean.d@example.com',
    });
  });

  it('PATCH .../membres/:membreId — 404 pour un Membre inconnu', async () => {
    const entite = await creerEntite('DSI');
    const creationEquipe = await request(app.getHttpServer())
      .post('/api/organisation/equipes')
      .send({ nom: 'Alpha', entiteId: entite.id })
      .expect(201);
    const equipe = creationEquipe.body as EquipeDto;

    await request(app.getHttpServer())
      .patch(`/api/organisation/equipes/${equipe.id}/membres/inconnu`)
      .send({ nom: 'Jean D.', email: 'jean.d@example.com' })
      .expect(404);
  });

  it('PATCH .../membres/:membreId — 409 si l’email choisi est déjà utilisé par un autre Membre', async () => {
    const entite = await creerEntite('DSI');
    const creationEquipe = await request(app.getHttpServer())
      .post('/api/organisation/equipes')
      .send({ nom: 'Alpha', entiteId: entite.id })
      .expect(201);
    const equipe = creationEquipe.body as EquipeDto;
    await request(app.getHttpServer())
      .post(`/api/organisation/equipes/${equipe.id}/membres`)
      .send({ nom: 'Jean Dupont', email: 'jean.dupont@example.com' })
      .expect(201);
    const ajoutMarie = await request(app.getHttpServer())
      .post(`/api/organisation/equipes/${equipe.id}/membres`)
      .send({ nom: 'Marie Curie', email: 'marie@example.com' })
      .expect(201);
    const marie = (ajoutMarie.body as EquipeDto).membres.find(
      (m) => m.email === 'marie@example.com',
    )!;

    await request(app.getHttpServer())
      .patch(`/api/organisation/equipes/${equipe.id}/membres/${marie.id}`)
      .send({ nom: 'Marie C.', email: 'jean.dupont@example.com' })
      .expect(409);
  });

  it('POST .../membres — 409 si l’email est déjà utilisé dans le roster de cette Équipe', async () => {
    const entite = await creerEntite('DSI');
    const creationEquipe = await request(app.getHttpServer())
      .post('/api/organisation/equipes')
      .send({ nom: 'Alpha', entiteId: entite.id })
      .expect(201);
    const equipe = creationEquipe.body as EquipeDto;

    await request(app.getHttpServer())
      .post(`/api/organisation/equipes/${equipe.id}/membres`)
      .send({ nom: 'Jean Dupont', email: 'jean.dupont@example.com' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/organisation/equipes/${equipe.id}/membres`)
      .send({ nom: 'Jean D.', email: 'jean.dupont@example.com' })
      .expect(409);
  });

  it('POST .../membres — 400 pour un email mal formé', async () => {
    const entite = await creerEntite('DSI');
    const creationEquipe = await request(app.getHttpServer())
      .post('/api/organisation/equipes')
      .send({ nom: 'Alpha', entiteId: entite.id })
      .expect(201);
    const equipe = creationEquipe.body as EquipeDto;

    await request(app.getHttpServer())
      .post(`/api/organisation/equipes/${equipe.id}/membres`)
      .send({ nom: 'Jean Dupont', email: 'pas-un-email' })
      .expect(400);
  });

  it('DELETE /api/organisation/equipes/:id — supprime l’Équipe et son roster (cascade)', async () => {
    const entite = await creerEntite('DSI');
    const creationEquipe = await request(app.getHttpServer())
      .post('/api/organisation/equipes')
      .send({ nom: 'Alpha', entiteId: entite.id })
      .expect(201);
    const equipe = creationEquipe.body as EquipeDto;
    await request(app.getHttpServer())
      .post(`/api/organisation/equipes/${equipe.id}/membres`)
      .send({ nom: 'Jean Dupont', email: 'jean.dupont@example.com' })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/api/organisation/equipes/${equipe.id}`)
      .expect(200);

    const liste = await request(app.getHttpServer())
      .get(`/api/organisation/entites/${entite.id}/equipes`)
      .expect(200);
    expect(liste.body).toEqual([]);

    const membresRestants = await prisma.membre.count({
      where: { equipeId: equipe.id },
    });
    expect(membresRestants).toBe(0);
  });

  it('DELETE /api/organisation/equipes/:id — 404 pour un id inconnu', () => {
    return request(app.getHttpServer())
      .delete('/api/organisation/equipes/inconnue')
      .expect(404);
  });
});
