import { randomUUID } from 'node:crypto';
import { ReferentielRepository } from '../../referentiel/domain/referentiel.repository';
import { ReponseRepository } from '../../reponse/domain/reponse.repository';
import { SessionRepository } from '../domain/session.repository';
import { TourDeVote } from '../domain/tour-de-vote';
import { TourDeVoteRepository } from '../domain/tour-de-vote.repository';
import { resoudreQuestionParId } from './resoudre-question-par-id';

export type ResultatVoterParticipant =
  | { type: 'aucun_tour_ouvert' }
  | { type: 'question_introuvable' }
  | { type: 'option_invalide' }
  | { type: 'session_introuvable' }
  | { type: 'ok'; tour: TourDeVote };

/**
 * Vote (ou revote) d'un Jeton sur le Tour ouvert de sa Session — résolu via
 * `trouverTourOuvertDeLaSession`, jamais un `tourId` fourni par le client
 * (docs/design/agregat-tour-de-vote.md §3). `optionIndex` (position dans les Options de la
 * Question, jamais le Niveau) est converti en Niveau ici, à la frontière : le client ne connaît
 * jamais le Niveau d'une Option.
 */
export class VoterParticipant {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly tours: TourDeVoteRepository,
    private readonly reponses: ReponseRepository,
    private readonly referentiel: ReferentielRepository,
  ) {}

  async executer(
    sessionId: string,
    jetonId: string,
    optionIndex: number,
  ): Promise<ResultatVoterParticipant> {
    const tour = await this.tours.trouverTourOuvertDeLaSession(sessionId);
    if (!tour) {
      return { type: 'aucun_tour_ouvert' };
    }
    const question = await resoudreQuestionParId(
      tour.questionId,
      this.referentiel,
    );
    if (!question) {
      return { type: 'question_introuvable' };
    }
    const option = question.options[optionIndex];
    if (!option) {
      return { type: 'option_invalide' };
    }
    const session = await this.sessions.findById(sessionId);
    if (!session) {
      return { type: 'session_introuvable' };
    }
    const resultat = tour.voter(
      jetonId,
      randomUUID(),
      option.niveau.valeur,
      session.equipeId,
      new Date(),
    );
    if (resultat.estEchec) {
      // TourDejaClosError seul est atteignable ici (course avec une clôture Coach concurrente) :
      // le niveau est toujours valide puisque dérivé d'une Option réelle du Référentiel.
      return { type: 'aucun_tour_ouvert' };
    }
    // Ordre imposé par la contrainte FK (reponse.repository.ts) : la nouvelle Reponse doit
    // exister avant que Participation ne puisse la référencer ; l'ancienne ne peut être
    // supprimée qu'une fois que plus rien ne la référence.
    await this.reponses.save(resultat.valeur.reponse);
    await this.tours.save(tour);
    if (resultat.valeur.reponseASupprimer) {
      await this.reponses.remove(resultat.valeur.reponseASupprimer);
    }
    return { type: 'ok', tour };
  }
}
