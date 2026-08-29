import { Evolution, ProfilEntiteDto } from '@agilometre/shared';
import { Periode, ResultatPalier } from '../scoring/domain/scoring';
import { versChampsPalierDto } from './synthese.mapper';

export function versProfilEntiteDto(
  periode: Periode,
  entiteNom: string,
  seuilPalier: number,
  global: ResultatPalier,
  aPeriodePrecedente: boolean,
  periodeEnCours: boolean,
  evolutionGlobale: Evolution | null,
): ProfilEntiteDto {
  const champsPalierGlobal = versChampsPalierDto(global);
  return {
    entiteNom,
    periodeDebut: periode.debut.toISOString(),
    periodeFin: periode.fin.toISOString(),
    seuilPalier,
    palierGlobal: champsPalierGlobal.palier,
    tauxApprocheGlobal: champsPalierGlobal.tauxApproche,
    margeAvantDescenteGlobal: champsPalierGlobal.margeAvantDescente,
    effectifGlobal: champsPalierGlobal.effectif,
    aPeriodePrecedente,
    periodeEnCours,
    evolutionGlobale,
  };
}
