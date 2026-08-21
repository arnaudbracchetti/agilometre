import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

/**
 * Vérifie que l'app démarre réellement avec sa configuration de production (préfixe /api, cf.
 * main.ts) plutôt qu'un contrôleur racine — l'ancien test scaffoldé par Nest CLI ciblait un
 * AppController "Hello World" qui n'a jamais survécu à l'arrivée des modules DDD (health/,
 * referentiel/, session/...), donc 404 depuis longtemps sans que personne ne le remarque.
 */
describe('AppModule (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  it('GET /api/health — l’app démarre et la connexion à la base répond', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  afterEach(async () => {
    await app.close();
  });
});
