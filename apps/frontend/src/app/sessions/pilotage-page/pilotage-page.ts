import {
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription, finalize } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import {
  OptionAffichageDto,
  PilotageSessionDto,
  ProgressionQuestionDto,
  QuestionCouranteDto,
  RepartitionVotesDto,
  StatutQuestionProgressionDto,
  TourClosDto,
  TourHistoriqueDto,
  TourOuvertDto,
} from '@agilometre/shared';
import { LETTRES_OPTIONS } from '../../shared/lettres-options';
import { libelleStatutProgression } from '../../shared/libelle-statut-progression';
import { couleurCategorielle } from '../../shared/couleur-categorielle';
import { SEUIL_ECHECS_CONNEXION_PERDUE, sonder } from '../../shared/sondage-2s';
import { ErrorMessage } from '../../shared/error-message/error-message';
import { SessionsService } from '../sessions.service';

interface IndicateurStatut {
  type: string;
  theme: 'fill' | 'outline';
  classe: string;
}

interface ThemeProgression {
  themeId: string;
  themeLibelle: string;
}

interface QuestionAffichee {
  libelle: string;
  options: OptionAffichageDto[];
}

interface ActionPrimaire {
  libelle: string;
  executer: () => void;
}

/**
 * Repère visuel par statut — permet de scanner le rail sans lire chaque libellé de statut :
 * forme distincte par statut, jamais la couleur seule. Plein = définitif (Traitée), contour = pas
 * encore résolu positivement (À venir, Sautée) ; Courante seule porte le bleu primaire, exclusif à
 * la Question sur laquelle agir maintenant.
 */
const INDICATEURS_STATUT: Record<StatutQuestionProgressionDto, IndicateurStatut> = {
  A_VENIR: {
    type: 'clock-circle',
    theme: 'outline',
    classe: 'pilotage__question-icone pilotage__question-icone--a-venir',
  },
  COURANTE: {
    type: 'caret-right',
    theme: 'fill',
    classe: 'pilotage__question-icone pilotage__question-icone--courante',
  },
  TRAITEE: {
    type: 'check-circle',
    theme: 'fill',
    classe: 'pilotage__question-icone pilotage__question-icone--traitee',
  },
  SAUTEE: {
    type: 'minus-circle',
    theme: 'outline',
    classe: 'pilotage__question-icone pilotage__question-icone--sautee',
  },
};

/** Écran de pilotage (Coach) — sondage 2s (doc/spec/annexes/deroulement-session-animee.md). */
@Component({
  selector: 'app-pilotage-page',
  imports: [
    RouterLink,
    NzButtonModule,
    NzIconModule,
    NzModalModule,
    NzTooltipModule,
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
  private readonly modal = inject(NzModalService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly lettres = LETTRES_OPTIONS;
  protected readonly sessionId = signal<string | null>(null);
  protected readonly statut = signal<PilotageSessionDto['statut'] | null>(null);
  protected readonly code = signal<string | null>(null);
  protected readonly nbDevicesConnectes = signal(0);
  protected readonly questionCourante = signal<QuestionCouranteDto | null>(null);
  protected readonly tourOuvert = signal<TourOuvertDto | null>(null);
  protected readonly dernierTourClos = signal<TourClosDto | null>(null);
  protected readonly historique = signal<TourHistoriqueDto[]>([]);
  protected readonly progression = signal<ProgressionQuestionDto[]>([]);
  protected readonly inaccessible = signal(false);
  /** Bandeau discret, distinct de `inaccessible` — plusieurs échecs de sondage consécutifs, mais
   * l'écran déjà rendu reste affiché tel quel (carte H2, #49). */
  protected readonly connexionPerdue = signal(false);
  protected readonly chargementEnCours = signal(true);
  protected readonly avancerEnCours = signal(false);
  protected readonly tourEnCours = signal(false);
  /** questionId en cours de traitement, pour ne désactiver que le bon bouton Sauter. */
  protected readonly sauterEnCours = signal<string | null>(null);
  /** questionId en cours de traitement, pour ne désactiver que le bon bouton Réactiver. */
  protected readonly reactiverEnCours = signal<string | null>(null);
  protected readonly terminerPrematurementEnCours = signal(false);
  /** null = direct (Question courante) ; sinon questionId d'une Question déjà Traitée consultée depuis le rail. */
  protected readonly questionConsulteeId = signal<string | null>(null);
  /** Tour choisi via le carrousel pour la Question consultée ; `null` = le dernier Tour (valeur
   * par défaut à l'entrée en consultation, cf. `consulterQuestion`). */
  protected readonly numeroTourConsulte = signal<number | null>(null);
  /** Coupé définitivement sur 404 (jamais ouverte) ou dès qu'un pilotage renvoie CLOTUREE — évite
   * un sondage perpétuel sur un onglet oublié ouvert (carte H2, #49). */
  private sondageAbonnement: Subscription | null = null;

  private readonly railRef = viewChild<ElementRef<HTMLElement>>('railRef');
  private readonly lignesRailRef = viewChildren<ElementRef<HTMLElement>>('ligneRailRef');
  /** Dernier questionId vu au statut COURANTE — l'effet ci-dessous ne réagit qu'à un changement
   * réel de Question courante, jamais aux signaux `progression` réémis à chaque sondage 2s. */
  private questionCouranteSuivieId: string | null = null;
  /** Passe à `true` dès qu'un scroll du rail n'est pas d'origine programmatique ; repassé à
   * `false` uniquement au prochain changement de Question courante. */
  private railAjusteManuellement = false;
  /** `true` pendant le scroll déclenché par `repositionnerRailSiBesoin`, pour qu'`onScrollRail`
   * ne le prenne pas pour un scroll du coach. */
  private railAjustementProgrammatique = false;
  private readonly suivreQuestionCourantePourRail = effect(() =>
    this.gererChangementQuestionCourante(),
  );

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

  /** Lecture seule après CLOTUREE (carte G1) — un seul dérivé, réutilisé par les gardes du template. */
  protected readonly estOuverte = computed(() => this.statut() === 'OUVERTE');

  protected readonly estEnDirect = computed(() => this.questionConsulteeId() === null);

  /**
   * Une seule action à la fois, jamais deux boutons à choisir entre eux : après un Tour clos, le
   * choix réel (revoter ou avancer) part vers les actions secondaires, la priorité par défaut est
   * toujours d'avancer.
   *
   * Le déclencheur est `dernierTourClos()` (scopé à la Question courante par le backend), jamais
   * le statut de `progression()` pour cette Question : `Session.progression()` (session.ts,
   * `index === this._indexCourant` testé avant `questionsTraitees.has(...)`) rapporte toujours
   * COURANTE pour l'item à `indexCourant`, même une fois son Tour clos — elle ne bascule à TRAITEE
   * qu'après `passerQuestionSuivante()`. S'appuyer sur ce statut pour piloter l'action bloquait
   * l'avancée après clôture d'un vote (le bouton restait « Ouvrir le vote », qui rouvre un Tour —
   * un revote — au lieu d'avancer).
   */
  protected readonly action = computed<ActionPrimaire | null>(() => {
    if (this.estTerminee()) {
      return null;
    }
    if (this.tourOuvert()) {
      return { libelle: 'Clore le vote', executer: () => this.basculerTour() };
    }
    if (!this.questionCourante()) {
      return { libelle: 'Commencer', executer: () => this.avancer() };
    }
    if (this.dernierTourClos()) {
      return { libelle: 'Question suivante', executer: () => this.avancer() };
    }
    return { libelle: 'Ouvrir le vote', executer: () => this.basculerTour() };
  });

  protected readonly peutRevoter = computed(() => this.estEnDirect() && !!this.dernierTourClos());

  /** Jamais pendant un Tour ouvert : Session.sauter() ne le refuse pourtant que si le Tour est
   * déjà clos (session.ts) — mais sauter en plein vote perdrait silencieusement les votes déjà
   * déposés, un risque de clic accidentel trop réel pour ce bouton mis en avant dans le cadre
   * d'action, alors qu'il n'était qu'une icône discrète dans l'ancien rail. */
  protected readonly peutSauterCourante = computed(
    () =>
      this.estEnDirect() &&
      !!this.questionCourante() &&
      !this.dernierTourClos() &&
      !this.tourOuvert(),
  );

  /** Thèmes distincts dans leur ordre de première apparition — la Sélection peut alterner les
   * Thèmes sans contiguïté, ce n'est jamais un regroupement. */
  protected readonly themesDistincts = computed<ThemeProgression[]>(() => {
    const vus = new Set<string>();
    const themes: ThemeProgression[] = [];
    for (const entree of this.progression()) {
      if (!vus.has(entree.themeId)) {
        vus.add(entree.themeId);
        themes.push({ themeId: entree.themeId, themeLibelle: entree.themeLibelle });
      }
    }
    return themes;
  });

  /** Tours de la Question consultée, du plus ancien au plus récent — vide en direct. */
  protected readonly toursConsultables = computed<TourHistoriqueDto[]>(() => {
    const id = this.questionConsulteeId();
    if (!id) {
      return [];
    }
    return this.historique()
      .filter((tour) => tour.questionId === id)
      .sort((a, b) => a.numero - b.numero);
  });

  /** Index dans `toursConsultables` du Tour choisi par le carrousel — le dernier Tour tant que
   * `numeroTourConsulte` n'a pas été fixé par `tourPrecedent`/`tourSuivant`. */
  protected readonly tourConsulteIndex = computed(() => {
    const tours = this.toursConsultables();
    if (tours.length === 0) {
      return -1;
    }
    const numero = this.numeroTourConsulte();
    if (numero === null) {
      return tours.length - 1;
    }
    const index = tours.findIndex((tour) => tour.numero === numero);
    return index >= 0 ? index : tours.length - 1;
  });

  private readonly tourConsulteDto = computed<TourHistoriqueDto | null>(
    () => this.toursConsultables()[this.tourConsulteIndex()] ?? null,
  );

  protected readonly peutReculerTour = computed(() => this.tourConsulteIndex() > 0);
  protected readonly peutAvancerTour = computed(
    () => this.tourConsulteIndex() >= 0 && this.tourConsulteIndex() < this.toursConsultables().length - 1,
  );

  /** En direct : la Question courante. En consultation : le Tour choisi dans le carrousel — son
   * libellé/ses options sont ceux de la Question au moment de ce Tour (TourHistoriqueDto est
   * auto-porteur, pas besoin d'une deuxième source). */
  protected readonly questionAffichee = computed<QuestionAffichee | null>(() => {
    if (this.estEnDirect()) {
      return this.questionCourante();
    }
    return this.tourConsulteDto();
  });

  /** Résultats à afficher à côté de la Question affichée : en direct après clôture (tant qu'on
   * n'a pas avancé), ou le Tour choisi dans le carrousel en consultation. */
  protected readonly tourAffiche = computed<{ numero: number; repartition: RepartitionVotesDto } | null>(
    () => {
      if (!this.estEnDirect()) {
        return this.tourConsulteDto();
      }
      return this.tourOuvert() ? null : this.dernierTourClos();
    },
  );

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      return;
    }
    this.sessionId.set(id);

    this.sondageAbonnement = sonder(
      () => this.sessionsService.obtenirPilotage(id),
      (erreur, echecsConsecutifs) => {
        if (erreur instanceof HttpErrorResponse && erreur.status === 404) {
          this.sondageAbonnement?.unsubscribe();
          this.inaccessible.set(true);
          this.chargementEnCours.set(false);
          this.message.error('Cet écran de pilotage n’est plus accessible.');
          return;
        }
        if (echecsConsecutifs >= SEUIL_ECHECS_CONNEXION_PERDUE) {
          this.connexionPerdue.set(true);
        }
      },
      this.destroyRef,
    ).subscribe((pilotage) => {
      this.connexionPerdue.set(false);
      this.appliquer(pilotage);
      this.chargementEnCours.set(false);
      if (pilotage.statut === 'CLOTUREE') {
        this.sondageAbonnement?.unsubscribe();
      }
    });
  }

  protected urlProjection(): string {
    const id = this.sessionId();
    return id ? `/projection/${id}` : '';
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

  /** Boîte de dialogue générique (NzModalService) plutôt qu'un popconfirm posé à côté du bouton
   * — même composant que ajustement-page/aide-menu pour toute confirmation de l'app. */
  protected confirmerTerminerPrematurement(): void {
    this.modal.confirm({
      nzTitle: 'Terminer la séance prématurément ?',
      nzContent: 'Toutes les Questions restantes seront automatiquement marquées comme sautées.',
      nzOkText: 'Terminer la séance',
      nzOkDanger: true,
      nzCancelText: 'Annuler',
      nzOnOk: () => this.terminerPrematurement(),
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

  protected libelleStatut(statut: StatutQuestionProgressionDto): string {
    return libelleStatutProgression(statut);
  }

  protected indicateurStatut(statut: StatutQuestionProgressionDto): IndicateurStatut {
    return INDICATEURS_STATUT[statut];
  }

  protected couleurTheme(themeId: string): string {
    const index = this.themesDistincts().findIndex((theme) => theme.themeId === themeId);
    return couleurCategorielle(index < 0 ? 0 : index);
  }

  /** Seules Courante (retour au direct) et Traitée (consultation du résultat) réagissent au clic de ligne. */
  protected estConsultable(statut: StatutQuestionProgressionDto): boolean {
    return statut === 'COURANTE' || statut === 'TRAITEE';
  }

  protected consulterQuestion(entree: ProgressionQuestionDto): void {
    if (entree.statut === 'COURANTE') {
      this.revenirAuDirect();
    } else if (entree.statut === 'TRAITEE') {
      this.numeroTourConsulte.set(null);
      this.questionConsulteeId.set(entree.questionId);
    }
  }

  protected revenirAuDirect(): void {
    this.questionConsulteeId.set(null);
  }

  protected tourPrecedent(): void {
    const index = this.tourConsulteIndex();
    if (index > 0) {
      this.numeroTourConsulte.set(this.toursConsultables()[index - 1].numero);
    }
  }

  protected tourSuivant(): void {
    const tours = this.toursConsultables();
    const index = this.tourConsulteIndex();
    if (index >= 0 && index < tours.length - 1) {
      this.numeroTourConsulte.set(tours[index + 1].numero);
    }
  }

  protected onScrollRail(): void {
    if (this.railAjustementProgrammatique) {
      return;
    }
    this.railAjusteManuellement = true;
  }

  /** Le compte de l'Option à `index` se lit via son Niveau (index + 1, invariant monotone). */
  protected compteOption(tour: { repartition: RepartitionVotesDto }, index: number): number {
    return tour.repartition[(index + 1) as 1 | 2 | 3 | 4];
  }

  /** Largeur de barre relative au plus haut compte, même calcul que l'écran de projection. */
  protected fractionOption(tour: { repartition: RepartitionVotesDto }, index: number): number {
    const max = Math.max(
      tour.repartition[1],
      tour.repartition[2],
      tour.repartition[3],
      tour.repartition[4],
    );
    return max === 0 ? 0 : this.compteOption(tour, index) / max;
  }

  private gererChangementQuestionCourante(): void {
    const courante = this.progression().find((entree) => entree.statut === 'COURANTE');
    const id = courante?.questionId ?? null;
    if (id === this.questionCouranteSuivieId) {
      return;
    }
    this.questionCouranteSuivieId = id;
    this.railAjusteManuellement = false;
    if (id) {
      requestAnimationFrame(() => this.repositionnerRailSiBesoin(id));
    }
  }

  /** Garde la ligne de la Question courante dans les deux tiers hauts du rail, recalculé une
   * seule fois par changement de Question courante — jamais si `railAjusteManuellement` (le
   * coach a scrollé le rail depuis). */
  private repositionnerRailSiBesoin(questionId: string): void {
    if (this.railAjusteManuellement) {
      return;
    }
    const rail = this.railRef()?.nativeElement;
    const index = this.progression().findIndex((entree) => entree.questionId === questionId);
    const ligne = index >= 0 ? this.lignesRailRef()[index]?.nativeElement : undefined;
    if (!rail || !ligne) {
      return;
    }

    const limiteDeuxTiers = rail.clientHeight * (2 / 3);
    const rectRail = rail.getBoundingClientRect();
    const rectLigne = ligne.getBoundingClientRect();
    const haut = rectLigne.top - rectRail.top;
    const bas = rectLigne.bottom - rectRail.top;

    let delta = 0;
    if (bas > limiteDeuxTiers) {
      delta = bas - limiteDeuxTiers;
    } else if (haut < 0) {
      delta = haut;
    }
    if (delta === 0) {
      return;
    }

    this.railAjustementProgrammatique = true;
    rail.scrollTo({
      top: rail.scrollTop + delta,
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
    this.planifierFinAjustementRail(rail);
  }

  private planifierFinAjustementRail(rail: HTMLElement): void {
    const finir = (): void => {
      this.railAjustementProgrammatique = false;
      rail.removeEventListener('scrollend', finir);
      clearTimeout(delai);
    };
    rail.addEventListener('scrollend', finir, { once: true });
    const delai = setTimeout(finir, 500);
  }

  private appliquer(pilotage: PilotageSessionDto): void {
    this.statut.set(pilotage.statut);
    this.code.set(pilotage.code);
    this.nbDevicesConnectes.set(pilotage.nbDevicesConnectes);
    this.questionCourante.set(pilotage.questionCourante);
    this.tourOuvert.set(pilotage.tourOuvert);
    this.dernierTourClos.set(pilotage.dernierTourClos);
    this.historique.set(pilotage.historique ?? []);
    this.progression.set(pilotage.progression ?? []);
  }
}
