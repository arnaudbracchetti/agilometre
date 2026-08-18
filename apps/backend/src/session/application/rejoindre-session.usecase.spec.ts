import { randomUUID } from 'node:crypto';
import { GenerateurDeCode } from '../domain/generateur-de-code';
import { JetonSession } from '../domain/jeton-session';
import { JetonSessionRepository } from '../domain/jeton-session.repository';
import { Selection } from '../domain/selection';
import { Session, SessionNonOuverteError } from '../domain/session';
import { SessionRepository } from '../domain/session.repository';
import { RejoindreSession } from './rejoindre-session.usecase';

const generateurDeCode: GenerateurDeCode = {
  generer: () => Promise.resolve('4271'),
};

class SessionRepositoryFake implements SessionRepository {
  sessions: Session[] = [];
  findById(id: string): Promise<Session | null> {
    return Promise.resolve(this.sessions.find((s) => s.id === id) ?? null);
  }
  /** Même restriction que l'adaptateur Prisma : seules les Sessions OUVERTE portent un Code résolvable. */
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

class JetonSessionRepositoryFake implements JetonSessionRepository {
  jetons: JetonSession[] = [];
  /** Rejette comme l'adaptateur Prisma si la Session n'est plus OUVERTE au moment de l'émission. */
  sessionsOuvertes = new Set<string>();
  invalides = new Set<string>();

  emettre(sessionId: string): Promise<JetonSession> {
    if (!this.sessionsOuvertes.has(sessionId)) {
      return Promise.reject(new SessionNonOuverteError());
    }
    const jeton = JetonSession.creer(randomUUID(), sessionId, new Date());
    this.jetons.push(jeton);
    return Promise.resolve(jeton);
  }
  findById(id: string): Promise<JetonSession | null> {
    return Promise.resolve(this.jetons.find((j) => j.id === id) ?? null);
  }
  compterPour(sessionId: string): Promise<number> {
    return Promise.resolve(
      this.jetons.filter(
        (j) => j.sessionId === sessionId && !this.invalides.has(j.id),
      ).length,
    );
  }
  invalider(id: string): Promise<void> {
    this.invalides.add(id);
    return Promise.resolve();
  }
}

function sessionPreparee(id = 's1'): Session {
  return Session.creer(
    id,
    'e1',
    new Date('2026-03-01'),
    'm1',
    Selection.reconstituer(['q1']),
    generateurDeCode,
  ).valeur;
}

async function contexteOuvert(): Promise<{
  sessions: SessionRepositoryFake;
  jetons: JetonSessionRepositoryFake;
  useCase: RejoindreSession;
  session: Session;
}> {
  const sessions = new SessionRepositoryFake();
  const jetons = new JetonSessionRepositoryFake();
  const session = sessionPreparee();
  await session.ouvrir();
  sessions.sessions.push(session);
  jetons.sessionsOuvertes.add(session.id);
  return {
    sessions,
    jetons,
    useCase: new RejoindreSession(sessions, jetons),
    session,
  };
}

describe('RejoindreSession', () => {
  it('émet un Jeton pour le Code d’une Session OUVERTE', async () => {
    const { useCase, session } = await contexteOuvert();

    const resultat = await useCase.executer('4271');

    expect(resultat.type).toBe('ok');
    if (resultat.type !== 'ok') throw new Error('unreachable');
    expect(resultat.sessionId).toBe(session.id);
    expect(resultat.jeton.sessionId).toBe(session.id);
  });

  it('émet un Jeton distinct à chaque jointure sur le même Code (compteur device-based)', async () => {
    const { useCase } = await contexteOuvert();

    const premier = await useCase.executer('4271');
    const second = await useCase.executer('4271');

    if (premier.type !== 'ok' || second.type !== 'ok')
      throw new Error('unreachable');
    expect(premier.jeton.id).not.toBe(second.jeton.id);
  });

  it('renvoie "introuvable" pour un Code inconnu', async () => {
    const { useCase } = await contexteOuvert();

    const resultat = await useCase.executer('0000');

    expect(resultat.type).toBe('introuvable');
  });

  it('renvoie "introuvable" pour une Session encore PREPAREE (pas de Code émis)', async () => {
    const sessions = new SessionRepositoryFake();
    const jetons = new JetonSessionRepositoryFake();
    sessions.sessions.push(sessionPreparee());
    const useCase = new RejoindreSession(sessions, jetons);

    const resultat = await useCase.executer('4271');

    expect(resultat.type).toBe('introuvable');
  });

  it('renvoie "introuvable" pour une Session CLOTUREE', async () => {
    const { useCase, session } = await contexteOuvert();
    session.terminer();

    const resultat = await useCase.executer('4271');

    expect(resultat.type).toBe('introuvable');
  });

  it('renvoie "introuvable" si la Session se clôture entre la résolution du Code et l’émission', async () => {
    const { useCase, jetons, session } = await contexteOuvert();
    // La Session reste OUVERTE pour findByCode, mais l'émission atomique la rejette.
    jetons.sessionsOuvertes.delete(session.id);

    const resultat = await useCase.executer('4271');

    expect(resultat.type).toBe('introuvable');
  });

  it('invalide le Jeton précédent une fois la nouvelle jointure réussie ("Rejoindre une autre séance")', async () => {
    const {
      useCase,
      sessions,
      jetons,
      session: sessionOrigine,
    } = await contexteOuvert();
    const jetonPrecedent = await jetons.emettre(sessionOrigine.id);
    // Code distinct de celui de sessionOrigine ('4271', fixé par generateurDeCode) : sinon
    // findByCode résoudrait sur la mauvaise Session, faussant le test.
    const generateurCible: GenerateurDeCode = {
      generer: () => Promise.resolve('9999'),
    };
    const sessionCible = Session.creer(
      's2',
      'e1',
      new Date('2026-03-01'),
      'm1',
      Selection.reconstituer(['q1']),
      generateurCible,
    ).valeur;
    await sessionCible.ouvrir();
    sessions.sessions.push(sessionCible);
    jetons.sessionsOuvertes.add(sessionCible.id);

    const resultat = await useCase.executer('9999', jetonPrecedent.id);

    expect(resultat.type).toBe('ok');
    await expect(jetons.compterPour(sessionOrigine.id)).resolves.toBe(0);
  });

  it('n’invalide rien quand aucun jetonPrecedentId n’est fourni (première jointure)', async () => {
    const { useCase, jetons, session } = await contexteOuvert();

    await useCase.executer('4271');

    await expect(jetons.compterPour(session.id)).resolves.toBe(1);
    expect(jetons.invalides.size).toBe(0);
  });

  it('n’invalide pas le Jeton précédent si la nouvelle jointure échoue (Code inconnu)', async () => {
    const { useCase, jetons, session } = await contexteOuvert();
    const jetonPrecedent = await jetons.emettre(session.id);

    const resultat = await useCase.executer('0000', jetonPrecedent.id);

    expect(resultat.type).toBe('introuvable');
    expect(jetons.invalides.has(jetonPrecedent.id)).toBe(false);
  });
});
