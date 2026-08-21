import { EtatToursQuery } from '../domain/etat-tours.query';
import { GenerateurDeCode } from '../domain/generateur-de-code';
import { Selection } from '../domain/selection';
import { EtatTour, Session } from '../domain/session';
import { SessionRepository } from '../domain/session.repository';
import { TourDeVote } from '../domain/tour-de-vote';
import { TourDeVoteRepository } from '../domain/tour-de-vote.repository';
import { TerminerPrematurementSession } from './terminer-prematurement-session.usecase';

const generateurDeCode: GenerateurDeCode = {
  generer: () => Promise.resolve('AB12'),
};

class SessionRepositoryFake implements SessionRepository {
  sessions: Session[] = [];
  saveAppels = 0;
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

async function sessionOuverte(
  questionIds: string[] = ['q1', 'q2', 'q3'],
): Promise<Session> {
  const session = Session.creer(
    's1',
    'e1',
    new Date('2026-03-01'),
    'm1',
    Selection.reconstituer(questionIds),
    generateurDeCode,
  ).valeur;
  await session.ouvrir();
  return session;
}

describe('TerminerPrematurementSession', () => {
  it('renvoie "introuvable" si la Session n’existe pas', async () => {
    const useCase = new TerminerPrematurementSession(
      new SessionRepositoryFake(),
      new TourDeVoteRepositoryFake(),
      new EtatToursQueryFake(),
    );

    const resultat = await useCase.executer('inconnue');

    expect(resultat.type).toBe('introuvable');
  });

  it('renvoie "non_ouverte" si la Session est encore PREPAREE', async () => {
    const sessions = new SessionRepositoryFake();
    const session = Session.creer(
      's1',
      'e1',
      new Date('2026-03-01'),
      'm1',
      Selection.reconstituer(['q1']),
      generateurDeCode,
    ).valeur;
    sessions.sessions.push(session);
    const useCase = new TerminerPrematurementSession(
      sessions,
      new TourDeVoteRepositoryFake(),
      new EtatToursQueryFake(),
    );

    const resultat = await useCase.executer('s1');

    expect(resultat.type).toBe('non_ouverte');
    expect(sessions.saveAppels).toBe(0);
  });

  it('depuis la salle d’attente, marque toutes les Questions comme Sautées ; toutes restent réactivables (indexCourant n’a jamais bougé, aucune n’était courante)', async () => {
    const sessions = new SessionRepositoryFake();
    sessions.sessions.push(await sessionOuverte(['q1', 'q2', 'q3']));
    const tours = new TourDeVoteRepositoryFake();
    const useCase = new TerminerPrematurementSession(
      sessions,
      tours,
      new EtatToursQueryFake(),
    );

    const resultat = await useCase.executer('s1');

    expect(resultat.type).toBe('ok');
    if (resultat.type !== 'ok') throw new Error('unreachable');
    expect(resultat.session.questionsSautees).toEqual(
      new Set(['q1', 'q2', 'q3']),
    );
    const progression = resultat.session.progression([]);
    expect(progression.every((p) => p.statut === 'SAUTEE')).toBe(true);
    expect(progression.every((p) => p.reactivable === true)).toBe(true);
    expect(sessions.saveAppels).toBe(1);
    expect(tours.saveAppels).toBe(0);
  });

  it('clôt sans résultat le Tour ouvert sur la Question courante et saute le reste', async () => {
    const sessions = new SessionRepositoryFake();
    const session = await sessionOuverte(['q1', 'q2', 'q3']);
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

    const useCase = new TerminerPrematurementSession(
      sessions,
      tours,
      etatTours,
    );

    const resultat = await useCase.executer('s1');

    expect(resultat.type).toBe('ok');
    if (resultat.type !== 'ok') throw new Error('unreachable');
    expect(resultat.session.questionsSautees).toEqual(
      new Set(['q1', 'q2', 'q3']),
    );
    expect(tourOuvert.estClos).toBe(true);
    expect(tourOuvert.participations).toHaveLength(0);
    expect(tours.saveAppels).toBe(1);
    expect(sessions.saveAppels).toBe(1);
  });

  it('laisse intactes les Questions déjà Traitées (Tour clos)', async () => {
    const sessions = new SessionRepositoryFake();
    const session = await sessionOuverte(['q1', 'q2', 'q3']);
    const etatTours = new EtatToursQueryFake();
    etatTours.tours = [
      { tourId: 't1', questionId: 'q1', numero: 1, clos: true },
    ];
    session.passerQuestionSuivante(etatTours.tours); // salle d'attente -> q1 courante
    session.passerQuestionSuivante(etatTours.tours); // q1 (Tour clos) résolue -> q2 courante
    sessions.sessions.push(session);
    const tours = new TourDeVoteRepositoryFake();
    const useCase = new TerminerPrematurementSession(
      sessions,
      tours,
      etatTours,
    );

    const resultat = await useCase.executer('s1');

    expect(resultat.type).toBe('ok');
    if (resultat.type !== 'ok') throw new Error('unreachable');
    expect(resultat.session.questionsSautees).toEqual(new Set(['q2', 'q3']));
    const progression = resultat.session.progression(etatTours.tours);
    expect(progression.find((p) => p.questionId === 'q1')?.statut).toBe(
      'TRAITEE',
    );
    expect(progression.find((p) => p.questionId === 'q2')?.statut).toBe(
      'SAUTEE',
    );
    expect(progression.find((p) => p.questionId === 'q3')?.statut).toBe(
      'SAUTEE',
    );
  });

  it('ne fait rien (mais persiste) si tout est déjà traité ou sauté', async () => {
    const sessions = new SessionRepositoryFake();
    const session = await sessionOuverte(['q1', 'q2']);
    const etatTours = new EtatToursQueryFake();
    etatTours.tours = [
      { tourId: 't1', questionId: 'q1', numero: 1, clos: true },
    ];
    session.passerQuestionSuivante(etatTours.tours); // salle d'attente -> q1 courante
    session.passerQuestionSuivante(etatTours.tours); // q1 (Tour clos) résolue -> q2 courante
    session.sauter('q2', etatTours.tours); // q2 sautée -> plus rien à faire
    sessions.sessions.push(session);
    const tours = new TourDeVoteRepositoryFake();
    const useCase = new TerminerPrematurementSession(
      sessions,
      tours,
      etatTours,
    );

    const resultat = await useCase.executer('s1');

    expect(resultat.type).toBe('ok');
    if (resultat.type !== 'ok') throw new Error('unreachable');
    expect(resultat.session.questionsSautees).toEqual(new Set(['q2']));
    expect(sessions.saveAppels).toBe(1);
    expect(tours.saveAppels).toBe(0);
  });
});
