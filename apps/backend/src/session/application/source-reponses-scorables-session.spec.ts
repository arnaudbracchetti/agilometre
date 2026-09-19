import { Reponse } from '../../reponse/domain/reponse';
import { ReponseRepository } from '../../reponse/domain/reponse.repository';
import { EtatTour, Session } from '../domain/session';
import { EtatToursQuery } from '../domain/etat-tours.query';
import { GenerateurDeCode } from '../domain/generateur-de-code';
import { Selection } from '../../modele-collecte/domain/selection';
import { SourceReponsesScorablesSession } from './source-reponses-scorables-session';

const generateurDeCode: GenerateurDeCode = {
  generer: () => Promise.resolve('AB12'),
};

function sessionOuverte(
  questionIds: string[],
  questionsSautees: string[] = [],
): Session {
  return Session.reconstituer(
    's1',
    'e1',
    new Date('2026-03-01'),
    'OUVERTE',
    'm1',
    Selection.reconstituer(questionIds),
    'AB12',
    0,
    new Set(questionsSautees),
    generateurDeCode,
  );
}

class EtatToursQueryFake implements EtatToursQuery {
  constructor(private readonly etats: EtatTour[]) {}
  listerEtatsDesToursDeLaSession(): Promise<EtatTour[]> {
    return Promise.resolve(this.etats);
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

describe('SourceReponsesScorablesSession', () => {
  it("ne compte qu'une fois la Question revotée : seul le dernier Tour clos compte", async () => {
    const session = sessionOuverte(['q1']);
    const etatTours = new EtatToursQueryFake([
      { tourId: 't1', questionId: 'q1', numero: 1, clos: true },
      { tourId: 't2', questionId: 'q1', numero: 2, clos: true },
    ]);
    const reponses = new ReponseRepositoryFake([
      reponse('r1', 'q1', 1, 't1'),
      reponse('r2', 'q1', 4, 't2'),
    ]);
    const source = new SourceReponsesScorablesSession(
      session,
      etatTours,
      reponses,
    );

    const resultat = await source.obtenirReponsesScorables();

    expect(resultat).toEqual([{ questionId: 'q1', niveau: 4 }]);
  });

  it('exclut les Réponses des Tours clos sur une Question Sautée', async () => {
    const session = sessionOuverte(['q1', 'q2'], ['q2']);
    const etatTours = new EtatToursQueryFake([
      { tourId: 't1', questionId: 'q1', numero: 1, clos: true },
      { tourId: 't2', questionId: 'q2', numero: 1, clos: true },
    ]);
    const reponses = new ReponseRepositoryFake([
      reponse('r1', 'q1', 2, 't1'),
      reponse('r2', 'q2', 3, 't2'),
    ]);
    const source = new SourceReponsesScorablesSession(
      session,
      etatTours,
      reponses,
    );

    const resultat = await source.obtenirReponsesScorables();

    expect(resultat).toEqual([{ questionId: 'q1', niveau: 2 }]);
  });

  it("renvoie un tableau vide si aucun Tour n'est clos", async () => {
    const session = sessionOuverte(['q1']);
    const etatTours = new EtatToursQueryFake([
      { tourId: 't1', questionId: 'q1', numero: 1, clos: false },
    ]);
    const reponses = new ReponseRepositoryFake([]);
    const source = new SourceReponsesScorablesSession(
      session,
      etatTours,
      reponses,
    );

    expect(await source.obtenirReponsesScorables()).toEqual([]);
  });
});
