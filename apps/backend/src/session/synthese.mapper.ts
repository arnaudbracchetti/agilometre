import { SyntheseSessionDto, SyntheseThemeDto } from '@agilometre/shared';
import { SyntheseThemeAvecLibelle } from './application/enrichir-resultats-avec-libelles';

/** Le domaine ignore délibérément `@agilometre/shared` (frontière API) — mapping explicite ici. */
export function versSyntheseThemeDto(
  theme: SyntheseThemeAvecLibelle,
): SyntheseThemeDto {
  if (!('palier' in theme.resultatPalier)) {
    return {
      themeId: theme.themeId,
      libelle: theme.libelle,
      palier: null,
      tauxApproche: null,
      margeAvantDescente: null,
      effectif: 0,
      questions: [],
    };
  }
  const { palier, tauxApproche, margeAvantDescente, effectif } =
    theme.resultatPalier;
  return {
    themeId: theme.themeId,
    libelle: theme.libelle,
    palier,
    tauxApproche,
    margeAvantDescente,
    effectif,
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
  themes: SyntheseThemeAvecLibelle[],
): SyntheseSessionDto {
  return { themes: themes.map(versSyntheseThemeDto) };
}
