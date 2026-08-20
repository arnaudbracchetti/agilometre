import { QuestionCouranteDto, TourOuvertDto } from '@agilometre/shared';
import { Question } from '../referentiel/domain/question';
import { TourDeVote } from './domain/tour-de-vote';

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

/** Jamais la répartition des votes — seulement le numéro et le nombre de votants. */
export function versTourOuvertDto(
  tourOuvert: TourDeVote | null,
): TourOuvertDto | null {
  if (!tourOuvert) {
    return null;
  }
  return {
    numero: tourOuvert.numero,
    nbVotants: tourOuvert.participations.length,
  };
}
