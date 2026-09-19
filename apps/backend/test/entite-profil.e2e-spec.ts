import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  EntiteDto,
  EquipeDto,
  JetonSessionDto,
  ModeleCollecteDto,
  ProfilEntiteDto,
  SessionDto,
} from '@agilometre/shared';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { jetonCoachDeTest } from './support/jeton-coach';
import { configureReferentielImportBodyParser } from './../src/referentiel/configure-import-body-parser';
import { ScoringV1 } from './../src/scoring/domain/scoring-v1';

describe('Palier agrégé d’une Entité (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let jetonCoach: string;

  // Même durée par défaut que SCORING_DUREE_PERIODE_MOIS (env.validation.ts), non surchargée par
  // .env.test — recalculée ici pour construire des Sessions dedans/dehors de la dernière Période
  // complète, sans port horloge dans ce codebase (cf. Session.ouvrir()).
  const scoring = new ScoringV1();
  const periodeEnCours = scoring.periodeContenant(new Date(), 3);
  const periode = scoring.periodePrecedente(periodeEnCours, 3);
  const uneJourneeMs = 24 * 60 * 60 * 1000;
  const dateDansLaPeriode = new Date(
    periode.debut.getTime() + uneJourneeMs,
  ).toISOString();

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
    await prisma.participation.deleteMany();
    await prisma.jetonSession.deleteMany();
    await prisma.reponse.deleteMany();
    await prisma.tourDeVote.deleteMany();
    await prisma.sessionSelectionItem.deleteMany();
    await prisma.sessionQuestionSautee.deleteMany();
    await prisma.session.deleteMany();
    await prisma.selectionItem.deleteMany();
    await prisma.modeleCollecte.deleteMany();
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
      .set('Authorization', `Bearer ${jetonCoach}`)
      .set('Content-Type', 'text/plain')
      .send(
        [
          'themes:',
          '  - id: t1',
          '    libelle: Thème unique',
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

  /** Crée, ouvre, fait voter un jeton sur q1 au Niveau `niveau`, clôt le Tour puis termine la Session. */
  async function sessionVoteeEtTerminee(
    equipeId: string,
    modeleId: string,
    date: string,
    niveau: 1 | 2 | 3 | 4,
  ): Promise<SessionDto> {
    const creation = await request(app.getHttpServer())
      .post('/api/sessions')
      .set('Authorization', `Bearer ${jetonCoach}`)
      .send({ equipeId, date, modeleCollecteId: modeleId })
      .expect(201);
    const sessionPreparee = creation.body as SessionDto;
    const ouverture = await request(app.getHttpServer())
      .post(`/api/sessions/${sessionPreparee.id}/ouvrir`)
      .set('Authorization', `Bearer ${jetonCoach}`)
      .expect(201);
    const session = ouverture.body as SessionDto;
    await request(app.getHttpServer())
      .post(`/api/sessions/${session.id}/passer-question-suivante`)
      .set('Authorization', `Bearer ${jetonCoach}`)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/sessions/${session.id}/ouvrir-tour`)
      .set('Authorization', `Bearer ${jetonCoach}`)
      .expect(201);
    const jetonReponse = await request(app.getHttpServer())
      .post('/api/participant/rejoindre')
      .send({ code: session.code })
      .expect(201);
    const jeton = (jetonReponse.body as JetonSessionDto).jeton;
    await request(app.getHttpServer())
      .post('/api/participant/voter')
      .set('Authorization', `Bearer ${jeton}`)
      .send({ optionIndex: niveau - 1 })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/sessions/${session.id}/clore-tour`)
      .set('Authorization', `Bearer ${jetonCoach}`)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/sessions/${session.id}/terminer`)
      .set('Authorization', `Bearer ${jetonCoach}`)
      .expect(201);
    return session;
  }

  async function ajouterThemeAuModele(modeleId: string): Promise<void> {
    await request(app.getHttpServer())
      .post(`/api/modeles-collecte/${modeleId}/themes`)
      .set('Authorization', `Bearer ${jetonCoach}`)
      .send({ questionIds: ['q1'] })
      .expect(201);
  }

  it('fusionne les Réponses brutes des deux Équipes en un seul Palier — jamais une moyenne des Paliers d’Équipe', async () => {
    await importer();
    const entite = await creerEntite('DSI');
    const equipeAlpha = await creerEquipe('Alpha', entite.id);
    const equipeBeta = await creerEquipe('Beta', entite.id);
    const modele = await creerModele('Diagnostic');
    await ajouterThemeAuModele(modele.id);

    // Alpha vote Niveau 2, Beta vote Niveau 4 sur la même Question.
    await sessionVoteeEtTerminee(
      equipeAlpha.id,
      modele.id,
      dateDansLaPeriode,
      2,
    );
    await sessionVoteeEtTerminee(
      equipeBeta.id,
      modele.id,
      dateDansLaPeriode,
      4,
    );

    const reponse = await request(app.getHttpServer())
      .get(`/api/organisation/entites/${entite.id}/profil`)
      .set('Authorization', `Bearer ${jetonCoach}`)
      .expect(200);
    const profil = reponse.body as ProfilEntiteDto;

    expect(profil.entiteNom).toBe('DSI');
    expect(profil.effectifGlobal).toBe(2);
    // Fusion des Niveaux bruts [2, 4], jamais une moyenne des Paliers d'Équipe pris séparément —
    // calculé indépendamment ici via le même moteur de scoring, pas une valeur en dur.
    const attendu = scoring.calculerPalier(
      [2, 4],
      scoring.pourcentageVersFraction(60),
    );
    if (!('palier' in attendu)) throw new Error('effectif attendu > 0');
    expect(profil.palierGlobal).toBe(attendu.palier);
    expect(profil.tauxApprocheGlobal).toBe(attendu.tauxApproche);
    expect(profil.margeAvantDescenteGlobal).toBe(attendu.margeAvantDescente);
  });

  it('renvoie un effectif nul quand l’Entité n’a aucune Équipe', async () => {
    const entite = await creerEntite('Entité vide');

    const reponse = await request(app.getHttpServer())
      .get(`/api/organisation/entites/${entite.id}/profil`)
      .set('Authorization', `Bearer ${jetonCoach}`)
      .expect(200);
    const profil = reponse.body as ProfilEntiteDto;

    expect(profil.effectifGlobal).toBe(0);
    expect(profil.palierGlobal).toBeNull();
  });

  it('renvoie 404 pour une Entité inconnue', async () => {
    await request(app.getHttpServer())
      .get('/api/organisation/entites/inconnue/profil')
      .set('Authorization', `Bearer ${jetonCoach}`)
      .expect(404);
  });

  it('renvoie 400 pour un offset inférieur à -1', async () => {
    const entite = await creerEntite('DSI');

    await request(app.getHttpServer())
      .get(`/api/organisation/entites/${entite.id}/profil?offset=-2`)
      .set('Authorization', `Bearer ${jetonCoach}`)
      .expect(400);
  });

  it('calcule l’Évolution globale par rapport à la Période précédente, agrégée sur les deux Équipes', async () => {
    await importer();
    const entite = await creerEntite('DSI');
    const equipeAlpha = await creerEquipe('Alpha', entite.id);
    const equipeBeta = await creerEquipe('Beta', entite.id);
    const modele = await creerModele('Diagnostic');
    await ajouterThemeAuModele(modele.id);

    const periodeEncoreAvant = scoring.periodePrecedente(periode, 3);
    const dateDeuxPeriodesAvant = new Date(
      periodeEncoreAvant.debut.getTime() + uneJourneeMs,
    ).toISOString();

    // Les deux Équipes votent Niveau 1 en Période précédente, Niveau 4 en Période affichée : hausse.
    await sessionVoteeEtTerminee(
      equipeAlpha.id,
      modele.id,
      dateDansLaPeriode,
      4,
    );
    await sessionVoteeEtTerminee(
      equipeBeta.id,
      modele.id,
      dateDansLaPeriode,
      4,
    );
    await sessionVoteeEtTerminee(
      equipeAlpha.id,
      modele.id,
      dateDeuxPeriodesAvant,
      1,
    );
    await sessionVoteeEtTerminee(
      equipeBeta.id,
      modele.id,
      dateDeuxPeriodesAvant,
      1,
    );

    const reponse = await request(app.getHttpServer())
      .get(`/api/organisation/entites/${entite.id}/profil`)
      .set('Authorization', `Bearer ${jetonCoach}`)
      .expect(200);
    const profil = reponse.body as ProfilEntiteDto;

    expect(profil.aPeriodePrecedente).toBe(true);
    expect(profil.evolutionGlobale).toBe('hausse');
  });

  it('navigue vers la Période en cours via `?offset=-1`, marquée incomplète', async () => {
    await importer();
    const entite = await creerEntite('DSI');
    const equipe = await creerEquipe('Alpha', entite.id);
    const modele = await creerModele('Diagnostic');
    await ajouterThemeAuModele(modele.id);

    const dateDansLaPeriodeEnCours = new Date(
      periodeEnCours.debut.getTime() + uneJourneeMs,
    ).toISOString();
    await sessionVoteeEtTerminee(
      equipe.id,
      modele.id,
      dateDansLaPeriodeEnCours,
      3,
    );

    const reponse = await request(app.getHttpServer())
      .get(`/api/organisation/entites/${entite.id}/profil?offset=-1`)
      .set('Authorization', `Bearer ${jetonCoach}`)
      .expect(200);
    const profil = reponse.body as ProfilEntiteDto;

    expect(profil.periodeDebut).toBe(periodeEnCours.debut.toISOString());
    expect(profil.periodeEnCours).toBe(true);
    expect(profil.effectifGlobal).toBe(1);
  });
});
