import { Question } from '../../referentiel/domain/question';
import { Referentiel } from '../../referentiel/domain/referentiel';
import { Result } from '../../shared-kernel/result';
import {
  QuestionDejaSelectionneeError,
  QuestionIntrouvableDansSelectionError,
  Selection,
} from './selection';

export class NomModeleSessionInvalideError extends Error {
  constructor() {
    super('Le nom d’un Modèle de session ne peut pas être vide');
    this.name = 'NomModeleSessionInvalideError';
  }
}

export type ErreurInvariantModeleSession = NomModeleSessionInvalideError;

/**
 * Agrégat racine — bibliothèque globale, sans rattachement à une Équipe (ADR-0008). Porte sa
 * propre Sélection (Value Object), librement modifiable, jamais partagée avec une Session
 * (ADR-0009 : copie figée à la création d'une Session, hors périmètre de cet agrégat).
 */
export class ModeleSession {
  private constructor(
    readonly id: string,
    private _nom: string,
    private readonly _selection: Selection,
  ) {}

  static creer(
    id: string,
    nom: string,
  ): Result<ModeleSession, ErreurInvariantModeleSession> {
    const validation = ModeleSession.validerNom(nom);
    if (validation.estEchec) {
      return Result.echec(validation.erreur);
    }
    return Result.succes(new ModeleSession(id, nom.trim(), Selection.vide()));
  }

  /**
   * Recharge un Modèle de session depuis une source déjà validée (le repository Prisma) — ne
   * revalide pas l'invariant, contrairement à `creer` (cf. CLAUDE.md sur la vigilance requise
   * pour toute factory additionnelle d'une entité déjà validée ailleurs).
   */
  static reconstituer(
    id: string,
    nom: string,
    selection: Selection,
  ): ModeleSession {
    return new ModeleSession(id, nom, selection);
  }

  private static validerNom(
    nom: string,
  ): Result<void, ErreurInvariantModeleSession> {
    if (nom.trim().length === 0) {
      return Result.echec(new NomModeleSessionInvalideError());
    }
    return Result.succes(undefined);
  }

  get nom(): string {
    return this._nom;
  }

  /** Copie défensive — indépendante de la Sélection interne, jamais une référence vivante. */
  get selection(): Selection {
    return Selection.reconstituer([...this._selection.questionIds]);
  }

  renommer(nom: string): Result<void, ErreurInvariantModeleSession> {
    const validation = ModeleSession.validerNom(nom);
    if (validation.estEchec) {
      return Result.echec(validation.erreur);
    }
    this._nom = nom.trim();
    return Result.succes(undefined);
  }

  ajouterQuestion(
    questionId: string,
    position?: number,
  ): Result<void, QuestionDejaSelectionneeError> {
    return this._selection.ajouter(questionId, position);
  }

  ajouterTheme(
    questionIds: string[],
    position?: number,
  ): Result<void, QuestionDejaSelectionneeError> {
    return this._selection.ajouterPlusieurs(questionIds, position);
  }

  retirerQuestion(
    questionId: string,
  ): Result<void, QuestionIntrouvableDansSelectionError> {
    return this._selection.retirer(questionId);
  }

  reordonnerQuestion(
    questionId: string,
    nouvellePosition: number,
  ): Result<void, QuestionIntrouvableDansSelectionError> {
    return this._selection.reordonner(questionId, nouvellePosition);
  }

  /**
   * Détail enrichi : résout chaque QuestionId de la Sélection contre le Référentiel actif, dans
   * l'ordre de la Sélection. Une Question archivée (ou déjà supprimée du Référentiel) disparaît
   * silencieusement du résultat, sans jamais être retirée physiquement de la Sélection — résolu à
   * la lecture, le Référentiel n'est jamais stocké par référence (docs/design/agregat-session.md §2).
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
