import { GenerateurDeCode } from '../domain/generateur-de-code';
import { Selection } from '../domain/selection';
import { Session } from '../domain/session';
import { SessionRepository } from '../domain/session.repository';
import { TerminerSession } from './terminer-session.usecase';

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

async function sessionOuverte(): Promise<Session> {
  const session = Session.creer(
    's1',
    'e1',
    new Date('2026-03-01'),
    'm1',
    Selection.reconstituer(['q1']),
    generateurDeCode,
  ).valeur;
  await session.ouvrir();
  return session;
}

describe('TerminerSession', () => {
  it('renvoie "introuvable" si la Session n’existe pas', async () => {
    const useCase = new TerminerSession(new SessionRepositoryFake());

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
    const useCase = new TerminerSession(sessions);

    const resultat = await useCase.executer('s1');

    expect(resultat.type).toBe('non_ouverte');
    expect(sessions.saveAppels).toBe(0);
  });

  it('renvoie "non_ouverte" si la Session est déjà CLOTUREE (double clôture)', async () => {
    const sessions = new SessionRepositoryFake();
    const session = await sessionOuverte();
    session.terminer();
    sessions.sessions.push(session);
    const useCase = new TerminerSession(sessions);

    const resultat = await useCase.executer('s1');

    expect(resultat.type).toBe('non_ouverte');
    expect(sessions.saveAppels).toBe(0);
  });

  it('clôture une Session OUVERTE et la persiste', async () => {
    const sessions = new SessionRepositoryFake();
    sessions.sessions.push(await sessionOuverte());
    const useCase = new TerminerSession(sessions);

    const resultat = await useCase.executer('s1');

    expect(resultat.type).toBe('ok');
    if (resultat.type !== 'ok') throw new Error('unreachable');
    expect(resultat.session.statut).toBe('CLOTUREE');
    expect(sessions.saveAppels).toBe(1);
  });
});
