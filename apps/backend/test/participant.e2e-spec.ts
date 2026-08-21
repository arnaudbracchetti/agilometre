import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  EntiteDto,
  EquipeDto,
  InfoSessionParticipantDto,
  JetonSessionDto,
  ModeleSessionDto,
  MoiParticipantDto,
  PilotageSessionDto,
  ProjectionSessionDto,
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

  /**
   * Crée une Session PREPAREE avec une Sélection non vide (Session.creer valide equipe+modèle).
   * `suffixe` distingue les entités quand un test a besoin de plusieurs Sessions indépendantes —
   * l'API rejette un nom d'Équipe/Entité/Modèle déjà pris.
   */
  async function sessionPreparee(suffixe = ''): Promise<SessionDto> {
    const questionId = `q1${suffixe}`;
    await importer([questionId]);
    const entite = await creerEntite(`DSI${suffixe}`);
    const equipe = await creerEquipe(`Équipe Alpha${suffixe}`, entite.id);
    const modele = await creerModele(`Diagnostic${suffixe}`);
    await request(app.getHttpServer())
      .post(`/api/modeles-session/${modele.id}/themes`)
      .send({ questionIds: [questionId] })
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

  async function sessionOuverte(suffixe = ''): Promise<SessionDto> {
    const session = await sessionPreparee(suffixe);
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

  it('POST /api/participant/rejoindre — jetonPrecedent invalide le Jeton de la Session quittée ("Rejoindre une autre séance")', async () => {
    const sessionA = await sessionOuverte('A');
    const sessionB = await sessionOuverte('B');

    const premier = await request(app.getHttpServer())
      .post('/api/participant/rejoindre')
      .send({ code: sessionA.code })
      .expect(201);
    const jetonA = (premier.body as JetonSessionDto).jeton;

    await request(app.getHttpServer())
      .post('/api/participant/rejoindre')
      .send({ code: sessionB.code, jetonPrecedent: jetonA })
      .expect(201);

    const projectionA = await request(app.getHttpServer())
      .get(`/api/projection/${sessionA.id}`)
      .expect(200);
    const projectionB = await request(app.getHttpServer())
      .get(`/api/projection/${sessionB.id}`)
      .expect(200);
    expect((projectionA.body as ProjectionSessionDto).nbDevicesConnectes).toBe(
      0,
    );
    expect((projectionB.body as ProjectionSessionDto).nbDevicesConnectes).toBe(
      1,
    );
  });

  /** Fait avancer une Session OUVERTE vers sa première Question et ouvre un Tour dessus. */
  async function sessionEnVote(suffixe = ''): Promise<SessionDto> {
    const session = await sessionOuverte(suffixe);
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

  describe('parcours D2 — ouvrir un Tour, voter, revoter, clore', () => {
    it('POST /api/sessions/:id/ouvrir-tour — 409 en salle d’attente (aucune Question courante)', async () => {
      const session = await sessionOuverte();

      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/ouvrir-tour`)
        .expect(409);
    });

    it('GET /api/participant/moi — voteOuvert=false et 4 Options masquées hors vote', async () => {
      const session = await sessionOuverte();
      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/passer-question-suivante`)
        .expect(201);
      const jeton = await rejoindre(session.code as string);

      const reponse = await request(app.getHttpServer())
        .get('/api/participant/moi')
        .set('Authorization', `Bearer ${jeton}`)
        .expect(200);

      const etat = reponse.body as MoiParticipantDto;
      expect(etat.voteOuvert).toBe(false);
      expect(etat.question).toBeNull();
    });

    it('GET /api/participant/moi — 401 pour un Jeton absent ou invalide', async () => {
      await request(app.getHttpServer())
        .get('/api/participant/moi')
        .expect(401);
      await request(app.getHttpServer())
        .get('/api/participant/moi')
        .set('Authorization', 'Bearer inconnu')
        .expect(401);
    });

    it('GET /api/participant/info-session — nom d’équipe et date d’ouverture', async () => {
      const session = await sessionOuverte();
      const jeton = await rejoindre(session.code as string);

      const reponse = await request(app.getHttpServer())
        .get('/api/participant/info-session')
        .set('Authorization', `Bearer ${jeton}`)
        .expect(200);

      const info = reponse.body as InfoSessionParticipantDto;
      expect(info.equipeNom).toBe('Équipe Alpha');
      expect(info.ouvertureLe).not.toBeNull();
      expect(new Date(info.ouvertureLe as string).getTime()).not.toBeNaN();
    });

    it('GET /api/participant/info-session — 401 pour un Jeton absent ou invalide', async () => {
      await request(app.getHttpServer())
        .get('/api/participant/info-session')
        .expect(401);
      await request(app.getHttpServer())
        .get('/api/participant/info-session')
        .set('Authorization', 'Bearer inconnu')
        .expect(401);
    });

    it('ouvrir un Tour révèle les 4 Options côté participant et le numéro/compteur côté pilotage', async () => {
      const session = await sessionOuverte();
      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/passer-question-suivante`)
        .expect(201);
      const jeton = await rejoindre(session.code as string);

      const pilotageAvant = await request(app.getHttpServer())
        .get(`/api/sessions/${session.id}/pilotage`)
        .expect(200);
      expect((pilotageAvant.body as PilotageSessionDto).tourOuvert).toBeNull();

      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/ouvrir-tour`)
        .expect(201);

      const moi = await request(app.getHttpServer())
        .get('/api/participant/moi')
        .set('Authorization', `Bearer ${jeton}`)
        .expect(200);
      const etat = moi.body as MoiParticipantDto;
      expect(etat.voteOuvert).toBe(true);
      expect(etat.question?.options).toHaveLength(4);
      expect(etat.optionChoisieIndex).toBeNull();

      const pilotage = await request(app.getHttpServer())
        .get(`/api/sessions/${session.id}/pilotage`)
        .expect(200);
      expect((pilotage.body as PilotageSessionDto).tourOuvert).toEqual({
        numero: 1,
        nbVotants: 0,
      });
    });

    it('POST /api/sessions/:id/ouvrir-tour — 409 si un Tour est déjà ouvert', async () => {
      const session = await sessionEnVote();

      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/ouvrir-tour`)
        .expect(409);
    });

    it('POST /api/participant/voter puis revote — un seul votant, dernier choix retenu', async () => {
      const session = await sessionEnVote();
      const jeton = await rejoindre(session.code as string);

      const premierVote = await request(app.getHttpServer())
        .post('/api/participant/voter')
        .set('Authorization', `Bearer ${jeton}`)
        .send({ optionIndex: 0 })
        .expect(201);
      expect((premierVote.body as MoiParticipantDto).optionChoisieIndex).toBe(
        0,
      );

      const pilotageApresVote = await request(app.getHttpServer())
        .get(`/api/sessions/${session.id}/pilotage`)
        .expect(200);
      expect(
        (pilotageApresVote.body as PilotageSessionDto).tourOuvert?.nbVotants,
      ).toBe(1);

      const revote = await request(app.getHttpServer())
        .post('/api/participant/voter')
        .set('Authorization', `Bearer ${jeton}`)
        .send({ optionIndex: 3 })
        .expect(201);
      expect((revote.body as MoiParticipantDto).optionChoisieIndex).toBe(3);

      const pilotageApresRevote = await request(app.getHttpServer())
        .get(`/api/sessions/${session.id}/pilotage`)
        .expect(200);
      expect(
        (pilotageApresRevote.body as PilotageSessionDto).tourOuvert?.nbVotants,
      ).toBe(1); // revote : toujours un seul votant
    });

    it('POST /api/participant/voter — 400 pour un optionIndex hors bornes', async () => {
      const session = await sessionEnVote();
      const jeton = await rejoindre(session.code as string);

      await request(app.getHttpServer())
        .post('/api/participant/voter')
        .set('Authorization', `Bearer ${jeton}`)
        .send({ optionIndex: 4 })
        .expect(400);
    });

    it('POST /api/participant/voter — 401 pour un Jeton invalide', async () => {
      await sessionEnVote();

      await request(app.getHttpServer())
        .post('/api/participant/voter')
        .set('Authorization', 'Bearer inconnu')
        .send({ optionIndex: 0 })
        .expect(401);
    });

    it('POST /api/sessions/:id/clore-tour — le compteur de participation redevient invisible côté participant et le Tour disparaît du pilotage', async () => {
      const session = await sessionEnVote();
      const jeton = await rejoindre(session.code as string);
      await request(app.getHttpServer())
        .post('/api/participant/voter')
        .set('Authorization', `Bearer ${jeton}`)
        .send({ optionIndex: 1 })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/clore-tour`)
        .expect(201);

      const moi = await request(app.getHttpServer())
        .get('/api/participant/moi')
        .set('Authorization', `Bearer ${jeton}`)
        .expect(200);
      expect((moi.body as MoiParticipantDto).voteOuvert).toBe(false);

      const pilotage = await request(app.getHttpServer())
        .get(`/api/sessions/${session.id}/pilotage`)
        .expect(200);
      expect((pilotage.body as PilotageSessionDto).tourOuvert).toBeNull();
    });

    it('POST /api/sessions/:id/clore-tour — 409 si aucun Tour n’est ouvert', async () => {
      const session = await sessionOuverte();
      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/passer-question-suivante`)
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/clore-tour`)
        .expect(409);
    });

    it('après clôture, un nouveau Tour (revote sur la même Question) démarre à numero=2', async () => {
      const session = await sessionEnVote();
      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/clore-tour`)
        .expect(201);

      const reouverture = await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/ouvrir-tour`)
        .expect(201);

      expect((reouverture.body as PilotageSessionDto).tourOuvert).toEqual({
        numero: 2,
        nbVotants: 0,
      });
    });
  });

  describe('carte D3 — le Coach clôt le vote et révèle le résultat (#40)', () => {
    it('GET /api/projection/:sessionId — dernierTourClos reflète la répartition des votes après clôture, tourOuvert redevient null', async () => {
      const session = await sessionEnVote();
      const jetonA = await rejoindre(session.code as string);
      const jetonB = await rejoindre(session.code as string);
      const jetonC = await rejoindre(session.code as string);

      await request(app.getHttpServer())
        .post('/api/participant/voter')
        .set('Authorization', `Bearer ${jetonA}`)
        .send({ optionIndex: 1 }) // Niveau 2
        .expect(201);
      await request(app.getHttpServer())
        .post('/api/participant/voter')
        .set('Authorization', `Bearer ${jetonB}`)
        .send({ optionIndex: 2 }) // Niveau 3
        .expect(201);
      await request(app.getHttpServer())
        .post('/api/participant/voter')
        .set('Authorization', `Bearer ${jetonC}`)
        .send({ optionIndex: 2 }) // Niveau 3
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/clore-tour`)
        .expect(201);

      const projection = await request(app.getHttpServer())
        .get(`/api/projection/${session.id}`)
        .expect(200);
      const dto = projection.body as ProjectionSessionDto;
      expect(dto.tourOuvert).toBeNull();
      expect(dto.dernierTourClos).toEqual({
        numero: 1,
        repartition: { 1: 0, 2: 1, 3: 2, 4: 0 },
      });
    });

    it('GET /api/participant/moi — reste hors vote après clôture, sans jamais exposer la répartition des votes', async () => {
      const session = await sessionEnVote();
      const jeton = await rejoindre(session.code as string);
      await request(app.getHttpServer())
        .post('/api/participant/voter')
        .set('Authorization', `Bearer ${jeton}`)
        .send({ optionIndex: 0 })
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/clore-tour`)
        .expect(201);

      const moi = await request(app.getHttpServer())
        .get('/api/participant/moi')
        .set('Authorization', `Bearer ${jeton}`)
        .expect(200);
      expect((moi.body as MoiParticipantDto).voteOuvert).toBe(false);
      expect(moi.body).not.toHaveProperty('dernierTourClos');
      expect(moi.body).not.toHaveProperty('repartition');
    });
  });
});
