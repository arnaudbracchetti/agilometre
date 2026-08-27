import { EtatToursQuery } from '../domain/etat-tours.query';
import { GenerateurDeCode } from '../domain/generateur-de-code';
import { Selection } from '../domain/selection';
import { EtatTour, Session } from '../domain/session';
import { SessionRepository } from '../domain/session.repository';
import { PasserQuestionSuivanteSession } from './passer-question-suivante-session.usecase';

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

describe('PasserQuestionSuivanteSession', () => {
  it('renvoie "introuvable" si la Session n’existe pas', async () => {
    const sessions = new SessionRepositoryFake();
    const useCase = new PasserQuestionSuivanteSession(
      sessions,
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
      new Date('2026-03-01'),
      'm1',
      Selection.reconstituer(['q1']),
      generateurDeCode,
    ).valeur;
    sessions.sessions.push(session);
    const useCase = new PasserQuestionSuivanteSession(
      sessions,
      new EtatToursQueryFake(),
    );

    const resultat = await useCase.executer('s1');

    expect(resultat.type).toBe('non_ouverte');
    expect(sessions.saveAppels).toBe(0);
  });

  it('avance depuis la salle d’attente vers la première Question et persiste', async () => {
    const sessions = new SessionRepositoryFake();
    sessions.sessions.push(await sessionOuverte());
    const useCase = new PasserQuestionSuivanteSession(
      sessions,
      new EtatToursQueryFake(),
    );

    const resultat = await useCase.executer('s1');

    expect(resultat.type).toBe('ok');
    if (resultat.type !== 'ok') throw new Error('unreachable');
    expect(resultat.session.questionCouranteId()).toBe('q1');
    expect(sessions.saveAppels).toBe(1);
  });

  it('renvoie "question_courante_non_resolue" si la Question courante n’a ni Tour clos ni marquage Sautée, sans sauvegarder', async () => {
    const sessions = new SessionRepositoryFake();
    const session = await sessionOuverte();
    sessions.sessions.push(session);
    const etatTours = new EtatToursQueryFake();
    const useCase = new PasserQuestionSuivanteSession(sessions, etatTours);
    await useCase.executer('s1');
    sessions.saveAppels = 0;

    const resultat = await useCase.executer('s1');

    expect(resultat.type).toBe('question_courante_non_resolue');
    expect(sessions.saveAppels).toBe(0);
  });
});
