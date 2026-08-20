import { TourDeVote } from '../domain/tour-de-vote';
import { TourDeVoteRepository } from '../domain/tour-de-vote.repository';
import { CloreTourDeVote } from './clore-tour-de-vote.usecase';

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

describe('CloreTourDeVote', () => {
  it('renvoie "aucun_tour_ouvert" si la Session n’a pas de Tour ouvert', async () => {
    const useCase = new CloreTourDeVote(new TourDeVoteRepositoryFake());

    const resultat = await useCase.executer('s1');

    expect(resultat.type).toBe('aucun_tour_ouvert');
  });

  it('clôt le Tour ouvert et persiste', async () => {
    const tours = new TourDeVoteRepositoryFake();
    const tour = TourDeVote.creer(
      't1',
      's1',
      'q1',
      1,
      new Date('2026-04-01T10:00:00Z'),
      null,
    ).valeur;
    tour.voter('jeton-1', 'r1', 3, 'e1', new Date('2026-04-01T10:01:00Z'));
    tours.tours.push(tour);
    const useCase = new CloreTourDeVote(tours);

    const resultat = await useCase.executer('s1');

    expect(resultat.type).toBe('ok');
    if (resultat.type !== 'ok') throw new Error('unreachable');
    expect(resultat.tour.estClos).toBe(true);
    expect(resultat.tour.participations).toHaveLength(0);
    expect(tours.saveAppels).toBe(1);
  });
});
