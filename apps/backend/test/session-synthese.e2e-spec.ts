import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  EntiteDto,
  EquipeDto,
  JetonSessionDto,
  ModeleSessionDto,
  SessionDto,
  SyntheseSessionDto,
} from '@agilometre/shared';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { configureReferentielImportBodyParser } from './../src/referentiel/configure-import-body-parser';

describe('Synthèse de fin de Session (e2e) — carte #52', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

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

    prisma = app.get(PrismaService);
    await nettoyer();
  });

  afterEach(async () => {
    await nettoyer();
    await app.close();
  });

  async function nettoyer(): Promise<void> {
    await prisma.participation.deleteMany();
    await prisma.jetonSession.deleteMany();
    await prisma.reponse.deleteMany();
    await prisma.tourDeVote.deleteMany();
    await prisma.sessionSelectionItem.deleteMany();
    await prisma.sessionQuestionSautee.deleteMany();
    await prisma.session.deleteMany();
    await prisma.selectionItem.deleteMany();
    await prisma.modeleSession.deleteMany();
    await prisma.equipe.deleteMany();
    await prisma.entite.deleteMany();
    await prisma.option.deleteMany();
    await prisma.question.deleteMany();
    await prisma.theme.deleteMany();
    await prisma.referentiel.deleteMany();
  }

  async function importer(): Promise<void> {
    await request(app.getHttpServer())
      .post('/api/referentiel/import/application')
      .set('Content-Type', 'text/plain')
      .send(
        [
          'themes:',
          '  - id: t1',
          '    libelle: Thème 1',
          '    questions:',
          '      - id: q1',
          '        libelle: Libellé q1',
          '        options:',
          '          - { libelle: Jamais, niveau: 1 }',
          '          - { libelle: Parfois, niveau: 2 }',
          '          - { libelle: Souvent, niveau: 3 }',
          '          - { libelle: Toujours, niveau: 4 }',
        ].join('\n'),
      )
      .expect(201);
  }

  async function creerEntite(nom: string): Promise<EntiteDto> {
    const reponse = await request(app.getHttpServer())
      .post('/api/organisation/entites')
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
      .send({ nom, entiteId })
      .expect(201);
    return reponse.body as EquipeDto;
  }

  async function creerModele(nom: string): Promise<ModeleSessionDto> {
    const reponse = await request(app.getHttpServer())
      .post('/api/modeles-session')
      .send({ nom })
      .expect(201);
    return reponse.body as ModeleSessionDto;
  }

  async function sessionEnVote(): Promise<SessionDto> {
    await importer();
    const entite = await creerEntite('DSI');
    const equipe = await creerEquipe('Équipe Alpha', entite.id);
    const modele = await creerModele('Diagnostic');
    await request(app.getHttpServer())
      .post(`/api/modeles-session/${modele.id}/themes`)
      .send({ questionIds: ['q1'] })
      .expect(201);
    const creation = await request(app.getHttpServer())
      .post('/api/sessions')
      .send({
        equipeId: equipe.id,
        date: '2026-04-01',
        modeleSessionId: modele.id,
      })
      .expect(201);
    const sessionPreparee = creation.body as SessionDto;
    const ouverture = await request(app.getHttpServer())
      .post(`/api/sessions/${sessionPreparee.id}/ouvrir`)
      .expect(201);
    const session = ouverture.body as SessionDto;
    await request(app.getHttpServer())
      .post(`/api/sessions/${session.id}/passer-question-suivante`)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/sessions/${session.id}/ouvrir-tour`)
      .expect(201);
    return session;
  }

  async function rejoindre(code: string): Promise<string> {
    const reponse = await request(app.getHttpServer())
      .post('/api/participant/rejoindre')
      .send({ code })
      .expect(201);
    return (reponse.body as JetonSessionDto).jeton;
  }

  async function voter(jeton: string, optionIndex: number): Promise<void> {
    await request(app.getHttpServer())
      .post('/api/participant/voter')
      .set('Authorization', `Bearer ${jeton}`)
      .send({ optionIndex })
      .expect(201);
  }

  it('un revote ne compte pas double : seul le dernier Tour clos alimente la synthèse', async () => {
    const session = await sessionEnVote();
    const jetonA = await rejoindre(session.code as string);
    const jetonB = await rejoindre(session.code as string);

    // Tour 1 : deux votes au Niveau 1 (optionIndex 0).
    await voter(jetonA, 0);
    await voter(jetonB, 0);
    await request(app.getHttpServer())
      .post(`/api/sessions/${session.id}/clore-tour`)
      .expect(201);

    // Revote : Tour 2 sur la même Question, deux votes au Niveau 4 (optionIndex 3).
    await request(app.getHttpServer())
      .post(`/api/sessions/${session.id}/ouvrir-tour`)
      .expect(201);
    await voter(jetonA, 3);
    await voter(jetonB, 3);
    await request(app.getHttpServer())
      .post(`/api/sessions/${session.id}/clore-tour`)
      .expect(201);

    const reponse = await request(app.getHttpServer())
      .get(`/api/sessions/${session.id}/synthese`)
      .expect(200);
    const synthese = reponse.body as SyntheseSessionDto;

    expect(synthese.themes).toHaveLength(1);
    const [theme] = synthese.themes;
    expect(theme.questions).toHaveLength(1);
    const [question] = theme.questions;
    // Si le 1er Tour comptait encore, effectif vaudrait 4 et moyenne 2.5 au lieu de 4.
    expect(question.effectif).toBe(2);
    expect(question.moyenne).toBe(4);
    expect(question.repartition).toEqual({ 1: 0, 2: 0, 3: 0, 4: 2 });
    expect(theme.effectif).toBe(2);
    expect(theme.palier).toBe(4);
  });

  it('renvoie 404 tant que la Session est encore PREPAREE', async () => {
    await importer();
    const entite = await creerEntite('DSI2');
    const equipe = await creerEquipe('Équipe Beta', entite.id);
    const modele = await creerModele('Diagnostic 2');
    await request(app.getHttpServer())
      .post(`/api/modeles-session/${modele.id}/themes`)
      .send({ questionIds: ['q1'] })
      .expect(201);
    const creation = await request(app.getHttpServer())
      .post('/api/sessions')
      .send({
        equipeId: equipe.id,
        date: '2026-04-01',
        modeleSessionId: modele.id,
      })
      .expect(201);
    const session = creation.body as SessionDto;

    await request(app.getHttpServer())
      .get(`/api/sessions/${session.id}/synthese`)
      .expect(404);
  });
});
