import { Question } from '../../referentiel/domain/question';
import { ReferentielRepository } from '../../referentiel/domain/referentiel.repository';
import { Session } from '../domain/session';

/**
 * Résout par id, jamais par index : `Session.selectionEnrichie` filtre les Questions retirées du
 * Référentiel, son index ne correspond donc plus forcément à `indexCourant`. Partagé par
 * ObtenirPilotageSession et ObtenirProjectionSession pour ne jamais diverger.
 */
export async function resoudreQuestionCourante(
  session: Session,
  referentiel: ReferentielRepository,
): Promise<Question | null> {
  const questionCouranteId = session.questionCouranteId();
  if (!questionCouranteId) {
    return null;
  }
  const referentielCharge = await referentiel.charger();
  return (
    session
      .selectionEnrichie(referentielCharge)
      .find((question) => question.id === questionCouranteId) ?? null
  );
}
