import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  LigneBibliothequeModeleSessionDto,
  ModeleSessionDto,
} from '@agilometre/shared';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { configureReferentielImportBodyParser } from './../src/referentiel/configure-import-body-parser';

describe('Modèle de session (e2e)', () => {
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
    await prisma.selectionItem.deleteMany();
    await prisma.modeleSession.deleteMany();
    await prisma.option.deleteMany();
    await prisma.question.deleteMany();
    await prisma.theme.deleteMany();
    await prisma.referentiel.deleteMany();
  });

  afterEach(async () => {
    await prisma.selectionItem.deleteMany();
    await prisma.modeleSession.deleteMany();
    await prisma.option.deleteMany();
    await prisma.question.deleteMany();
    await prisma.theme.deleteMany();
    await prisma.referentiel.deleteMany();
    await app.close();
  });

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

  async function creerModele(nom: string): Promise<ModeleSessionDto> {
    const reponse = await request(app.getHttpServer())
      .post('/api/modeles-session')
      .send({ nom })
      .expect(201);
    return reponse.body as ModeleSessionDto;
  }

  it('POST /api/modeles-session — crée un Modèle vide, puis GET le retrouve', async () => {
    const modele = await creerModele('Diagnostic complet');

    expect(modele).toMatchObject({ nom: 'Diagnostic complet', selection: [] });

    const reponse = await request(app.getHttpServer())
      .get(`/api/modeles-session/${modele.id}`)
      .expect(200);
    expect(reponse.body).toMatchObject({
      nom: 'Diagnostic complet',
      selection: [],
    });
  });

  it('PATCH /api/modeles-session/:id — renomme le Modèle', async () => {
    const modele = await creerModele('Alpha');

    const reponse = await request(app.getHttpServer())
      .patch(`/api/modeles-session/${modele.id}`)
      .send({ nom: 'Beta' })
      .expect(200);

    expect(reponse.body).toMatchObject({ nom: 'Beta' });
  });

  it('PATCH /api/modeles-session/:id — 404 sur un Modèle inconnu', async () => {
    await request(app.getHttpServer())
      .patch('/api/modeles-session/inconnu')
      .send({ nom: 'Beta' })
      .expect(404);
  });

  it('cycle complet : ajouter une Question, ajouter un Thème entier, réordonner, retirer', async () => {
    await importer(['q1', 'q2', 'q3']);
    const modele = await creerModele('Alpha');

    await request(app.getHttpServer())
      .post(`/api/modeles-session/${modele.id}/questions`)
      .send({ questionId: 'q1' })
      .expect(201);

    const apresTheme = await request(app.getHttpServer())
      .post(`/api/modeles-session/${modele.id}/themes`)
      .send({ questionIds: ['q2', 'q3'] })
      .expect(201);
    expect(
      (apresTheme.body as ModeleSessionDto).selection.map((q) => q.questionId),
    ).toEqual(['q1', 'q2', 'q3']);

    const apresReordre = await request(app.getHttpServer())
      .patch(`/api/modeles-session/${modele.id}/questions/q3`)
      .send({ position: 0 })
      .expect(200);
    expect(
      (apresReordre.body as ModeleSessionDto).selection.map(
        (q) => q.questionId,
      ),
    ).toEqual(['q3', 'q1', 'q2']);

    const apresRetrait = await request(app.getHttpServer())
      .delete(`/api/modeles-session/${modele.id}/questions/q1`)
      .expect(200);
    expect(
      (apresRetrait.body as ModeleSessionDto).selection.map(
        (q) => q.questionId,
      ),
    ).toEqual(['q3', 'q2']);
  });

  it('POST /api/modeles-session/:id/questions — 409 sur une Question déjà sélectionnée', async () => {
    await importer(['q1']);
    const modele = await creerModele('Alpha');
    await request(app.getHttpServer())
      .post(`/api/modeles-session/${modele.id}/questions`)
      .send({ questionId: 'q1' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/modeles-session/${modele.id}/questions`)
      .send({ questionId: 'q1' })
      .expect(409);
  });

  it('POST /api/modeles-session/:id/dupliquer — copie la Sélection dans un nouveau Modèle indépendant', async () => {
    await importer(['q1', 'q2']);
    const modele = await creerModele('Alpha');
    await request(app.getHttpServer())
      .post(`/api/modeles-session/${modele.id}/themes`)
      .send({ questionIds: ['q1', 'q2'] })
      .expect(201);

    const reponse = await request(app.getHttpServer())
      .post(`/api/modeles-session/${modele.id}/dupliquer`)
      .expect(201);
    const copie = reponse.body as ModeleSessionDto;

    expect(copie.id).not.toBe(modele.id);
    expect(copie.nom).toBe('Alpha (copie)');
    expect(copie.selection.map((q) => q.questionId)).toEqual(['q1', 'q2']);

    // La copie est indépendante : retirer une Question de l'originale ne touche pas la copie.
    await request(app.getHttpServer())
      .delete(`/api/modeles-session/${modele.id}/questions/q1`)
      .expect(200);
    const copieApres = await request(app.getHttpServer())
      .get(`/api/modeles-session/${copie.id}`)
      .expect(200);
    expect(
      (copieApres.body as ModeleSessionDto).selection.map((q) => q.questionId),
    ).toEqual(['q1', 'q2']);
  });

  it('DELETE /api/modeles-session/:id — supprime toujours, même déjà utilisé (ADR-0009)', async () => {
    const modele = await creerModele('Alpha');

    await request(app.getHttpServer())
      .delete(`/api/modeles-session/${modele.id}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/modeles-session/${modele.id}`)
      .expect(404);
  });

  it('GET /api/modeles-session — bibliothèque : nb Questions actives et Thèmes couverts', async () => {
    await importer(['q1', 'q2']);
    const modele = await creerModele('Alpha');
    await request(app.getHttpServer())
      .post(`/api/modeles-session/${modele.id}/themes`)
      .send({ questionIds: ['q1', 'q2'] })
      .expect(201);

    const reponse = await request(app.getHttpServer())
      .get('/api/modeles-session')
      .expect(200);
    const lignes = reponse.body as LigneBibliothequeModeleSessionDto[];

    expect(lignes).toHaveLength(1);
    expect(lignes[0]).toMatchObject({
      id: modele.id,
      nom: 'Alpha',
      nbQuestionsActives: 2,
      themesCouverts: ['Thème 1'],
    });
    expect(typeof lignes[0].misAJourLe).toBe('string');
  });

  it('une Question archivée disparaît de la Sélection lue sans être retirée physiquement, et réapparaît si réactivée', async () => {
    await importer(['q1', 'q2']);
    const modele = await creerModele('Alpha');
    await request(app.getHttpServer())
      .post(`/api/modeles-session/${modele.id}/themes`)
      .send({ questionIds: ['q1', 'q2'] })
      .expect(201);

    // Ré-import sans q2 : archivage côté Référentiel, la Sélection ne bouge pas physiquement.
    await importer(['q1']);

    const detailApresArchivage = await request(app.getHttpServer())
      .get(`/api/modeles-session/${modele.id}`)
      .expect(200);
    expect(
      (detailApresArchivage.body as ModeleSessionDto).selection.map(
        (q) => q.questionId,
      ),
    ).toEqual(['q1']);
    await expect(
      prisma.selectionItem.count({ where: { modeleSessionId: modele.id } }),
    ).resolves.toBe(2);

    const bibliothequeApresArchivage = await request(app.getHttpServer())
      .get('/api/modeles-session')
      .expect(200);
    expect(
      (
        bibliothequeApresArchivage.body as LigneBibliothequeModeleSessionDto[]
      )[0].nbQuestionsActives,
    ).toBe(1);

    // Ré-import avec q2 de nouveau : réactivation, la Question réapparaît dans la Sélection lue.
    await importer(['q1', 'q2']);

    const detailApresReactivation = await request(app.getHttpServer())
      .get(`/api/modeles-session/${modele.id}`)
      .expect(200);
    expect(
      (detailApresReactivation.body as ModeleSessionDto).selection.map(
        (q) => q.questionId,
      ),
    ).toEqual(['q1', 'q2']);
  });
});
