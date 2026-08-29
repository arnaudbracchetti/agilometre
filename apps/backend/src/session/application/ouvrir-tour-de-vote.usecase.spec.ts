import { EtatToursQuery } from '../domain/etat-tours.query';
import { GenerateurDeCode } from '../domain/generateur-de-code';
import { Selection } from '../domain/selection';
import { EtatTour, Session } from '../domain/session';
import { SessionRepository } from '../domain/session.repository';
import { TourDeVote } from '../domain/tour-de-vote';
import { TourDeVoteRepository } from '../domain/tour-de-vote.repository';
import { OuvrirTourDeVote } from './ouvrir-tour-de-vote.usecase';

const generateurDeCode: GenerateurDeCode = {
  generer: () => Promise.resolve('AB12'),
};

class SessionRepositoryFake implements SessionRepository {
  sessions: Session[] = [];
  findById(id: string): Promise<Session | null> {
    return Promise.resolve(this.sessions.find((s) => s.id === id) ?? null);
  }
  findFermeesParEquipeEtPeriode(): Promise<Session[]> {
    return Promise.resolve([]);
  }
  findByCode(): Promise<Session | null> {
    return Promise.resolve(null);
  }
  save(): Promise<void> {
    return Promise.resolve();
  }
  remove(): Promise<void> {
    return Promise.resolve();
  }
  existeCodeOuvert(): Promise<boolean> {
    return Promise.resolve(false);
  }
  existeFermeeAvant(): Promise<boolean> {
    return Promise.resolve(false);
  }
  findFermeesParEquipesEtPeriode(): Promise<Session[]> {
    return Promise.resolve([]);
  }
  existeFermeeAvantPourEquipes(): Promise<boolean> {
    return Promise.resolve(false);
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

class EtatToursQueryFake implements EtatToursQuery {
  tours: EtatTour[] = [];
  listerEtatsDesToursDeLaSession(): Promise<EtatTour[]> {
    return Promise.resolve(this.tours);
  }
}

async function sessionSurQuestionCourante(): Promise<Session> {
  const session = Session.creer(
    's1',
    'e1',
    new Date('2026-04-01'),
    'm1',
    Selection.reconstituer(['q1', 'q2']),
    generateurDeCode,
  ).valeur;
  await session.ouvrir();
  session.passerQuestionSuivante([]);
  return session;
}

describe('OuvrirTourDeVote', () => {
  it('renvoie "introuvable" si la Session n’existe pas', async () => {
    const useCase = new OuvrirTourDeVote(
      new SessionRepositoryFake(),
      new TourDeVoteRepositoryFake(),
      new EtatToursQueryFake(),
    );

    const resultat = await useCase.executer('inconnue');

    expect(resultat.type).toBe('introuvable');
  });

  it('renvoie "non_ouverte" si la Session n’est pas OUVERTE', async () => {
    const sessions = new SessionRepositoryFake();
    const session = Session.creer(
      's1',
      'e1',
      new Date('2026-04-01'),
      'm1',
      Selection.reconstituer(['q1']),
      generateurDeCode,
    ).valeur;
    sessions.sessions.push(session);
    const useCase = new OuvrirTourDeVote(
      sessions,
      new TourDeVoteRepositoryFake(),
      new EtatToursQueryFake(),
    );

    const resultat = await useCase.executer('s1');

    expect(resultat.type).toBe('non_ouverte');
  });

  it('renvoie "aucune_question_courante" en salle d’attente', async () => {
    const sessions = new SessionRepositoryFake();
    const session = Session.creer(
      's1',
      'e1',
      new Date('2026-04-01'),
      'm1',
      Selection.reconstituer(['q1']),
      generateurDeCode,
    ).valeur;
    await session.ouvrir();
    sessions.sessions.push(session);
    const useCase = new OuvrirTourDeVote(
      sessions,
      new TourDeVoteRepositoryFake(),
      new EtatToursQueryFake(),
    );

    const resultat = await useCase.executer('s1');

    expect(resultat.type).toBe('aucune_question_courante');
  });

  it('renvoie "tour_deja_ouvert" si un Tour est déjà ouvert sur la Session', async () => {
    const sessions = new SessionRepositoryFake();
    sessions.sessions.push(await sessionSurQuestionCourante());
    const tours = new TourDeVoteRepositoryFake();
    tours.tours.push(
      TourDeVote.creer(
        't0',
        's1',
        'q1',
        1,
        new Date('2026-04-01T10:00:00Z'),
        null,
      ).valeur,
    );
    const useCase = new OuvrirTourDeVote(
      sessions,
      tours,
      new EtatToursQueryFake(),
    );

    const resultat = await useCase.executer('s1');

    expect(resultat.type).toBe('tour_deja_ouvert');
  });

  it('ouvre le premier Tour (numero=1) sur la Question courante et persiste', async () => {
    const sessions = new SessionRepositoryFake();
    sessions.sessions.push(await sessionSurQuestionCourante());
    const tours = new TourDeVoteRepositoryFake();
    const useCase = new OuvrirTourDeVote(
      sessions,
      tours,
      new EtatToursQueryFake(),
    );

    const resultat = await useCase.executer('s1');

    expect(resultat.type).toBe('ok');
    if (resultat.type !== 'ok') throw new Error('unreachable');
    expect(resultat.tour.questionId).toBe('q1');
    expect(resultat.tour.numero).toBe(1);
    expect(resultat.tour.estClos).toBe(false);
    expect(tours.saveAppels).toBe(1);
  });

  it('ouvre un revote (numero = dernier + 1) quand un Tour précédent est déjà clos pour cette Question', async () => {
    const sessions = new SessionRepositoryFake();
    sessions.sessions.push(await sessionSurQuestionCourante());
    const tours = new TourDeVoteRepositoryFake();
    const etatTours = new EtatToursQueryFake();
    etatTours.tours = [
      { tourId: 't0', questionId: 'q1', numero: 1, clos: true },
    ];
    const useCase = new OuvrirTourDeVote(sessions, tours, etatTours);

    const resultat = await useCase.executer('s1');

    expect(resultat.type).toBe('ok');
    if (resultat.type !== 'ok') throw new Error('unreachable');
    expect(resultat.tour.numero).toBe(2);
  });
});
