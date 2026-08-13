import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { configureReferentielImportBodyParser } from './../src/referentiel/configure-import-body-parser';

interface ChangeSetReponse {
  themes: { type: string; id: string }[];
  questions: { type: string; id: string; apres: { themeId: string } }[];
}

describe("Référentiel — aperçu d'import (e2e)", () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureReferentielImportBodyParser(app);
    app.setGlobalPrefix('api');
    await app.init();

    prisma = app.get(PrismaService);
    await prisma.option.deleteMany();
    await prisma.question.deleteMany();
    await prisma.theme.deleteMany();
    await prisma.referentiel.deleteMany();
  });

  afterEach(async () => {
    await prisma.option.deleteMany();
    await prisma.question.deleteMany();
    await prisma.theme.deleteMany();
    await prisma.referentiel.deleteMany();
    await app.close();
  });

  it('POST /api/referentiel/import/apercu — base vide, YAML valide → tout en création, rien écrit', async () => {
    const yaml = [
      'themes:',
      '  - id: t1',
      '    libelle: Thème 1',
      '    questions:',
      '      - id: q1',
      '        libelle: Question 1',
      '        options:',
      '          - { libelle: Jamais, niveau: 1 }',
      '          - { libelle: Parfois, niveau: 2 }',
      '          - { libelle: Souvent, niveau: 3 }',
      '          - { libelle: Toujours, niveau: 4 }',
    ].join('\n');

    const reponse = await request(app.getHttpServer())
      .post('/api/referentiel/import/apercu')
      .set('Content-Type', 'text/plain')
      .send(yaml)
      .expect(201);

    const changeSet = reponse.body as ChangeSetReponse;
    expect(changeSet.themes).toHaveLength(1);
    expect(changeSet.themes[0]).toMatchObject({ type: 'creation', id: 't1' });
    expect(changeSet.questions[0]).toMatchObject({
      type: 'creation',
      id: 'q1',
      apres: { themeId: 't1' },
    });

    await expect(prisma.theme.count()).resolves.toBe(0);
    await expect(prisma.question.count()).resolves.toBe(0);
  });

  it('POST /api/referentiel/import/apercu — YAML mal formé → 400', async () => {
    await request(app.getHttpServer())
      .post('/api/referentiel/import/apercu')
      .set('Content-Type', 'text/plain')
      .send('themes: [ not: valid')
      .expect(400);
  });
});
