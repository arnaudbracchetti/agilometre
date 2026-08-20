import { GenerateurDeCode } from '../domain/generateur-de-code';
import { JetonSessionRepository } from '../domain/jeton-session.repository';
import { JetonSession } from '../domain/jeton-session';
import { Niveau } from '../../referentiel/domain/niveau';
import { Option } from '../../referentiel/domain/option';
import { Question } from '../../referentiel/domain/question';
import { Referentiel } from '../../referentiel/domain/referentiel';
import { ReferentielRepository } from '../../referentiel/domain/referentiel.repository';
import { Theme } from '../../referentiel/domain/theme';
import { Selection } from '../domain/selection';
import { Session } from '../domain/session';
import { SessionRepository } from '../domain/session.repository';
import { TourDeVote } from '../domain/tour-de-vote';
import { TourDeVoteRepository } from '../domain/tour-de-vote.repository';
import { ObtenirProjectionSession } from './obtenir-projection-session.usecase';

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

function referentielAvecQuestion(questionId: string): Referentiel {
  const options = [1, 2, 3, 4].map((niveau) =>
    Option.creer(`Option ${niveau}`, Niveau.creer(niveau).valeur),
  );
  const question = Question.creer(questionId, 'Libellé', 't1', options).valeur;
  const theme = Theme.creer('t1', 'Thème 1', [question]);
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

describe('ObtenirProjectionSession', () => {
  it('renvoie "introuvable" si la Session n’existe pas', async () => {
    const sessions = new SessionRepositoryFake();
    const jetons = new JetonSessionRepositoryFake();
    const useCase = new ObtenirProjectionSession(
      sessions,
      jetons,
      new ReferentielRepositoryFake(),
      new TourDeVoteRepositoryFake(),
    );

    const resultat = await useCase.executer('inconnue');

    expect(resultat.type).toBe('introuvable');
  });

  it('renvoie "introuvable" tant que la Session n’est pas OUVERTE', async () => {
    const sessions = new SessionRepositoryFake();
    const session = creerSessionPreparee('s1');
    sessions.sessions.push(session);
    const jetons = new JetonSessionRepositoryFake();
    const useCase = new ObtenirProjectionSession(
      sessions,
      jetons,
      new ReferentielRepositoryFake(),
      new TourDeVoteRepositoryFake(),
    );

    const resultat = await useCase.executer('s1');

    expect(resultat.type).toBe('introuvable');
  });

  it('renvoie "introuvable" une fois la Session CLOTUREE', async () => {
    const sessions = new SessionRepositoryFake();
    const session = creerSessionPreparee('s1');
    await session.ouvrir();
    session.terminer();
    sessions.sessions.push(session);
    const jetons = new JetonSessionRepositoryFake();
    const useCase = new ObtenirProjectionSession(
      sessions,
      jetons,
      new ReferentielRepositoryFake(),
      new TourDeVoteRepositoryFake(),
    );

    const resultat = await useCase.executer('s1');

    expect(resultat.type).toBe('introuvable');
  });

  it('renvoie le Code, le nombre de devices connectés, questionCourante=null et tourOuvert=null en salle d’attente', async () => {
    const sessions = new SessionRepositoryFake();
    const session = creerSessionPreparee('s1');
    await session.ouvrir();
    sessions.sessions.push(session);
    const jetons = new JetonSessionRepositoryFake();
    jetons.compte = 3;
    const useCase = new ObtenirProjectionSession(
      sessions,
      jetons,
      new ReferentielRepositoryFake(),
      new TourDeVoteRepositoryFake(),
    );

    const resultat = await useCase.executer('s1');

    expect(resultat.type).toBe('ok');
    if (resultat.type !== 'ok') throw new Error('unreachable');
    expect(resultat.session.code).toBe('AB12');
    expect(resultat.nbDevicesConnectes).toBe(3);
    expect(resultat.questionCourante).toBeNull();
    expect(resultat.tourOuvert).toBeNull();
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
    const useCase = new ObtenirProjectionSession(
      sessions,
      jetons,
      referentiel,
      new TourDeVoteRepositoryFake(),
    );

    const resultat = await useCase.executer('s1');

    expect(resultat.type).toBe('ok');
    if (resultat.type !== 'ok') throw new Error('unreachable');
    expect(resultat.questionCourante?.id).toBe('q1');
  });

  it('renvoie le Tour ouvert de la Session avec son nombre de votants', async () => {
    const sessions = new SessionRepositoryFake();
    const session = creerSessionPreparee('s1');
    await session.ouvrir();
    session.passerQuestionSuivante([]);
    sessions.sessions.push(session);
    const jetons = new JetonSessionRepositoryFake();
    const referentiel = new ReferentielRepositoryFake();
    referentiel.referentiel = referentielAvecQuestion('q1');
    const tours = new TourDeVoteRepositoryFake();
    const tour = TourDeVote.creer(
      't1',
      's1',
      'q1',
      1,
      new Date('2026-04-01T10:00:00Z'),
      null,
    ).valeur;
    tour.voter('jeton-1', 'r1', 2, 'e1', new Date('2026-04-01T10:01:00Z'));
    tours.tours.push(tour);
    const useCase = new ObtenirProjectionSession(
      sessions,
      jetons,
      referentiel,
      tours,
    );

    const resultat = await useCase.executer('s1');

    expect(resultat.type).toBe('ok');
    if (resultat.type !== 'ok') throw new Error('unreachable');
    expect(resultat.tourOuvert?.numero).toBe(1);
    expect(resultat.tourOuvert?.participations).toHaveLength(1);
  });
});
