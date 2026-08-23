import { ReferentielRepository } from '../../referentiel/domain/referentiel.repository';
import { ReponseRepository } from '../../reponse/domain/reponse.repository';
import { Scoring } from '../../scoring/domain/scoring';
import { CalculerSyntheseScoring } from '../../scoring/application/calculer-synthese-scoring';
import { EtatToursQuery } from '../domain/etat-tours.query';
import { SessionRepository } from '../domain/session.repository';
import {
  EnrichirResultatsAvecLibelles,
  SyntheseThemeAvecLibelle,
} from './enrichir-resultats-avec-libelles';
import { ResoudreQuestionsScorables } from './resoudre-questions-scorables';
import { SourceReponsesScorablesSession } from './source-reponses-scorables-session';

export type ResultatObtenirSyntheseSession =
  { type: 'introuvable' } | { type: 'ok'; themes: SyntheseThemeAvecLibelle[] };

/**
 * Assemble la synthèse de fin de Session (#52) : `ResoudreQuestionsScorables` résout la Sélection
 * contre le Référentiel complet (archivés inclus, ADR-0015), `SourceReponsesScorablesSession`
 * fournit les Réponses au port de `scoring/` (ADR-0018), et `CalculerSyntheseScoring` calcule le
 * Palier par Thème et la lecture fine par Question. Même garde `PREPAREE` → introuvable que
 * `ObtenirPilotageSession` : l'écran n'existe qu'à partir de l'ouverture.
 */
export class ObtenirSyntheseSession {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly referentiel: ReferentielRepository,
    private readonly etatTours: EtatToursQuery,
    private readonly reponses: ReponseRepository,
    private readonly scoring: Scoring,
    private readonly seuilPalierPourcentage: number,
  ) {}

  async executer(id: string): Promise<ResultatObtenirSyntheseSession> {
    const session = await this.sessions.findById(id);
    if (!session || session.statut === 'PREPAREE') {
      return { type: 'introuvable' };
    }

    const referentielCharge = await this.referentiel.charger();
    const questions = ResoudreQuestionsScorables.executer(
      session,
      referentielCharge,
    );
    const source = new SourceReponsesScorablesSession(
      session,
      this.etatTours,
      this.reponses,
    );
    const seuil = this.scoring.pourcentageVersFraction(
      this.seuilPalierPourcentage,
    );

    const resultatsParTheme = await CalculerSyntheseScoring.executer(
      this.scoring,
      source,
      questions.map((q) => ({ questionId: q.questionId, themeId: q.themeId })),
      seuil,
    );

    const themes = EnrichirResultatsAvecLibelles.executer(
      resultatsParTheme,
      questions,
    );

    return { type: 'ok', themes };
  }
}
