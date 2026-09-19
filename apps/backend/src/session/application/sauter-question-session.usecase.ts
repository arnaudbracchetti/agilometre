import { QuestionIntrouvableDansSelectionError } from '../../modele-collecte/domain/selection';
import {
  QuestionDejaSauteeError,
  QuestionDejaTraiteeError,
  Session,
  SessionNonOuverteError,
} from '../domain/session';
import { EtatToursQuery } from '../domain/etat-tours.query';
import { SessionRepository } from '../domain/session.repository';
import { TourDeVoteRepository } from '../domain/tour-de-vote.repository';

export type ResultatSauterQuestionSession =
  | { type: 'introuvable' }
  | { type: 'question_introuvable' }
  | {
      type: 'invalide';
      erreur:
        | SessionNonOuverteError
        | QuestionDejaTraiteeError
        | QuestionDejaSauteeError;
    }
  | { type: 'ok'; session: Session };

/**
 * Marque une Question restante comme Sautée (carte #44) ; clôt le Tour ouvert éventuel de cette
 * Question sans en dériver de résultat (docs/design/agregat-tour-de-vote.md §3).
 */
export class SauterQuestionSession {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly tours: TourDeVoteRepository,
    private readonly etatTours: EtatToursQuery,
  ) {}

  async executer(
    id: string,
    questionId: string,
  ): Promise<ResultatSauterQuestionSession> {
    const session = await this.sessions.findById(id);
    if (!session) {
      return { type: 'introuvable' };
    }

    // Lu AVANT toute fermeture : Session.sauter() doit voir le Tour ouvert de cette Question
    // comme non clos, sinon il serait à tort rejeté comme QuestionDejaTraiteeError.
    const etatsDesTours =
      await this.etatTours.listerEtatsDesToursDeLaSession(id);
    const resultat = session.sauter(questionId, etatsDesTours);
    if (resultat.estEchec) {
      if (resultat.erreur instanceof QuestionIntrouvableDansSelectionError) {
        return { type: 'question_introuvable' };
      }
      return { type: 'invalide', erreur: resultat.erreur };
    }

    // Effet de bord une fois le marquage validé : clôt le Tour ouvert éventuel de cette Question,
    // jamais une précondition — voir resoudreHistoriqueToursClos pour l'exclusion du résultat.
    const tourOuvert = await this.tours.trouverTourOuvertDeLaSession(id);
    if (tourOuvert && tourOuvert.questionId === questionId) {
      tourOuvert.clore(new Date());
      await this.tours.save(tourOuvert);
    }

    await this.sessions.save(session);
    return { type: 'ok', session };
  }
}
