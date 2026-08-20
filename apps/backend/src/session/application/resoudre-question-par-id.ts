import { Question } from '../../referentiel/domain/question';
import { ReferentielRepository } from '../../referentiel/domain/referentiel.repository';

/**
 * Résout une Question par son id directement contre le Référentiel actif, sans passer par
 * `Session.selectionEnrichie` (contrairement à `resoudreQuestionCourante`) — utilisé par le
 * chemin participant, qui ne charge jamais l'agrégat `Session` (docs/design/
 * agregat-tour-de-vote.md §5).
 */
export async function resoudreQuestionParId(
  questionId: string,
  referentiel: ReferentielRepository,
): Promise<Question | null> {
  const referentielCharge = await referentiel.charger();
  return (
    referentielCharge
      .themesActifs()
      .flatMap((theme) => theme.questions)
      .find((question) => question.id === questionId) ?? null
  );
}
