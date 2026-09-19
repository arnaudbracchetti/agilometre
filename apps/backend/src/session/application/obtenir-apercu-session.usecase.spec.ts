import { EquipeRepository } from '../../organisation/domain/equipe.repository';
import { Equipe } from '../../organisation/domain/equipe';
import { Selection } from '../../modele-collecte/domain/selection';
import { Session } from '../domain/session';
import { SessionRepository } from '../domain/session.repository';
import { ObtenirApercuSession } from './obtenir-apercu-session.usecase';

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
  existeFermeeAvant(): Promise<boolean> {
    return Promise.resolve(false);
  }
  findFermeesParEquipesEtPeriode(): Promise<Session[]> {
    return Promise.resolve([]);
  }
  existeFermeeAvantPourEquipes(): Promise<boolean> {
    return Promise.resolve(false);
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
  trouverParEmailMembre(): Promise<Equipe[]> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }
  estMembreDe(): Promise<boolean> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }
  aUneEquipeDansLEntite(): Promise<boolean> {
    return Promise.reject(new Error('non utilisé par ce test'));
  }
}

function sessionOuverte(id = 's1', equipeId = 'e1', code = '4271'): Session {
  const session = Session.creer(
    id,
    equipeId,
    new Date('2026-03-01'),
    'm1',
    Selection.reconstituer(['q1']),
    { generer: () => Promise.resolve(code) },
  ).valeur;
  return session;
}

describe('ObtenirApercuSession', () => {
  it('résout le Code d’une Session OUVERTE vers son Équipe et sa date d’ouverture, sans écriture', async () => {
    const sessions = new SessionRepositoryFake();
    const equipes = new EquipeRepositoryFake();
    const session = sessionOuverte();
    await session.ouvrir();
    sessions.sessions.push(session);
    equipes.equipes.push(Equipe.creer('e1', 'Les Mangoustes', 'ent1').valeur);
    const useCase = new ObtenirApercuSession(sessions, equipes);

    const resultat = await useCase.executer('4271');

    expect(resultat.type).toBe('ok');
    expect(resultat.type === 'ok' && resultat.equipeNom).toBe('Les Mangoustes');
    expect(resultat.type === 'ok' && resultat.ouvertureLe).toBeInstanceOf(Date);
  });

  it('renvoie introuvable pour un Code inconnu', async () => {
    const sessions = new SessionRepositoryFake();
    const equipes = new EquipeRepositoryFake();
    const useCase = new ObtenirApercuSession(sessions, equipes);

    const resultat = await useCase.executer('0000');

    expect(resultat).toEqual({ type: 'introuvable' });
  });

  it('renvoie introuvable pour une Session pas encore OUVERTE (même Code, findByCode ne la résout pas)', async () => {
    const sessions = new SessionRepositoryFake();
    const equipes = new EquipeRepositoryFake();
    sessions.sessions.push(sessionOuverte());
    equipes.equipes.push(Equipe.creer('e1', 'Les Mangoustes', 'ent1').valeur);
    const useCase = new ObtenirApercuSession(sessions, equipes);

    const resultat = await useCase.executer('4271');

    expect(resultat).toEqual({ type: 'introuvable' });
  });

  it('equipeNom vide si l’Équipe est introuvable', async () => {
    const sessions = new SessionRepositoryFake();
    const equipes = new EquipeRepositoryFake();
    const session = sessionOuverte();
    await session.ouvrir();
    sessions.sessions.push(session);
    const useCase = new ObtenirApercuSession(sessions, equipes);

    const resultat = await useCase.executer('4271');

    expect(resultat.type).toBe('ok');
    expect(resultat.type === 'ok' && resultat.equipeNom).toBe('');
    expect(resultat.type === 'ok' && resultat.ouvertureLe).toBeInstanceOf(Date);
  });
});
