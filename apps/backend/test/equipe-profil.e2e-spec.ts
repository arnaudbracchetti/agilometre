import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  EntiteDto,
  EquipeDto,
  JetonSessionDto,
  ModeleSessionDto,
  ProfilEquipeDto,
  SessionDto,
} from '@agilometre/shared';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { configureReferentielImportBodyParser } from './../src/referentiel/configure-import-body-parser';
import { ScoringV1 } from './../src/scoring/domain/scoring-v1';

describe('Profil par Thème d’une Équipe (e2e) — carte #53', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  // Même durée par défaut que SCORING_DUREE_PERIODE_MOIS (env.validation.ts), non surchargée par
  // .env.test — recalculée ici pour construire des Sessions dedans/dehors de la dernière Période
  // complète (celle précédant la Période en cours, cf. ObtenirProfilEquipe), sans port horloge
  // dans ce codebase (cf. Session.ouvrir()).
  const scoring = new ScoringV1();
  const periodeEnCours = scoring.periodeContenant(new Date(), 3);
  const periode = scoring.periodePrecedente(periodeEnCours, 3);
  const uneJourneeMs = 24 * 60 * 60 * 1000;
  const dateDansLaPeriode = new Date(
    periode.debut.getTime() + uneJourneeMs,
  ).toISOString();
  const dateHorsPeriode = new Date(
    periode.debut.getTime() - uneJourneeMs,
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
          '    libelle: Thème répondu',
          '    questions:',
          '      - id: q1',
          '        libelle: Libellé q1',
          '        options:',
          '          - { libelle: Jamais, niveau: 1 }',
          '          - { libelle: Parfois, niveau: 2 }',
          '          - { libelle: Souvent, niveau: 3 }',
          '          - { libelle: Toujours, niveau: 4 }',
          '  - id: t2',
          '    libelle: Thème non évalué',
          '    questions:',
          '      - id: q2',
          '        libelle: Libellé q2',
          '        options:',
          '          - { libelle: Jamais, niveau: 1 }',
          '          - { libelle: Parfois, niveau: 2 }',
          '          - { libelle: Souvent, niveau: 3 }',
          '          - { libelle: Toujours, niveau: 4 }',
          '  - id: t-archive',
          '    libelle: Thème à archiver',
          '    questions:',
          '      - id: q-archive',
          '        libelle: Libellé q-archive',
          '        options:',
          '          - { libelle: Jamais, niveau: 1 }',
          '          - { libelle: Parfois, niveau: 2 }',
          '          - { libelle: Souvent, niveau: 3 }',
          '          - { libelle: Toujours, niveau: 4 }',
        ].join('\n'),
      )
      .expect(201);
  }

  /** Ré-importe sans t-archive : archive ce Thème (ADR-0015 : les Réponses passées restent, mais
   * il doit disparaître d'un calcul en Portée périodique). */
  async function archiverThemeArchive(): Promise<void> {
    await request(app.getHttpServer())
      .post('/api/referentiel/import/application')
      .set('Content-Type', 'text/plain')
      .send(
        [
          'themes:',
          '  - id: t1',
          '    libelle: Thème répondu',
          '    questions:',
          '      - id: q1',
          '        libelle: Libellé q1',
          '        options:',
          '          - { libelle: Jamais, niveau: 1 }',
          '          - { libelle: Parfois, niveau: 2 }',
          '          - { libelle: Souvent, niveau: 3 }',
          '          - { libelle: Toujours, niveau: 4 }',
          '  - id: t2',
          '    libelle: Thème non évalué',
          '    questions:',
          '      - id: q2',
          '        libelle: Libellé q2',
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

  /** Crée, ouvre, fait voter un jeton sur q1 (Niveau 3), clôt le Tour puis termine la Session. */
  async function sessionVoteeEtTerminee(
    equipeId: string,
    modeleId: string,
    date: string,
  ): Promise<SessionDto> {
    const creation = await request(app.getHttpServer())
      .post('/api/sessions')
      .send({ equipeId, date, modeleSessionId: modeleId })
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
    const jetonReponse = await request(app.getHttpServer())
      .post('/api/participant/rejoindre')
      .send({ code: session.code })
      .expect(201);
    const jeton = (jetonReponse.body as JetonSessionDto).jeton;
    await request(app.getHttpServer())
      .post('/api/participant/voter')
      .set('Authorization', `Bearer ${jeton}`)
      .send({ optionIndex: 2 }) // Niveau 3
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/sessions/${session.id}/clore-tour`)
      .expect(201);
    await request(app.getHttpServer())
      .post(`/api/sessions/${session.id}/terminer`)
      .expect(201);
    return session;
  }

  it('agrège la Session close dans la Période, exclut celle hors Période et le Thème archivé, garde le Thème sans Réponse marqué non évalué', async () => {
    await importer();
    const entite = await creerEntite('DSI');
    const equipe = await creerEquipe('Équipe Alpha', entite.id);
    const modele = await creerModele('Diagnostic');
    await request(app.getHttpServer())
      .post(`/api/modeles-session/${modele.id}/themes`)
      .send({ questionIds: ['q1'] })
      .expect(201);
    await archiverThemeArchive();

    await sessionVoteeEtTerminee(equipe.id, modele.id, dateDansLaPeriode);
    await sessionVoteeEtTerminee(equipe.id, modele.id, dateHorsPeriode);

    const reponse = await request(app.getHttpServer())
      .get(`/api/organisation/equipes/${equipe.id}/profil`)
      .expect(200);
    const profil = reponse.body as ProfilEquipeDto;

    expect(profil.periodeDebut).toBe(periode.debut.toISOString());
    expect(profil.periodeFin).toBe(periode.fin.toISOString());
    expect(profil.periodeEnCours).toBe(false);
    expect(profil.themes.map((t) => t.themeId).sort()).toEqual(['t1', 't2']);

    const themeRepondu = profil.themes.find((t) => t.themeId === 't1')!;
    // Une seule Session compte (celle dans la Période) : effectif 1, pas 2.
    expect(themeRepondu.effectif).toBe(1);
    expect(themeRepondu.palier).toBe(3);
    // dateHorsPeriode tombe dans la Période immédiatement précédente (contiguïté) et vote au même
    // Niveau 3 : même Palier des deux côtés → Évolution stable.
    expect(themeRepondu.evolution).toBe('stable');
    expect(profil.evolutionGlobale).toBe('stable');

    const themeNonEvalue = profil.themes.find((t) => t.themeId === 't2')!;
    expect(themeNonEvalue.palier).toBeNull();
    expect(themeNonEvalue.effectif).toBe(0);
    // t2 n'a de Réponse ni dans la Période affichée ni dans la précédente : rien à comparer.
    expect(themeNonEvalue.evolution).toBeNull();
  });

  it('renvoie 404 pour une Équipe inconnue', async () => {
    await request(app.getHttpServer())
      .get('/api/organisation/equipes/inconnue/profil')
      .expect(404);
  });

  it('navigue vers la Période précédente via `?offset=1` et signale son existence via `aPeriodePrecedente`', async () => {
    await importer();
    const entite = await creerEntite('DSI');
    const equipe = await creerEquipe('Équipe Alpha', entite.id);
    const modele = await creerModele('Diagnostic');
    await request(app.getHttpServer())
      .post(`/api/modeles-session/${modele.id}/themes`)
      .send({ questionIds: ['q1'] })
      .expect(201);
    await archiverThemeArchive();

    const periodeEncoreAvant = scoring.periodePrecedente(periode, 3);
    const dateDeuxPeriodesAvant = new Date(
      periodeEncoreAvant.debut.getTime() + uneJourneeMs,
    ).toISOString();

    await sessionVoteeEtTerminee(equipe.id, modele.id, dateDansLaPeriode);
    await sessionVoteeEtTerminee(equipe.id, modele.id, dateDeuxPeriodesAvant);

    const reponseDerniereComplete = await request(app.getHttpServer())
      .get(`/api/organisation/equipes/${equipe.id}/profil`)
      .expect(200);
    const profilDerniereComplete =
      reponseDerniereComplete.body as ProfilEquipeDto;
    expect(profilDerniereComplete.periodeDebut).toBe(
      periode.debut.toISOString(),
    );
    // Une Session close existe dans `periodeEncoreAvant`, avant la Période affichée.
    expect(profilDerniereComplete.aPeriodePrecedente).toBe(true);
    // Même Niveau 3 des deux côtés (Période affichée et periodeEncoreAvant) : Évolution stable.
    expect(profilDerniereComplete.evolutionGlobale).toBe('stable');

    const reponseOffset1 = await request(app.getHttpServer())
      .get(`/api/organisation/equipes/${equipe.id}/profil?offset=1`)
      .expect(200);
    const profilOffset1 = reponseOffset1.body as ProfilEquipeDto;
    expect(profilOffset1.periodeDebut).toBe(
      periodeEncoreAvant.debut.toISOString(),
    );
    const themeRepondu = profilOffset1.themes.find((t) => t.themeId === 't1')!;
    expect(themeRepondu.effectif).toBe(1);
    // Aucune Session close n'existe avant `periodeEncoreAvant` dans ce scénario.
    expect(profilOffset1.aPeriodePrecedente).toBe(false);
    expect(profilOffset1.evolutionGlobale).toBeNull();
  });

  it('renvoie 400 pour un offset inférieur à -1', async () => {
    await importer();
    const entite = await creerEntite('DSI');
    const equipe = await creerEquipe('Équipe Alpha', entite.id);

    await request(app.getHttpServer())
      .get(`/api/organisation/equipes/${equipe.id}/profil?offset=-2`)
      .expect(400);
  });

  it('navigue vers la Période en cours via `?offset=-1`, marquée incomplète', async () => {
    await importer();
    const entite = await creerEntite('DSI');
    const equipe = await creerEquipe('Équipe Alpha', entite.id);
    const modele = await creerModele('Diagnostic');
    await request(app.getHttpServer())
      .post(`/api/modeles-session/${modele.id}/themes`)
      .send({ questionIds: ['q1'] })
      .expect(201);
    await archiverThemeArchive();

    const dateDansLaPeriodeEnCours = new Date(
      periodeEnCours.debut.getTime() + uneJourneeMs,
    ).toISOString();
    await sessionVoteeEtTerminee(
      equipe.id,
      modele.id,
      dateDansLaPeriodeEnCours,
    );

    const reponse = await request(app.getHttpServer())
      .get(`/api/organisation/equipes/${equipe.id}/profil?offset=-1`)
      .expect(200);
    const profil = reponse.body as ProfilEquipeDto;

    expect(profil.periodeDebut).toBe(periodeEnCours.debut.toISOString());
    expect(profil.periodeFin).toBe(periodeEnCours.fin.toISOString());
    expect(profil.periodeEnCours).toBe(true);
    const themeRepondu = profil.themes.find((t) => t.themeId === 't1')!;
    expect(themeRepondu.effectif).toBe(1);
    // Aucune Session close n'existe avant la Période en cours dans ce scénario : rien à comparer.
    expect(profil.evolutionGlobale).toBeNull();
  });
});
