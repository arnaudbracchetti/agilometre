import { Selection } from '../../modele-collecte/domain/selection';
import { Question } from '../../referentiel/domain/question';
import { Referentiel } from '../../referentiel/domain/referentiel';
import { Result } from '../../shared-kernel/result';
import { RythmeHebdomadaire } from './rythme-hebdomadaire';

export type StatutCampagne = 'BROUILLON' | 'ACTIVE' | 'SUSPENDUE' | 'TERMINEE';

export class QuestionsParEnvoiInvalideError extends Error {
  constructor() {
    super(
      'Le nombre de Questions par envoi doit être un entier strictement positif',
    );
    this.name = 'QuestionsParEnvoiInvalideError';
  }
}

export type ErreurInvariantCampagnePouls = QuestionsParEnvoiInvalideError;

/**
 * Agrégat racine — ne détient ni Sollicitation ni historique, sa taille est constante dans le
 * temps (docs/design/agregat-campagne-de-pouls.md §1). `modeleCollecteId` est un scalaire nu, sans
 * FK (ADR-0009) : supprimer le Modèle source n'a aucun effet sur la Campagne. `panel` est une copie
 * figée de la Sélection du Modèle à la création, en composition, jamais en référence partagée.
 */
export class CampagnePouls {
  private constructor(
    readonly id: string,
    readonly equipeId: string,
    private _statut: StatutCampagne,
    readonly modeleCollecteId: string,
    private readonly _panel: Selection,
    private readonly _rythme: RythmeHebdomadaire,
    private readonly _questionsParEnvoi: number,
  ) {}

  static creer(
    id: string,
    equipeId: string,
    modeleCollecteId: string,
    panel: Selection,
    rythme: RythmeHebdomadaire,
    questionsParEnvoi: number,
  ): Result<CampagnePouls, ErreurInvariantCampagnePouls> {
    const validation =
      CampagnePouls.validerQuestionsParEnvoi(questionsParEnvoi);
    if (validation.estEchec) {
      return Result.echec(validation.erreur);
    }
    return Result.succes(
      new CampagnePouls(
        id,
        equipeId,
        'BROUILLON',
        modeleCollecteId,
        Selection.reconstituer([...panel.questionIds]),
        rythme,
        questionsParEnvoi,
      ),
    );
  }

  /**
   * Recharge une Campagne depuis une source déjà validée (le repository Prisma) — ne revalide pas
   * l'invariant, contrairement à `creer` (cf. CLAUDE.md sur la vigilance requise pour toute
   * factory additionnelle d'un agrégat déjà validé ailleurs).
   */
  static reconstituer(
    id: string,
    equipeId: string,
    statut: StatutCampagne,
    modeleCollecteId: string,
    panel: Selection,
    rythme: RythmeHebdomadaire,
    questionsParEnvoi: number,
  ): CampagnePouls {
    return new CampagnePouls(
      id,
      equipeId,
      statut,
      modeleCollecteId,
      panel,
      rythme,
      questionsParEnvoi,
    );
  }

  private static validerQuestionsParEnvoi(
    questionsParEnvoi: number,
  ): Result<void, QuestionsParEnvoiInvalideError> {
    if (!Number.isInteger(questionsParEnvoi) || questionsParEnvoi <= 0) {
      return Result.echec(new QuestionsParEnvoiInvalideError());
    }
    return Result.succes(undefined);
  }

  get statut(): StatutCampagne {
    return this._statut;
  }

  get rythme(): RythmeHebdomadaire {
    return this._rythme;
  }

  get questionsParEnvoi(): number {
    return this._questionsParEnvoi;
  }

  /** Copie défensive — indépendante du Panel interne, jamais une référence vivante. */
  get panel(): Selection {
    return Selection.reconstituer([...this._panel.questionIds]);
  }

  /**
   * Détail enrichi : résout chaque QuestionId du Panel contre le Référentiel actif, dans l'ordre
   * du Panel. Une Question archivée (ou déjà supprimée du Référentiel) disparaît silencieusement
   * du résultat, sans jamais être retirée physiquement du Panel — résolu à la lecture, comme
   * ModeleCollecte.selectionEnrichie (docs/design/agregat-campagne-de-pouls.md §2).
   */
  panelEnrichi(referentiel: Referentiel): Question[] {
    const questionsActives = new Map<string, Question>(
      referentiel
        .themesActifs()
        .flatMap((theme) => theme.questions.map((q) => [q.id, q] as const)),
    );
    return this._panel.questionIds
      .map((questionId) => questionsActives.get(questionId))
      .filter((question): question is Question => question !== undefined);
  }
}
