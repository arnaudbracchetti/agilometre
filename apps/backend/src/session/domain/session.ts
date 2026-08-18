import { Question } from '../../referentiel/domain/question';
import { Referentiel } from '../../referentiel/domain/referentiel';
import { Result } from '../../shared-kernel/result';
import {
  QuestionDejaSelectionneeError,
  QuestionIntrouvableDansSelectionError,
  Selection,
} from './selection';

export type StatutSession = 'PREPAREE' | 'OUVERTE' | 'CLOTUREE';

/** État en lecture d'un Tour de vote, fourni par l'appelant (#33) — Session n'y détient jamais de référence. */
export interface EtatTour {
  tourId: string;
  questionId: string;
  numero: number;
  clos: boolean;
}

export type StatutQuestionProgression =
  'A_VENIR' | 'COURANTE' | 'TRAITEE' | 'SAUTEE';

export type Progression = ReadonlyArray<{
  questionId: string;
  statut: StatutQuestionProgression;
}>;

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

export class SessionNonModifiableError extends Error {
  constructor() {
    super(
      'Cette Session ne peut plus être modifiée : elle est verrouillée ou clôturée',
    );
    this.name = 'SessionNonModifiableError';
  }
}

export class SessionNonPrepareeError extends Error {
  constructor() {
    super('Cette Session a déjà été ouverte ou clôturée');
    this.name = 'SessionNonPrepareeError';
  }
}

/** Garde partagée par ouvrir/sauter/passerQuestionSuivante/terminer — même Session doit être OUVERTE. */
export class SessionNonOuverteError extends Error {
  constructor() {
    super('Cette Session doit être ouverte pour cette action');
    this.name = 'SessionNonOuverteError';
  }
}

export class CodeInvalideError extends Error {
  constructor() {
    super('Le Code de session ne peut pas être vide');
    this.name = 'CodeInvalideError';
  }
}

export class QuestionDejaTraiteeError extends Error {
  constructor() {
    super('Cette Question a déjà été traitée (Tour de vote clos)');
    this.name = 'QuestionDejaTraiteeError';
  }
}

export class QuestionDejaSauteeError extends Error {
  constructor() {
    super('Cette Question a déjà été sautée');
    this.name = 'QuestionDejaSauteeError';
  }
}

export class QuestionCouranteNonResolueError extends Error {
  constructor() {
    super(
      'La Question courante doit être traitée ou sautée avant de passer à la suivante',
    );
    this.name = 'QuestionCouranteNonResolueError';
  }
}

export type ErreurInvariantSession = EquipeManquanteError | ModeleManquantError;

/**
 * Agrégat racine — une Session animée rattachée à une Équipe, initialisée avec une copie figée
 * de la Sélection du Modèle de session choisi (ADR-0009 : jamais de lien vivant vers ce Modèle).
 */
export class Session {
  /** indexCourant en salle d'attente : aucune Question courante (docs/design/agregat-tour-de-vote.md §1). */
  private static readonly SANS_QUESTION_COURANTE = -1;

  private constructor(
    readonly id: string,
    private _equipeId: string,
    private _date: Date,
    private _statut: StatutSession,
    private _modeleSessionId: string,
    private _selection: Selection,
    private _code: string | null,
    private _indexCourant: number,
    private _questionsSautees: Set<string>,
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
        'PREPAREE',
        modeleSessionId.trim(),
        selection,
        null,
        Session.SANS_QUESTION_COURANTE,
        new Set(),
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
    selection: Selection,
    code: string | null,
    indexCourant: number,
    questionsSautees: Set<string>,
  ): Session {
    return new Session(
      id,
      equipeId,
      date,
      statut,
      modeleSessionId,
      selection,
      code,
      indexCourant,
      new Set(questionsSautees),
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

  get equipeId(): string {
    return this._equipeId;
  }

  get date(): Date {
    return this._date;
  }

  get modeleSessionId(): string {
    return this._modeleSessionId;
  }

  get statut(): StatutSession {
    return this._statut;
  }

  get code(): string | null {
    return this._code;
  }

  get indexCourant(): number {
    return this._indexCourant;
  }

  get questionsSautees(): ReadonlySet<string> {
    return new Set(this._questionsSautees);
  }

  /** Copie défensive — indépendante de la Sélection interne, jamais une référence vivante. */
  get selection(): Selection {
    return Selection.reconstituer([...this._selection.questionIds]);
  }

  /** Dérivé de statut, jamais son propre état : verrouillée dès que PREPAREE est quitté (ADR-0010). */
  estVerrouillee(): boolean {
    return this._statut !== 'PREPAREE';
  }

  /**
   * Garde propre à Équipe/Date/Modèle/Suppression : plus large que celle qui protège déjà
   * ajouterQuestion/ajouterTheme/reordonnerQuestion (verrouillée uniquement) — ces opérations
   * doivent aussi être refusées une fois la Session clôturée (docs/design/agregat-session.md §2).
   * Publique : réutilisée telle quelle par SupprimerSession (use case), qui n'a pas besoin d'un
   * Result puisqu'il ne mute rien sur l'agrégat lui-même avant de déléguer au repository.
   */
  estModifiable(): boolean {
    return !this.estVerrouillee() && this._statut !== 'CLOTUREE';
  }

  private garantirModifiable(): Result<void, SessionNonModifiableError> {
    if (!this.estModifiable()) {
      return Result.echec(new SessionNonModifiableError());
    }
    return Result.succes(undefined);
  }

  modifierInfos(
    equipeId: string,
    date: Date,
  ): Result<void, EquipeManquanteError | SessionNonModifiableError> {
    const garde = this.garantirModifiable();
    if (garde.estEchec) {
      return garde;
    }
    if (equipeId.trim().length === 0) {
      return Result.echec(new EquipeManquanteError());
    }
    this._equipeId = equipeId.trim();
    this._date = date;
    return Result.succes(undefined);
  }

  /** Remplace le Modèle source et réinitialise entièrement la Sélection (copie, pas de fusion). */
  changerModele(
    modeleSessionId: string,
    nouvelleSelection: Selection,
  ): Result<void, ModeleManquantError | SessionNonModifiableError> {
    const garde = this.garantirModifiable();
    if (garde.estEchec) {
      return garde;
    }
    if (modeleSessionId.trim().length === 0) {
      return Result.echec(new ModeleManquantError());
    }
    this._modeleSessionId = modeleSessionId.trim();
    this._selection = nouvelleSelection;
    return Result.succes(undefined);
  }

  ajouterQuestion(
    questionId: string,
    position?: number,
  ): Result<void, QuestionDejaSelectionneeError | SessionVerrouilleeError> {
    if (this.estVerrouillee()) {
      return Result.echec(new SessionVerrouilleeError());
    }
    return this._selection.ajouter(questionId, position);
  }

  ajouterTheme(
    questionIds: string[],
    position?: number,
  ): Result<void, QuestionDejaSelectionneeError | SessionVerrouilleeError> {
    if (this.estVerrouillee()) {
      return Result.echec(new SessionVerrouilleeError());
    }
    return this._selection.ajouterPlusieurs(questionIds, position);
  }

  /** Retrait bloqué une fois verrouillée — seul Sauter reste permis (ADR-0010). */
  retirerQuestion(
    questionId: string,
  ): Result<
    void,
    QuestionIntrouvableDansSelectionError | SessionVerrouilleeError
  > {
    if (this.estVerrouillee()) {
      return Result.echec(new SessionVerrouilleeError());
    }
    return this._selection.retirer(questionId);
  }

  reordonnerQuestion(
    questionId: string,
    nouvellePosition: number,
  ): Result<
    void,
    QuestionIntrouvableDansSelectionError | SessionVerrouilleeError
  > {
    if (this.estVerrouillee()) {
      return Result.echec(new SessionVerrouilleeError());
    }
    return this._selection.reordonner(questionId, nouvellePosition);
  }

  /** PREPAREE → OUVERTE : verrouille la Sélection pour de bon (ADR-0010), salle d'attente (-1). */
  ouvrir(
    code: string,
  ): Result<void, SessionNonPrepareeError | CodeInvalideError> {
    if (this._statut !== 'PREPAREE') {
      return Result.echec(new SessionNonPrepareeError());
    }
    if (code.trim().length === 0) {
      return Result.echec(new CodeInvalideError());
    }
    this._code = code.trim();
    this._statut = 'OUVERTE';
    this._indexCourant = Session.SANS_QUESTION_COURANTE;
    return Result.succes(undefined);
  }

  /** OUVERTE → CLOTUREE. */
  terminer(): Result<void, SessionNonOuverteError> {
    if (this._statut !== 'OUVERTE') {
      return Result.echec(new SessionNonOuverteError());
    }
    this._statut = 'CLOTUREE';
    return Result.succes(undefined);
  }

  /** Marque une Question restante comme Sautée ; avance indexCourant si c'était l'item courant. */
  sauter(
    questionId: string,
    tours: readonly EtatTour[],
  ): Result<
    void,
    | SessionNonOuverteError
    | QuestionIntrouvableDansSelectionError
    | QuestionDejaTraiteeError
    | QuestionDejaSauteeError
  > {
    if (this._statut !== 'OUVERTE') {
      return Result.echec(new SessionNonOuverteError());
    }
    const index = this._selection.questionIds.indexOf(questionId);
    if (index === -1) {
      return Result.echec(new QuestionIntrouvableDansSelectionError());
    }
    if (tours.some((t) => t.questionId === questionId && t.clos)) {
      return Result.echec(new QuestionDejaTraiteeError());
    }
    if (this._questionsSautees.has(questionId)) {
      return Result.echec(new QuestionDejaSauteeError());
    }
    this._questionsSautees.add(questionId);
    if (index === this._indexCourant) {
      this._indexCourant = this.prochainIndexNonSaute(this._indexCourant);
    }
    return Result.succes(undefined);
  }

  /** Depuis la salle d'attente, démarre toujours la séance ; sinon refusé tant que l'item courant n'est pas résolu (docs/design/agregat-tour-de-vote.md §2). */
  passerQuestionSuivante(
    tours: readonly EtatTour[],
  ): Result<void, SessionNonOuverteError | QuestionCouranteNonResolueError> {
    if (this._statut !== 'OUVERTE') {
      return Result.echec(new SessionNonOuverteError());
    }
    if (
      this._indexCourant !== Session.SANS_QUESTION_COURANTE &&
      !this.estResolue(this._indexCourant, tours)
    ) {
      return Result.echec(new QuestionCouranteNonResolueError());
    }
    this._indexCourant = this.prochainIndexNonSaute(this._indexCourant);
    return Result.succes(undefined);
  }

  /**
   * Dérive à_venir/courante/traitée/sautée par Question, sans muter l'agrégat (docs/design/
   * agregat-tour-de-vote.md §5) — seul endroit où vit cette règle.
   */
  progression(tours: readonly EtatTour[]): Progression {
    const questionsTraitees = new Set(
      tours.filter((t) => t.clos).map((t) => t.questionId),
    );
    return this._selection.questionIds.map((questionId, index) => {
      let statut: StatutQuestionProgression;
      if (this._questionsSautees.has(questionId)) {
        statut = 'SAUTEE';
      } else if (index === this._indexCourant) {
        statut = 'COURANTE';
      } else if (questionsTraitees.has(questionId)) {
        statut = 'TRAITEE';
      } else {
        statut = 'A_VENIR';
      }
      return { questionId, statut };
    });
  }

  private estResolue(index: number, tours: readonly EtatTour[]): boolean {
    const questionId = this._selection.questionIds[index];
    if (questionId === undefined) {
      return false;
    }
    return (
      this._questionsSautees.has(questionId) ||
      tours.some((t) => t.questionId === questionId && t.clos)
    );
  }

  /** Ne saute que les Sautées (jamais les Traitées, cf. design doc). */
  private prochainIndexNonSaute(depuis: number): number {
    const ids = this._selection.questionIds;
    let i = depuis + 1;
    while (i < ids.length && this._questionsSautees.has(ids[i])) {
      i++;
    }
    return i;
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
