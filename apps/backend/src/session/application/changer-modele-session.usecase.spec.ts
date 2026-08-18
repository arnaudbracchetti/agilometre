import { GenerateurDeCode } from '../domain/generateur-de-code';
import { ModeleSession } from '../domain/modele-session';
import { ModeleSessionRepository } from '../domain/modele-session.repository';
import { Selection } from '../domain/selection';
import { Session } from '../domain/session';
import { SessionRepository } from '../domain/session.repository';
import { ChangerModeleSession } from './changer-modele-session.usecase';

const generateurDeCode: GenerateurDeCode = {
  generer: () => Promise.resolve('AB12'),
};

class ModeleSessionRepositoryFake implements ModeleSessionRepository {
  modeles: ModeleSession[] = [];
  findById(id: string): Promise<ModeleSession | null> {
    return Promise.resolve(this.modeles.find((m) => m.id === id) ?? null);
  }
  save(modele: ModeleSession): Promise<void> {
    if (!this.modeles.includes(modele)) {
      this.modeles.push(modele);
    }
    return Promise.resolve();
  }
  remove(): Promise<void> {
    return Promise.resolve();
  }
}

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

function sessionOuverte(): Session {
  return Session.creer(
    's1',
    'e1',
    new Date('2026-03-01'),
    'm1',
    Selection.reconstituer(['q1', 'q2']),
    generateurDeCode,
  ).valeur;
}

describe('ChangerModeleSession', () => {
  it('remplace le Modèle et réinitialise la Sélection avec une copie du nouveau Modèle', async () => {
    const modeles = new ModeleSessionRepositoryFake();
    const nouveauModele = ModeleSession.creer('m2', 'Suivi').valeur;
    nouveauModele.ajouterQuestion('q9');
    modeles.modeles.push(nouveauModele);
    const sessions = new SessionRepositoryFake();
    sessions.sessions.push(sessionOuverte());
    const useCase = new ChangerModeleSession(sessions, modeles);

    const resultat = await useCase.executer('s1', 'm2');

    expect(resultat.type).toBe('modifiee');
    if (resultat.type !== 'modifiee') throw new Error('unreachable');
    expect(resultat.session.modeleSessionId).toBe('m2');
    expect(resultat.session.selection.questionIds).toEqual(['q9']);
  });

  it('ne partage jamais l’instance de Sélection avec le nouveau Modèle source', async () => {
    const modeles = new ModeleSessionRepositoryFake();
    const nouveauModele = ModeleSession.creer('m2', 'Suivi').valeur;
    nouveauModele.ajouterQuestion('q9');
    modeles.modeles.push(nouveauModele);
    const sessions = new SessionRepositoryFake();
    sessions.sessions.push(sessionOuverte());
    const useCase = new ChangerModeleSession(sessions, modeles);

    const resultat = await useCase.executer('s1', 'm2');
    if (resultat.type !== 'modifiee') throw new Error('unreachable');

    nouveauModele.ajouterQuestion('q10');

    expect(resultat.session.selection.questionIds).toEqual(['q9']);
  });

  it('renvoie "introuvable" si la Session n’existe pas', async () => {
    const modeles = new ModeleSessionRepositoryFake();
    const sessions = new SessionRepositoryFake();
    const useCase = new ChangerModeleSession(sessions, modeles);

    const resultat = await useCase.executer('inconnue', 'm2');

    expect(resultat.type).toBe('introuvable');
  });

  it('renvoie "modele_introuvable" et ne modifie rien si le nouveau Modèle est inconnu', async () => {
    const modeles = new ModeleSessionRepositoryFake();
    const sessions = new SessionRepositoryFake();
    sessions.sessions.push(sessionOuverte());
    const useCase = new ChangerModeleSession(sessions, modeles);

    const resultat = await useCase.executer('s1', 'inconnu');

    expect(resultat.type).toBe('modele_introuvable');
    expect(sessions.sessions[0].modeleSessionId).toBe('m1');
  });

  it('renvoie "non_modifiable" si la Session est verrouillée', async () => {
    const modeles = new ModeleSessionRepositoryFake();
    modeles.modeles.push(ModeleSession.creer('m2', 'Suivi').valeur);
    const sessions = new SessionRepositoryFake();
    sessions.sessions.push(
      Session.reconstituer(
        's1',
        'e1',
        new Date('2026-03-01'),
        'OUVERTE',
        'm1',
        Selection.reconstituer(['q1']),
        null,
        -1,
        new Set(),
        generateurDeCode,
      ),
    );
    const useCase = new ChangerModeleSession(sessions, modeles);

    const resultat = await useCase.executer('s1', 'm2');

    expect(resultat.type).toBe('non_modifiable');
  });

  it('renvoie "non_modifiable" si la Session est clôturée', async () => {
    const modeles = new ModeleSessionRepositoryFake();
    modeles.modeles.push(ModeleSession.creer('m2', 'Suivi').valeur);
    const sessions = new SessionRepositoryFake();
    sessions.sessions.push(
      Session.reconstituer(
        's1',
        'e1',
        new Date('2026-03-01'),
        'CLOTUREE',
        'm1',
        Selection.reconstituer(['q1']),
        null,
        -1,
        new Set(),
        generateurDeCode,
      ),
    );
    const useCase = new ChangerModeleSession(sessions, modeles);

    const resultat = await useCase.executer('s1', 'm2');

    expect(resultat.type).toBe('non_modifiable');
  });
});
