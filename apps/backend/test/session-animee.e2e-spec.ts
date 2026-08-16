import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  EntiteDto,
  EquipeDto,
  LigneListeSessionDto,
  ModeleSessionDto,
  SessionDto,
} from '@agilometre/shared';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { configureReferentielImportBodyParser } from './../src/referentiel/configure-import-body-parser';

describe('Session animée (e2e)', () => {
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
    await prisma.sessionSelectionItem.deleteMany();
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

  async function contexte(): Promise<{
    equipe: EquipeDto;
    modele: ModeleSessionDto;
  }> {
    await importer(['q1', 'q2', 'q3']);
    const entite = await creerEntite('DSI');
    const equipe = await creerEquipe('Équipe Alpha', entite.id);
    const modele = await creerModele('Diagnostic');
    await request(app.getHttpServer())
      .post(`/api/modeles-session/${modele.id}/themes`)
      .send({ questionIds: ['q1', 'q2'] })
      .expect(201);
    const modeleAvecSelection = await request(app.getHttpServer())
      .get(`/api/modeles-session/${modele.id}`)
      .expect(200);
    return { equipe, modele: modeleAvecSelection.body as ModeleSessionDto };
  }

  it('POST /api/sessions — copie la Sélection du Modèle dans une nouvelle Session ouverte', async () => {
    const { equipe, modele } = await contexte();

    const reponse = await request(app.getHttpServer())
      .post('/api/sessions')
      .send({
        equipeId: equipe.id,
        date: '2026-04-01',
        modeleSessionId: modele.id,
      })
      .expect(201);
    const session = reponse.body as SessionDto;

    expect(session).toMatchObject({
      equipeId: equipe.id,
      equipeNom: 'Équipe Alpha',
      statut: 'OUVERTE',
      modeleSessionId: modele.id,
      verrouillee: false,
    });
    expect(session.selection.map((q) => q.questionId)).toEqual(['q1', 'q2']);

    const detail = await request(app.getHttpServer())
      .get(`/api/sessions/${session.id}`)
      .expect(200);
    expect((detail.body as SessionDto).id).toBe(session.id);
  });

  it('POST /api/sessions — la Sélection copiée est indépendante du Modèle source', async () => {
    const { equipe, modele } = await contexte();
    const reponse = await request(app.getHttpServer())
      .post('/api/sessions')
      .send({
        equipeId: equipe.id,
        date: '2026-04-01',
        modeleSessionId: modele.id,
      })
      .expect(201);
    const session = reponse.body as SessionDto;

    // Modification du Modèle après coup (ADR-0009) : aucune répercussion sur la Session déjà créée.
    await request(app.getHttpServer())
      .delete(`/api/modeles-session/${modele.id}/questions/q1`)
      .expect(200);

    const detail = await request(app.getHttpServer())
      .get(`/api/sessions/${session.id}`)
      .expect(200);
    expect(
      (detail.body as SessionDto).selection.map((q) => q.questionId),
    ).toEqual(['q1', 'q2']);
  });

  it('POST /api/sessions — 404 si l’Équipe est inconnue', async () => {
    const { modele } = await contexte();

    await request(app.getHttpServer())
      .post('/api/sessions')
      .send({
        equipeId: 'inconnue',
        date: '2026-04-01',
        modeleSessionId: modele.id,
      })
      .expect(404);
  });

  it('POST /api/sessions — 404 si le Modèle est inconnu', async () => {
    const { equipe } = await contexte();

    await request(app.getHttpServer())
      .post('/api/sessions')
      .send({
        equipeId: equipe.id,
        date: '2026-04-01',
        modeleSessionId: 'inconnu',
      })
      .expect(404);
  });

  it('cycle complet : ajouter une Question, réordonner, retirer sur la Sélection de la Session', async () => {
    const { equipe, modele } = await contexte();
    const creation = await request(app.getHttpServer())
      .post('/api/sessions')
      .send({
        equipeId: equipe.id,
        date: '2026-04-01',
        modeleSessionId: modele.id,
      })
      .expect(201);
    const session = creation.body as SessionDto;
    expect(session.selection.map((q) => q.questionId)).toEqual(['q1', 'q2']);

    const apresAjout = await request(app.getHttpServer())
      .post(`/api/sessions/${session.id}/questions`)
      .send({ questionId: 'q3' })
      .expect(201);
    expect(
      (apresAjout.body as SessionDto).selection.map((q) => q.questionId),
    ).toEqual(['q1', 'q2', 'q3']);

    const apresReordre = await request(app.getHttpServer())
      .patch(`/api/sessions/${session.id}/questions/q3`)
      .send({ position: 0 })
      .expect(200);
    expect(
      (apresReordre.body as SessionDto).selection.map((q) => q.questionId),
    ).toEqual(['q3', 'q1', 'q2']);

    const apresRetrait = await request(app.getHttpServer())
      .delete(`/api/sessions/${session.id}/questions/q1`)
      .expect(200);
    expect(
      (apresRetrait.body as SessionDto).selection.map((q) => q.questionId),
    ).toEqual(['q3', 'q2']);
  });

  it('GET /api/sessions — liste avec équipe, statut, nb de questions et nom du Modèle', async () => {
    const { equipe, modele } = await contexte();
    await request(app.getHttpServer())
      .post('/api/sessions')
      .send({
        equipeId: equipe.id,
        date: '2026-04-01',
        modeleSessionId: modele.id,
      })
      .expect(201);

    const reponse = await request(app.getHttpServer())
      .get('/api/sessions')
      .expect(200);
    const lignes = reponse.body as LigneListeSessionDto[];

    expect(lignes).toHaveLength(1);
    expect(lignes[0]).toMatchObject({
      equipeNom: 'Équipe Alpha',
      statut: 'OUVERTE',
      nbQuestions: 2,
      modeleSessionNom: 'Diagnostic',
    });
  });

  it('PATCH /api/sessions/:id — modifie Équipe et Date, persisté après rechargement', async () => {
    const { equipe, modele } = await contexte();
    const autreEquipe = await creerEquipe('Équipe Beta', equipe.entiteId);
    const creation = await request(app.getHttpServer())
      .post('/api/sessions')
      .send({
        equipeId: equipe.id,
        date: '2026-04-01',
        modeleSessionId: modele.id,
      })
      .expect(201);
    const session = creation.body as SessionDto;

    const reponse = await request(app.getHttpServer())
      .patch(`/api/sessions/${session.id}`)
      .send({ equipeId: autreEquipe.id, date: '2026-05-01' })
      .expect(200);
    expect(reponse.body).toMatchObject({
      equipeId: autreEquipe.id,
      equipeNom: 'Équipe Beta',
    });

    // Vérifie que PrismaSessionRepository.save persiste bien equipeId/date à la mise à jour.
    const detail = await request(app.getHttpServer())
      .get(`/api/sessions/${session.id}`)
      .expect(200);
    expect((detail.body as SessionDto).equipeId).toBe(autreEquipe.id);
    expect((detail.body as SessionDto).date.slice(0, 10)).toBe('2026-05-01');
  });

  it('PATCH /api/sessions/:id — 404 si la nouvelle Équipe est inconnue', async () => {
    const { equipe, modele } = await contexte();
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
      .patch(`/api/sessions/${session.id}`)
      .send({ equipeId: 'inconnue', date: '2026-05-01' })
      .expect(404);
  });

  it('PATCH /api/sessions/:id — 409 si la Session est verrouillée', async () => {
    const { equipe, modele } = await contexte();
    const creation = await request(app.getHttpServer())
      .post('/api/sessions')
      .send({
        equipeId: equipe.id,
        date: '2026-04-01',
        modeleSessionId: modele.id,
      })
      .expect(201);
    const session = creation.body as SessionDto;
    await prisma.session.update({
      where: { id: session.id },
      data: { verrouillee: true },
    });

    await request(app.getHttpServer())
      .patch(`/api/sessions/${session.id}`)
      .send({ equipeId: equipe.id, date: '2026-05-01' })
      .expect(409);
  });

  it('PATCH /api/sessions/:id/modele — remplace le Modèle et réinitialise entièrement la Sélection', async () => {
    const { equipe, modele } = await contexte();
    const autreModele = await creerModele('Suivi');
    await request(app.getHttpServer())
      .post(`/api/modeles-session/${autreModele.id}/themes`)
      .send({ questionIds: ['q3'] })
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
    // Ajustement manuel avant le changement de Modèle : doit être perdu par la réinitialisation.
    await request(app.getHttpServer())
      .patch(`/api/sessions/${session.id}/questions/q1`)
      .send({ position: 1 })
      .expect(200);

    const reponse = await request(app.getHttpServer())
      .patch(`/api/sessions/${session.id}/modele`)
      .send({ modeleSessionId: autreModele.id })
      .expect(200);
    const sessionModifiee = reponse.body as SessionDto;

    expect(sessionModifiee.modeleSessionId).toBe(autreModele.id);
    expect(sessionModifiee.selection.map((q) => q.questionId)).toEqual(['q3']);

    const detail = await request(app.getHttpServer())
      .get(`/api/sessions/${session.id}`)
      .expect(200);
    expect((detail.body as SessionDto).modeleSessionId).toBe(autreModele.id);
  });

  it('PATCH /api/sessions/:id/modele — 404 si le nouveau Modèle est inconnu', async () => {
    const { equipe, modele } = await contexte();
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
      .patch(`/api/sessions/${session.id}/modele`)
      .send({ modeleSessionId: 'inconnu' })
      .expect(404);
  });

  it('PATCH /api/sessions/:id/modele — 409 si la Session est clôturée', async () => {
    const { equipe, modele } = await contexte();
    const autreModele = await creerModele('Suivi');
    const creation = await request(app.getHttpServer())
      .post('/api/sessions')
      .send({
        equipeId: equipe.id,
        date: '2026-04-01',
        modeleSessionId: modele.id,
      })
      .expect(201);
    const session = creation.body as SessionDto;
    await prisma.session.update({
      where: { id: session.id },
      data: { statut: 'CLOTUREE' },
    });

    await request(app.getHttpServer())
      .patch(`/api/sessions/${session.id}/modele`)
      .send({ modeleSessionId: autreModele.id })
      .expect(409);
  });

  it('DELETE /api/sessions/:id — supprime une Session ouverte et non verrouillée', async () => {
    const { equipe, modele } = await contexte();
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
      .delete(`/api/sessions/${session.id}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/sessions/${session.id}`)
      .expect(404);
  });

  it('DELETE /api/sessions/:id — 404 si la Session est inconnue', async () => {
    await request(app.getHttpServer())
      .delete('/api/sessions/inconnue')
      .expect(404);
  });

  it('DELETE /api/sessions/:id — 409 si la Session est verrouillée', async () => {
    const { equipe, modele } = await contexte();
    const creation = await request(app.getHttpServer())
      .post('/api/sessions')
      .send({
        equipeId: equipe.id,
        date: '2026-04-01',
        modeleSessionId: modele.id,
      })
      .expect(201);
    const session = creation.body as SessionDto;
    await prisma.session.update({
      where: { id: session.id },
      data: { verrouillee: true },
    });

    await request(app.getHttpServer())
      .delete(`/api/sessions/${session.id}`)
      .expect(409);
  });

  it('DELETE /api/sessions/:id — 409 si la Session est clôturée', async () => {
    const { equipe, modele } = await contexte();
    const creation = await request(app.getHttpServer())
      .post('/api/sessions')
      .send({
        equipeId: equipe.id,
        date: '2026-04-01',
        modeleSessionId: modele.id,
      })
      .expect(201);
    const session = creation.body as SessionDto;
    await prisma.session.update({
      where: { id: session.id },
      data: { statut: 'CLOTUREE' },
    });

    await request(app.getHttpServer())
      .delete(`/api/sessions/${session.id}`)
      .expect(409);
  });

  it('GET /api/sessions — modeleSessionNom devient null si le Modèle source est supprimé (ADR-0009)', async () => {
    const { equipe, modele } = await contexte();
    await request(app.getHttpServer())
      .post('/api/sessions')
      .send({
        equipeId: equipe.id,
        date: '2026-04-01',
        modeleSessionId: modele.id,
      })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/api/modeles-session/${modele.id}`)
      .expect(200);

    const reponse = await request(app.getHttpServer())
      .get('/api/sessions')
      .expect(200);
    const lignes = reponse.body as LigneListeSessionDto[];
    expect(lignes[0].modeleSessionNom).toBeNull();
  });
});
