import { Reponse } from '../../reponse/domain/reponse';
import { ReponseRepository } from '../../reponse/domain/reponse.repository';
import { EtatTour, Session } from '../domain/session';
import { EtatToursQuery } from '../domain/etat-tours.query';
import { GenerateurDeCode } from '../domain/generateur-de-code';
import { Selection } from '../../modele-collecte/domain/selection';
import { SourceReponsesScorablesPeriodeEquipe } from './source-reponses-scorables-periode-equipe';

const generateurDeCode: GenerateurDeCode = {
  generer: () => Promise.resolve('AB12'),
};

function sessionFermee(
  id: string,
  questionIds: string[],
  questionsSautees: string[] = [],
): Session {
  return Session.reconstituer(
    id,
    'e1',
    new Date('2026-03-01'),
    'CLOTUREE',
    'm1',
    Selection.reconstituer(questionIds),
    null,
    0,
    new Set(questionsSautees),
    generateurDeCode,
  );
}

class EtatToursQueryFake implements EtatToursQuery {
  constructor(private readonly etatsParSession: Record<string, EtatTour[]>) {}
  listerEtatsDesToursDeLaSession(sessionId: string): Promise<EtatTour[]> {
    return Promise.resolve(this.etatsParSession[sessionId] ?? []);
  }
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

describe('SourceReponsesScorablesPeriodeEquipe', () => {
  it('additionne les Réponses scorables de plusieurs Sessions closes, chacune dédoublonnée par Tour', async () => {
    const sessionA = sessionFermee('s1', ['q1']);
    const sessionB = sessionFermee('s2', ['q1', 'q2'], ['q2']);
    const etatTours = new EtatToursQueryFake({
      s1: [
        { tourId: 't1', questionId: 'q1', numero: 1, clos: true },
        { tourId: 't2', questionId: 'q1', numero: 2, clos: true }, // revote : seul celui-ci compte
      ],
      s2: [
        { tourId: 't3', questionId: 'q1', numero: 1, clos: true },
        { tourId: 't4', questionId: 'q2', numero: 1, clos: true }, // Sautée : exclu
      ],
    });
    const reponses = new ReponseRepositoryFake([
      reponse('r1', 'q1', 1, 't1'),
      reponse('r2', 'q1', 4, 't2'),
      reponse('r3', 'q1', 3, 't3'),
      reponse('r4', 'q2', 2, 't4'),
    ]);
    const source = new SourceReponsesScorablesPeriodeEquipe(
      [sessionA, sessionB],
      etatTours,
      reponses,
    );

    const resultat = await source.obtenirReponsesScorables();

    expect(resultat).toEqual(
      expect.arrayContaining([
        { questionId: 'q1', niveau: 4 },
        { questionId: 'q1', niveau: 3 },
      ]),
    );
    expect(resultat).toHaveLength(2);
  });

  it('sans aucune Session, renvoie un tableau vide', async () => {
    const source = new SourceReponsesScorablesPeriodeEquipe(
      [],
      new EtatToursQueryFake({}),
      new ReponseRepositoryFake([]),
    );

    expect(await source.obtenirReponsesScorables()).toEqual([]);
  });
});
