import { Entite } from '../../organisation/domain/entite';
import { EntiteRepository } from '../../organisation/domain/entite.repository';
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
import { ObtenirProfilEntite } from './obtenir-profil-entite.usecase';

const generateurDeCode: GenerateurDeCode = {
  generer: () => Promise.resolve('AB12'),
};

class EntiteRepositoryFake implements EntiteRepository {
  constructor(private readonly entites: Entite[]) {}
  findById(id: string): Promise<Entite | null> {
    return Promise.resolve(this.entites.find((e) => e.id === id) ?? null);
  }
  findAll(): Promise<Entite[]> {
    return Promise.resolve(this.entites);
  }
  trouverParNom(): Promise<Entite | null> {
    return Promise.resolve(null);
  }
  save(): Promise<void> {
    return Promise.resolve();
  }
  remove(): Promise<void> {
    return Promise.resolve();
  }
}

class EquipeRepositoryFake implements EquipeRepository {
  constructor(private readonly equipes: Equipe[]) {}
  findById(id: string): Promise<Equipe | null> {
    return Promise.resolve(this.equipes.find((e) => e.id === id) ?? null);
  }
  findByEntiteId(entiteId: string): Promise<Equipe[]> {
    return Promise.resolve(this.equipes.filter((e) => e.entiteId === entiteId));
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

class SessionRepositoryFake implements SessionRepository {
  sessions: Session[] = [];
  findById(id: string): Promise<Session | null> {
    return Promise.resolve(this.sessions.find((s) => s.id === id) ?? null);
  }
  findFermeesParEquipeEtPeriode(
    equipeId: string,
    periode: { debut: Date; fin: Date },
  ): Promise<Session[]> {
    return this.findFermeesParEquipesEtPeriode([equipeId], periode);
  }
  findFermeesParEquipesEtPeriode(
    equipeIds: string[],
    periode: { debut: Date; fin: Date },
  ): Promise<Session[]> {
    return Promise.resolve(
      this.sessions.filter(
        (s) =>
          equipeIds.includes(s.equipeId) &&
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
  existeFermeeAvant(equipeId: string, date: Date): Promise<boolean> {
    return this.existeFermeeAvantPourEquipes([equipeId], date);
  }
  existeFermeeAvantPourEquipes(
    equipeIds: string[],
    date: Date,
  ): Promise<boolean> {
    return Promise.resolve(
      this.sessions.some(
        (s) =>
          equipeIds.includes(s.equipeId) &&
          s.statut === 'CLOTUREE' &&
          s.date < date,
      ),
    );
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

describe('ObtenirProfilEntite', () => {
  it('renvoie "introuvable" si l’Entité n’existe pas', async () => {
    const useCase = new ObtenirProfilEntite(
      new EntiteRepositoryFake([]),
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

  it('fusionne les Réponses de toutes les Équipes de l’Entité en un seul Palier (jamais une moyenne des Paliers par Équipe)', async () => {
    const entite = Entite.creer('ent1', 'DSI').valeur;
    const equipeAlpha = Equipe.creer('e-alpha', 'Alpha', 'ent1').valeur;
    const equipeBeta = Equipe.creer('e-beta', 'Beta', 'ent1').valeur;
    const themeA = Theme.creer('t1', 'Thème A', [question('q1', 't1')]);
    const referentiel = Referentiel.reconstituer(new Date('2026-01-01'), [
      themeA,
    ]);

    const scoring = new ScoringV1();
    const periodeEnCours = scoring.periodeContenant(new Date(), 3);
    const periode = scoring.periodePrecedente(periodeEnCours, 3);
    const uneJourneeMs = 24 * 60 * 60 * 1000;

    // Alpha vote Niveau 2, Beta vote Niveau 4 sur la même Question : une moyenne des Paliers
    // d'Équipe donnerait un résultat différent d'une fusion des Niveaux bruts [2, 4].
    const sessionAlpha = sessionFermee(
      's-alpha',
      'e-alpha',
      new Date(periode.debut.getTime() + uneJourneeMs),
      ['q1'],
    );
    const sessionBeta = sessionFermee(
      's-beta',
      'e-beta',
      new Date(periode.debut.getTime() + uneJourneeMs),
      ['q1'],
    );

    const sessions = new SessionRepositoryFake();
    sessions.sessions.push(sessionAlpha, sessionBeta);

    const etatTours = new EtatToursQueryFake({
      's-alpha': [
        { tourId: 't-alpha', questionId: 'q1', numero: 1, clos: true },
      ],
      's-beta': [{ tourId: 't-beta', questionId: 'q1', numero: 1, clos: true }],
    });
    const reponses = new ReponseRepositoryFake([
      reponse('r1', 'q1', 2, 't-alpha'),
      reponse('r2', 'q1', 4, 't-beta'),
    ]);

    const useCase = new ObtenirProfilEntite(
      new EntiteRepositoryFake([entite]),
      new EquipeRepositoryFake([equipeAlpha, equipeBeta]),
      sessions,
      new ReferentielRepositoryFake(referentiel),
      etatTours,
      reponses,
      scoring,
      60,
      3,
    );

    const resultat = await useCase.executer('ent1');

    expect(resultat.type).toBe('ok');
    if (resultat.type !== 'ok') return;
    expect(resultat.entiteNom).toBe('DSI');
    // Fusion [2, 4] à seuil 60% : part(≥2)=100%, part(≥3)=50%<60% → Palier 2. Une moyenne des
    // Paliers d'Équipe pris séparément (Palier 2 pour Alpha, Palier 4 pour Beta) donnerait un
    // résultat différent (ex. arrondi à 3) — la fusion des Niveaux bruts est bien celle exercée ici.
    expect(resultat.global).toEqual(
      scoring.calculerPalier([2, 4], scoring.pourcentageVersFraction(60)),
    );
  });

  it('renvoie un Palier vide (effectif 0) quand l’Entité n’a aucune Équipe', async () => {
    const entite = Entite.creer('ent1', 'DSI').valeur;
    const useCase = new ObtenirProfilEntite(
      new EntiteRepositoryFake([entite]),
      new EquipeRepositoryFake([]),
      new SessionRepositoryFake(),
      new ReferentielRepositoryFake(Referentiel.vide()),
      new EtatToursQueryFake({}),
      new ReponseRepositoryFake([]),
      new ScoringV1(),
      60,
      3,
    );

    const resultat = await useCase.executer('ent1');

    expect(resultat.type).toBe('ok');
    if (resultat.type !== 'ok') return;
    expect(resultat.global).toEqual({ effectif: 0 });
    expect(resultat.aPeriodePrecedente).toBe(false);
  });

  it('calcule l’Évolution globale par rapport à la Période immédiatement précédente, agrégée sur les deux Équipes', async () => {
    const entite = Entite.creer('ent1', 'DSI').valeur;
    const equipeAlpha = Equipe.creer('e-alpha', 'Alpha', 'ent1').valeur;
    const equipeBeta = Equipe.creer('e-beta', 'Beta', 'ent1').valeur;
    const themeA = Theme.creer('t1', 'Thème A', [question('q1', 't1')]);
    const referentiel = Referentiel.reconstituer(new Date('2026-01-01'), [
      themeA,
    ]);

    const scoring = new ScoringV1();
    const periodeEnCours = scoring.periodeContenant(new Date(), 3);
    const derniereComplete = scoring.periodePrecedente(periodeEnCours, 3);
    const encoreAvant = scoring.periodePrecedente(derniereComplete, 3);
    const uneJourneeMs = 24 * 60 * 60 * 1000;

    const sessionActuelleAlpha = sessionFermee(
      's1',
      'e-alpha',
      new Date(derniereComplete.debut.getTime() + uneJourneeMs),
      ['q1'],
    );
    const sessionActuelleBeta = sessionFermee(
      's2',
      'e-beta',
      new Date(derniereComplete.debut.getTime() + uneJourneeMs),
      ['q1'],
    );
    const sessionPrecedenteAlpha = sessionFermee(
      's3',
      'e-alpha',
      new Date(encoreAvant.debut.getTime() + uneJourneeMs),
      ['q1'],
    );
    const sessionPrecedenteBeta = sessionFermee(
      's4',
      'e-beta',
      new Date(encoreAvant.debut.getTime() + uneJourneeMs),
      ['q1'],
    );

    const sessions = new SessionRepositoryFake();
    sessions.sessions.push(
      sessionActuelleAlpha,
      sessionActuelleBeta,
      sessionPrecedenteAlpha,
      sessionPrecedenteBeta,
    );

    const etatTours = new EtatToursQueryFake({
      s1: [{ tourId: 't-s1', questionId: 'q1', numero: 1, clos: true }],
      s2: [{ tourId: 't-s2', questionId: 'q1', numero: 1, clos: true }],
      s3: [{ tourId: 't-s3', questionId: 'q1', numero: 1, clos: true }],
      s4: [{ tourId: 't-s4', questionId: 'q1', numero: 1, clos: true }],
    });
    const reponses = new ReponseRepositoryFake([
      reponse('r1', 'q1', 4, 't-s1'),
      reponse('r2', 'q1', 4, 't-s2'),
      reponse('r3', 'q1', 1, 't-s3'),
      reponse('r4', 'q1', 1, 't-s4'),
    ]);

    const useCase = new ObtenirProfilEntite(
      new EntiteRepositoryFake([entite]),
      new EquipeRepositoryFake([equipeAlpha, equipeBeta]),
      sessions,
      new ReferentielRepositoryFake(referentiel),
      etatTours,
      reponses,
      scoring,
      60,
      3,
    );

    const resultat = await useCase.executer('ent1');

    expect(resultat.type).toBe('ok');
    if (resultat.type !== 'ok') return;
    expect(resultat.aPeriodePrecedente).toBe(true);
    expect(resultat.evolutionGlobale).toBe('hausse');
  });

  it('`offset -1` renvoie la Période en cours, marquée incomplète', async () => {
    const entite = Entite.creer('ent1', 'DSI').valeur;
    const scoring = new ScoringV1();
    const periodeEnCoursAttendue = scoring.periodeContenant(new Date(), 3);

    const useCase = new ObtenirProfilEntite(
      new EntiteRepositoryFake([entite]),
      new EquipeRepositoryFake([]),
      new SessionRepositoryFake(),
      new ReferentielRepositoryFake(Referentiel.vide()),
      new EtatToursQueryFake({}),
      new ReponseRepositoryFake([]),
      scoring,
      60,
      3,
    );

    const resultat = await useCase.executer('ent1', -1);

    expect(resultat.type).toBe('ok');
    if (resultat.type !== 'ok') return;
    expect(resultat.periode).toEqual(periodeEnCoursAttendue);
    expect(resultat.periodeEnCours).toBe(true);
  });
});
