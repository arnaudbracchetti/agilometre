import { EntiteRepository } from '../../organisation/domain/entite.repository';
import { EquipeRepository } from '../../organisation/domain/equipe.repository';
import { ReferentielRepository } from '../../referentiel/domain/referentiel.repository';
import { ReponseRepository } from '../../reponse/domain/reponse.repository';
import {
  Evolution,
  Periode,
  ResultatPalier,
  Scoring,
} from '../../scoring/domain/scoring';
import {
  CalculerSyntheseScoring,
  QuestionScorable,
} from '../../scoring/application/calculer-synthese-scoring';
import { EtatToursQuery } from '../domain/etat-tours.query';
import { SessionRepository } from '../domain/session.repository';
import { SourceReponsesScorablesPeriodeEquipe } from './source-reponses-scorables-periode-equipe';

export type ResultatObtenirProfilEntite =
  | { type: 'introuvable' }
  | {
      type: 'ok';
      periode: Periode;
      entiteNom: string;
      seuilPalier: number;
      global: ResultatPalier;
      aPeriodePrecedente: boolean;
      periodeEnCours: boolean;
      evolutionGlobale: Evolution | null;
    };

/**
 * Assemble le Palier agrégé d'une Entité : fusion des Réponses scorables de toutes les Sessions
 * closes de toutes les Équipes de l'Entité sur une Période de calcul (PRD §"Agrégation entité / BU")
 * — jamais une moyenne des Paliers par Équipe, pas de pondération par taille d'Équipe. Pas de
 * détail par Thème (contrairement à `ObtenirProfilEquipe`) : seule la vue Direction consomme ce
 * profil, qui ne montre que le Palier global et son Évolution.
 *
 * Même carrousel de navigation (`offset`, sentinel `-1` pour la Période en cours) que
 * `ObtenirProfilEquipe`, dont ce use case est le pendant au niveau Entité.
 */
export class ObtenirProfilEntite {
  constructor(
    private readonly entites: EntiteRepository,
    private readonly equipes: EquipeRepository,
    private readonly sessions: SessionRepository,
    private readonly referentiel: ReferentielRepository,
    private readonly etatTours: EtatToursQuery,
    private readonly reponses: ReponseRepository,
    private readonly scoring: Scoring,
    private readonly seuilPalierPourcentage: number,
    private readonly dureePeriodeMois: number,
  ) {}

  async executer(
    entiteId: string,
    offset = 0,
  ): Promise<ResultatObtenirProfilEntite> {
    const entite = await this.entites.findById(entiteId);
    if (!entite) {
      return { type: 'introuvable' };
    }
    const equipeIds = (await this.equipes.findByEntiteId(entiteId)).map(
      (equipe) => equipe.id,
    );

    let periode = this.scoring.periodeContenant(
      new Date(),
      this.dureePeriodeMois,
    );
    const periodeEnCours = offset === -1;
    if (!periodeEnCours) {
      for (let i = 0; i <= offset; i++) {
        periode = this.scoring.periodePrecedente(
          periode,
          this.dureePeriodeMois,
        );
      }
    }
    const aPeriodePrecedente = await this.sessions.existeFermeeAvantPourEquipes(
      equipeIds,
      periode.debut,
    );
    const referentielCharge = await this.referentiel.charger();
    const questions = referentielCharge.questionsActives();
    const questionsScorables = questions.map((q) => ({
      questionId: q.questionId,
      themeId: q.themeId,
    }));
    const seuil = this.scoring.pourcentageVersFraction(
      this.seuilPalierPourcentage,
    );

    const global = await this.calculerResultatPeriode(
      equipeIds,
      periode,
      questionsScorables,
      seuil,
    );

    let evolutionGlobale: Evolution | null = null;
    if (aPeriodePrecedente) {
      const periodePrecedenteCalcul = this.scoring.periodePrecedente(
        periode,
        this.dureePeriodeMois,
      );
      const globalPrecedent = await this.calculerResultatPeriode(
        equipeIds,
        periodePrecedenteCalcul,
        questionsScorables,
        seuil,
      );
      evolutionGlobale = this.scoring.comparerEvolution(
        global,
        globalPrecedent,
      );
    }

    return {
      type: 'ok',
      periode,
      entiteNom: entite.nom,
      seuilPalier: seuil,
      aPeriodePrecedente,
      periodeEnCours,
      global,
      evolutionGlobale,
    };
  }

  private async calculerResultatPeriode(
    equipeIds: string[],
    periode: Periode,
    questions: readonly QuestionScorable[],
    seuil: number,
  ): Promise<ResultatPalier> {
    const sessionsFermees = await this.sessions.findFermeesParEquipesEtPeriode(
      equipeIds,
      periode,
    );
    const source = new SourceReponsesScorablesPeriodeEquipe(
      sessionsFermees,
      this.etatTours,
      this.reponses,
    );
    const { global } = await CalculerSyntheseScoring.executer(
      this.scoring,
      source,
      questions,
      seuil,
    );
    return global;
  }
}
