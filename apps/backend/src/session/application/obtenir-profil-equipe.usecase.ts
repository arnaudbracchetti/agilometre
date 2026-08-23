import { ReferentielRepository } from '../../referentiel/domain/referentiel.repository';
import { EquipeRepository } from '../../organisation/domain/equipe.repository';
import { ReponseRepository } from '../../reponse/domain/reponse.repository';
import { Periode, Scoring } from '../../scoring/domain/scoring';
import { CalculerSyntheseScoring } from '../../scoring/application/calculer-synthese-scoring';
import { EtatToursQuery } from '../domain/etat-tours.query';
import { SessionRepository } from '../domain/session.repository';
import {
  EnrichirResultatsAvecLibelles,
  SyntheseThemeAvecLibelle,
} from './enrichir-resultats-avec-libelles';
import { SourceReponsesScorablesPeriodeEquipe } from './source-reponses-scorables-periode-equipe';

export type ResultatObtenirProfilEquipe =
  | { type: 'introuvable' }
  | { type: 'ok'; periode: Periode; themes: SyntheseThemeAvecLibelle[] };

/**
 * Assemble le Profil par Thème d'une Équipe (#53) : Portée périodique du moteur de scoring
 * (ADR-0014), Réponses agrégées sur les Sessions closes de l'Équipe sur la Période de calcul en
 * cours (ADR-0018), Thèmes/Questions actifs du Référentiel seulement (ADR-0015).
 */
export class ObtenirProfilEquipe {
  constructor(
    private readonly equipes: EquipeRepository,
    private readonly sessions: SessionRepository,
    private readonly referentiel: ReferentielRepository,
    private readonly etatTours: EtatToursQuery,
    private readonly reponses: ReponseRepository,
    private readonly scoring: Scoring,
    private readonly seuilPalierPourcentage: number,
    private readonly dureePeriodeMois: number,
  ) {}

  async executer(equipeId: string): Promise<ResultatObtenirProfilEquipe> {
    const equipe = await this.equipes.findById(equipeId);
    if (!equipe) {
      return { type: 'introuvable' };
    }

    const periode = this.scoring.periodeContenant(
      new Date(),
      this.dureePeriodeMois,
    );
    const sessionsFermees = await this.sessions.findFermeesParEquipeEtPeriode(
      equipeId,
      periode,
    );
    const referentielCharge = await this.referentiel.charger();
    const questions = referentielCharge.questionsActives();
    const source = new SourceReponsesScorablesPeriodeEquipe(
      sessionsFermees,
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

    return { type: 'ok', periode, themes };
  }
}
