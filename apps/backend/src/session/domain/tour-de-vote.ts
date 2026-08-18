import { Participation } from './participation';
import { NiveauInvalideError, Reponse } from './reponse';
import { Result } from '../../shared-kernel/result';

export class NumeroTourInvalideError extends Error {
  constructor(numero: number, attendu: number) {
    super(
      `Le numéro du Tour doit être strictement croissant pour cette Question (reçu ${numero}, attendu ${attendu})`,
    );
    this.name = 'NumeroTourInvalideError';
  }
}

/** Garde partagée par clore/voter — même Tour ne peut plus être mutée une fois clos. */
export class TourDejaClosError extends Error {
  constructor() {
    super('Ce Tour de vote est clos');
    this.name = 'TourDejaClosError';
  }
}

export interface ResultatVote {
  /** La nouvelle Reponse créée par ce vote — à persister par l'appelant (ReponseRepository.save). */
  reponse: Reponse;
  /** Ancienne Reponse à supprimer en cas de revote (ReponseRepository.remove), sinon null. */
  reponseASupprimer: string | null;
}

/**
 * Agrégat racine indépendant — un cycle de vote sur une Question au sein d'une Session.
 * Délibérément PAS un enfant de Session (docs/design/agregat-tour-de-vote.md §1) : le rythme
 * d'écriture du vote (un Jeton, potentiellement un revote) n'a rien à voir avec celui du pilotage
 * Coach. `sessionId` référence la Session par identité, jamais un agrégat Session chargé.
 */
export class TourDeVote {
  private constructor(
    readonly id: string,
    readonly sessionId: string,
    readonly questionId: string,
    readonly numero: number,
    readonly ouvertLe: Date,
    private _clotureLe: Date | null,
    private _participations: Participation[],
  ) {}

  /**
   * `numeroPrecedentPourQuestion` : dernier numero connu pour cette Question au sein de la
   * Session, ou null s'il s'agit du premier Tour — à fournir par l'appelant (un futur use case
   * "Ouvrir un Tour" le calculera à partir d'EtatTour[], cf. Session.EtatTour et la
   * EtatToursQuery différée). Validé ici plutôt que blindé côté appelant : cf. CLAUDE.md, un
   * agrégat valide ses propres invariants plutôt que de faire confiance à l'appelant.
   */
  static creer(
    id: string,
    sessionId: string,
    questionId: string,
    numero: number,
    ouvertLe: Date,
    numeroPrecedentPourQuestion: number | null,
  ): Result<TourDeVote, NumeroTourInvalideError> {
    const attendu = (numeroPrecedentPourQuestion ?? 0) + 1;
    if (numero !== attendu) {
      return Result.echec(new NumeroTourInvalideError(numero, attendu));
    }
    return Result.succes(
      new TourDeVote(id, sessionId, questionId, numero, ouvertLe, null, []),
    );
  }

  /**
   * Recharge un TourDeVote depuis une source déjà validée (le repository Prisma) — ne revalide
   * pas l'invariant de numéro, contrairement à `creer` (cf. CLAUDE.md).
   */
  static reconstituer(
    id: string,
    sessionId: string,
    questionId: string,
    numero: number,
    ouvertLe: Date,
    clotureLe: Date | null,
    participations: Participation[],
  ): TourDeVote {
    return new TourDeVote(
      id,
      sessionId,
      questionId,
      numero,
      ouvertLe,
      clotureLe,
      [...participations],
    );
  }

  get clotureLe(): Date | null {
    return this._clotureLe;
  }

  get estClos(): boolean {
    return this._clotureLe !== null;
  }

  /** Copie défensive — jamais une référence vivante vers la collection interne. */
  get participations(): readonly Participation[] {
    return [...this._participations];
  }

  /** Feed le futur sondage 1s Participant (docs/design/agregat-tour-de-vote.md §5). */
  voteDe(jetonId: string): Participation | null {
    return this._participations.find((p) => p.jetonId === jetonId) ?? null;
  }

  /** Purge intégrale des Participation à la clôture — jamais les Reponse, qui restent pour le score. */
  clore(le: Date): Result<void, TourDejaClosError> {
    if (this.estClos) {
      return Result.echec(new TourDejaClosError());
    }
    this._clotureLe = le;
    this._participations = [];
    return Result.succes(undefined);
  }

  /**
   * Vote (ou revote) d'un Jeton. Construit toujours une Reponse fraîche — jamais de mutation
   * d'une Reponse existante (docs/design/agregat-tour-de-vote.md §2). `reponseId` est fourni par
   * l'appelant (généré à la frontière use case, même convention que randomUUID() dans les autres
   * use cases de ce module) pour garder ce fichier sans dépendance à `crypto`.
   */
  voter(
    jetonId: string,
    reponseId: string,
    niveau: number,
    equipeId: string,
    horodatage: Date,
  ): Result<ResultatVote, TourDejaClosError | NiveauInvalideError> {
    if (this.estClos) {
      return Result.echec(new TourDejaClosError());
    }
    // origine/tourId sont ici toujours cohérents (SESSION + this.id) : seul le niveau peut faire
    // échouer Reponse.creer sur ce chemin.
    const resultatReponse = Reponse.creer(
      reponseId,
      this.questionId,
      niveau,
      equipeId,
      horodatage,
      'SESSION',
      this.id,
    );
    if (resultatReponse.estEchec) {
      return Result.echec(resultatReponse.erreur);
    }
    const nouvelleReponse = resultatReponse.valeur;

    const existante = this._participations.find((p) => p.jetonId === jetonId);
    let reponseASupprimer: string | null = null;
    if (existante) {
      reponseASupprimer = existante.reponseId;
      existante.remplacerReponse(nouvelleReponse.id);
    } else {
      this._participations.push(
        Participation.creer(this.id, jetonId, nouvelleReponse.id),
      );
    }
    return Result.succes({ reponse: nouvelleReponse, reponseASupprimer });
  }
}
