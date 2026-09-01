import { ReferentielRepository } from '../../referentiel/domain/referentiel.repository';
import { EquipeRepository } from '../../organisation/domain/equipe.repository';
import { ReponseRepository } from '../../reponse/domain/reponse.repository';
import { ResultatPalier, Scoring } from '../../scoring/domain/scoring';
import { CalculerSyntheseScoring } from '../../scoring/application/calculer-synthese-scoring';
import { PerimetreUtilisateur } from '../../auth/domain/perimetre-utilisateur';
import { UtilisateurConnecte } from '../../auth/jeton-utilisateur';
import { EtatToursQuery } from '../domain/etat-tours.query';
import { SessionRepository } from '../domain/session.repository';
import { StatutSession } from '../domain/session';
import {
  EnrichirResultatsAvecLibelles,
  SyntheseThemeAvecLibelle,
} from './enrichir-resultats-avec-libelles';
import { ResoudreQuestionsScorables } from './resoudre-questions-scorables';
import { SourceReponsesScorablesSession } from './source-reponses-scorables-session';

export interface ContexteSyntheseSession {
  equipeNom: string;
  date: Date;
  code: string | null;
  statut: StatutSession;
  /** Seuil de Palier de l'instance, en fraction (0-1). */
  seuilPalier: number;
}

export type ResultatObtenirSyntheseSession =
  | { type: 'introuvable' }
  | { type: 'interdit' }
  | {
      type: 'ok';
      contexte: ContexteSyntheseSession;
      themes: SyntheseThemeAvecLibelle[];
      palierGlobal: ResultatPalier;
    };

/**
 * Assemble la synthèse de fin de Session (#52) : `ResoudreQuestionsScorables` résout la Sélection
 * contre le Référentiel complet (archivés inclus, ADR-0015), `SourceReponsesScorablesSession`
 * fournit les Réponses au port de `scoring/` (ADR-0018), et `CalculerSyntheseScoring` calcule le
 * Palier par Thème et la lecture fine par Question. Même garde `PREPAREE` → introuvable que
 * `ObtenirPilotageSession` : l'écran n'existe qu'à partir de l'ouverture.
 *
 * Vérification de périmètre manuelle (#62), pas `@Perimetre('equipe')` : le `:id` de cette route
 * est un id de Session, pas d'Équipe — le guard générique ne peut pas s'appliquer directement, même
 * limite que documentée pour le filtrage de collection (docs/design/agregat-politique-des-droits.md
 * §3), ici sur un id de nature différente plutôt que sur une collection.
 */
export class ObtenirSyntheseSession {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly equipes: EquipeRepository,
    private readonly referentiel: ReferentielRepository,
    private readonly etatTours: EtatToursQuery,
    private readonly reponses: ReponseRepository,
    private readonly scoring: Scoring,
    private readonly seuilPalierPourcentage: number,
    private readonly perimetre: PerimetreUtilisateur,
  ) {}

  async executer(
    id: string,
    utilisateur: UtilisateurConnecte,
  ): Promise<ResultatObtenirSyntheseSession> {
    const session = await this.sessions.findById(id);
    if (!session || session.statut === 'PREPAREE') {
      return { type: 'introuvable' };
    }

    const equipe = await this.equipes.findById(session.equipeId);
    if (!equipe) {
      return { type: 'introuvable' };
    }

    if (!(await this.perimetre.peutVoirEquipe(utilisateur, equipe.id))) {
      return { type: 'interdit' };
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

    const { themes: resultatsParTheme, global: palierGlobal } =
      await CalculerSyntheseScoring.executer(
        this.scoring,
        source,
        questions.map((q) => ({
          questionId: q.questionId,
          themeId: q.themeId,
        })),
        seuil,
      );

    const themes = EnrichirResultatsAvecLibelles.executer(
      resultatsParTheme,
      questions,
    );

    return {
      type: 'ok',
      contexte: {
        equipeNom: equipe.nom,
        date: session.date,
        code: session.code,
        statut: session.statut,
        seuilPalier: seuil,
      },
      themes,
      palierGlobal,
    };
  }
}
