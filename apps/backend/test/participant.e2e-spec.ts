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

  /** Comme sessionPreparee, mais avec deux Questions — nécessaire pour tester Sauter/Réactiver
   *  sur une Question autre que la seule courante. */
  async function sessionADeuxQuestions(suffixe: string): Promise<SessionDto> {
    await importer([`qa${suffixe}`, `qb${suffixe}`]);
    const entite = await creerEntite(`DSI-${suffixe}`);
    const equipe = await creerEquipe(`Équipe ${suffixe}`, entite.id);
    const modele = await creerModele(`Diagnostic ${suffixe}`);
    await request(app.getHttpServer())
      .post(`/api/modeles-session/${modele.id}/themes`)
      .send({ questionIds: [`qa${suffixe}`, `qb${suffixe}`] })
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

  /** Comme sessionADeuxQuestions, avec une troisième Question — nécessaire pour "terminer
   *  prématurément" (carte F3) avec une Question Traitée, une Courante et une À venir en même
   *  temps. */
  async function sessionATroisQuestions(suffixe: string): Promise<SessionDto> {
    const questionIds = [`qa${suffixe}`, `qb${suffixe}`, `qc${suffixe}`];
    await importer(questionIds);
    const entite = await creerEntite(`DSI-${suffixe}`);
    const equipe = await creerEquipe(`Équipe ${suffixe}`, entite.id);
    const modele = await creerModele(`Diagnostic ${suffixe}`);
    await request(app.getHttpServer())
      .post(`/api/modeles-session/${modele.id}/themes`)
      .send({ questionIds })
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

  describe('carte E1 — le Coach relance un vote sur la même Question (revote)', () => {
    it('un revote conserve le Tour et les Réponses précédents en base', async () => {
      const session = await sessionEnVote();
      const jetonA = await rejoindre(session.code as string);
      const jetonB = await rejoindre(session.code as string);

      await request(app.getHttpServer())
        .post('/api/participant/voter')
        .set('Authorization', `Bearer ${jetonA}`)
        .send({ optionIndex: 0 })
        .expect(201);
      await request(app.getHttpServer())
        .post('/api/participant/voter')
        .set('Authorization', `Bearer ${jetonB}`)
        .send({ optionIndex: 1 })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/clore-tour`)
        .expect(201);

      const toursApresPremiereCloture = await prisma.tourDeVote.findMany({
        where: { questionId: 'q1' },
      });
      expect(toursApresPremiereCloture).toHaveLength(1);
      const premierTour = toursApresPremiereCloture[0];
      const reponsesDuPremierTour = await prisma.reponse.findMany({
        where: { tourId: premierTour.id },
      });
      expect(reponsesDuPremierTour).toHaveLength(2);
      const idsReponsesPremierTour = reponsesDuPremierTour
        .map((r) => r.id)
        .sort();

      const reouverture = await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/ouvrir-tour`)
        .expect(201);
      expect((reouverture.body as PilotageSessionDto).tourOuvert).toEqual({
        numero: 2,
        nbVotants: 0,
      });

      // Revote des mêmes Jetons avec des choix différents sur le nouveau Tour.
      await request(app.getHttpServer())
        .post('/api/participant/voter')
        .set('Authorization', `Bearer ${jetonA}`)
        .send({ optionIndex: 2 })
        .expect(201);
      await request(app.getHttpServer())
        .post('/api/participant/voter')
        .set('Authorization', `Bearer ${jetonB}`)
        .send({ optionIndex: 3 })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/clore-tour`)
        .expect(201);

      const toursApresRevote = await prisma.tourDeVote.findMany({
        where: { questionId: 'q1' },
        orderBy: { numero: 'asc' },
      });
      expect(toursApresRevote).toHaveLength(2);
      expect(toursApresRevote[0]).toMatchObject({
        id: premierTour.id,
        numero: 1,
        clotureLe: premierTour.clotureLe,
      });
      expect(toursApresRevote[1]).toMatchObject({ numero: 2 });

      // Les Réponses du 1er Tour n'ont pas été supprimées par le revote sur le 2e Tour.
      const reponsesDuPremierTourApresRevote = await prisma.reponse.findMany({
        where: { tourId: premierTour.id },
      });
      expect(reponsesDuPremierTourApresRevote.map((r) => r.id).sort()).toEqual(
        idsReponsesPremierTour,
      );

      const reponsesDuSecondTour = await prisma.reponse.findMany({
        where: { tourId: toursApresRevote[1].id },
      });
      expect(reponsesDuSecondTour).toHaveLength(2);
    });

    it('le nouvel histogramme remplace le précédent sur la projection à la clôture du 2e Tour', async () => {
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

      const projectionApresPremierTour = await request(app.getHttpServer())
        .get(`/api/projection/${session.id}`)
        .expect(200);
      expect(
        (projectionApresPremierTour.body as ProjectionSessionDto)
          .dernierTourClos,
      ).toEqual({
        numero: 1,
        repartition: { 1: 0, 2: 1, 3: 2, 4: 0 },
      });

      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/ouvrir-tour`)
        .expect(201);
      // Revote avec une répartition différente du 1er Tour (tous sur le Niveau 4).
      await request(app.getHttpServer())
        .post('/api/participant/voter')
        .set('Authorization', `Bearer ${jetonA}`)
        .send({ optionIndex: 3 })
        .expect(201);
      await request(app.getHttpServer())
        .post('/api/participant/voter')
        .set('Authorization', `Bearer ${jetonB}`)
        .send({ optionIndex: 3 })
        .expect(201);
      await request(app.getHttpServer())
        .post('/api/participant/voter')
        .set('Authorization', `Bearer ${jetonC}`)
        .send({ optionIndex: 3 })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/clore-tour`)
        .expect(201);

      const projectionApresRevote = await request(app.getHttpServer())
        .get(`/api/projection/${session.id}`)
        .expect(200);
      const dernierTourClosProjection = (
        projectionApresRevote.body as ProjectionSessionDto
      ).dernierTourClos;
      expect(dernierTourClosProjection).toEqual({
        numero: 2,
        repartition: { 1: 0, 2: 0, 3: 0, 4: 3 },
      });

      const pilotageApresRevote = await request(app.getHttpServer())
        .get(`/api/sessions/${session.id}/pilotage`)
        .expect(200);
      expect(
        (pilotageApresRevote.body as PilotageSessionDto).dernierTourClos,
      ).toEqual(dernierTourClosProjection);
    });

    it('une fois passé à la Question suivante, ouvrir un Tour cible la nouvelle Question — plus de revote possible sur l’ancienne', async () => {
      await importer(['qa', 'qb']);
      const entite = await creerEntite('DSI-E1');
      const equipe = await creerEquipe('Équipe E1', entite.id);
      const modele = await creerModele('Diagnostic E1');
      await request(app.getHttpServer())
        .post(`/api/modeles-session/${modele.id}/themes`)
        .send({ questionIds: ['qa', 'qb'] })
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
        .post(`/api/sessions/${session.id}/ouvrir`)
        .expect(201);
      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/passer-question-suivante`)
        .expect(201); // salle d'attente -> qa courante

      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/ouvrir-tour`)
        .expect(201);
      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/clore-tour`)
        .expect(201);
      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/passer-question-suivante`)
        .expect(201); // qa résolue -> qb courante

      const reouverture = await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/ouvrir-tour`)
        .expect(201);
      const pilotage = reouverture.body as PilotageSessionDto;
      expect(pilotage.questionCourante?.questionId).toBe('qb');
      expect(pilotage.tourOuvert).toEqual({ numero: 1, nbVotants: 0 });

      // Aucun revote possible sur qa une fois qu'on est passé à la Question suivante.
      const toursQa = await prisma.tourDeVote.findMany({
        where: { questionId: 'qa' },
      });
      expect(toursQa).toHaveLength(1);
    });
  });

  describe('carte E2 — le Coach consulte l’historique en direct (#42)', () => {
    it('GET /api/sessions/:id/pilotage — historique reste vide tant qu’aucun Tour n’est clos', async () => {
      const session = await sessionEnVote();

      const pilotage = await request(app.getHttpServer())
        .get(`/api/sessions/${session.id}/pilotage`)
        .expect(200);

      expect((pilotage.body as PilotageSessionDto).historique).toEqual([]);
    });

    it('historique liste tous les Tours clos de la Session, groupés par Question, avec les deux Tours d’une Question revotée', async () => {
      await importer(['qa', 'qb']);
      const entite = await creerEntite('DSI-E2');
      const equipe = await creerEquipe('Équipe E2', entite.id);
      const modele = await creerModele('Diagnostic E2');
      await request(app.getHttpServer())
        .post(`/api/modeles-session/${modele.id}/themes`)
        .send({ questionIds: ['qa', 'qb'] })
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
      const ouverture = await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/ouvrir`)
        .expect(201);
      const code = (ouverture.body as SessionDto).code as string;
      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/passer-question-suivante`)
        .expect(201); // salle d'attente -> qa courante

      const jetonA = await rejoindre(code);
      const jetonB = await rejoindre(code);

      // qa, Tour 1 : 2 votes Niveau 1 ({ 1: 2, 2: 0, 3: 0, 4: 0 }).
      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/ouvrir-tour`)
        .expect(201);
      await request(app.getHttpServer())
        .post('/api/participant/voter')
        .set('Authorization', `Bearer ${jetonA}`)
        .send({ optionIndex: 0 })
        .expect(201);
      await request(app.getHttpServer())
        .post('/api/participant/voter')
        .set('Authorization', `Bearer ${jetonB}`)
        .send({ optionIndex: 0 })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/clore-tour`)
        .expect(201);

      // qa, Tour 2 (revote) : 2 votes Niveau 4 ({ 1: 0, 2: 0, 3: 0, 4: 2 }).
      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/ouvrir-tour`)
        .expect(201);
      await request(app.getHttpServer())
        .post('/api/participant/voter')
        .set('Authorization', `Bearer ${jetonA}`)
        .send({ optionIndex: 3 })
        .expect(201);
      await request(app.getHttpServer())
        .post('/api/participant/voter')
        .set('Authorization', `Bearer ${jetonB}`)
        .send({ optionIndex: 3 })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/clore-tour`)
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/passer-question-suivante`)
        .expect(201); // qa résolue -> qb courante

      // qb, Tour 1 : 1 vote Niveau 2 ({ 1: 0, 2: 1, 3: 0, 4: 0 }).
      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/ouvrir-tour`)
        .expect(201);
      await request(app.getHttpServer())
        .post('/api/participant/voter')
        .set('Authorization', `Bearer ${jetonA}`)
        .send({ optionIndex: 1 })
        .expect(201);
      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/clore-tour`)
        .expect(201);

      const pilotage = await request(app.getHttpServer())
        .get(`/api/sessions/${session.id}/pilotage`)
        .expect(200);

      expect((pilotage.body as PilotageSessionDto).historique).toEqual([
        {
          questionId: 'qa',
          libelle: 'Libellé qa',
          numero: 1,
          repartition: { 1: 2, 2: 0, 3: 0, 4: 0 },
        },
        {
          questionId: 'qa',
          libelle: 'Libellé qa',
          numero: 2,
          repartition: { 1: 0, 2: 0, 3: 0, 4: 2 },
        },
        {
          questionId: 'qb',
          libelle: 'Libellé qb',
          numero: 1,
          repartition: { 1: 0, 2: 1, 3: 0, 4: 0 },
        },
      ]);
    });
  });

  describe('carte F2 — le Coach saute une Question (#44)', () => {
    it('saute la Question courante alors qu’un Tour est ouvert avec des votes : le Tour est clos sans résultat, indexCourant avance', async () => {
      const session = await sessionADeuxQuestions('F2a');
      const ouverture = await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/ouvrir`)
        .expect(201);
      const code = (ouverture.body as SessionDto).code as string;
      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/passer-question-suivante`)
        .expect(201); // salle d'attente -> qaF2a courante

      const jeton = await rejoindre(code);
      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/ouvrir-tour`)
        .expect(201);
      await request(app.getHttpServer())
        .post('/api/participant/voter')
        .set('Authorization', `Bearer ${jeton}`)
        .send({ optionIndex: 0 })
        .expect(201);

      const saut = await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/questions/qaF2a/sauter`)
        .expect(201);
      const pilotageApresSaut = saut.body as PilotageSessionDto;
      expect(pilotageApresSaut.progression).toEqual([
        // Sautée en tant que courante : indexCourant l'a dépassée dans la même opération ->
        // jamais réactivable (addendum "Réactiver").
        {
          questionId: 'qaF2a',
          libelle: 'Libellé qaF2a',
          statut: 'SAUTEE',
          reactivable: false,
        },
        {
          questionId: 'qbF2a',
          libelle: 'Libellé qbF2a',
          statut: 'COURANTE',
          reactivable: false,
        },
      ]);
      expect(pilotageApresSaut.questionCourante?.questionId).toBe('qbF2a');
      expect(pilotageApresSaut.tourOuvert).toBeNull();
      // "sans qu'aucun résultat n'en découle" : le Tour forcé-clos de qaF2a n'apparaît pas.
      expect(pilotageApresSaut.historique).toEqual([]);

      const pilotage = await request(app.getHttpServer())
        .get(`/api/sessions/${session.id}/pilotage`)
        .expect(200);
      expect((pilotage.body as PilotageSessionDto).historique).toEqual([]);
    });

    it('saute une Question à venir sans Tour, sans changer la Question courante', async () => {
      const session = await sessionADeuxQuestions('F2b');
      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/ouvrir`)
        .expect(201);
      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/passer-question-suivante`)
        .expect(201); // salle d'attente -> qaF2b courante

      const saut = await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/questions/qbF2b/sauter`)
        .expect(201);
      const pilotage = saut.body as PilotageSessionDto;
      expect(pilotage.progression).toEqual([
        {
          questionId: 'qaF2b',
          libelle: 'Libellé qaF2b',
          statut: 'COURANTE',
          reactivable: false,
        },
        // Sautée par anticipation, toujours devant indexCourant : réactivable.
        {
          questionId: 'qbF2b',
          libelle: 'Libellé qbF2b',
          statut: 'SAUTEE',
          reactivable: true,
        },
      ]);
      expect(pilotage.questionCourante?.questionId).toBe('qaF2b');
    });

    it('POST /api/sessions/:id/questions/:questionId/sauter — 404 si la Session est inconnue', async () => {
      await request(app.getHttpServer())
        .post('/api/sessions/inconnue/questions/qa/sauter')
        .expect(404);
    });

    it('POST /api/sessions/:id/questions/:questionId/sauter — 409 si la Session n’est pas OUVERTE', async () => {
      const session = await sessionPreparee('F2c');

      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/questions/q1F2c/sauter`)
        .expect(409);
    });

    it('POST /api/sessions/:id/questions/:questionId/sauter — 404 si la Question n’appartient pas à la Sélection', async () => {
      const session = await sessionOuverte('F2d');

      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/questions/inconnue/sauter`)
        .expect(404);
    });

    it('POST /api/sessions/:id/questions/:questionId/sauter — 409 si la Question est déjà sautée', async () => {
      const session = await sessionOuverte('F2e');
      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/questions/q1F2e/sauter`)
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/questions/q1F2e/sauter`)
        .expect(409);
    });
  });

  describe('carte #44 addendum — le Coach réactive une Question sautée', () => {
    it('réactive une Question sautée par anticipation : elle redevient à venir', async () => {
      const session = await sessionADeuxQuestions('Ra');
      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/ouvrir`)
        .expect(201);
      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/passer-question-suivante`)
        .expect(201); // salle d'attente -> qaRa courante
      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/questions/qbRa/sauter`)
        .expect(201); // qbRa sautée par anticipation, toujours devant indexCourant

      const reactivation = await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/questions/qbRa/reactiver`)
        .expect(201);
      const pilotage = reactivation.body as PilotageSessionDto;
      expect(pilotage.progression).toEqual([
        {
          questionId: 'qaRa',
          libelle: 'Libellé qaRa',
          statut: 'COURANTE',
          reactivable: false,
        },
        {
          questionId: 'qbRa',
          libelle: 'Libellé qbRa',
          statut: 'A_VENIR',
          reactivable: false,
        },
      ]);
    });

    it('409 si on tente de réactiver la Question qu’on vient de sauter en tant que courante', async () => {
      const session = await sessionADeuxQuestions('Rb');
      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/ouvrir`)
        .expect(201);
      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/passer-question-suivante`)
        .expect(201); // salle d'attente -> qaRb courante
      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/questions/qaRb/sauter`)
        .expect(201); // qaRb sautée en tant que courante -> indexCourant avance à qbRb

      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/questions/qaRb/reactiver`)
        .expect(409);
    });

    it('POST /api/sessions/:id/questions/:questionId/reactiver — 409 si la Question n’est pas sautée', async () => {
      const session = await sessionOuverte('Rc');

      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/questions/q1Rc/reactiver`)
        .expect(409);
    });

    it('POST /api/sessions/:id/questions/:questionId/reactiver — 404 si la Session est inconnue', async () => {
      await request(app.getHttpServer())
        .post('/api/sessions/inconnue/questions/qa/reactiver')
        .expect(404);
    });

    it('POST /api/sessions/:id/questions/:questionId/reactiver — 404 si la Question n’appartient pas à la Sélection', async () => {
      const session = await sessionOuverte('Rd');

      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/questions/inconnue/reactiver`)
        .expect(404);
    });

    it('POST /api/sessions/:id/questions/:questionId/reactiver — 409 si la Session n’est pas OUVERTE', async () => {
      const session = await sessionPreparee('Re');

      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/questions/q1Re/reactiver`)
        .expect(409);
    });
  });

  describe('carte F3 — le Coach termine la séance prématurément (#45)', () => {
    it('depuis la salle d’attente : toutes les Questions deviennent Sautées', async () => {
      const session = await sessionADeuxQuestions('F3a');
      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/ouvrir`)
        .expect(201);

      const reponse = await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/terminer-prematurement`)
        .expect(201);
      const pilotage = reponse.body as PilotageSessionDto;
      expect(pilotage.progression).toEqual([
        // Aucune Question n'a jamais été courante : indexCourant n'a pas bougé, donc les deux
        // restent réactivables (même mécanique que Sauter une Question à venir, carte F2).
        {
          questionId: 'qaF3a',
          libelle: 'Libellé qaF3a',
          statut: 'SAUTEE',
          reactivable: true,
        },
        {
          questionId: 'qbF3a',
          libelle: 'Libellé qbF3a',
          statut: 'SAUTEE',
          reactivable: true,
        },
      ]);
      expect(pilotage.questionCourante).toBeNull();
    });

    it('avec un Tour ouvert et des votes sur la Question courante : le Tour est clos sans résultat, le reste est sauté', async () => {
      const session = await sessionATroisQuestions('F3b');
      const ouverture = await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/ouvrir`)
        .expect(201);
      const code = (ouverture.body as SessionDto).code as string;
      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/passer-question-suivante`)
        .expect(201); // salle d'attente -> qaF3b courante

      const jeton = await rejoindre(code);
      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/ouvrir-tour`)
        .expect(201);
      await request(app.getHttpServer())
        .post('/api/participant/voter')
        .set('Authorization', `Bearer ${jeton}`)
        .send({ optionIndex: 0 })
        .expect(201);

      const reponse = await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/terminer-prematurement`)
        .expect(201);
      const pilotage = reponse.body as PilotageSessionDto;
      expect(pilotage.progression).toEqual([
        {
          questionId: 'qaF3b',
          libelle: 'Libellé qaF3b',
          statut: 'SAUTEE',
          reactivable: false,
        },
        {
          questionId: 'qbF3b',
          libelle: 'Libellé qbF3b',
          statut: 'SAUTEE',
          reactivable: false,
        },
        {
          questionId: 'qcF3b',
          libelle: 'Libellé qcF3b',
          statut: 'SAUTEE',
          reactivable: false,
        },
      ]);
      expect(pilotage.questionCourante).toBeNull();
      expect(pilotage.tourOuvert).toBeNull();
      // "sans qu'aucun résultat n'en découle" : le Tour forcé-clos de qaF3b n'apparaît pas.
      expect(pilotage.historique).toEqual([]);
    });

    it('laisse intacte une Question déjà Traitée (Tour clos)', async () => {
      const session = await sessionATroisQuestions('F3c');
      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/ouvrir`)
        .expect(201);
      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/passer-question-suivante`)
        .expect(201); // salle d'attente -> qaF3c courante
      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/ouvrir-tour`)
        .expect(201);
      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/clore-tour`)
        .expect(201); // qaF3c traitée
      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/passer-question-suivante`)
        .expect(201); // qaF3c résolue -> qbF3c courante

      const reponse = await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/terminer-prematurement`)
        .expect(201);
      const pilotage = reponse.body as PilotageSessionDto;
      expect(pilotage.progression).toEqual([
        {
          questionId: 'qaF3c',
          libelle: 'Libellé qaF3c',
          statut: 'TRAITEE',
          reactivable: false,
        },
        {
          questionId: 'qbF3c',
          libelle: 'Libellé qbF3c',
          statut: 'SAUTEE',
          reactivable: false,
        },
        {
          questionId: 'qcF3c',
          libelle: 'Libellé qcF3c',
          statut: 'SAUTEE',
          reactivable: false,
        },
      ]);
    });

    it('POST /api/sessions/:id/terminer-prematurement — 404 si la Session est inconnue', async () => {
      await request(app.getHttpServer())
        .post('/api/sessions/inconnue/terminer-prematurement')
        .expect(404);
    });

    it('POST /api/sessions/:id/terminer-prematurement — 409 si la Session n’est pas OUVERTE', async () => {
      const session = await sessionPreparee('F3d');

      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/terminer-prematurement`)
        .expect(409);
    });

    it('appelée une seconde fois alors que tout est déjà traité/sauté : no-op, toujours 201', async () => {
      const session = await sessionADeuxQuestions('F3e');
      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/ouvrir`)
        .expect(201);
      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/terminer-prematurement`)
        .expect(201);

      const reponse = await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/terminer-prematurement`)
        .expect(201);
      const pilotage = reponse.body as PilotageSessionDto;
      expect(pilotage.progression.every((p) => p.statut === 'SAUTEE')).toBe(
        true,
      );
    });
  });

  describe('carte G1 — le Coach termine la séance (#46)', () => {
    it('POST /api/sessions/:id/terminer — 404 si la Session est inconnue', async () => {
      await request(app.getHttpServer())
        .post('/api/sessions/inconnue/terminer')
        .expect(404);
    });

    it('POST /api/sessions/:id/terminer — 409 si la Session est encore PREPAREE', async () => {
      const session = await sessionPreparee('G1a');

      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/terminer`)
        .expect(409);
    });

    it('POST /api/sessions/:id/terminer — 409 si la Session est déjà CLOTUREE (double clôture)', async () => {
      const session = await sessionOuverte('G1b');
      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/terminer`)
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/terminer`)
        .expect(409);
    });

    it('depuis OUVERTE : clôture la Session (statut CLOTUREE dans la réponse)', async () => {
      const session = await sessionOuverte('G1c');

      const reponse = await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/terminer`)
        .expect(201);

      const pilotage = reponse.body as PilotageSessionDto;
      expect(pilotage.statut).toBe('CLOTUREE');
    });

    it('après clôture : GET /api/sessions/:id/pilotage reste accessible en lecture seule avec la même progression', async () => {
      const session = await sessionADeuxQuestions('G1d');
      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/ouvrir`)
        .expect(201);
      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/terminer-prematurement`)
        .expect(201);

      const avantCloture = await request(app.getHttpServer())
        .get(`/api/sessions/${session.id}/pilotage`)
        .expect(200);

      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/terminer`)
        .expect(201);

      const apresCloture = await request(app.getHttpServer())
        .get(`/api/sessions/${session.id}/pilotage`)
        .expect(200);
      const pilotage = apresCloture.body as PilotageSessionDto;
      expect(pilotage.statut).toBe('CLOTUREE');
      expect(pilotage.progression).toEqual(
        (avantCloture.body as PilotageSessionDto).progression,
      );
    });

    it('après clôture : GET /api/projection/:id devient inaccessible (404)', async () => {
      const session = await sessionOuverte('G1e');
      await request(app.getHttpServer())
        .get(`/api/projection/${session.id}`)
        .expect(200);

      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/terminer`)
        .expect(201);

      await request(app.getHttpServer())
        .get(`/api/projection/${session.id}`)
        .expect(404);
    });

    it('après clôture : le Code de session ne permet plus de rejoindre (404, aucun nouveau Jeton)', async () => {
      const session = await sessionOuverte('G1f');
      await request(app.getHttpServer())
        .post(`/api/sessions/${session.id}/terminer`)
        .expect(201);

      await request(app.getHttpServer())
        .post('/api/participant/rejoindre')
        .send({ code: session.code })
        .expect(404);
    });
  });
});
