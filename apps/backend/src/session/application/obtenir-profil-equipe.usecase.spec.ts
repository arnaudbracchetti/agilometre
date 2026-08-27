import { Equipe } from '../../organisation/domain/equipe';
import { EquipeRepository } from '../../organisation/domain/equipe.repository';
import { Niveau } from '../../referentiel/domain/niveau';
import { Option } from '../../referentiel/domain/option';
import { Question } from '../../referentiel/domain/question';
import { Referentiel } from '../../referentiel/domain/referentiel';
import { ReferentielRepository } from '../../referentiel/domain/referentiel.repository';
import { Theme } from '../../referentiel/domain/theme';
import { Reponse } from '../../reponse/domain/reponse';
import { ReponseRepository } from '../../reponse/domain/reponse.repository';
import { ScoringV1 } from '../../scoring/domain/scoring-v1';
import { EtatTour, Session } from '../domain/session';
import { EtatToursQuery } from '../domain/etat-tours.query';
import { GenerateurDeCode } from '../domain/generateur-de-code';
import { Selection } from '../domain/selection';
import { SessionRepository } from '../domain/session.repository';
import { ObtenirProfilEquipe } from './obtenir-profil-equipe.usecase';

const generateurDeCode: GenerateurDeCode = {
  generer: () => Promise.resolve('AB12'),
};

class SessionRepositoryFake implements SessionRepository {
  sessions: Session[] = [];
  findById(id: string): Promise<Session | null> {
    return Promise.resolve(this.sessions.find((s) => s.id === id) ?? null);
  }
  findFermeesParEquipeEtPeriode(
    equipeId: string,
    periode: { debut: Date; fin: Date },
  ): Promise<Session[]> {
    return Promise.resolve(
      this.sessions.filter(
        (s) =>
          s.equipeId === equipeId &&
          s.statut === 'CLOTUREE' &&
          s.date >= periode.debut &&
          s.date < periode.fin,
      ),
    );
  }
  findByCode(): Promise<Session | null> {
    return Promise.resolve(null);
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
  constructor(private readonly etatsParSession: Record<string, EtatTour[]>) {}
  listerEtatsDesToursDeLaSession(sessionId: string): Promise<EtatTour[]> {
    return Promise.resolve(this.etatsParSession[sessionId] ?? []);
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

function sessionFermee(
  id: string,
  equipeId: string,
  date: Date,
  questionIds: string[],
): Session {
  return Session.reconstituer(
    id,
    equipeId,
    date,
    'CLOTUREE',
    'm1',
    Selection.reconstituer(questionIds),
    null,
    0,
    new Set(),
    generateurDeCode,
  );
}

function sessionOuverte(
  id: string,
  equipeId: string,
  date: Date,
  questionIds: string[],
): Session {
  return Session.reconstituer(
    id,
    equipeId,
    date,
    'OUVERTE',
    'm1',
    Selection.reconstituer(questionIds),
    'AB12',
    0,
    new Set(),
    generateurDeCode,
  );
}

describe('ObtenirProfilEquipe', () => {
  it('renvoie "introuvable" si l’Équipe n’existe pas', async () => {
    const useCase = new ObtenirProfilEquipe(
      new EquipeRepositoryFake([]),
      new SessionRepositoryFake(),
      new ReferentielRepositoryFake(Referentiel.vide()),
      new EtatToursQueryFake({}),
      new ReponseRepositoryFake([]),
      new ScoringV1(),
      60,
      3,
    );

    const resultat = await useCase.executer('inconnue');

    expect(resultat.type).toBe('introuvable');
  });

  it('agrège les Sessions closes de la Période, exclut les Sessions hors Période et non closes, garde un Thème actif sans Réponse, exclut un Thème archivé', async () => {
    const equipe = Equipe.creer('e1', 'Équipe A', 'ent1').valeur;
    const themeArchive = Theme.creer('t-archive', 'Thème archivé', [
      question('q-archive', 't-archive'),
    ]);
    themeArchive.retirer(new Date('2026-01-15'));
    const themeA = Theme.creer('t1', 'Thème A', [question('q1', 't1')]);
    const themeB = Theme.creer('t2', 'Thème B', [question('q2', 't2')]); // jamais répondue
    const referentiel = Referentiel.reconstituer(new Date('2026-01-01'), [
      themeArchive,
      themeA,
      themeB,
    ]);

    // ObtenirProfilEquipe calcule la Période courante à partir de "maintenant" (pas de port
    // horloge dans ce codebase, cf. Session.ouvrir()) : on la recalcule ici de la même façon.
    const scoring = new ScoringV1();
    const periode = scoring.periodeContenant(new Date(), 3);
    const uneJourneeMs = 24 * 60 * 60 * 1000;

    const sessionDansPeriode = sessionFermee(
      's1',
      'e1',
      new Date(periode.debut.getTime() + uneJourneeMs),
      ['q1'],
    );
    const sessionHorsPeriode = sessionFermee(
      's2',
      'e1',
      new Date(periode.debut.getTime() - uneJourneeMs),
      ['q1'],
    );
    const sessionEncoreOuverte = sessionOuverte(
      's3',
      'e1',
      new Date(periode.debut.getTime() + uneJourneeMs),
      ['q1'],
    );

    const sessions = new SessionRepositoryFake();
    sessions.sessions.push(
      sessionDansPeriode,
      sessionHorsPeriode,
      sessionEncoreOuverte,
    );

    const etatTours = new EtatToursQueryFake({
      s1: [{ tourId: 't1', questionId: 'q1', numero: 1, clos: true }],
    });
    const reponses = new ReponseRepositoryFake([reponse('r1', 'q1', 3, 't1')]);

    const useCase = new ObtenirProfilEquipe(
      new EquipeRepositoryFake([equipe]),
      sessions,
      new ReferentielRepositoryFake(referentiel),
      etatTours,
      reponses,
      scoring,
      60,
      3,
    );

    const resultat = await useCase.executer('e1');

    expect(resultat.type).toBe('ok');
    if (resultat.type !== 'ok') return;
    expect(resultat.periode).toEqual(periode);
    expect(resultat.themes.map((t) => t.themeId)).toEqual(['t1', 't2']);
    expect(resultat.themes[0].resultatPalier).toEqual({
      effectif: 1,
      palier: 3,
      tauxApproche: 0,
      margeAvantDescente: 1,
    });
    expect(resultat.themes[1]).toEqual({
      themeId: 't2',
      libelle: 'Thème B',
      position: 1,
      resultatPalier: { effectif: 0 },
      questions: [],
    });
  });
});
