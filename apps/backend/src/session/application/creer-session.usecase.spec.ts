import { Equipe } from '../../organisation/domain/equipe';
import { EquipeRepository } from '../../organisation/domain/equipe.repository';
import { GenerateurDeCode } from '../domain/generateur-de-code';
import { ModeleSession } from '../domain/modele-session';
import { ModeleSessionRepository } from '../domain/modele-session.repository';
import { Session } from '../domain/session';
import { SessionRepository } from '../domain/session.repository';
import { CreerSession } from './creer-session.usecase';

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
    this.sessions.push(session);
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

describe('CreerSession', () => {
  it('copie la Sélection du Modèle dans une nouvelle Session ouverte', async () => {
    const equipes = new EquipeRepositoryFake();
    equipes.equipes.push(Equipe.creer('e1', 'Alpha', 'ent1').valeur);
    const modeles = new ModeleSessionRepositoryFake();
    const modele = ModeleSession.creer('m1', 'Diagnostic').valeur;
    modele.ajouterQuestion('q1');
    modele.ajouterQuestion('q2');
    modeles.modeles.push(modele);
    const sessions = new SessionRepositoryFake();
    const useCase = new CreerSession(
      sessions,
      equipes,
      modeles,
      generateurDeCode,
    );

    const resultat = await useCase.executer('e1', new Date('2026-04-01'), 'm1');

    expect(resultat.type).toBe('creee');
    if (resultat.type !== 'creee') throw new Error('unreachable');
    expect(resultat.session.equipeId).toBe('e1');
    expect(resultat.session.modeleSessionId).toBe('m1');
    expect(resultat.session.selection.questionIds).toEqual(['q1', 'q2']);
    expect(sessions.sessions).toHaveLength(1);
  });

  it('ne partage jamais l’instance de Sélection avec le Modèle source', async () => {
    const equipes = new EquipeRepositoryFake();
    equipes.equipes.push(Equipe.creer('e1', 'Alpha', 'ent1').valeur);
    const modeles = new ModeleSessionRepositoryFake();
    const modele = ModeleSession.creer('m1', 'Diagnostic').valeur;
    modele.ajouterQuestion('q1');
    modeles.modeles.push(modele);
    const sessions = new SessionRepositoryFake();
    const useCase = new CreerSession(
      sessions,
      equipes,
      modeles,
      generateurDeCode,
    );

    const resultat = await useCase.executer('e1', new Date('2026-04-01'), 'm1');
    if (resultat.type !== 'creee') throw new Error('unreachable');

    modele.ajouterQuestion('q2');

    expect(resultat.session.selection.questionIds).toEqual(['q1']);
  });

  it('renvoie "equipe_introuvable" et ne sauvegarde rien si l’Équipe est inconnue', async () => {
    const equipes = new EquipeRepositoryFake();
    const modeles = new ModeleSessionRepositoryFake();
    const sessions = new SessionRepositoryFake();
    const useCase = new CreerSession(
      sessions,
      equipes,
      modeles,
      generateurDeCode,
    );

    const resultat = await useCase.executer('inconnue', new Date(), 'm1');

    expect(resultat.type).toBe('equipe_introuvable');
    expect(sessions.sessions).toHaveLength(0);
  });

  it('renvoie "modele_introuvable" et ne sauvegarde rien si le Modèle est inconnu', async () => {
    const equipes = new EquipeRepositoryFake();
    equipes.equipes.push(Equipe.creer('e1', 'Alpha', 'ent1').valeur);
    const modeles = new ModeleSessionRepositoryFake();
    const sessions = new SessionRepositoryFake();
    const useCase = new CreerSession(
      sessions,
      equipes,
      modeles,
      generateurDeCode,
    );

    const resultat = await useCase.executer('e1', new Date(), 'inconnu');

    expect(resultat.type).toBe('modele_introuvable');
    expect(sessions.sessions).toHaveLength(0);
  });
});
