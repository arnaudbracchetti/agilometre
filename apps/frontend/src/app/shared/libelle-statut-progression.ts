import { StatutQuestionProgressionDto } from '@agilometre/shared';

const LIBELLES: Record<StatutQuestionProgressionDto, string> = {
  A_VENIR: 'À venir',
  COURANTE: 'En cours',
  TRAITEE: 'Traitée',
  SAUTEE: 'Sautée',
};

/** Partagé entre pilotage-page et synthese-page — jamais deux libellés divergents pour le même statut. */
export function libelleStatutProgression(statut: StatutQuestionProgressionDto): string {
  return LIBELLES[statut];
}
