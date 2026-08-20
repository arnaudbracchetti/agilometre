import { Question } from '../../referentiel/domain/question';
import { ReferentielRepository } from '../../referentiel/domain/referentiel.repository';
import { ReponseRepository } from '../domain/reponse.repository';
import { TourDeVoteRepository } from '../domain/tour-de-vote.repository';
import { resoudreQuestionParId } from './resoudre-question-par-id';

export interface EtatParticipant {
  voteOuvert: boolean;
  question: Question | null;
  optionChoisieIndex: number | null;
}

/**
 * Lecture 1s de l'écran participant (docs/design/agregat-tour-de-vote.md §5) : ne charge jamais
 * l'agrégat `Session`, seulement le `TourDeVote` ouvert. Jamais d'erreur "hors vote" — c'est
 * l'état normal du participant entre deux Tours, pas un refus (la validité du Jeton est vérifiée
 * en amont par `JetonParticipantGuard`).
 */
export class ObtenirEtatParticipant {
  constructor(
    private readonly tours: TourDeVoteRepository,
    private readonly reponses: ReponseRepository,
    private readonly referentiel: ReferentielRepository,
  ) {}

  async executer(sessionId: string, jetonId: string): Promise<EtatParticipant> {
    const tour = await this.tours.trouverTourOuvertDeLaSession(sessionId);
    if (!tour) {
      return { voteOuvert: false, question: null, optionChoisieIndex: null };
    }
    const question = await resoudreQuestionParId(
      tour.questionId,
      this.referentiel,
    );
    if (!question) {
      // Question archivée pendant que son Tour était ouvert : cas limite, écran participant reste
      // en vote (le Coach clôturera) mais sans contenu à afficher plutôt que de faire échouer le sondage.
      return { voteOuvert: true, question: null, optionChoisieIndex: null };
    }
    const participation = tour.voteDe(jetonId);
    if (!participation) {
      return { voteOuvert: true, question, optionChoisieIndex: null };
    }
    const reponse = await this.reponses.findById(participation.reponseId);
    const optionChoisieIndex = reponse
      ? this.indexOption(question, reponse.niveau)
      : null;
    return { voteOuvert: true, question, optionChoisieIndex };
  }

  private indexOption(question: Question, niveau: number): number | null {
    const index = question.options.findIndex(
      (option) => option.niveau.valeur === niveau,
    );
    return index === -1 ? null : index;
  }
}
