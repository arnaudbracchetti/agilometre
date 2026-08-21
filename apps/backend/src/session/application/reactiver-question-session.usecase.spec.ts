import { GenerateurDeCode } from '../domain/generateur-de-code';
import { Selection } from '../domain/selection';
import {
  QuestionDejaDepasseeError,
  QuestionNonSauteeError,
  Session,
} from '../domain/session';
import { SessionRepository } from '../domain/session.repository';
import { ReactiverQuestionSession } from './reactiver-question-session.usecase';

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

async function sessionOuverteAvecQuestionSauteeParAnticipation(): Promise<Session> {
  const session = Session.creer(
    's1',
    'e1',
    new Date('2026-03-01'),
    'm1',
    Selection.reconstituer(['q1', 'q2', 'q3']),
    generateurDeCode,
  ).valeur;
  await session.ouvrir();
  session.passerQuestionSuivante([]); // salle d'attente -> q1 courante
  session.sauter('q3', []); // q3 sautée par anticipation, encore devant indexCourant (0)
  return session;
}

describe('ReactiverQuestionSession', () => {
  it('renvoie "introuvable" si la Session n’existe pas', async () => {
    const useCase = new ReactiverQuestionSession(new SessionRepositoryFake());

    const resultat = await useCase.executer('inconnue', 'q1');

    expect(resultat.type).toBe('introuvable');
  });

  it('renvoie "question_introuvable" si la Question n’est pas dans la Sélection', async () => {
    const sessions = new SessionRepositoryFake();
    sessions.sessions.push(
      await sessionOuverteAvecQuestionSauteeParAnticipation(),
    );
    const useCase = new ReactiverQuestionSession(sessions);

    const resultat = await useCase.executer('s1', 'q-inconnue');

    expect(resultat.type).toBe('question_introuvable');
    expect(sessions.saveAppels).toBe(0);
  });

  it('réactive une Question sautée par anticipation et persiste', async () => {
    const sessions = new SessionRepositoryFake();
    const session = await sessionOuverteAvecQuestionSauteeParAnticipation();
    sessions.sessions.push(session);
    const useCase = new ReactiverQuestionSession(sessions);

    const resultat = await useCase.executer('s1', 'q3');

    expect(resultat.type).toBe('ok');
    if (resultat.type !== 'ok') throw new Error('unreachable');
    expect(resultat.session.questionsSautees.has('q3')).toBe(false);
    expect(sessions.saveAppels).toBe(1);
  });

  it('renvoie "invalide" (QuestionDejaDepasseeError) sans muter si l’index n’est plus devant indexCourant', async () => {
    const sessions = new SessionRepositoryFake();
    const session = Session.creer(
      's1',
      'e1',
      new Date('2026-03-01'),
      'm1',
      Selection.reconstituer(['q1', 'q2']),
      generateurDeCode,
    ).valeur;
    await session.ouvrir();
    session.passerQuestionSuivante([]); // -> q1 courante
    session.sauter('q1', []); // q1 sautée en tant que courante -> indexCourant avance à q2
    sessions.sessions.push(session);
    const useCase = new ReactiverQuestionSession(sessions);

    const resultat = await useCase.executer('s1', 'q1');

    expect(resultat.type).toBe('invalide');
    if (resultat.type !== 'invalide') throw new Error('unreachable');
    expect(resultat.erreur).toBeInstanceOf(QuestionDejaDepasseeError);
    expect(sessions.saveAppels).toBe(0);
  });

  it('renvoie "invalide" (QuestionNonSauteeError) si la Question n’est pas Sautée', async () => {
    const sessions = new SessionRepositoryFake();
    const session = Session.creer(
      's1',
      'e1',
      new Date('2026-03-01'),
      'm1',
      Selection.reconstituer(['q1', 'q2']),
      generateurDeCode,
    ).valeur;
    await session.ouvrir();
    sessions.sessions.push(session);
    const useCase = new ReactiverQuestionSession(sessions);

    const resultat = await useCase.executer('s1', 'q2');

    expect(resultat.type).toBe('invalide');
    if (resultat.type !== 'invalide') throw new Error('unreachable');
    expect(resultat.erreur).toBeInstanceOf(QuestionNonSauteeError);
    expect(sessions.saveAppels).toBe(0);
  });
});
