import { Session } from '../domain/session';
import { EtatToursQuery } from '../domain/etat-tours.query';
import { SessionRepository } from '../domain/session.repository';
import { TourDeVoteRepository } from '../domain/tour-de-vote.repository';

export type ResultatTerminerPrematurementSession =
  | { type: 'introuvable' }
  | { type: 'non_ouverte' }
  | { type: 'ok'; session: Session };

/**
 * Marque automatiquement toutes les Questions restantes (À venir ou Courante) comme Sautées, pour
 * amener directement à l'écran de synthèse (carte F3, #45) — boucle `Session.sauter()` sur le
 * reste de la Sélection (docs/design/agregat-tour-de-vote.md §3), sans nouvelle méthode de
 * domaine. Distinct de `Session.terminer()` (clôture finale `CLOTUREE`, carte G1) : cette
 * opération laisse la Session `OUVERTE`.
 */
export class TerminerPrematurementSession {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly tours: TourDeVoteRepository,
    private readonly etatTours: EtatToursQuery,
  ) {}

  async executer(id: string): Promise<ResultatTerminerPrematurementSession> {
    const session = await this.sessions.findById(id);
    if (!session) {
      return { type: 'introuvable' };
    }
    if (session.statut !== 'OUVERTE') {
      return { type: 'non_ouverte' };
    }

    // Lu une seule fois : ni sauter() ni le marquage qui suit ne changent l'état des Tours.
    const etatsDesTours =
      await this.etatTours.listerEtatsDesToursDeLaSession(id);
    const aVenirOuCourante = session
      .progression(etatsDesTours)
      .filter(
        (entree) => entree.statut === 'A_VENIR' || entree.statut === 'COURANTE',
      )
      .map((entree) => entree.questionId);

    for (const questionId of aVenirOuCourante) {
      const resultat = session.sauter(questionId, etatsDesTours);
      if (resultat.estEchec) {
        // Ne peut pas arriver : aVenirOuCourante vient de session.progression(etatsDesTours)
        // elle-même, donc chaque Question y est encore À venir ou Courante par construction.
        throw resultat.erreur;
      }
    }

    // Au plus un Tour ouvert par Session (invariant du Repository) : forcément celui de la
    // Question qui était courante avant la boucle ci-dessus, désormais sautée.
    const tourOuvert = await this.tours.trouverTourOuvertDeLaSession(id);
    if (tourOuvert) {
      tourOuvert.clore(new Date());
      await this.tours.save(tourOuvert);
    }

    await this.sessions.save(session);
    return { type: 'ok', session };
  }
}
