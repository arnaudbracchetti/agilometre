import { GenerateurDeCode } from '../domain/generateur-de-code';
import { Selection } from '../domain/selection';
import { Session } from '../domain/session';
import { SessionRepository } from '../domain/session.repository';
import { OuvrirSession } from './ouvrir-session.usecase';

const generateurDeCode: GenerateurDeCode = {
  generer: () => Promise.resolve('AB12'),
};

class SessionRepositoryFake implements SessionRepository {
  sessions: Session[] = [];
  findById(id: string): Promise<Session | null> {
    return Promise.resolve(this.sessions.find((s) => s.id === id) ?? null);
  }
  save(session: Session): Promise<void> {
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

function sessionPreparee(): Session {
  return Session.creer(
    's1',
    'e1',
    new Date('2026-03-01'),
    'm1',
    Selection.reconstituer(['q1']),
    generateurDeCode,
  ).valeur;
}

describe('OuvrirSession', () => {
  it('ouvre une Session PREPAREE, le Code vient du générateur du domaine', async () => {
    const sessions = new SessionRepositoryFake();
    sessions.sessions.push(sessionPreparee());
    const useCase = new OuvrirSession(sessions);

    const resultat = await useCase.executer('s1');

    expect(resultat.type).toBe('ouverte');
    if (resultat.type !== 'ouverte') throw new Error('unreachable');
    expect(resultat.session.statut).toBe('OUVERTE');
    expect(resultat.session.code).toBe('AB12');
    expect(resultat.session.estVerrouillee()).toBe(true);
  });

  it('renvoie "introuvable" si la Session n’existe pas', async () => {
    const sessions = new SessionRepositoryFake();
    const useCase = new OuvrirSession(sessions);

    const resultat = await useCase.executer('inconnue');

    expect(resultat.type).toBe('introuvable');
  });

  it('renvoie "non_preparee" si la Session est déjà OUVERTE', async () => {
    const sessions = new SessionRepositoryFake();
    const session = sessionPreparee();
    await session.ouvrir();
    sessions.sessions.push(session);
    const useCase = new OuvrirSession(sessions);

    const resultat = await useCase.executer('s1');

    expect(resultat.type).toBe('non_preparee');
  });

  it('renvoie "non_preparee" si la Session est CLOTUREE', async () => {
    const sessions = new SessionRepositoryFake();
    const session = sessionPreparee();
    await session.ouvrir();
    session.terminer();
    sessions.sessions.push(session);
    const useCase = new OuvrirSession(sessions);

    const resultat = await useCase.executer('s1');

    expect(resultat.type).toBe('non_preparee');
  });
});
