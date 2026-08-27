import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { StatutSession, SyntheseThemeDto } from '@agilometre/shared';
import { Chargement } from '../../shared/chargement/chargement';
import { CranConsensus } from '../../shared/cran-consensus/cran-consensus';
import { ErrorMessage } from '../../shared/error-message/error-message';
import { MoyenneGraduee } from '../../shared/moyenne-graduee/moyenne-graduee';
import { PalierTheme } from '../../shared/palier-theme/palier-theme';
import { RepartitionNiveaux } from '../../shared/repartition-niveaux/repartition-niveaux';
import { couleurCategorielle, couleurCategorielleFond } from '../../shared/couleur-categorielle';
import { SessionsService } from '../sessions.service';
import { GlossaireSynthese } from './glossaire-synthese';

/** Rang de tri d'un Thème : proche du franchissement d'abord, Palier déjà maximal ensuite, sans donnée en dernier. */
function rangTri(theme: SyntheseThemeDto): 0 | 1 | 2 {
  if (theme.palier === null) {
    return 2;
  }
  if (theme.tauxApproche === null) {
    return 1;
  }
  return 0;
}

/**
 * Écran de synthèse (cartes F3 #45, G1 #46, lecture par Thème #52) : un seul appel réseau
 * (`GET .../synthese`, qui porte désormais le contexte de la Session en plus des Thèmes — voir
 * `ContexteSyntheseSession` côté backend), Palier par Thème triés par proximité de franchissement
 * avec drill-down par Question (Moyenne, cran de consensus, répartition par Niveau), et le bouton
 * de clôture finale (« Terminer la séance »).
 *
 * L'ancien appel à `/pilotage` et la liste Traitée/Sautée qu'il alimentait ont été retirés (voir
 * critique #shiny-metcalfe) : le pilotage montre déjà ce détail, et la liste dupliquait 68% de la
 * hauteur de cet écran pour l'information la moins utile qu'il portait.
 */
@Component({
  selector: 'app-synthese-page',
  imports: [
    DatePipe,
    RouterLink,
    NzButtonModule,
    NzCollapseModule,
    NzIconModule,
    NzModalModule,
    NzPopconfirmModule,
    Chargement,
    CranConsensus,
    ErrorMessage,
    MoyenneGraduee,
    PalierTheme,
    RepartitionNiveaux,
  ],
  templateUrl: './synthese-page.html',
  styleUrl: './synthese-page.scss',
})
export class SynthesePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sessionsService = inject(SessionsService);
  private readonly message = inject(NzMessageService);
  private readonly modal = inject(NzModalService);

  protected readonly sessionId = signal<string | null>(null);
  protected readonly equipeNom = signal('');
  protected readonly date = signal<string | null>(null);
  protected readonly statut = signal<StatutSession | null>(null);
  protected readonly seuilPalier = signal(0);
  protected readonly themes = signal<SyntheseThemeDto[]>([]);
  protected readonly palierGlobal = signal<1 | 2 | 3 | 4 | null>(null);
  protected readonly tauxApprocheGlobal = signal<number | null>(null);
  protected readonly margeAvantDescenteGlobal = signal<number | null>(null);

  protected readonly seuilPalierPourcent = computed(() => Math.round(this.seuilPalier() * 100));

  protected readonly themesTries = computed(() =>
    [...this.themes()].sort((a, b) => {
      const rangA = rangTri(a);
      const rangB = rangTri(b);
      if (rangA !== rangB) {
        return rangA - rangB;
      }
      // Au sein du rang 0 (tauxApproche connu) : proche du franchissement d'abord.
      return (b.tauxApproche ?? 0) - (a.tauxApproche ?? 0);
    }),
  );

  protected readonly totalQuestionsRepondues = computed(() =>
    this.themes().reduce((somme, theme) => somme + theme.questions.length, 0),
  );
  protected readonly totalReponses = computed(() =>
    this.themes().reduce((somme, theme) => somme + theme.effectif, 0),
  );
  protected readonly chargementEnCours = signal(true);
  protected readonly inaccessible = signal(false);
  protected readonly terminerEnCours = signal(false);

  /** Thèmes dont le contenu (Questions ou message vide) est déplié — vide par défaut : l'écran
   * s'ouvre replié sur la seule ligne de Palier par Thème (vue d'ensemble), et le coach déplie
   * un Thème pour en voir le drill-down par Question. */
  private readonly themesOuverts = signal<ReadonlySet<string>>(new Set());

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      return;
    }
    this.sessionId.set(id);

    this.sessionsService.obtenirSynthese(id).subscribe({
      next: (synthese) => {
        this.equipeNom.set(synthese.equipeNom);
        this.date.set(synthese.date);
        this.statut.set(synthese.statut);
        this.seuilPalier.set(synthese.seuilPalier);
        this.themes.set(synthese.themes);
        this.palierGlobal.set(synthese.palierGlobal);
        this.tauxApprocheGlobal.set(synthese.tauxApprocheGlobal);
        this.margeAvantDescenteGlobal.set(synthese.margeAvantDescenteGlobal);
        this.chargementEnCours.set(false);
      },
      error: () => {
        this.inaccessible.set(true);
        this.chargementEnCours.set(false);
      },
    });
  }

  protected ouvrirGlossaire(): void {
    this.modal.create({
      nzTitle: 'Comprendre les résultats',
      nzContent: GlossaireSynthese,
      nzData: { seuilPalierPourcent: this.seuilPalierPourcent() },
      nzFooter: null,
    });
  }

  /** Couleur catégorielle d'un Thème (même repère que le composeur de session — DESIGN.md). */
  protected couleurTheme(position: number): string {
    return couleurCategorielle(position);
  }

  /** Variante fond pâle de `couleurTheme`, pour l'en-tête de carte de Thème. */
  protected couleurThemeFond(position: number): string {
    return couleurCategorielleFond(position);
  }

  protected estOuvert(themeId: string): boolean {
    return this.themesOuverts().has(themeId);
  }

  protected toggleTheme(themeId: string): void {
    const ouverts = new Set(this.themesOuverts());
    if (ouverts.has(themeId)) {
      ouverts.delete(themeId);
    } else {
      ouverts.add(themeId);
    }
    this.themesOuverts.set(ouverts);
  }

  /** Accord simple (ajout d'un -s) pour les compteurs de Questions/Réponses. */
  protected pluriel(compte: number, singulier: string): string {
    return compte > 1 ? `${singulier}s` : singulier;
  }

  protected terminerSeance(): void {
    const id = this.sessionId();
    if (!id) {
      return;
    }
    this.terminerEnCours.set(true);
    this.sessionsService
      .terminerSession(id)
      .pipe(finalize(() => this.terminerEnCours.set(false)))
      .subscribe({
        next: () => this.router.navigate(['/sessions', id, 'pilotage']),
        error: () => this.message.error('Impossible de terminer la séance.'),
      });
  }
}
