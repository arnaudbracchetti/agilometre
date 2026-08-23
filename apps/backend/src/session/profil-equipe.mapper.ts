import { ProfilEquipeDto } from '@agilometre/shared';
import { Periode } from '../scoring/domain/scoring';
import { SyntheseThemeAvecLibelle } from './application/enrichir-resultats-avec-libelles';
import { versSyntheseThemeDto } from './synthese.mapper';

export function versProfilEquipeDto(
  periode: Periode,
  themes: SyntheseThemeAvecLibelle[],
): ProfilEquipeDto {
  return {
    periodeDebut: periode.debut.toISOString(),
    periodeFin: periode.fin.toISOString(),
    themes: themes.map(versSyntheseThemeDto),
  };
}
