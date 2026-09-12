import { Referentiel } from '../../referentiel/domain/referentiel';
import {
  EtatTour,
  Session,
  StatutQuestionProgression,
} from '../domain/session';

export interface ProgressionQuestion {
  questionId: string;
  libelle: string;
  statut: StatutQuestionProgression;
  reactivable: boolean;
  themeId: string;
  themeLibelle: string;
}

/**
 * Progression de la Sélection entière (carte F1), dans son ordre — dérivée par
 * `Session.progression`, enrichie du libellé de chaque Question et de son Thème (le rail de
 * pilotage colore chaque Question par Thème, y compris quand les Thèmes s'alternent dans la
 * Sélection : `Question.themeId` ne suppose aucune contiguïté). Filtre les Questions retirées
 * du Référentiel actif depuis la Sélection, même garde que `resoudreHistoriqueToursClos`.
 *
 * `etatsDesTours`/`referentielCharge` sont déjà résolus par l'appelant (`ObtenirPilotageSession`,
 * partagés avec `resoudreHistoriqueToursClos`) — aucune I/O ici, fonction pure.
 */
export function resoudreProgression(
  session: Session,
  etatsDesTours: readonly EtatTour[],
  referentielCharge: Referentiel,
): ProgressionQuestion[] {
  const questions = new Map(
    session.selectionEnrichie(referentielCharge).map((q) => [q.id, q] as const),
  );
  const libelleParThemeId = new Map(
    referentielCharge
      .themesActifs()
      .map((theme) => [theme.id, theme.libelle] as const),
  );
  return session
    .progression(etatsDesTours)
    .filter((entree) => questions.has(entree.questionId))
    .map((entree) => {
      const question = questions.get(entree.questionId)!;
      return {
        questionId: entree.questionId,
        libelle: question.libelle,
        statut: entree.statut,
        reactivable: entree.reactivable,
        themeId: question.themeId,
        themeLibelle: libelleParThemeId.get(question.themeId) ?? '',
      };
    });
}
