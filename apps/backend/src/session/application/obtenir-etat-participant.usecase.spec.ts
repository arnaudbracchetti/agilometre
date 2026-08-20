import { Niveau } from '../../referentiel/domain/niveau';
import { Option } from '../../referentiel/domain/option';
import { Question } from '../../referentiel/domain/question';
import { Referentiel } from '../../referentiel/domain/referentiel';
import { ReferentielRepository } from '../../referentiel/domain/referentiel.repository';
import { Theme } from '../../referentiel/domain/theme';
import { Reponse } from '../domain/reponse';
import { ReponseRepository } from '../domain/reponse.repository';
import { TourDeVote } from '../domain/tour-de-vote';
import { TourDeVoteRepository } from '../domain/tour-de-vote.repository';
import { ObtenirEtatParticipant } from './obtenir-etat-participant.usecase';

class TourDeVoteRepositoryFake implements TourDeVoteRepository {
  tours: TourDeVote[] = [];
  findById(id: string): Promise<TourDeVote | null> {
    return Promise.resolve(this.tours.find((t) => t.id === id) ?? null);
  }
  trouverTourOuvertDeLaSession(sessionId: string): Promise<TourDeVote | null> {
    return Promise.resolve(
      this.tours.find((t) => t.sessionId === sessionId && !t.estClos) ?? null,
    );
  }
  save(): Promise<void> {
    return Promise.resolve();
  }
}

class ReponseRepositoryFake implements ReponseRepository {
  reponses: Reponse[] = [];
  findById(id: string): Promise<Reponse | null> {
    return Promise.resolve(this.reponses.find((r) => r.id === id) ?? null);
  }
  save(reponse: Reponse): Promise<void> {
    this.reponses.push(reponse);
    return Promise.resolve();
  }
  remove(): Promise<void> {
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

describe('ObtenirEtatParticipant', () => {
  it('renvoie voteOuvert=false quand la Session n’a pas de Tour ouvert', async () => {
    const useCase = new ObtenirEtatParticipant(
      new TourDeVoteRepositoryFake(),
      new ReponseRepositoryFake(),
      referentielFake(),
    );

    const resultat = await useCase.executer('s1', 'jeton-1');

    expect(resultat).toEqual({
      voteOuvert: false,
      question: null,
      optionChoisieIndex: null,
    });
  });

  it('renvoie la Question et optionChoisieIndex=null pour un Jeton qui n’a pas encore voté', async () => {
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
    const useCase = new ObtenirEtatParticipant(
      tours,
      new ReponseRepositoryFake(),
      referentielFake(),
    );

    const resultat = await useCase.executer('s1', 'jeton-1');

    expect(resultat.voteOuvert).toBe(true);
    expect(resultat.question?.id).toBe('q1');
    expect(resultat.optionChoisieIndex).toBeNull();
  });

  it('renvoie l’index de l’Option déjà choisie par ce Jeton', async () => {
    const tours = new TourDeVoteRepositoryFake();
    const tour = TourDeVote.creer(
      't1',
      's1',
      'q1',
      1,
      new Date('2026-04-01T10:00:00Z'),
      null,
    ).valeur;
    const reponses = new ReponseRepositoryFake();
    const resultatVote = tour.voter(
      'jeton-1',
      'r1',
      3,
      'e1',
      new Date('2026-04-01T10:01:00Z'),
    );
    if (resultatVote.estEchec) throw new Error('unreachable');
    reponses.reponses.push(resultatVote.valeur.reponse);
    tours.tours.push(tour);
    const useCase = new ObtenirEtatParticipant(
      tours,
      reponses,
      referentielFake(),
    );

    const resultat = await useCase.executer('s1', 'jeton-1');

    expect(resultat.voteOuvert).toBe(true);
    expect(resultat.optionChoisieIndex).toBe(2); // niveau 3 → options[2] (1-indexé)
  });
});
