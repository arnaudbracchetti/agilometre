import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { ReferentielDto } from '@agilometre/shared';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { configureReferentielImportBodyParser } from './../src/referentiel/configure-import-body-parser';

describe('Référentiel — lecture (e2e)', () => {
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

  async function importer(yaml: string): Promise<void> {
    await request(app.getHttpServer())
      .post('/api/referentiel/import/application')
      .set('Content-Type', 'text/plain')
      .send(yaml)
      .expect(201);
  }

  it('GET /api/referentiel — base vide → aucun Thème', async () => {
    const reponse = await request(app.getHttpServer())
      .get('/api/referentiel')
      .expect(200);

    expect((reponse.body as ReferentielDto).themes).toEqual([]);
  });

  it('GET /api/referentiel — renvoie les Thèmes/Questions actifs, dans l’ordre d’import, et exclut une Question archivée', async () => {
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
      '      - id: q2',
      '        libelle: Question 2',
      '        options:',
      '          - { libelle: Jamais, niveau: 1 }',
      '          - { libelle: Parfois, niveau: 2 }',
      '          - { libelle: Souvent, niveau: 3 }',
      '          - { libelle: Toujours, niveau: 4 }',
    ].join('\n');
    await importer(yaml);

    const yamlSansQ2 = [
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
    await importer(yamlSansQ2);

    const reponse = await request(app.getHttpServer())
      .get('/api/referentiel')
      .expect(200);

    const { themes } = reponse.body as ReferentielDto;
    expect(themes).toHaveLength(1);
    expect(themes[0].id).toBe('t1');
    expect(themes[0].questions.map((q) => q.id)).toEqual(['q1']);
    expect(themes[0].questions[0].options).toHaveLength(4);
  });
});
