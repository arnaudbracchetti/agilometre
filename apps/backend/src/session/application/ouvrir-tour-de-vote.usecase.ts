import { randomUUID } from 'node:crypto';
import { EtatToursQuery } from '../domain/etat-tours.query';
import { SessionRepository } from '../domain/session.repository';
import { TourDeVote } from '../domain/tour-de-vote';
import { TourDeVoteRepository } from '../domain/tour-de-vote.repository';

export type ResultatOuvrirTourDeVote =
  | { type: 'introuvable' }
  | { type: 'non_ouverte' }
  | { type: 'aucune_question_courante' }
  | { type: 'tour_deja_ouvert' }
  | { type: 'ok'; tour: TourDeVote };

/**
 * "Ouvrir un Tour" (docs/design/agregat-tour-de-vote.md §3) : lit `Session` pour la Question
 * courante, vérifie via `TourDeVoteRepository` qu'aucun Tour n'est déjà ouvert, calcule `numero`
 * à partir de `EtatToursQuery` (dernier numero pour cette Question + 1), crée le `TourDeVote`.
 */
export class OuvrirTourDeVote {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly tours: TourDeVoteRepository,
    private readonly etatTours: EtatToursQuery,
  ) {}

  async executer(sessionId: string): Promise<ResultatOuvrirTourDeVote> {
    const session = await this.sessions.findById(sessionId);
    if (!session) {
      return { type: 'introuvable' };
    }
    if (session.statut !== 'OUVERTE') {
      return { type: 'non_ouverte' };
    }
    const questionId = session.questionCouranteId();
    if (!questionId) {
      return { type: 'aucune_question_courante' };
    }
    const tourExistant =
      await this.tours.trouverTourOuvertDeLaSession(sessionId);
    if (tourExistant) {
      return { type: 'tour_deja_ouvert' };
    }
    const etats =
      await this.etatTours.listerEtatsDesToursDeLaSession(sessionId);
    const dernierNumero = etats
      .filter((etat) => etat.questionId === questionId)
      .reduce((max, etat) => Math.max(max, etat.numero), 0);
    const resultat = TourDeVote.creer(
      randomUUID(),
      sessionId,
      questionId,
      dernierNumero + 1,
      new Date(),
      dernierNumero === 0 ? null : dernierNumero,
    );
    if (resultat.estEchec) {
      // Ne devrait jamais arriver : numero calculé pour être toujours valide vis-à-vis de creer().
      throw resultat.erreur;
    }
    await this.tours.save(resultat.valeur);
    return { type: 'ok', tour: resultat.valeur };
  }
}
