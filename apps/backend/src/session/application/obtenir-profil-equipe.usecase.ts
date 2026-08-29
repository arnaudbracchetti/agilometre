import { ReferentielRepository } from '../../referentiel/domain/referentiel.repository';
import { EquipeRepository } from '../../organisation/domain/equipe.repository';
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
  ResultatSyntheseScoring,
} from '../../scoring/application/calculer-synthese-scoring';
import { EtatToursQuery } from '../domain/etat-tours.query';
import { SessionRepository } from '../domain/session.repository';
import {
  EnrichirResultatsAvecLibelles,
  SyntheseThemeAvecLibelle,
} from './enrichir-resultats-avec-libelles';
import { SourceReponsesScorablesPeriodeEquipe } from './source-reponses-scorables-periode-equipe';

export type ResultatObtenirProfilEquipe =
  | { type: 'introuvable' }
  | {
      type: 'ok';
      periode: Periode;
      equipeNom: string;
      seuilPalier: number;
      themes: SyntheseThemeAvecLibelle[];
      global: ResultatPalier;
      aPeriodePrecedente: boolean;
      periodeEnCours: boolean;
      evolutionGlobale: Evolution | null;
      evolutionsParTheme: Record<string, Evolution | null>;
    };

/**
 * Assemble le Profil par Thème d'une Équipe (#53) : Portée périodique du moteur de scoring
 * (ADR-0014), Réponses agrégées sur les Sessions closes de l'Équipe sur une Période de calcul
 * (ADR-0015 pour les Thèmes/Questions actifs du Référentiel).
 *
 * `offset` permet de reculer d'`offset` Périodes complètes supplémentaires avant la dernière
 * (offset 0, comportement historique) — carrousel de navigation entre Périodes de l'écran Profil
 * d'Équipe. Sentinel `offset = -1` : la Période en cours elle-même, encore ouverte — son calcul
 * ne porte que sur les Sessions déjà closes à ce jour dans cette Période et doit donc être signalé
 * comme incomplet à l'affichage (`periodeEnCours`).
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

  async executer(
    equipeId: string,
    offset = 0,
  ): Promise<ResultatObtenirProfilEquipe> {
    const equipe = await this.equipes.findById(equipeId);
    if (!equipe) {
      return { type: 'introuvable' };
    }

    let periode = this.scoring.periodeContenant(
      new Date(),
      this.dureePeriodeMois,
    );
    const periodeEnCours = offset === -1;
    if (!periodeEnCours) {
      // `offset + 1` reculs : un premier recul systématique (Période en cours exclue) puis un
      // recul par `offset` déjà écoulé — offset 0 reproduit donc le comportement historique
      // (la dernière Période complète).
      for (let i = 0; i <= offset; i++) {
        periode = this.scoring.periodePrecedente(
          periode,
          this.dureePeriodeMois,
        );
      }
    }
    const aPeriodePrecedente = await this.sessions.existeFermeeAvant(
      equipeId,
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

    const { themes: resultatsParTheme, global } =
      await this.calculerResultatsPeriode(
        equipeId,
        periode,
        questionsScorables,
        seuil,
      );

    // Évolution : comparaison avec la Période immédiatement précédente à celle affichée (jamais
    // "la dernière Période complète" — la comparaison suit la Période affichée en naviguant dans
    // l'historique). `aPeriodePrecedente` sert de garde : sans Session close avant `periode.debut`,
    // le second calcul ne trouverait de toute façon aucune donnée à comparer.
    let evolutionGlobale: Evolution | null = null;
    const evolutionsParTheme: Record<string, Evolution | null> = {};
    if (aPeriodePrecedente) {
      const periodePrecedenteCalcul = this.scoring.periodePrecedente(
        periode,
        this.dureePeriodeMois,
      );
      const { themes: themesPrecedents, global: globalPrecedent } =
        await this.calculerResultatsPeriode(
          equipeId,
          periodePrecedenteCalcul,
          questionsScorables,
          seuil,
        );
      evolutionGlobale = this.scoring.comparerEvolution(
        global,
        globalPrecedent,
      );
      const precedentParThemeId = new Map(
        themesPrecedents.map((t) => [t.themeId, t.resultatPalier]),
      );
      for (const theme of resultatsParTheme) {
        const precedent = precedentParThemeId.get(theme.themeId);
        evolutionsParTheme[theme.themeId] = precedent
          ? this.scoring.comparerEvolution(theme.resultatPalier, precedent)
          : null;
      }
    }

    const themes = EnrichirResultatsAvecLibelles.executer(
      resultatsParTheme,
      questions,
    );

    return {
      type: 'ok',
      periode,
      equipeNom: equipe.nom,
      seuilPalier: seuil,
      aPeriodePrecedente,
      periodeEnCours,
      themes,
      global,
      evolutionGlobale,
      evolutionsParTheme,
    };
  }

  private async calculerResultatsPeriode(
    equipeId: string,
    periode: Periode,
    questions: readonly QuestionScorable[],
    seuil: number,
  ): Promise<ResultatSyntheseScoring> {
    const sessionsFermees = await this.sessions.findFermeesParEquipeEtPeriode(
      equipeId,
      periode,
    );
    const source = new SourceReponsesScorablesPeriodeEquipe(
      sessionsFermees,
      this.etatTours,
      this.reponses,
    );
    return CalculerSyntheseScoring.executer(
      this.scoring,
      source,
      questions,
      seuil,
    );
  }
}
