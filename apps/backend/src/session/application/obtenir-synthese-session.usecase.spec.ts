import { Niveau } from '../../referentiel/domain/niveau';
import { Option } from '../../referentiel/domain/option';
import { Question } from '../../referentiel/domain/question';
import { Referentiel } from '../../referentiel/domain/referentiel';
import { ReferentielRepository } from '../../referentiel/domain/referentiel.repository';
import { Theme } from '../../referentiel/domain/theme';
import { ScoringV1 } from '../../scoring/domain/scoring-v1';
import { Equipe } from '../../organisation/domain/equipe';
import { EquipeRepository } from '../../organisation/domain/equipe.repository';
import { Reponse } from '../../reponse/domain/reponse';
import { ReponseRepository } from '../../reponse/domain/reponse.repository';
import { EtatTour, Session } from '../domain/session';
import { EtatToursQuery } from '../domain/etat-tours.query';
import { GenerateurDeCode } from '../domain/generateur-de-code';
import { Selection } from '../domain/selection';
import { SessionRepository } from '../domain/session.repository';
import { ObtenirSyntheseSession } from './obtenir-synthese-session.usecase';

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
  existeFermeeAvant(): Promise<boolean> {
    return Promise.resolve(false);
  }
}

class EquipeRepositoryFake implements EquipeRepository {
  constructor(private readonly equipes: Equipe[]) {}
  findById(id: string): Promise<Equipe | null> {
    return Promise.resolve(this.equipes.find((e) => e.id === id) ?? null);
  }
  findByEntiteId(): Promise<Equipe[]> {
    return Promise.resolve(this.equipes);
  }
  trouverParNom(): Promise<Equipe | null> {
    return Promise.resolve(null);
  }
  save(): Promise<void> {
    return Promise.resolve();
  }
  remove(): Promise<void> {
    return Promise.resolve();
  }
  compterParEntite(): Promise<number> {
    return Promise.resolve(this.equipes.length);
  }
}

const equipeParDefaut = (): Equipe[] => [
  Equipe.creer('e1', 'Équipe A', 'ent1').valeur,
];

class ReferentielRepositoryFake implements ReferentielRepository {
  constructor(private readonly referentiel: Referentiel) {}
  charger(): Promise<Referentiel> {
    return Promise.resolve(this.referentiel);
  }
  sauvegarder(): Promise<void> {
    return Promise.resolve();
  }
}

class EtatToursQueryFake implements EtatToursQuery {
  constructor(private readonly etats: EtatTour[]) {}
  listerEtatsDesToursDeLaSession(): Promise<EtatTour[]> {
    return Promise.resolve(this.etats);
  }
}

class ReponseRepositoryFake implements ReponseRepository {
  constructor(private readonly reponses: Reponse[]) {}
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
  save(): Promise<void> {
    return Promise.resolve();
  }
  remove(): Promise<void> {
    return Promise.resolve();
  }
}

function optionsValides(): Option[] {
  return [1, 2, 3, 4].map((niveau) =>
    Option.creer(`Option ${niveau}`, Niveau.creer(niveau).valeur),
  );
}

function question(id: string, themeId: string): Question {
  return Question.creer(id, `Libellé ${id}`, themeId, optionsValides()).valeur;
}

function reponse(
  id: string,
  questionId: string,
  niveau: number,
  tourId: string,
): Reponse {
  return Reponse.reconstituer(
    id,
    questionId,
    niveau,
    'e1',
    new Date('2026-03-01'),
    'SESSION',
    tourId,
  );
}

async function creerSessionOuverte(
  id: string,
  questionIds: string[],
): Promise<Session> {
  const session = Session.creer(
    id,
    'e1',
    new Date('2026-04-01'),
    'm1',
    Selection.reconstituer(questionIds),
    generateurDeCode,
  ).valeur;
  await session.ouvrir();
  return session;
}

describe('ObtenirSyntheseSession', () => {
  it('renvoie "introuvable" si la Session n’existe pas', async () => {
    const useCase = new ObtenirSyntheseSession(
      new SessionRepositoryFake(),
      new EquipeRepositoryFake(equipeParDefaut()),
      new ReferentielRepositoryFake(Referentiel.vide()),
      new EtatToursQueryFake([]),
      new ReponseRepositoryFake([]),
      new ScoringV1(),
      60,
    );

    const resultat = await useCase.executer('inconnue');

    expect(resultat.type).toBe('introuvable');
  });

  it('renvoie "introuvable" tant que la Session est encore PREPAREE', async () => {
    const sessionPreparee = Session.creer(
      's1',
      'e1',
      new Date('2026-04-01'),
      'm1',
      Selection.reconstituer(['q1']),
      generateurDeCode,
    ).valeur;
    const sessions = new SessionRepositoryFake();
    sessions.sessions.push(sessionPreparee);
    const useCase = new ObtenirSyntheseSession(
      sessions,
      new EquipeRepositoryFake(equipeParDefaut()),
      new ReferentielRepositoryFake(Referentiel.vide()),
      new EtatToursQueryFake([]),
      new ReponseRepositoryFake([]),
      new ScoringV1(),
      60,
    );

    const resultat = await useCase.executer('s1');

    expect(resultat.type).toBe('introuvable');
  });

  it('assemble un Palier par Thème traité avec la lecture fine par Question', async () => {
    const themeA = Theme.creer('t1', 'Thème A', [
      question('q1', 't1'),
      question('q2', 't1'),
    ]);
    const themeB = Theme.creer('t2', 'Thème B', [question('q3', 't2')]);
    const referentiel = Referentiel.reconstituer(new Date('2026-01-01'), [
      themeA,
      themeB,
    ]);

    const session = await creerSessionOuverte('s1', ['q1', 'q2']);
    const sessions = new SessionRepositoryFake();
    sessions.sessions.push(session);

    const etatTours = new EtatToursQueryFake([
      { tourId: 't1', questionId: 'q1', numero: 1, clos: true },
      { tourId: 't2', questionId: 'q2', numero: 1, clos: true },
    ]);
    const reponses = new ReponseRepositoryFake([
      reponse('r1', 'q1', 1, 't1'),
      reponse('r2', 'q1', 1, 't1'),
      reponse('r3', 'q2', 4, 't2'),
    ]);

    const useCase = new ObtenirSyntheseSession(
      sessions,
      new EquipeRepositoryFake(equipeParDefaut()),
      new ReferentielRepositoryFake(referentiel),
      etatTours,
      reponses,
      new ScoringV1(),
      60,
    );

    const resultat = await useCase.executer('s1');

    expect(resultat.type).toBe('ok');
    if (resultat.type !== 'ok') return;
    // t2 (Thème B, Question q3) n'est pas dans la Sélection de cette Session : absent du résultat.
    expect(resultat.themes.map((t) => t.themeId)).toEqual(['t1']);
    expect(resultat.palierGlobal).toEqual(
      new ScoringV1().calculerPalier([1, 1, 4], 0.6),
    );
    const [theme] = resultat.themes;
    expect(theme.libelle).toBe('Thème A');
    expect(
      theme.questions.map((q) => ({
        questionId: q.questionId,
        libelle: q.libelle,
      })),
    ).toEqual([
      { questionId: 'q1', libelle: 'Libellé q1' },
      { questionId: 'q2', libelle: 'Libellé q2' },
    ]);
  });

  it("garde un Thème dont la Question sélectionnée n'a reçu aucune Réponse, marqué sans Palier", async () => {
    const themeA = Theme.creer('t1', 'Thème A', [question('q1', 't1')]);
    const themeB = Theme.creer('t2', 'Thème B', [question('q2', 't2')]);
    const referentiel = Referentiel.reconstituer(new Date('2026-01-01'), [
      themeA,
      themeB,
    ]);

    const session = await creerSessionOuverte('s1', ['q1', 'q2']);
    const sessions = new SessionRepositoryFake();
    sessions.sessions.push(session);

    // Seul le Tour de q1 est clos ; q2 n'a encore reçu aucun vote.
    const etatTours = new EtatToursQueryFake([
      { tourId: 't1', questionId: 'q1', numero: 1, clos: true },
    ]);
    const reponses = new ReponseRepositoryFake([reponse('r1', 'q1', 2, 't1')]);

    const useCase = new ObtenirSyntheseSession(
      sessions,
      new EquipeRepositoryFake(equipeParDefaut()),
      new ReferentielRepositoryFake(referentiel),
      etatTours,
      reponses,
      new ScoringV1(),
      60,
    );

    const resultat = await useCase.executer('s1');

    expect(resultat.type).toBe('ok');
    if (resultat.type !== 'ok') return;
    expect(resultat.themes.map((t) => t.themeId)).toEqual(['t1', 't2']);
    // Le Palier global ne pool que les Réponses effectivement reçues (q2 n'a pas encore voté).
    expect(resultat.palierGlobal).toEqual(
      new ScoringV1().calculerPalier([2], 0.6),
    );
    expect(resultat.themes[1]).toEqual({
      themeId: 't2',
      libelle: 'Thème B',
      position: 1,
      resultatPalier: { effectif: 0 },
      questions: [],
    });
  });
});
