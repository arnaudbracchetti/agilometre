import { GenerateurDeCode } from '../domain/generateur-de-code';
import { JetonSessionRepository } from '../domain/jeton-session.repository';
import { JetonSession } from '../domain/jeton-session';
import { Niveau } from '../../referentiel/domain/niveau';
import { Option } from '../../referentiel/domain/option';
import { Question } from '../../referentiel/domain/question';
import { Referentiel } from '../../referentiel/domain/referentiel';
import { ReferentielRepository } from '../../referentiel/domain/referentiel.repository';
import { Theme } from '../../referentiel/domain/theme';
import { EtatTour } from '../domain/session';
import { EtatToursQuery } from '../domain/etat-tours.query';
import {
  RepartitionTour,
  RepartitionTourQuery,
} from '../domain/repartition-tour.query';
import { Selection } from '../domain/selection';
import { Session } from '../domain/session';
import { SessionRepository } from '../domain/session.repository';
import { TourDeVote } from '../domain/tour-de-vote';
import { TourDeVoteRepository } from '../domain/tour-de-vote.repository';
import { ObtenirPilotageSession } from './obtenir-pilotage-session.usecase';

const generateurDeCode: GenerateurDeCode = {
  generer: () => Promise.resolve('AB12'),
};

class SessionRepositoryFake implements SessionRepository {
  sessions: Session[] = [];
  findById(id: string): Promise<Session | null> {
    return Promise.resolve(this.sessions.find((s) => s.id === id) ?? null);
  }
  findByCode(code: string): Promise<Session | null> {
    return Promise.resolve(
      this.sessions.find((s) => s.code === code && s.statut === 'OUVERTE') ??
        null,
    );
  }
  save(session: Session): Promise<void> {
    this.sessions.push(session);
    return Promise.resolve();
  }
  remove(): Promise<void> {
    return Promise.resolve();
  }
  existeCodeOuvert(): Promise<boolean> {
    return Promise.resolve(false);
  }
}

class JetonSessionRepositoryFake implements JetonSessionRepository {
  compte = 0;
  emettre(sessionId: string): Promise<JetonSession> {
    return Promise.resolve(JetonSession.creer('j1', sessionId, new Date()));
  }
  findById(): Promise<JetonSession | null> {
    return Promise.resolve(null);
  }
  compterJetonsDeLaSession(): Promise<number> {
    return Promise.resolve(this.compte);
  }
  invalider(): Promise<void> {
    return Promise.resolve();
  }
  resoudreSessionActive(): Promise<string | null> {
    return Promise.resolve(null);
  }
}

class ReferentielRepositoryFake implements ReferentielRepository {
  referentiel = Referentiel.vide();
  charger(): Promise<Referentiel> {
    return Promise.resolve(this.referentiel);
  }
  sauvegarder(referentiel: Referentiel): Promise<void> {
    this.referentiel = referentiel;
    return Promise.resolve();
  }
}

class TourDeVoteRepositoryFake implements TourDeVoteRepository {
  tours: TourDeVote[] = [];
  findById(id: string): Promise<TourDeVote | null> {
    return Promise.resolve(this.tours.find((t) => t.id === id) ?? null);
  }
  trouverTourOuvertDeLaSession(sessionId: string): Promise<TourDeVote | null> {
    return Promise.resolve(
      this.tours.find((t) => t.sessionId === sessionId && !t.estClos) ?? null,
    );
  }
  save(): Promise<void> {
    return Promise.resolve();
  }
}

class EtatToursQueryFake implements EtatToursQuery {
  etats: EtatTour[] = [];
  listerEtatsDesToursDeLaSession(): Promise<EtatTour[]> {
    return Promise.resolve(this.etats);
  }
}

class RepartitionTourQueryFake implements RepartitionTourQuery {
  repartitions: RepartitionTour[] = [];
  listerRepartitionsDesTours(tourIds: string[]): Promise<RepartitionTour[]> {
    return Promise.resolve(
      this.repartitions.filter((r) => tourIds.includes(r.tourId)),
    );
  }
}

function referentielAvecQuestion(questionId: string): Referentiel {
  return referentielAvecQuestions([[questionId, 'Libellé']]);
}

function referentielAvecQuestions(
  questions: ReadonlyArray<readonly [id: string, libelle: string]>,
): Referentiel {
  const options = [1, 2, 3, 4].map((niveau) =>
    Option.creer(`Option ${niveau}`, Niveau.creer(niveau).valeur),
  );
  const theme = Theme.creer(
    't1',
    'Thème 1',
    questions.map(
      ([id, libelle]) => Question.creer(id, libelle, 't1', options).valeur,
    ),
  );
  return Referentiel.reconstituer(new Date('2026-01-01'), [theme]);
}

function creerSessionPreparee(id: string): Session {
  return Session.creer(
    id,
    'e1',
    new Date('2026-04-01'),
    'm1',
    Selection.reconstituer(['q1']),
    generateurDeCode,
  ).valeur;
}

describe('ObtenirPilotageSession', () => {
  it('renvoie "introuvable" si la Session n’existe pas', async () => {
    const sessions = new SessionRepositoryFake();
    const jetons = new JetonSessionRepositoryFake();
    const useCase = new ObtenirPilotageSession(
      sessions,
      jetons,
      new ReferentielRepositoryFake(),
      new TourDeVoteRepositoryFake(),
      new EtatToursQueryFake(),
      new RepartitionTourQueryFake(),
    );

    const resultat = await useCase.executer('inconnue');

    expect(resultat.type).toBe('introuvable');
  });

  it('renvoie "introuvable" tant que la Session est encore PREPAREE', async () => {
    const sessions = new SessionRepositoryFake();
    sessions.sessions.push(creerSessionPreparee('s1'));
    const jetons = new JetonSessionRepositoryFake();
    const useCase = new ObtenirPilotageSession(
      sessions,
      jetons,
      new ReferentielRepositoryFake(),
      new TourDeVoteRepositoryFake(),
      new EtatToursQueryFake(),
      new RepartitionTourQueryFake(),
    );

    const resultat = await useCase.executer('s1');

    expect(resultat.type).toBe('introuvable');
  });

  it('renvoie le détail, le nombre de devices connectés, questionCourante=null et tourOuvert=null en salle d’attente', async () => {
    const sessions = new SessionRepositoryFake();
    const session = creerSessionPreparee('s1');
    await session.ouvrir();
    sessions.sessions.push(session);
    const jetons = new JetonSessionRepositoryFake();
    jetons.compte = 3;
    const useCase = new ObtenirPilotageSession(
      sessions,
      jetons,
      new ReferentielRepositoryFake(),
      new TourDeVoteRepositoryFake(),
      new EtatToursQueryFake(),
      new RepartitionTourQueryFake(),
    );

    const resultat = await useCase.executer('s1');

    expect(resultat.type).toBe('ok');
    if (resultat.type !== 'ok') throw new Error('unreachable');
    expect(resultat.session.code).toBe('AB12');
    expect(resultat.nbDevicesConnectes).toBe(3);
    expect(resultat.questionCourante).toBeNull();
    expect(resultat.tourOuvert).toBeNull();
    expect(resultat.dernierTourClos).toBeNull();
  });

  it('renvoie questionCourante une fois indexCourant avancé', async () => {
    const sessions = new SessionRepositoryFake();
    const session = creerSessionPreparee('s1');
    await session.ouvrir();
    session.passerQuestionSuivante([]);
    sessions.sessions.push(session);
    const jetons = new JetonSessionRepositoryFake();
    const referentiel = new ReferentielRepositoryFake();
    referentiel.referentiel = referentielAvecQuestion('q1');
    const useCase = new ObtenirPilotageSession(
      sessions,
      jetons,
      referentiel,
      new TourDeVoteRepositoryFake(),
      new EtatToursQueryFake(),
      new RepartitionTourQueryFake(),
    );

    const resultat = await useCase.executer('s1');

    expect(resultat.type).toBe('ok');
    if (resultat.type !== 'ok') throw new Error('unreachable');
    expect(resultat.questionCourante?.id).toBe('q1');
  });

  it('renvoie le Tour ouvert de la Session, s’il y en a un', async () => {
    const sessions = new SessionRepositoryFake();
    const session = creerSessionPreparee('s1');
    await session.ouvrir();
    session.passerQuestionSuivante([]);
    sessions.sessions.push(session);
    const jetons = new JetonSessionRepositoryFake();
    const referentiel = new ReferentielRepositoryFake();
    referentiel.referentiel = referentielAvecQuestion('q1');
    const tours = new TourDeVoteRepositoryFake();
    tours.tours.push(
      TourDeVote.creer(
        't1',
        's1',
        'q1',
        1,
        new Date('2026-04-01T10:00:00Z'),
        null,
      ).valeur,
    );
    const useCase = new ObtenirPilotageSession(
      sessions,
      jetons,
      referentiel,
      tours,
      new EtatToursQueryFake(),
      new RepartitionTourQueryFake(),
    );

    const resultat = await useCase.executer('s1');

    expect(resultat.type).toBe('ok');
    if (resultat.type !== 'ok') throw new Error('unreachable');
    expect(resultat.tourOuvert?.numero).toBe(1);
  });

  it('reste accessible en lecture seule une fois CLOTUREE', async () => {
    const sessions = new SessionRepositoryFake();
    const session = creerSessionPreparee('s1');
    await session.ouvrir();
    session.terminer();
    sessions.sessions.push(session);
    const jetons = new JetonSessionRepositoryFake();
    const useCase = new ObtenirPilotageSession(
      sessions,
      jetons,
      new ReferentielRepositoryFake(),
      new TourDeVoteRepositoryFake(),
      new EtatToursQueryFake(),
      new RepartitionTourQueryFake(),
    );

    const resultat = await useCase.executer('s1');

    expect(resultat.type).toBe('ok');
  });

  it('renvoie dernierTourClos=null tant qu’aucun Tour n’est clos sur la Question courante', async () => {
    const sessions = new SessionRepositoryFake();
    const session = creerSessionPreparee('s1');
    await session.ouvrir();
    session.passerQuestionSuivante([]);
    sessions.sessions.push(session);
    const jetons = new JetonSessionRepositoryFake();
    const referentiel = new ReferentielRepositoryFake();
    referentiel.referentiel = referentielAvecQuestion('q1');
    const etatTours = new EtatToursQueryFake();
    etatTours.etats = [
      { tourId: 't1', questionId: 'q1', numero: 1, clos: false },
    ];
    const useCase = new ObtenirPilotageSession(
      sessions,
      jetons,
      referentiel,
      new TourDeVoteRepositoryFake(),
      etatTours,
      new RepartitionTourQueryFake(),
    );

    const resultat = await useCase.executer('s1');

    expect(resultat.type).toBe('ok');
    if (resultat.type !== 'ok') throw new Error('unreachable');
    expect(resultat.dernierTourClos).toBeNull();
  });

  it('renvoie la répartition du dernier Tour clos de la Question courante (carte #40)', async () => {
    const sessions = new SessionRepositoryFake();
    const session = creerSessionPreparee('s1');
    await session.ouvrir();
    session.passerQuestionSuivante([]);
    sessions.sessions.push(session);
    const jetons = new JetonSessionRepositoryFake();
    const referentiel = new ReferentielRepositoryFake();
    referentiel.referentiel = referentielAvecQuestion('q1');
    const etatTours = new EtatToursQueryFake();
    // Deux Tours clos sur q1 (revote) : seul le numero le plus haut (t2) doit être retenu.
    etatTours.etats = [
      { tourId: 't1', questionId: 'q1', numero: 1, clos: true },
      { tourId: 't2', questionId: 'q1', numero: 2, clos: true },
    ];
    const repartitions = new RepartitionTourQueryFake();
    repartitions.repartitions = [
      { tourId: 't1', comptesParNiveau: { 1: 9, 2: 0, 3: 0, 4: 0 } },
      { tourId: 't2', comptesParNiveau: { 1: 0, 2: 1, 3: 2, 4: 1 } },
    ];
    const useCase = new ObtenirPilotageSession(
      sessions,
      jetons,
      referentiel,
      new TourDeVoteRepositoryFake(),
      etatTours,
      repartitions,
    );

    const resultat = await useCase.executer('s1');

    expect(resultat.type).toBe('ok');
    if (resultat.type !== 'ok') throw new Error('unreachable');
    expect(resultat.dernierTourClos).toEqual({
      numero: 2,
      comptesParNiveau: { 1: 0, 2: 1, 3: 2, 4: 1 },
    });
  });

  it('renvoie l’historique de tous les Tours clos, y compris les deux Tours d’une Question revotée (carte E2)', async () => {
    const sessions = new SessionRepositoryFake();
    const session = creerSessionPreparee('s1');
    await session.ouvrir();
    session.passerQuestionSuivante([]);
    sessions.sessions.push(session);
    const jetons = new JetonSessionRepositoryFake();
    const referentiel = new ReferentielRepositoryFake();
    referentiel.referentiel = referentielAvecQuestion('q1');
    const etatTours = new EtatToursQueryFake();
    etatTours.etats = [
      { tourId: 't1', questionId: 'q1', numero: 1, clos: true },
      { tourId: 't2', questionId: 'q1', numero: 2, clos: true },
      { tourId: 't3', questionId: 'q1', numero: 3, clos: false },
    ];
    const repartitions = new RepartitionTourQueryFake();
    repartitions.repartitions = [
      { tourId: 't1', comptesParNiveau: { 1: 9, 2: 0, 3: 0, 4: 0 } },
      { tourId: 't2', comptesParNiveau: { 1: 0, 2: 1, 3: 2, 4: 1 } },
    ];
    const useCase = new ObtenirPilotageSession(
      sessions,
      jetons,
      referentiel,
      new TourDeVoteRepositoryFake(),
      etatTours,
      repartitions,
    );

    const resultat = await useCase.executer('s1');

    expect(resultat.type).toBe('ok');
    if (resultat.type !== 'ok') throw new Error('unreachable');
    expect(resultat.historique).toEqual([
      {
        questionId: 'q1',
        libelle: 'Libellé',
        numero: 1,
        comptesParNiveau: { 1: 9, 2: 0, 3: 0, 4: 0 },
      },
      {
        questionId: 'q1',
        libelle: 'Libellé',
        numero: 2,
        comptesParNiveau: { 1: 0, 2: 1, 3: 2, 4: 1 },
      },
    ]);
  });

  it('exclut de l’historique le Tour clos par une fermeture forcée de Sauter (carte F2, "aucun résultat n’en découle")', async () => {
    const sessions = new SessionRepositoryFake();
    const session = creerSessionPreparee('s1');
    await session.ouvrir();
    const etatTours = new EtatToursQueryFake();
    session.passerQuestionSuivante(etatTours.etats); // salle d'attente -> q1 courante
    // q1 sautée alors que son Tour t1 était encore ouvert : la fermeture forcée le clôt, mais
    // il ne doit surfacer aucun résultat dans l'historique.
    session.sauter('q1', etatTours.etats);
    sessions.sessions.push(session);
    const jetons = new JetonSessionRepositoryFake();
    const referentiel = new ReferentielRepositoryFake();
    referentiel.referentiel = referentielAvecQuestion('q1');
    etatTours.etats = [
      { tourId: 't1', questionId: 'q1', numero: 1, clos: true },
    ];
    const repartitions = new RepartitionTourQueryFake();
    repartitions.repartitions = [
      { tourId: 't1', comptesParNiveau: { 1: 3, 2: 0, 3: 0, 4: 0 } },
    ];
    const useCase = new ObtenirPilotageSession(
      sessions,
      jetons,
      referentiel,
      new TourDeVoteRepositoryFake(),
      etatTours,
      repartitions,
    );

    const resultat = await useCase.executer('s1');

    expect(resultat.type).toBe('ok');
    if (resultat.type !== 'ok') throw new Error('unreachable');
    expect(resultat.historique).toEqual([]);
  });

  it('renvoie la progression de toute la Sélection (carte F1), y compris les Questions à venir', async () => {
    const sessions = new SessionRepositoryFake();
    const session = Session.creer(
      's1',
      'e1',
      new Date('2026-04-01'),
      'm1',
      Selection.reconstituer(['q1', 'q2']),
      generateurDeCode,
    ).valeur;
    await session.ouvrir();
    const etatTours = new EtatToursQueryFake();
    etatTours.etats = [
      { tourId: 't1', questionId: 'q1', numero: 1, clos: true },
    ];
    session.passerQuestionSuivante([]);
    session.passerQuestionSuivante(etatTours.etats);
    sessions.sessions.push(session);
    const jetons = new JetonSessionRepositoryFake();
    const referentiel = new ReferentielRepositoryFake();
    referentiel.referentiel = referentielAvecQuestions([
      ['q1', 'Question 1'],
      ['q2', 'Question 2'],
    ]);
    const useCase = new ObtenirPilotageSession(
      sessions,
      jetons,
      referentiel,
      new TourDeVoteRepositoryFake(),
      etatTours,
      new RepartitionTourQueryFake(),
    );

    const resultat = await useCase.executer('s1');

    expect(resultat.type).toBe('ok');
    if (resultat.type !== 'ok') throw new Error('unreachable');
    expect(resultat.progression).toEqual([
      {
        questionId: 'q1',
        libelle: 'Question 1',
        statut: 'TRAITEE',
        reactivable: false,
      },
      {
        questionId: 'q2',
        libelle: 'Question 2',
        statut: 'COURANTE',
        reactivable: false,
      },
    ]);
  });

  it('exclut de la progression les Questions retirées du Référentiel actif', async () => {
    const sessions = new SessionRepositoryFake();
    const session = Session.creer(
      's1',
      'e1',
      new Date('2026-04-01'),
      'm1',
      Selection.reconstituer(['q1', 'q2']),
      generateurDeCode,
    ).valeur;
    await session.ouvrir();
    sessions.sessions.push(session);
    const jetons = new JetonSessionRepositoryFake();
    const referentiel = new ReferentielRepositoryFake();
    referentiel.referentiel = referentielAvecQuestions([['q1', 'Question 1']]);
    const useCase = new ObtenirPilotageSession(
      sessions,
      jetons,
      referentiel,
      new TourDeVoteRepositoryFake(),
      new EtatToursQueryFake(),
      new RepartitionTourQueryFake(),
    );

    const resultat = await useCase.executer('s1');

    expect(resultat.type).toBe('ok');
    if (resultat.type !== 'ok') throw new Error('unreachable');
    expect(resultat.progression).toEqual([
      {
        questionId: 'q1',
        libelle: 'Question 1',
        statut: 'A_VENIR',
        reactivable: false,
      },
    ]);
  });
});
