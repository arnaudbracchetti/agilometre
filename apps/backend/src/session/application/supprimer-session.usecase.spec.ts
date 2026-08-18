import { GenerateurDeCode } from '../domain/generateur-de-code';
import { Selection } from '../domain/selection';
import { Session } from '../domain/session';
import { SessionRepository } from '../domain/session.repository';
import { SupprimerSession } from './supprimer-session.usecase';

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

function sessionOuverte(): Session {
  return Session.creer(
    's1',
    'e1',
    new Date('2026-03-01'),
    'm1',
    Selection.vide(),
    generateurDeCode,
  ).valeur;
}

describe('SupprimerSession', () => {
  it('supprime une Session ouverte et non verrouillée', async () => {
    const sessions = new SessionRepositoryFake();
    sessions.sessions.push(sessionOuverte());
    const useCase = new SupprimerSession(sessions);

    const resultat = await useCase.executer('s1');

    expect(resultat.type).toBe('supprime');
    expect(sessions.sessions).toHaveLength(0);
  });

  it('renvoie "introuvable" si la Session n’existe pas', async () => {
    const sessions = new SessionRepositoryFake();
    const useCase = new SupprimerSession(sessions);

    const resultat = await useCase.executer('inconnue');

    expect(resultat.type).toBe('introuvable');
  });

  it('renvoie "non_supprimable" et ne supprime rien si la Session est verrouillée', async () => {
    const sessions = new SessionRepositoryFake();
    sessions.sessions.push(
      Session.reconstituer(
        's1',
        'e1',
        new Date('2026-03-01'),
        'OUVERTE',
        'm1',
        Selection.vide(),
        null,
        -1,
        new Set(),
        generateurDeCode,
      ),
    );
    const useCase = new SupprimerSession(sessions);

    const resultat = await useCase.executer('s1');

    expect(resultat.type).toBe('non_supprimable');
    expect(sessions.sessions).toHaveLength(1);
  });

  it('renvoie "non_supprimable" et ne supprime rien si la Session est clôturée', async () => {
    const sessions = new SessionRepositoryFake();
    sessions.sessions.push(
      Session.reconstituer(
        's1',
        'e1',
        new Date('2026-03-01'),
        'CLOTUREE',
        'm1',
        Selection.vide(),
        null,
        -1,
        new Set(),
        generateurDeCode,
      ),
    );
    const useCase = new SupprimerSession(sessions);

    const resultat = await useCase.executer('s1');

    expect(resultat.type).toBe('non_supprimable');
    expect(sessions.sessions).toHaveLength(1);
  });
});
