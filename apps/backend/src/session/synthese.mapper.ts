import { SyntheseSessionDto } from '@agilometre/shared';
import { ResultatPalier } from '../scoring/domain/scoring';
import { SyntheseThemeAvecLibelle } from './application/obtenir-synthese-session.usecase';

/** Le domaine ignore délibérément `@agilometre/shared` (frontière API) — mapping explicite ici. */
export function versSyntheseDto(
  themes: SyntheseThemeAvecLibelle[],
): SyntheseSessionDto {
  return {
    themes: themes.map((theme) => {
      const palier = paliersDejaCalcules(theme.resultatPalier);
      return {
        themeId: theme.themeId,
        libelle: theme.libelle,
        palier: palier.palier,
        tauxApproche: palier.tauxApproche,
        margeAvantDescente: palier.margeAvantDescente,
        effectif: palier.effectif,
        questions: theme.questions.map((question) => ({
          questionId: question.questionId,
          libelle: question.libelle,
          effectif: question.effectif,
          moyenne: question.moyenne,
          consensus: question.consensus,
          repartition: question.repartitionParNiveau,
        })),
      };
    }),
  };
}

/** CalculerSyntheseScoring exclut déjà tout Thème sans Réponse — ce cas ne devrait jamais survenir. */
function paliersDejaCalcules(
  resultatPalier: ResultatPalier,
): Extract<ResultatPalier, { palier: 1 | 2 | 3 | 4 }> {
  if (!('palier' in resultatPalier)) {
    throw new Error(
      'Palier absent pour un Thème censé avoir au moins une Réponse (invariant de CalculerSyntheseScoring rompu).',
    );
  }
  return resultatPalier;
}
