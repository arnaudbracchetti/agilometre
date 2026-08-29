import { EtatToursQuery } from '../domain/etat-tours.query';
import { GenerateurDeCode } from '../domain/generateur-de-code';
import { Selection } from '../domain/selection';
import {
  EtatTour,
  QuestionDejaSauteeError,
  QuestionDejaTraiteeError,
  Session,
} from '../domain/session';
import { SessionRepository } from '../domain/session.repository';
import { TourDeVote } from '../domain/tour-de-vote';
import { TourDeVoteRepository } from '../domain/tour-de-vote.repository';
import { SauterQuestionSession } from './sauter-question-session.usecase';

const generateurDeCode: GenerateurDeCode = {
  generer: () => Promise.resolve('AB12'),
};

class SessionRepositoryFake implements SessionRepository {
  sessions: Session[] = [];
  saveAppels = 0;
  findById(id: string): Promise<Session | null> {
    return Promise.resolve(this.sessions.find((s) => s.id === id) ?? null);
  }
  findFermeesParEquipeEtPeriode(): Promise<Session[]> {
    return Promise.resolve([]);
  }
  findByCode(code: string): Promise<Session | null> {
    return Promise.resolve(
      this.sessions.find((s) => s.code === code && s.statut === 'OUVERTE') ??
        null,
    );
  }
  save(session: Session): Promise<void> {
    this.saveAppels++;
    if (!this.sessions.includes(session)) {
      this.sessions.push(session);
    }
    return Promise.resolve();
  }
  remove(id: string): Promise<void> {
    this.sessions = this.sessions.filter((s) => s.id !== id);
    return Promise.resolve();
  }
  existeCodeOuvert(code: string): Promise<boolean> {
    return Promise.resolve(
      this.sessions.some((s) => s.code === code && s.statut === 'OUVERTE'),
    );
  }
  existeFermeeAvant(): Promise<boolean> {
    return Promise.resolve(false);
  }
}

class EtatToursQueryFake implements EtatToursQuery {
  tours: EtatTour[] = [];
  listerEtatsDesToursDeLaSession(): Promise<EtatTour[]> {
    return Promise.resolve(this.tours);
  }
}

class TourDeVoteRepositoryFake implements TourDeVoteRepository {
  tours: TourDeVote[] = [];
  saveAppels = 0;
  findById(id: string): Promise<TourDeVote | null> {
    return Promise.resolve(this.tours.find((t) => t.id === id) ?? null);
  }
  trouverTourOuvertDeLaSession(sessionId: string): Promise<TourDeVote | null> {
    return Promise.resolve(
      this.tours.find((t) => t.sessionId === sessionId && !t.estClos) ?? null,
    );
  }
  save(tourDeVote: TourDeVote): Promise<void> {
    this.saveAppels++;
    if (!this.tours.includes(tourDeVote)) {
      this.tours.push(tourDeVote);
    }
    return Promise.resolve();
  }
}

async function sessionOuverte(): Promise<Session> {
  const session = Session.creer(
    's1',
    'e1',
    new Date('2026-03-01'),
    'm1',
    Selection.reconstituer(['q1', 'q2']),
    generateurDeCode,
  ).valeur;
  await session.ouvrir();
  return session;
}

describe('SauterQuestionSession', () => {
  it('renvoie "introuvable" si la Session n’existe pas', async () => {
    const useCase = new SauterQuestionSession(
      new SessionRepositoryFake(),
      new TourDeVoteRepositoryFake(),
      new EtatToursQueryFake(),
    );

    const resultat = await useCase.executer('inconnue', 'q1');

    expect(resultat.type).toBe('introuvable');
  });

  it('renvoie "question_introuvable" si la Question n’est pas dans la Sélection', async () => {
    const sessions = new SessionRepositoryFake();
    sessions.sessions.push(await sessionOuverte());
    const useCase = new SauterQuestionSession(
      sessions,
      new TourDeVoteRepositoryFake(),
      new EtatToursQueryFake(),
    );

    const resultat = await useCase.executer('s1', 'q-inconnue');

    expect(resultat.type).toBe('question_introuvable');
    expect(sessions.saveAppels).toBe(0);
  });

  it('marque une Question À venir comme Sautée et persiste, sans toucher aux Tours', async () => {
    const sessions = new SessionRepositoryFake();
    sessions.sessions.push(await sessionOuverte());
    const tours = new TourDeVoteRepositoryFake();
    const useCase = new SauterQuestionSession(
      sessions,
      tours,
      new EtatToursQueryFake(),
    );

    const resultat = await useCase.executer('s1', 'q2');

    expect(resultat.type).toBe('ok');
    if (resultat.type !== 'ok') throw new Error('unreachable');
    expect(resultat.session.questionsSautees.has('q2')).toBe(true);
    expect(sessions.saveAppels).toBe(1);
    expect(tours.saveAppels).toBe(0);
  });

  it('saute la Question courante, clôt son Tour ouvert sans en dériver de résultat, et fait avancer indexCourant', async () => {
    const sessions = new SessionRepositoryFake();
    const session = await sessionOuverte();
    const etatTours = new EtatToursQueryFake();
    session.passerQuestionSuivante(etatTours.tours); // salle d'attente -> q1 courante
    sessions.sessions.push(session);

    const tours = new TourDeVoteRepositoryFake();
    const tourOuvert = TourDeVote.creer(
      't1',
      's1',
      'q1',
      1,
      new Date('2026-03-01T10:00:00Z'),
      null,
    ).valeur;
    tourOuvert.voter(
      'jeton-1',
      'r1',
      3,
      'e1',
      new Date('2026-03-01T10:01:00Z'),
    );
    tours.tours.push(tourOuvert);

    const useCase = new SauterQuestionSession(sessions, tours, etatTours);

    const resultat = await useCase.executer('s1', 'q1');

    expect(resultat.type).toBe('ok');
    if (resultat.type !== 'ok') throw new Error('unreachable');
    expect(resultat.session.questionsSautees.has('q1')).toBe(true);
    expect(resultat.session.questionCouranteId()).toBe('q2');
    expect(tourOuvert.estClos).toBe(true);
    expect(tourOuvert.participations).toHaveLength(0);
    expect(tours.saveAppels).toBe(1);
    expect(sessions.saveAppels).toBe(1);
  });

  it('renvoie "invalide" (QuestionDejaTraiteeError) sans muter si la Question a déjà un Tour clos', async () => {
    const sessions = new SessionRepositoryFake();
    const session = await sessionOuverte();
    sessions.sessions.push(session);
    const etatTours = new EtatToursQueryFake();
    etatTours.tours = [
      { tourId: 't1', questionId: 'q1', numero: 1, clos: true },
    ];
    const tours = new TourDeVoteRepositoryFake();
    const useCase = new SauterQuestionSession(sessions, tours, etatTours);

    const resultat = await useCase.executer('s1', 'q1');

    expect(resultat.type).toBe('invalide');
    if (resultat.type !== 'invalide') throw new Error('unreachable');
    expect(resultat.erreur).toBeInstanceOf(QuestionDejaTraiteeError);
    expect(sessions.saveAppels).toBe(0);
    expect(tours.saveAppels).toBe(0);
  });

  it('renvoie "invalide" (QuestionDejaSauteeError) si la Question est déjà sautée', async () => {
    const sessions = new SessionRepositoryFake();
    const session = await sessionOuverte();
    const etatTours = new EtatToursQueryFake();
    session.sauter('q1', etatTours.tours);
    sessions.sessions.push(session);
    const tours = new TourDeVoteRepositoryFake();
    const useCase = new SauterQuestionSession(sessions, tours, etatTours);

    const resultat = await useCase.executer('s1', 'q1');

    expect(resultat.type).toBe('invalide');
    if (resultat.type !== 'invalide') throw new Error('unreachable');
    expect(resultat.erreur).toBeInstanceOf(QuestionDejaSauteeError);
    expect(sessions.saveAppels).toBe(0);
  });
});
