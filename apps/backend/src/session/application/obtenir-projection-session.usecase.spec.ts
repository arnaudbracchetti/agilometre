import { GenerateurDeCode } from '../domain/generateur-de-code';
import { JetonSessionRepository } from '../domain/jeton-session.repository';
import { JetonSession } from '../domain/jeton-session';
import { Selection } from '../domain/selection';
import { Session } from '../domain/session';
import { SessionRepository } from '../domain/session.repository';
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
  compterPour(): Promise<number> {
    return Promise.resolve(this.compte);
  }
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
    const useCase = new ObtenirProjectionSession(sessions, jetons);

    const resultat = await useCase.executer('inconnue');

    expect(resultat.type).toBe('introuvable');
  });

  it('renvoie "introuvable" tant que la Session n’est pas OUVERTE', async () => {
    const sessions = new SessionRepositoryFake();
    const session = creerSessionPreparee('s1');
    sessions.sessions.push(session);
    const jetons = new JetonSessionRepositoryFake();
    const useCase = new ObtenirProjectionSession(sessions, jetons);

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
    const useCase = new ObtenirProjectionSession(sessions, jetons);

    const resultat = await useCase.executer('s1');

    expect(resultat.type).toBe('introuvable');
  });

  it('renvoie le Code et le nombre de devices connectés une fois OUVERTE', async () => {
    const sessions = new SessionRepositoryFake();
    const session = creerSessionPreparee('s1');
    await session.ouvrir();
    sessions.sessions.push(session);
    const jetons = new JetonSessionRepositoryFake();
    jetons.compte = 3;
    const useCase = new ObtenirProjectionSession(sessions, jetons);

    const resultat = await useCase.executer('s1');

    expect(resultat.type).toBe('ok');
    if (resultat.type !== 'ok') throw new Error('unreachable');
    expect(resultat.session.code).toBe('AB12');
    expect(resultat.nbDevicesConnectes).toBe(3);
  });
});
