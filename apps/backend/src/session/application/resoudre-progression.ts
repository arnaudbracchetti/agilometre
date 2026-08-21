import { Referentiel } from '../../referentiel/domain/referentiel';
import { EtatTour, Session, StatutQuestionProgression } from '../domain/session';

export interface ProgressionQuestion {
  questionId: string;
  libelle: string;
  statut: StatutQuestionProgression;
}

/**
 * Progression de la Sélection entière (carte F1), dans son ordre — dérivée par
 * `Session.progression`, enrichie du libellé de chaque Question. Filtre les Questions retirées
 * du Référentiel actif depuis la Sélection, même garde que `resoudreHistoriqueToursClos`.
 *
 * `etatsDesTours`/`referentielCharge` sont déjà résolus par l'appelant (`ObtenirPilotageSession`,
 * partagés avec `resoudreHistoriqueToursClos`) — aucune I/O ici, fonction pure.
 */
export function resoudreProgression(
  session: Session,
  etatsDesTours: readonly EtatTour[],
  referentielCharge: Referentiel,
): ProgressionQuestion[] {
  const libelleQuestion = new Map(
    session.selectionEnrichie(referentielCharge).map((q) => [q.id, q.libelle]),
  );
  return session
    .progression(etatsDesTours)
    .filter((entree) => libelleQuestion.has(entree.questionId))
    .map((entree) => ({
      questionId: entree.questionId,
      libelle: libelleQuestion.get(entree.questionId)!,
      statut: entree.statut,
    }));
}
