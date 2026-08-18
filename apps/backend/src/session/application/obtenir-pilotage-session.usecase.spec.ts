import { GenerateurDeCode } from '../domain/generateur-de-code';
import { Selection } from '../domain/selection';
import { Session } from '../domain/session';
import { SessionRepository } from '../domain/session.repository';
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
    const useCase = new ObtenirPilotageSession(sessions);

    const resultat = await useCase.executer('inconnue');

    expect(resultat.type).toBe('introuvable');
  });

  it('renvoie "introuvable" tant que la Session est encore PREPAREE', async () => {
    const sessions = new SessionRepositoryFake();
    sessions.sessions.push(creerSessionPreparee('s1'));
    const useCase = new ObtenirPilotageSession(sessions);

    const resultat = await useCase.executer('s1');

    expect(resultat.type).toBe('introuvable');
  });

  it('renvoie le détail une fois OUVERTE', async () => {
    const sessions = new SessionRepositoryFake();
    const session = creerSessionPreparee('s1');
    await session.ouvrir();
    sessions.sessions.push(session);
    const useCase = new ObtenirPilotageSession(sessions);

    const resultat = await useCase.executer('s1');

    expect(resultat.type).toBe('ok');
    if (resultat.type !== 'ok') throw new Error('unreachable');
    expect(resultat.session.code).toBe('AB12');
  });

  it('reste accessible en lecture seule une fois CLOTUREE', async () => {
    const sessions = new SessionRepositoryFake();
    const session = creerSessionPreparee('s1');
    await session.ouvrir();
    session.terminer();
    sessions.sessions.push(session);
    const useCase = new ObtenirPilotageSession(sessions);

    const resultat = await useCase.executer('s1');

    expect(resultat.type).toBe('ok');
  });
});
