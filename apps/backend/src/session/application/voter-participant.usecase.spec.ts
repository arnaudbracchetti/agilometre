import { Niveau } from '../../referentiel/domain/niveau';
import { Option } from '../../referentiel/domain/option';
import { Question } from '../../referentiel/domain/question';
import { Referentiel } from '../../referentiel/domain/referentiel';
import { ReferentielRepository } from '../../referentiel/domain/referentiel.repository';
import { Theme } from '../../referentiel/domain/theme';
import { GenerateurDeCode } from '../domain/generateur-de-code';
import { Reponse } from '../../reponse/domain/reponse';
import { ReponseRepository } from '../../reponse/domain/reponse.repository';
import { Selection } from '../domain/selection';
import { Session } from '../domain/session';
import { SessionRepository } from '../domain/session.repository';
import { TourDeVote } from '../domain/tour-de-vote';
import { TourDeVoteRepository } from '../domain/tour-de-vote.repository';
import { VoterParticipant } from './voter-participant.usecase';

const generateurDeCode: GenerateurDeCode = {
  generer: () => Promise.resolve('AB12'),
};

class SessionRepositoryFake implements SessionRepository {
  sessions: Session[] = [];
  findById(id: string): Promise<Session | null> {
    return Promise.resolve(this.sessions.find((s) => s.id === id) ?? null);
  }
  findFermeesParEquipeEtPeriode(): Promise<Session[]> {
    return Promise.resolve([]);
  }
  findByCode(): Promise<Session | null> {
    return Promise.resolve(null);
  }
  save(): Promise<void> {
    return Promise.resolve();
  }
  remove(): Promise<void> {
    return Promise.resolve();
  }
  existeCodeOuvert(): Promise<boolean> {
    return Promise.resolve(false);
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

class TourDeVoteRepositoryFake implements TourDeVoteRepository {
  tours: TourDeVote[] = [];
  saveAppels = 0;
  findById(id: string): Promise<TourDeVote | null> {
    return Promise.resolve(this.tours.find((t) => t.id === id) ?? null);
  }
  trouverTourOuvertDeLaSession(sessionId: string): Promise<TourDeVote | null> {
    return Promise.resolve(
      this.tours.find((t) => t.sessionId === sessionId && !t.estClos) ?? null,
    );
  }
  save(): Promise<void> {
    this.saveAppels++;
    return Promise.resolve();
  }
}

class ReponseRepositoryFake implements ReponseRepository {
  reponses: Reponse[] = [];
  ordreAppels: string[] = [];
  findById(id: string): Promise<Reponse | null> {
    return Promise.resolve(this.reponses.find((r) => r.id === id) ?? null);
  }
  findByTourIds(tourIds: string[]): Promise<Reponse[]> {
    return Promise.resolve(
      this.reponses.filter(
        (r) => r.tourId !== null && tourIds.includes(r.tourId),
      ),
    );
  }
  save(reponse: Reponse): Promise<void> {
    this.ordreAppels.push(`save:${reponse.id}`);
    this.reponses.push(reponse);
    return Promise.resolve();
  }
  remove(id: string): Promise<void> {
    this.ordreAppels.push(`remove:${id}`);
    this.reponses = this.reponses.filter((r) => r.id !== id);
    return Promise.resolve();
  }
}

function referentielFake(): ReferentielRepository {
  const options = [1, 2, 3, 4].map((niveau) =>
    Option.creer(`Option ${niveau}`, Niveau.creer(niveau).valeur),
  );
  const question = Question.creer('q1', 'Libellé', 't1', options).valeur;
  const theme = Theme.creer('t1', 'Thème', [question]);
  const referentiel = Referentiel.reconstituer(new Date('2026-01-01'), [theme]);
  return {
    charger: () => Promise.resolve(referentiel),
    sauvegarder: () => Promise.resolve(),
  };
}

async function sessionOuverte(): Promise<Session> {
  const session = Session.creer(
    's1',
    'e1',
    new Date('2026-04-01'),
    'm1',
    Selection.reconstituer(['q1']),
    generateurDeCode,
  ).valeur;
  await session.ouvrir();
  return session;
}

describe('VoterParticipant', () => {
  it('renvoie "aucun_tour_ouvert" si la Session n’a pas de Tour ouvert', async () => {
    const useCase = new VoterParticipant(
      new SessionRepositoryFake(),
      new TourDeVoteRepositoryFake(),
      new ReponseRepositoryFake(),
      referentielFake(),
    );

    const resultat = await useCase.executer('s1', 'jeton-1', 0);

    expect(resultat.type).toBe('aucun_tour_ouvert');
  });

  it('renvoie "option_invalide" pour un index hors bornes', async () => {
    const tours = new TourDeVoteRepositoryFake();
    tours.tours.push(
      TourDeVote.creer(
        't1',
        's1',
        'q1',
        1,
        new Date('2026-04-01T10:00:00Z'),
        null,
      ).valeur,
    );
    const useCase = new VoterParticipant(
      new SessionRepositoryFake(),
      tours,
      new ReponseRepositoryFake(),
      referentielFake(),
    );

    const resultat = await useCase.executer('s1', 'jeton-1', 4);

    expect(resultat.type).toBe('option_invalide');
  });

  it('vote : crée la Reponse puis sauvegarde le Tour, dans cet ordre (contrainte FK)', async () => {
    const sessions = new SessionRepositoryFake();
    sessions.sessions.push(await sessionOuverte());
    const tours = new TourDeVoteRepositoryFake();
    tours.tours.push(
      TourDeVote.creer(
        't1',
        's1',
        'q1',
        1,
        new Date('2026-04-01T10:00:00Z'),
        null,
      ).valeur,
    );
    const reponses = new ReponseRepositoryFake();
    const useCase = new VoterParticipant(
      sessions,
      tours,
      reponses,
      referentielFake(),
    );

    const resultat = await useCase.executer('s1', 'jeton-1', 2);

    expect(resultat.type).toBe('ok');
    if (resultat.type !== 'ok') throw new Error('unreachable');
    expect(resultat.tour.voteDe('jeton-1')?.reponseId).toBeDefined();
    expect(reponses.reponses).toHaveLength(1);
    expect(reponses.reponses[0].niveau).toBe(3); // options[2] → niveau 3 (1-indexé)
    expect(tours.saveAppels).toBe(1);
    expect(reponses.ordreAppels).toEqual([`save:${reponses.reponses[0].id}`]);
  });

  it('revote : sauvegarde la nouvelle Reponse, sauvegarde le Tour, puis supprime l’ancienne Reponse — dans cet ordre', async () => {
    const sessions = new SessionRepositoryFake();
    sessions.sessions.push(await sessionOuverte());
    const tours = new TourDeVoteRepositoryFake();
    tours.tours.push(
      TourDeVote.creer(
        't1',
        's1',
        'q1',
        1,
        new Date('2026-04-01T10:00:00Z'),
        null,
      ).valeur,
    );
    const reponses = new ReponseRepositoryFake();
    const useCase = new VoterParticipant(
      sessions,
      tours,
      reponses,
      referentielFake(),
    );
    await useCase.executer('s1', 'jeton-1', 0);
    const premiereReponseId = reponses.reponses[0].id;
    reponses.ordreAppels = [];

    const resultat = await useCase.executer('s1', 'jeton-1', 3);

    expect(resultat.type).toBe('ok');
    expect(reponses.reponses).toHaveLength(1);
    expect(reponses.reponses[0].niveau).toBe(4);
    const nouvelleReponseId = reponses.reponses[0].id;
    expect(reponses.ordreAppels).toEqual([
      `save:${nouvelleReponseId}`,
      `remove:${premiereReponseId}`,
    ]);
  });
});
