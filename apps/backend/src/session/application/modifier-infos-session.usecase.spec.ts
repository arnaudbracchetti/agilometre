import { Equipe } from '../../organisation/domain/equipe';
import { EquipeRepository } from '../../organisation/domain/equipe.repository';
import { GenerateurDeCode } from '../domain/generateur-de-code';
import { Selection } from '../domain/selection';
import { Session } from '../domain/session';
import { SessionRepository } from '../domain/session.repository';
import { ModifierInfosSession } from './modifier-infos-session.usecase';

const generateurDeCode: GenerateurDeCode = {
  generer: () => Promise.resolve('AB12'),
};

class EquipeRepositoryFake implements EquipeRepository {
  equipes: Equipe[] = [];
  findById(id: string): Promise<Equipe | null> {
    return Promise.resolve(this.equipes.find((e) => e.id === id) ?? null);
  }
  findByEntiteId(): Promise<Equipe[]> {
    return Promise.resolve(this.equipes);
  }
  trouverParNom(): Promise<Equipe | null> {
    return Promise.resolve(null);
  }
  save(equipe: Equipe): Promise<void> {
    this.equipes.push(equipe);
    return Promise.resolve();
  }
  remove(): Promise<void> {
    return Promise.resolve();
  }
  compterParEntite(): Promise<number> {
    return Promise.resolve(0);
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
    Selection.vide(),
    generateurDeCode,
  ).valeur;
}

describe('ModifierInfosSession', () => {
  it('remplace Équipe et Date puis sauvegarde', async () => {
    const equipes = new EquipeRepositoryFake();
    equipes.equipes.push(Equipe.creer('e1', 'Alpha', 'ent1').valeur);
    equipes.equipes.push(Equipe.creer('e2', 'Beta', 'ent1').valeur);
    const sessions = new SessionRepositoryFake();
    sessions.sessions.push(sessionOuverte());
    const useCase = new ModifierInfosSession(sessions, equipes);

    const resultat = await useCase.executer('s1', 'e2', new Date('2026-04-01'));

    expect(resultat.type).toBe('modifiee');
    if (resultat.type !== 'modifiee') throw new Error('unreachable');
    expect(resultat.session.equipeId).toBe('e2');
    expect(resultat.session.date).toEqual(new Date('2026-04-01'));
  });

  it('renvoie "introuvable" si la Session n’existe pas', async () => {
    const equipes = new EquipeRepositoryFake();
    const sessions = new SessionRepositoryFake();
    const useCase = new ModifierInfosSession(sessions, equipes);

    const resultat = await useCase.executer(
      'inconnue',
      'e2',
      new Date('2026-04-01'),
    );

    expect(resultat.type).toBe('introuvable');
  });

  it('renvoie "equipe_introuvable" et ne modifie rien si la nouvelle Équipe est inconnue', async () => {
    const equipes = new EquipeRepositoryFake();
    const sessions = new SessionRepositoryFake();
    sessions.sessions.push(sessionOuverte());
    const useCase = new ModifierInfosSession(sessions, equipes);

    const resultat = await useCase.executer(
      's1',
      'inconnue',
      new Date('2026-04-01'),
    );

    expect(resultat.type).toBe('equipe_introuvable');
    expect(sessions.sessions[0].equipeId).toBe('e1');
  });

  it('renvoie "non_modifiable" si la Session est verrouillée', async () => {
    const equipes = new EquipeRepositoryFake();
    equipes.equipes.push(Equipe.creer('e2', 'Beta', 'ent1').valeur);
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
    const useCase = new ModifierInfosSession(sessions, equipes);

    const resultat = await useCase.executer('s1', 'e2', new Date('2026-04-01'));

    expect(resultat.type).toBe('non_modifiable');
  });

  it('renvoie "non_modifiable" si la Session est clôturée', async () => {
    const equipes = new EquipeRepositoryFake();
    equipes.equipes.push(Equipe.creer('e2', 'Beta', 'ent1').valeur);
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
    const useCase = new ModifierInfosSession(sessions, equipes);

    const resultat = await useCase.executer('s1', 'e2', new Date('2026-04-01'));

    expect(resultat.type).toBe('non_modifiable');
  });
});
