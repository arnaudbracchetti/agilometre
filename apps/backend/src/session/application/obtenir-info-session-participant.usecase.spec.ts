import { EquipeRepository } from '../../organisation/domain/equipe.repository';
import { Equipe } from '../../organisation/domain/equipe';
import { GenerateurDeCode } from '../domain/generateur-de-code';
import { Selection } from '../domain/selection';
import { Session } from '../domain/session';
import { SessionRepository } from '../domain/session.repository';
import { ObtenirInfoSessionParticipant } from './obtenir-info-session-participant.usecase';

const generateurDeCode: GenerateurDeCode = {
  generer: () => Promise.resolve('4271'),
};

class SessionRepositoryFake implements SessionRepository {
  sessions: Session[] = [];
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

class EquipeRepositoryFake implements EquipeRepository {
  equipes: Equipe[] = [];
  findById(id: string): Promise<Equipe | null> {
    return Promise.resolve(this.equipes.find((e) => e.id === id) ?? null);
  }
  findByEntiteId(entiteId: string): Promise<Equipe[]> {
    return Promise.resolve(this.equipes.filter((e) => e.entiteId === entiteId));
  }
  trouverParNom(nom: string): Promise<Equipe | null> {
    return Promise.resolve(
      this.equipes.find((e) => e.nom.toLowerCase() === nom.toLowerCase()) ??
        null,
    );
  }
  save(equipe: Equipe): Promise<void> {
    if (!this.equipes.includes(equipe)) {
      this.equipes.push(equipe);
    }
    return Promise.resolve();
  }
  remove(id: string): Promise<void> {
    this.equipes = this.equipes.filter((e) => e.id !== id);
    return Promise.resolve();
  }
  compterParEntite(entiteId: string): Promise<number> {
    return Promise.resolve(
      this.equipes.filter((e) => e.entiteId === entiteId).length,
    );
  }
}

function sessionPreparee(id = 's1', equipeId = 'e1'): Session {
  return Session.creer(
    id,
    equipeId,
    new Date('2026-03-01'),
    'm1',
    Selection.reconstituer(['q1']),
    generateurDeCode,
  ).valeur;
}

describe('ObtenirInfoSessionParticipant', () => {
  it('renvoie le nom d’équipe et ouvertureLe=null tant que la Session n’est pas ouverte', async () => {
    const sessions = new SessionRepositoryFake();
    const equipes = new EquipeRepositoryFake();
    const session = sessionPreparee();
    sessions.sessions.push(session);
    equipes.equipes.push(Equipe.creer('e1', 'Les Mangoustes', 'ent1').valeur);
    const useCase = new ObtenirInfoSessionParticipant(sessions, equipes);

    const resultat = await useCase.executer('s1');

    expect(resultat).toEqual({
      type: 'ok',
      equipeNom: 'Les Mangoustes',
      ouvertureLe: null,
    });
  });

  it('renvoie ouvertureLe une fois la Session ouverte', async () => {
    const sessions = new SessionRepositoryFake();
    const equipes = new EquipeRepositoryFake();
    const session = sessionPreparee();
    await session.ouvrir();
    sessions.sessions.push(session);
    equipes.equipes.push(Equipe.creer('e1', 'Les Mangoustes', 'ent1').valeur);
    const useCase = new ObtenirInfoSessionParticipant(sessions, equipes);

    const resultat = await useCase.executer('s1');

    expect(resultat.type).toBe('ok');
    expect(resultat.type === 'ok' && resultat.ouvertureLe).toBeInstanceOf(Date);
  });

  it('equipeNom vide si l’Équipe est introuvable', async () => {
    const sessions = new SessionRepositoryFake();
    const equipes = new EquipeRepositoryFake();
    sessions.sessions.push(sessionPreparee());
    const useCase = new ObtenirInfoSessionParticipant(sessions, equipes);

    const resultat = await useCase.executer('s1');

    expect(resultat).toEqual({ type: 'ok', equipeNom: '', ouvertureLe: null });
  });

  it('renvoie introuvable si la Session n’existe pas', async () => {
    const sessions = new SessionRepositoryFake();
    const equipes = new EquipeRepositoryFake();
    const useCase = new ObtenirInfoSessionParticipant(sessions, equipes);

    const resultat = await useCase.executer('inconnu');

    expect(resultat).toEqual({ type: 'introuvable' });
  });
});
