import { Question } from '../../referentiel/domain/question';
import { Referentiel } from '../../referentiel/domain/referentiel';
import { Result } from '../../shared-kernel/result';
import {
  QuestionDejaSelectionneeError,
  QuestionIntrouvableDansSelectionError,
  Selection,
} from './selection';

export type StatutSession = 'OUVERTE' | 'CLOTUREE';

export class EquipeManquanteError extends Error {
  constructor() {
    super('Une Session doit être associée à une Équipe');
    this.name = 'EquipeManquanteError';
  }
}

export class ModeleManquantError extends Error {
  constructor() {
    super('Une Session doit être créée à partir d’un Modèle de session');
    this.name = 'ModeleManquantError';
  }
}

export class SessionVerrouilleeError extends Error {
  constructor() {
    super(
      'Cette Session est verrouillée : ajout et réordonnancement sont impossibles',
    );
    this.name = 'SessionVerrouilleeError';
  }
}

export type ErreurInvariantSession = EquipeManquanteError | ModeleManquantError;

/**
 * Agrégat racine — une Session animée rattachée à une Équipe, initialisée avec une copie figée
 * de la Sélection du Modèle de session choisi (ADR-0009 : jamais de lien vivant vers ce Modèle).
 * `estVerrouillee()` est une implémentation initiale sur un simple attribut, destinée à être
 * remplacée plus tard par un calcul dérivé des Tours de vote réels (Epic #30) sans changer le
 * contrat public (docs/design/agregat-session.md §1).
 */
export class Session {
  private constructor(
    readonly id: string,
    readonly equipeId: string,
    readonly date: Date,
    private _statut: StatutSession,
    readonly modeleSessionId: string,
    private _verrouillee: boolean,
    private readonly _selection: Selection,
  ) {}

  static creer(
    id: string,
    equipeId: string,
    date: Date,
    modeleSessionId: string,
    selection: Selection,
  ): Result<Session, ErreurInvariantSession> {
    const validation = Session.valider(equipeId, modeleSessionId);
    if (validation.estEchec) {
      return Result.echec(validation.erreur);
    }
    return Result.succes(
      new Session(
        id,
        equipeId.trim(),
        date,
        'OUVERTE',
        modeleSessionId.trim(),
        false,
        selection,
      ),
    );
  }

  /**
   * Recharge une Session depuis une source déjà validée (le repository Prisma) — ne revalide pas
   * l'invariant équipe/modèle, contrairement à `creer` (cf. CLAUDE.md sur la vigilance requise
   * pour toute factory additionnelle d'une entité déjà validée ailleurs).
   */
  static reconstituer(
    id: string,
    equipeId: string,
    date: Date,
    statut: StatutSession,
    modeleSessionId: string,
    verrouillee: boolean,
    selection: Selection,
  ): Session {
    return new Session(
      id,
      equipeId,
      date,
      statut,
      modeleSessionId,
      verrouillee,
      selection,
    );
  }

  private static valider(
    equipeId: string,
    modeleSessionId: string,
  ): Result<void, ErreurInvariantSession> {
    if (equipeId.trim().length === 0) {
      return Result.echec(new EquipeManquanteError());
    }
    if (modeleSessionId.trim().length === 0) {
      return Result.echec(new ModeleManquantError());
    }
    return Result.succes(undefined);
  }

  get statut(): StatutSession {
    return this._statut;
  }

  /** Copie défensive — indépendante de la Sélection interne, jamais une référence vivante. */
  get selection(): Selection {
    return Selection.reconstituer([...this._selection.questionIds]);
  }

  estVerrouillee(): boolean {
    return this._verrouillee;
  }

  ajouterQuestion(
    questionId: string,
    position?: number,
  ): Result<void, QuestionDejaSelectionneeError | SessionVerrouilleeError> {
    if (this._verrouillee) {
      return Result.echec(new SessionVerrouilleeError());
    }
    return this._selection.ajouter(questionId, position);
  }

  ajouterTheme(
    questionIds: string[],
    position?: number,
  ): Result<void, QuestionDejaSelectionneeError | SessionVerrouilleeError> {
    if (this._verrouillee) {
      return Result.echec(new SessionVerrouilleeError());
    }
    return this._selection.ajouterPlusieurs(questionIds, position);
  }

  /** Toujours permis, même verrouillée (docs/design/agregat-session.md §2). */
  retirerQuestion(
    questionId: string,
  ): Result<void, QuestionIntrouvableDansSelectionError> {
    return this._selection.retirer(questionId);
  }

  reordonnerQuestion(
    questionId: string,
    nouvellePosition: number,
  ): Result<
    void,
    QuestionIntrouvableDansSelectionError | SessionVerrouilleeError
  > {
    if (this._verrouillee) {
      return Result.echec(new SessionVerrouilleeError());
    }
    return this._selection.reordonner(questionId, nouvellePosition);
  }

  /**
   * Détail enrichi : résout chaque QuestionId de la Sélection contre le Référentiel actif, dans
   * l'ordre de la Sélection — même logique que `ModeleSession.selectionEnrichie`.
   */
  selectionEnrichie(referentiel: Referentiel): Question[] {
    const questionsActives = new Map<string, Question>(
      referentiel
        .themesActifs()
        .flatMap((theme) => theme.questions.map((q) => [q.id, q] as const)),
    );
    return this._selection.questionIds
      .map((questionId) => questionsActives.get(questionId))
      .filter((question): question is Question => question !== undefined);
  }
}
