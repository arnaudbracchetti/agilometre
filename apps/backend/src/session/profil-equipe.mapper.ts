import { ProfilEquipeDto } from '@agilometre/shared';
import { Periode, ResultatPalier } from '../scoring/domain/scoring';
import { SyntheseThemeAvecLibelle } from './application/enrichir-resultats-avec-libelles';
import { versChampsPalierDto, versSyntheseThemeDto } from './synthese.mapper';

export function versProfilEquipeDto(
  periode: Periode,
  equipeNom: string,
  seuilPalier: number,
  themes: SyntheseThemeAvecLibelle[],
  global: ResultatPalier,
): ProfilEquipeDto {
  const champsPalierGlobal = versChampsPalierDto(global);
  return {
    equipeNom,
    periodeDebut: periode.debut.toISOString(),
    periodeFin: periode.fin.toISOString(),
    seuilPalier,
    themes: themes.map(versSyntheseThemeDto),
    palierGlobal: champsPalierGlobal.palier,
    tauxApprocheGlobal: champsPalierGlobal.tauxApproche,
    margeAvantDescenteGlobal: champsPalierGlobal.margeAvantDescente,
    effectifGlobal: champsPalierGlobal.effectif,
  };
}
