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
} from '@agilometre/shared';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { configureReferentielImportBodyParser } from './../src/referentiel/configure-import-body-parser';

describe('Participant — jointure par Code (e2e)', () => {
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
    await prisma.jetonSession.deleteMany();
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
      .set('Content-Type', 'text/plain')
      .send(yamlAvecQuestions(questionIds))
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

  /** Crée une Session PREPAREE avec une Sélection non vide (Session.creer valide equipe+modèle). */
  async function sessionPreparee(): Promise<SessionDto> {
    await importer(['q1']);
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
    return creation.body as SessionDto;
  }

  async function sessionOuverte(): Promise<SessionDto> {
    const session = await sessionPreparee();
    const reponse = await request(app.getHttpServer())
      .post(`/api/sessions/${session.id}/ouvrir`)
      .expect(201);
    return reponse.body as SessionDto;
  }

  it('POST /api/participant/rejoindre — émet un Jeton pour le Code d’une Session OUVERTE', async () => {
    const session = await sessionOuverte();

    const reponse = await request(app.getHttpServer())
      .post('/api/participant/rejoindre')
      .send({ code: session.code })
      .expect(201);

    const jeton = reponse.body as JetonSessionDto;
    expect(jeton.sessionId).toBe(session.id);
    expect(typeof jeton.jeton).toBe('string');
    expect(jeton.jeton.length).toBeGreaterThan(0);
  });

  it('POST /api/participant/rejoindre — émet un Jeton distinct à chaque jointure sur le même Code', async () => {
    const session = await sessionOuverte();

    const premier = await request(app.getHttpServer())
      .post('/api/participant/rejoindre')
      .send({ code: session.code })
      .expect(201);
    const second = await request(app.getHttpServer())
      .post('/api/participant/rejoindre')
      .send({ code: session.code })
      .expect(201);

    expect((premier.body as JetonSessionDto).jeton).not.toBe(
      (second.body as JetonSessionDto).jeton,
    );
  });

  it('POST /api/participant/rejoindre — 404 pour un Code inconnu', async () => {
    await sessionOuverte();

    await request(app.getHttpServer())
      .post('/api/participant/rejoindre')
      .send({ code: '0000' })
      .expect(404);
  });

  it('POST /api/participant/rejoindre — 404 pour le Code d’une Session encore PREPAREE', async () => {
    const session = await sessionPreparee();

    // Une Session PREPAREE n'a pas de Code — on force un Code arbitraire côté requête.
    await request(app.getHttpServer())
      .post('/api/participant/rejoindre')
      .send({ code: '1234' })
      .expect(404);
    expect(session.code).toBeNull();
  });

  it('POST /api/participant/rejoindre — 400 si le Code est manquant', async () => {
    await request(app.getHttpServer())
      .post('/api/participant/rejoindre')
      .send({})
      .expect(400);
  });
});
