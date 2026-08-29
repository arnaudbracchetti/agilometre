import { Referentiel } from '../../referentiel/domain/referentiel';
import { Session } from '../domain/session';

export interface QuestionScorableEnrichie {
  questionId: string;
  libelleQuestion: string;
  themeId: string;
  libelleTheme: string;
  positionTheme: number;
}

/**
 * Résout la Sélection d'une Session contre le Référentiel **complet** (`referentiel.themes`, tous
 * confondus) plutôt que `themesActifs()` : à la Portée Session, les Réponses sur Question/Thème
 * depuis archivé restent incluses (ADR-0015) — c'est le compte-rendu d'une séance qui a réellement
 * eu lieu. À ne jamais réutiliser pour une lecture en Portée périodique (radar, Mur de badges),
 * qui doit au contraire exclure les archivés.
 */
export class ResoudreQuestionsScorables {
  static executer(
    session: Session,
    referentielCharge: Referentiel,
  ): QuestionScorableEnrichie[] {
    const positions = referentielCharge.positionsThemes();
    const parQuestionId = new Map<
      string,
      {
        themeId: string;
        libelleTheme: string;
        libelleQuestion: string;
        positionTheme: number;
      }
    >();
    for (const theme of referentielCharge.themes) {
      for (const question of theme.questions) {
        parQuestionId.set(question.id, {
          themeId: theme.id,
          libelleTheme: theme.libelle,
          libelleQuestion: question.libelle,
          positionTheme: positions.get(theme.id)!,
        });
      }
    }

    return session.selection.questionIds
      .map((questionId) => {
        const trouve = parQuestionId.get(questionId);
        return trouve ? { questionId, ...trouve } : null;
      })
      .filter(
        (question): question is QuestionScorableEnrichie => question !== null,
      );
  }
}
