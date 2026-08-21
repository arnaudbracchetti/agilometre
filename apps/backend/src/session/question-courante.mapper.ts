import {
  QuestionCouranteDto,
  TourClosDto,
  TourOuvertDto,
} from '@agilometre/shared';
import { Question } from '../referentiel/domain/question';
import { DernierTourClos } from './application/resoudre-dernier-tour-clos';
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

/** Le Palier de la Question reste hors périmètre — pas de moteur de scoring encore. */
export function versTourClosDto(
  dernierTourClos: DernierTourClos | null,
): TourClosDto | null {
  if (!dernierTourClos) {
    return null;
  }
  const comptes = dernierTourClos.comptesParNiveau;
  return {
    numero: dernierTourClos.numero,
    repartition: {
      1: comptes[1] ?? 0,
      2: comptes[2] ?? 0,
      3: comptes[3] ?? 0,
      4: comptes[4] ?? 0,
    },
  };
}
