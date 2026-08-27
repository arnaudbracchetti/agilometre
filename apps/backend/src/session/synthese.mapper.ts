import { SyntheseSessionDto, SyntheseThemeDto } from '@agilometre/shared';
import { ResultatPalier } from '../scoring/domain/scoring';
import { SyntheseThemeAvecLibelle } from './application/enrichir-resultats-avec-libelles';
import { ContexteSyntheseSession } from './application/obtenir-synthese-session.usecase';
import { STATUT_VERS_DTO } from './statut-session.mapper';

/** Champs plats communs à un Palier de Thème et au Palier global — `effectif: 0` → tout `null`. */
function versChampsPalierDto(resultatPalier: ResultatPalier): {
  palier: 1 | 2 | 3 | 4 | null;
  tauxApproche: number | null;
  margeAvantDescente: number | null;
  effectif: number;
} {
  if (!('palier' in resultatPalier)) {
    return {
      palier: null,
      tauxApproche: null,
      margeAvantDescente: null,
      effectif: 0,
    };
  }
  const { palier, tauxApproche, margeAvantDescente, effectif } = resultatPalier;
  return { palier, tauxApproche, margeAvantDescente, effectif };
}

/** Le domaine ignore délibérément `@agilometre/shared` (frontière API) — mapping explicite ici. */
export function versSyntheseThemeDto(
  theme: SyntheseThemeAvecLibelle,
): SyntheseThemeDto {
  return {
    themeId: theme.themeId,
    libelle: theme.libelle,
    position: theme.position,
    ...versChampsPalierDto(theme.resultatPalier),
    questions: theme.questions.map((question) => ({
      questionId: question.questionId,
      libelle: question.libelle,
      effectif: question.effectif,
      moyenne: question.moyenne,
      consensus: question.consensus,
      repartition: question.repartitionParNiveau,
    })),
  };
}

export function versSyntheseDto(
  contexte: ContexteSyntheseSession,
  themes: SyntheseThemeAvecLibelle[],
  palierGlobal: ResultatPalier,
): SyntheseSessionDto {
  const champsPalierGlobal = versChampsPalierDto(palierGlobal);
  return {
    equipeNom: contexte.equipeNom,
    date: contexte.date.toISOString(),
    code: contexte.code,
    statut: STATUT_VERS_DTO[contexte.statut],
    seuilPalier: contexte.seuilPalier,
    themes: themes.map(versSyntheseThemeDto),
    palierGlobal: champsPalierGlobal.palier,
    tauxApprocheGlobal: champsPalierGlobal.tauxApproche,
    margeAvantDescenteGlobal: champsPalierGlobal.margeAvantDescente,
    effectifGlobal: champsPalierGlobal.effectif,
  };
}
