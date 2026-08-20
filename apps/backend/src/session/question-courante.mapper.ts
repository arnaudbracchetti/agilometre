import { QuestionCouranteDto } from '@agilometre/shared';
import { Question } from '../referentiel/domain/question';

/** Le domaine ignore délibérément `@agilometre/shared` (frontière API) — mapping explicite ici. */
export function versQuestionCouranteDto(
  question: Question | null,
): QuestionCouranteDto | null {
  if (!question) {
    return null;
  }
  return {
    questionId: question.id,
    libelle: question.libelle,
    options: question.options.map((option) => ({ libelle: option.libelle })),
  };
}
