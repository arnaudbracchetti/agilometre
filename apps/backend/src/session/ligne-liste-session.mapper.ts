import { LigneListeSessionDto } from '@agilometre/shared';
import { LigneListeSession } from './domain/session-liste.query';
import { STATUT_VERS_DTO } from './statut-session.mapper';

export function versLigneListeSessionDto(
  ligne: LigneListeSession,
): LigneListeSessionDto {
  return {
    id: ligne.id,
    equipeNom: ligne.equipeNom,
    date: ligne.date.toISOString(),
    statut: STATUT_VERS_DTO[ligne.statut],
    verrouillee: ligne.verrouillee,
    nbQuestions: ligne.nbQuestions,
    modeleCollecteNom: ligne.modeleCollecteNom,
  };
}
