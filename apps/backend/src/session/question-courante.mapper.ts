import {
  ProgressionQuestionDto,
  QuestionCouranteDto,
  RepartitionVotesDto,
  TourClosDto,
  TourHistoriqueDto,
  TourOuvertDto,
} from '@agilometre/shared';
import { Question } from '../referentiel/domain/question';
import { DernierTourClos } from './application/resoudre-dernier-tour-clos';
import { HistoriqueTourClos } from './application/resoudre-historique-tours-clos';
import { ProgressionQuestion } from './application/resoudre-progression';
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

/** Zero-fill 1-4 partagé par tout mapping d'un `comptesParNiveau` partiel vers le DTO. */
function versRepartitionDto(
  comptes: Record<number, number>,
): RepartitionVotesDto {
  return {
    1: comptes[1] ?? 0,
    2: comptes[2] ?? 0,
    3: comptes[3] ?? 0,
    4: comptes[4] ?? 0,
  };
}

/** Le Palier de la Question reste hors périmètre — pas de moteur de scoring encore. */
export function versTourClosDto(
  dernierTourClos: DernierTourClos | null,
): TourClosDto | null {
  if (!dernierTourClos) {
    return null;
  }
  return {
    numero: dernierTourClos.numero,
    repartition: versRepartitionDto(dernierTourClos.comptesParNiveau),
  };
}

/** Tous les Tours clos de la Session (carte E2) — jamais seulement le dernier par Question. */
export function versHistoriqueDto(
  historique: HistoriqueTourClos[],
): TourHistoriqueDto[] {
  return historique.map((tour) => ({
    questionId: tour.questionId,
    libelle: tour.libelle,
    numero: tour.numero,
    repartition: versRepartitionDto(tour.comptesParNiveau),
    options: tour.libellesOptions.map((libelle) => ({ libelle })),
  }));
}

/** Progression de toute la Sélection (carte F1) — statut dérivé, jamais recalculé côté mapping. */
export function versProgressionDto(
  progression: ProgressionQuestion[],
): ProgressionQuestionDto[] {
  return progression.map((entree) => ({
    questionId: entree.questionId,
    libelle: entree.libelle,
    statut: entree.statut,
    reactivable: entree.reactivable,
    themeId: entree.themeId,
    themeLibelle: entree.themeLibelle,
  }));
}
