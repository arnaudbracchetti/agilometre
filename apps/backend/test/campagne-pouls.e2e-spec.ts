import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  CampagnePoulsDto,
  EntiteDto,
  EquipeDto,
  ModeleCollecteDto,
} from '@agilometre/shared';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { jetonCoachDeTest } from './support/jeton-coach';
import { configureReferentielImportBodyParser } from './../src/referentiel/configure-import-body-parser';

describe('Campagne de pouls (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jetonCoach: string;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureReferentielImportBodyParser(app);
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
    await prisma.sollicitationQuestion.deleteMany();
    await prisma.sollicitation.deleteMany();
    await prisma.campagnePanelItem.deleteMany();
    await prisma.campagnePouls.deleteMany();
    await prisma.selectionItem.deleteMany();
    await prisma.modeleCollecte.deleteMany();
    await prisma.equipe.deleteMany();
    await prisma.entite.deleteMany();
    await prisma.option.deleteMany();
    await prisma.question.deleteMany();
    await prisma.theme.deleteMany();
    await prisma.referentiel.deleteMany();
  }

  function yamlAvecQuestions(questionIds: string[]): string {
    const lignes = [
      'themes:',
      '  - id: t1',
      '    libelle: Thème 1',
      '    questions:',
    ];
    for (const id of questionIds) {
      lignes.push(
        `      - id: ${id}`,
        `        libelle: Libellé ${id}`,
        '        options:',
        '          - { libelle: Jamais, niveau: 1 }',
        '          - { libelle: Parfois, niveau: 2 }',
        '          - { libelle: Souvent, niveau: 3 }',
        '          - { libelle: Toujours, niveau: 4 }',
      );
    }
    return lignes.join('\n');
  }

  async function importer(questionIds: string[]): Promise<void> {
    await request(app.getHttpServer())
      .post('/api/referentiel/import/application')
      .set('Authorization', `Bearer ${jetonCoach}`)
      .set('Content-Type', 'text/plain')
      .send(yamlAvecQuestions(questionIds))
      .expect(201);
  }

  async function creerEntite(nom: string): Promise<EntiteDto> {
    const reponse = await request(app.getHttpServer())
      .post('/api/organisation/entites')
      .set('Authorization', `Bearer ${jetonCoach}`)
      .send({ nom })
      .expect(201);
    return reponse.body as EntiteDto;
  }

  async function creerEquipe(
    nom: string,
    entiteId: string,
  ): Promise<EquipeDto> {
    const reponse = await request(app.getHttpServer())
      .post('/api/organisation/equipes')
      .set('Authorization', `Bearer ${jetonCoach}`)
      .send({ nom, entiteId })
      .expect(201);
    return reponse.body as EquipeDto;
  }

  async function creerModele(nom: string): Promise<ModeleCollecteDto> {
    const reponse = await request(app.getHttpServer())
      .post('/api/modeles-collecte')
      .set('Authorization', `Bearer ${jetonCoach}`)
      .send({ nom })
      .expect(201);
    return reponse.body as ModeleCollecteDto;
  }

  it('POST .../campagne-pouls — copie la Sélection du Modèle en Panel figé, indépendant du Modèle source', async () => {
    await importer(['q1', 'q2']);
    const entite = await creerEntite('DSI');
    const equipe = await creerEquipe('Équipe Alpha', entite.id);
    const modele = await creerModele('Diagnostic');
    await request(app.getHttpServer())
      .post(`/api/modeles-collecte/${modele.id}/themes`)
      .set('Authorization', `Bearer ${jetonCoach}`)
      .send({ questionIds: ['q1', 'q2'] })
      .expect(201);

    const creation = await request(app.getHttpServer())
      .post(`/api/organisation/equipes/${equipe.id}/campagne-pouls`)
      .set('Authorization', `Bearer ${jetonCoach}`)
      .send({
        modeleCollecteId: modele.id,
        joursEnvoi: [1, 3],
        heureEnvoi: 480,
        questionsParEnvoi: 2,
      })
      .expect(201);
    const campagne = creation.body as CampagnePoulsDto;

    expect(campagne).toMatchObject({
      equipeId: equipe.id,
      statut: 'BROUILLON',
      modeleCollecteId: modele.id,
      joursEnvoi: [1, 3],
      heureEnvoi: 480,
      questionsParEnvoi: 2,
    });
    expect(campagne.panel.map((q) => q.questionId)).toEqual(['q1', 'q2']);
    await expect(
      prisma.campagnePanelItem.count({ where: { campagneId: campagne.id } }),
    ).resolves.toBe(2);

    // Le Panel est une copie figée : supprimer le Modèle source n'a aucun effet.
    await request(app.getHttpServer())
      .delete(`/api/modeles-collecte/${modele.id}`)
      .set('Authorization', `Bearer ${jetonCoach}`)
      .expect(200);

    const relecture = await request(app.getHttpServer())
      .get(`/api/organisation/equipes/${equipe.id}/campagne-pouls`)
      .set('Authorization', `Bearer ${jetonCoach}`)
      .expect(200);
    expect(
      (relecture.body as CampagnePoulsDto).panel.map((q) => q.questionId),
    ).toEqual(['q1', 'q2']);
  });

  it('GET .../campagne-pouls — null si aucune Campagne pour cette Équipe', async () => {
    const entite = await creerEntite('DSI');
    const equipe = await creerEquipe('Équipe Alpha', entite.id);

    const reponse = await request(app.getHttpServer())
      .get(`/api/organisation/equipes/${equipe.id}/campagne-pouls`)
      .set('Authorization', `Bearer ${jetonCoach}`)
      .expect(200);

    expect(reponse.body).toEqual({});
    expect(reponse.text).toBe('');
  });

  it('POST .../campagne-pouls — 404 sur une Équipe inconnue', async () => {
    const modele = await creerModele('Diagnostic');

    await request(app.getHttpServer())
      .post('/api/organisation/equipes/inconnue/campagne-pouls')
      .set('Authorization', `Bearer ${jetonCoach}`)
      .send({
        modeleCollecteId: modele.id,
        joursEnvoi: [1],
        heureEnvoi: 480,
        questionsParEnvoi: 1,
      })
      .expect(404);
  });

  it('POST .../campagne-pouls — 404 sur un Modèle de collecte inconnu', async () => {
    const entite = await creerEntite('DSI');
    const equipe = await creerEquipe('Équipe Alpha', entite.id);

    await request(app.getHttpServer())
      .post(`/api/organisation/equipes/${equipe.id}/campagne-pouls`)
      .set('Authorization', `Bearer ${jetonCoach}`)
      .send({
        modeleCollecteId: 'inconnu',
        joursEnvoi: [1],
        heureEnvoi: 480,
        questionsParEnvoi: 1,
      })
      .expect(404);
  });

  it('POST .../campagne-pouls — 400 si le Rythme est invalide (jours vides)', async () => {
    const entite = await creerEntite('DSI');
    const equipe = await creerEquipe('Équipe Alpha', entite.id);
    const modele = await creerModele('Diagnostic');

    await request(app.getHttpServer())
      .post(`/api/organisation/equipes/${equipe.id}/campagne-pouls`)
      .set('Authorization', `Bearer ${jetonCoach}`)
      .send({
        modeleCollecteId: modele.id,
        joursEnvoi: [],
        heureEnvoi: 480,
        questionsParEnvoi: 1,
      })
      .expect(400);
  });

  it("POST .../campagne-pouls — 409 si une Campagne non-Terminée existe déjà pour l'Équipe", async () => {
    const entite = await creerEntite('DSI');
    const equipe = await creerEquipe('Équipe Alpha', entite.id);
    const modele = await creerModele('Diagnostic');
    await request(app.getHttpServer())
      .post(`/api/organisation/equipes/${equipe.id}/campagne-pouls`)
      .set('Authorization', `Bearer ${jetonCoach}`)
      .send({
        modeleCollecteId: modele.id,
        joursEnvoi: [1],
        heureEnvoi: 480,
        questionsParEnvoi: 1,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/organisation/equipes/${equipe.id}/campagne-pouls`)
      .set('Authorization', `Bearer ${jetonCoach}`)
      .send({
        modeleCollecteId: modele.id,
        joursEnvoi: [2],
        heureEnvoi: 500,
        questionsParEnvoi: 1,
      })
      .expect(409);
  });
});
