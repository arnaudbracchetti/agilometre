import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import {
  PilotageSessionDto,
  ProgressionQuestionDto,
  QuestionCouranteDto,
  StatutQuestionProgressionDto,
  TourHistoriqueDto,
  TourOuvertDto,
} from '@agilometre/shared';
import { LETTRES_OPTIONS } from '../../shared/lettres-options';
import { libelleStatutProgression } from '../../shared/libelle-statut-progression';
import { sonder } from '../../shared/sondage-2s';
import { CouleurStickyNote, StickyNote } from '../../shared/sticky-note/sticky-note';
import { ErrorMessage } from '../../shared/error-message/error-message';
import { SessionsService } from '../sessions.service';

interface GroupeProgression {
  questionId: string;
  libelle: string;
  statut: StatutQuestionProgressionDto;
  reactivable: boolean;
  tours: TourHistoriqueDto[];
}

/**
 * 3 teintes seulement (comme <app-sticky-note>, jamais une 4e) — cyclées par position de
 * Question, pas par contenu, pour varier visuellement une liste de plusieurs notes empilées.
 */
const COULEURS_NOTES_HISTORIQUE: readonly CouleurStickyNote[] = ['blue', 'violet', 'magenta'];

/** Écran de pilotage (Coach) — sondage 2s (doc/spec/annexes/deroulement-session-animee.md). */
@Component({
  selector: 'app-pilotage-page',
  imports: [
    RouterLink,
    NzButtonModule,
    NzIconModule,
    NzPopconfirmModule,
    StickyNote,
    ErrorMessage,
  ],
  templateUrl: './pilotage-page.html',
  styleUrl: './pilotage-page.scss',
})
export class PilotagePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sessionsService = inject(SessionsService);
  private readonly message = inject(NzMessageService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly lettres = LETTRES_OPTIONS;
  protected readonly sessionId = signal<string | null>(null);
  protected readonly statut = signal<PilotageSessionDto['statut'] | null>(null);
  protected readonly code = signal<string | null>(null);
  protected readonly nbDevicesConnectes = signal(0);
  protected readonly questionCourante = signal<QuestionCouranteDto | null>(null);
  protected readonly tourOuvert = signal<TourOuvertDto | null>(null);
  protected readonly historique = signal<TourHistoriqueDto[]>([]);
  protected readonly progression = signal<ProgressionQuestionDto[]>([]);
  /** Repliées par défaut — consultation à la demande, jamais imposée au premier affichage. */
  protected readonly groupesHistoriqueOuverts = signal<ReadonlySet<string>>(new Set());
  protected readonly inaccessible = signal(false);
  protected readonly chargementEnCours = signal(true);
  protected readonly avancerEnCours = signal(false);
  protected readonly tourEnCours = signal(false);
  /** questionId en cours de traitement, pour ne désactiver que le bon bouton Sauter. */
  protected readonly sauterEnCours = signal<string | null>(null);
  /** questionId en cours de traitement, pour ne désactiver que le bon bouton Réactiver. */
  protected readonly reactiverEnCours = signal<string | null>(null);
  protected readonly terminerPrematurementEnCours = signal(false);

  /**
   * Toutes les Questions de la Sélection sont Traitées ou Sautées (carte F3) — atteignable soit
   * en avançant question par question jusqu'au bout, soit via « Terminer la séance
   * prématurément ». Distingue ce cas de la salle d'attente, où `questionCourante` est aussi
   * `null` mais où rien n'a encore de statut autre que À venir.
   */
  protected readonly estTerminee = computed(
    () =>
      this.progression().length > 0 &&
      this.progression().every((p) => p.statut === 'TRAITEE' || p.statut === 'SAUTEE'),
  );

  /**
   * Vue d'ensemble de la Sélection entière (carte F1), qu'une Question ait déjà des Tours clos ou
   * non — fusionne la progression (ordre + statut de chaque Question, toujours complet) avec
   * l'historique des Tours clos (carte E2, potentiellement plusieurs par Question en cas de
   * revote, carte E1). L'ordre vient uniquement de `progression`, déjà celui de la Sélection.
   */
  protected readonly vueDensemble = computed<GroupeProgression[]>(() => {
    const toursParQuestion = new Map<string, TourHistoriqueDto[]>();
    for (const tour of this.historique()) {
      const liste = toursParQuestion.get(tour.questionId);
      if (liste) {
        liste.push(tour);
      } else {
        toursParQuestion.set(tour.questionId, [tour]);
      }
    }
    return this.progression().map((entree) => ({
      questionId: entree.questionId,
      libelle: entree.libelle,
      statut: entree.statut,
      reactivable: entree.reactivable,
      tours: toursParQuestion.get(entree.questionId) ?? [],
    }));
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      return;
    }
    this.sessionId.set(id);

    sonder(
      () => this.sessionsService.obtenirPilotage(id),
      () => {
        this.inaccessible.set(true);
        this.chargementEnCours.set(false);
        this.message.error('Cet écran de pilotage n’est plus accessible.');
      },
      this.destroyRef,
    ).subscribe((pilotage) => {
      this.appliquer(pilotage);
      this.chargementEnCours.set(false);
    });
  }

  protected urlProjection(): string {
    const id = this.sessionId();
    return id ? `/projection/${id}` : '';
  }

  protected libelleBouton(): string {
    return this.questionCourante() ? 'Question suivante' : 'Commencer';
  }

  protected libelleBoutonTour(): string {
    return this.tourOuvert() ? 'Clore le vote' : 'Ouvrir le vote';
  }

  protected avancer(): void {
    const id = this.sessionId();
    if (!id) {
      return;
    }
    this.avancerEnCours.set(true);
    this.sessionsService
      .passerQuestionSuivante(id)
      .pipe(finalize(() => this.avancerEnCours.set(false)))
      .subscribe({
        next: (pilotage) => this.appliquer(pilotage),
        error: () =>
          this.message.error(
            'Impossible d’avancer : la Question en cours doit être clôturée ou sautée.',
          ),
      });
  }

  protected basculerTour(): void {
    const id = this.sessionId();
    if (!id) {
      return;
    }
    this.tourEnCours.set(true);
    const appel = this.tourOuvert()
      ? this.sessionsService.clorerTour(id)
      : this.sessionsService.ouvrirTour(id);
    appel.pipe(finalize(() => this.tourEnCours.set(false))).subscribe({
      next: (pilotage) => this.appliquer(pilotage),
      error: () => this.message.error('Impossible de basculer l’état du vote.'),
    });
  }

  /** Seule action encore permise sur une Question restante (carte F2) : pas sur une déjà traitée/sautée. */
  protected estSautable(statut: StatutQuestionProgressionDto): boolean {
    return statut === 'A_VENIR' || statut === 'COURANTE';
  }

  protected sauterQuestion(questionId: string): void {
    const id = this.sessionId();
    if (!id) {
      return;
    }
    this.sauterEnCours.set(questionId);
    this.sessionsService
      .sauterQuestion(id, questionId)
      .pipe(finalize(() => this.sauterEnCours.set(null)))
      .subscribe({
        next: (pilotage) => this.appliquer(pilotage),
        error: () => this.message.error('Impossible de sauter cette Question.'),
      });
  }

  protected reactiverQuestion(questionId: string): void {
    const id = this.sessionId();
    if (!id) {
      return;
    }
    this.reactiverEnCours.set(questionId);
    this.sessionsService
      .reactiverQuestion(id, questionId)
      .pipe(finalize(() => this.reactiverEnCours.set(null)))
      .subscribe({
        next: (pilotage) => this.appliquer(pilotage),
        error: () => this.message.error('Impossible de réactiver cette Question.'),
      });
  }

  protected terminerPrematurement(): void {
    const id = this.sessionId();
    if (!id) {
      return;
    }
    this.terminerPrematurementEnCours.set(true);
    this.sessionsService
      .terminerPrematurement(id)
      .pipe(finalize(() => this.terminerPrematurementEnCours.set(false)))
      .subscribe({
        next: (pilotage) => {
          this.appliquer(pilotage);
          this.router.navigate(['/sessions', id, 'synthese']);
        },
        error: () => this.message.error('Impossible de terminer la séance prématurément.'),
      });
  }

  protected couleurNoteHistorique(index: number): CouleurStickyNote {
    return COULEURS_NOTES_HISTORIQUE[index % COULEURS_NOTES_HISTORIQUE.length];
  }

  protected libelleStatut(statut: StatutQuestionProgressionDto): string {
    return libelleStatutProgression(statut);
  }

  protected estGroupeHistoriqueOuvert(questionId: string): boolean {
    return this.groupesHistoriqueOuverts().has(questionId);
  }

  protected basculerGroupeHistorique(questionId: string): void {
    const ouverts = new Set(this.groupesHistoriqueOuverts());
    if (ouverts.has(questionId)) {
      ouverts.delete(questionId);
    } else {
      ouverts.add(questionId);
    }
    this.groupesHistoriqueOuverts.set(ouverts);
  }

  /** Le compte de l'Option à `index` se lit via son Niveau (index + 1, invariant monotone). */
  protected compteHistorique(tour: TourHistoriqueDto, index: number): number {
    return tour.repartition[(index + 1) as 1 | 2 | 3 | 4];
  }

  /** Largeur de barre relative au plus haut compte, même calcul que l'écran de projection. */
  protected fractionHistorique(tour: TourHistoriqueDto, index: number): number {
    const max = Math.max(
      tour.repartition[1],
      tour.repartition[2],
      tour.repartition[3],
      tour.repartition[4],
    );
    return max === 0 ? 0 : this.compteHistorique(tour, index) / max;
  }

  private appliquer(pilotage: PilotageSessionDto): void {
    this.statut.set(pilotage.statut);
    this.code.set(pilotage.code);
    this.nbDevicesConnectes.set(pilotage.nbDevicesConnectes);
    this.questionCourante.set(pilotage.questionCourante);
    this.tourOuvert.set(pilotage.tourOuvert);
    this.historique.set(pilotage.historique ?? []);
    this.progression.set(pilotage.progression ?? []);
  }
}
