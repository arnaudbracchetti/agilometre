import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApexAxisChartSeries, ApexChart, ApexMarkers, ApexTooltip, ApexXAxis, ApexYAxis, NgApexchartsModule } from 'ng-apexcharts';
import type ApexCharts from 'apexcharts';
import type { ApexChartEventOpts, ApexFormatterOpts } from 'apexcharts';
import { SyntheseThemeDto } from '@agilometre/shared';
import { Chargement } from '../../shared/chargement/chargement';
import { ErrorMessage } from '../../shared/error-message/error-message';
import { PalierTheme } from '../../shared/palier-theme/palier-theme';
import { OrganisationService } from '../organisation.service';

/**
 * Écran Profil par Thème d'une Équipe (radar, carte #53) : un axe par Thème actif du Référentiel
 * sur la Période de calcul en cours, portant son Palier ou "Non évalué" s'il n'a reçu aucune
 * Réponse sur la Période (ADR-0015 : archivés déjà exclus côté backend).
 */
@Component({
  selector: 'app-profil-page',
  imports: [DatePipe, RouterLink, NgApexchartsModule, Chargement, ErrorMessage, PalierTheme],
  templateUrl: './profil-page.html',
  styleUrl: './profil-page.scss',
})
export class ProfilPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly organisationService = inject(OrganisationService);

  protected readonly equipeId = signal<string | null>(null);
  protected readonly chargementEnCours = signal(true);
  protected readonly inaccessible = signal(false);
  protected readonly periodeDebut = signal<string | null>(null);
  protected readonly periodeFin = signal<string | null>(null);
  protected readonly themes = signal<SyntheseThemeDto[]>([]);

  protected readonly totalQuestionsRepondues = computed(() =>
    this.themes().reduce((somme, theme) => somme + theme.questions.length, 0),
  );
  protected readonly totalReponses = computed(() =>
    this.themes().reduce((somme, theme) => somme + theme.effectif, 0),
  );

  protected readonly radarSeries = computed<ApexAxisChartSeries>(() => [
    { name: 'Palier', data: this.themes().map((theme) => theme.palier ?? 0) },
  ]);
  protected readonly radarXaxis = computed<ApexXAxis>(() => ({
    categories: this.themes().map((theme) => theme.libelle),
  }));
  /** Taille fixe plutôt que "100%" : apx-chart mesure son conteneur au montage, qui peut ne pas
   * encore avoir de largeur stable juste après le basculement hors de l'état de chargement. */
  protected readonly radarChart: ApexChart = {
    type: 'radar',
    height: 500,
    width: 500,
    events: {
      dataPointSelection: (_event: MouseEvent, _chart?: ApexCharts, options?: ApexChartEventOpts) => {
        if (options) {
          this.onPointSelectionne(options.dataPointIndex);
        }
      },
    },
  };
  /** Échelle fixe 0-4 (jamais dérivée des Paliers affichés) : positionne toujours l'Équipe par
   * rapport au maximum possible, pas seulement par rapport à ses propres valeurs du moment. */
  protected readonly radarYaxis: ApexYAxis = { min: 0, max: 4, tickAmount: 4 };
  protected readonly radarColors: string[];
  protected readonly radarTooltip: ApexTooltip;
  /** Points "non évalué" (Palier null, valeur 0 sur le radar) distingués visuellement d'un vrai Palier 1-4. */
  protected readonly radarMarkers = computed<ApexMarkers>(() => ({
    discrete: this.themes()
      .map((theme, dataPointIndex) => ({ theme, dataPointIndex }))
      .filter(({ theme }) => theme.palier === null)
      .map(({ dataPointIndex }) => ({
        seriesIndex: 0,
        dataPointIndex,
        fillColor: this.couleurNonEvalue,
        strokeColor: this.couleurNonEvalue,
        size: 5,
      })),
  }));

  private readonly couleurNonEvalue: string;

  constructor() {
    const style = getComputedStyle(document.documentElement);
    this.radarColors = [style.getPropertyValue('--color-primary').trim()];
    this.couleurNonEvalue = style.getPropertyValue('--color-ink-muted').trim();
    this.radarTooltip = {
      y: {
        formatter: (valeur: number, opts?: ApexFormatterOpts) => {
          const theme =
            opts !== undefined ? this.themes()[opts.dataPointIndex] : undefined;
          return theme && theme.palier === null ? 'Non évalué' : `Palier ${valeur}`;
        },
      },
    };
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      return;
    }
    this.equipeId.set(id);

    this.organisationService.obtenirProfil(id).subscribe({
      next: (profil) => {
        this.periodeDebut.set(profil.periodeDebut);
        this.periodeFin.set(profil.periodeFin);
        this.themes.set(profil.themes);
        this.chargementEnCours.set(false);
      },
      error: () => {
        this.inaccessible.set(true);
        this.chargementEnCours.set(false);
      },
    });
  }

  /** Clic sur un axe du radar : ouvre la Lecture fine du Thème correspondant. */
  protected onPointSelectionne(dataPointIndex: number): void {
    const theme = this.themes()[dataPointIndex];
    const id = this.equipeId();
    if (!theme || !id) {
      return;
    }
    this.router.navigate(['/organisation/equipes', id, 'profil', theme.themeId]);
  }
}
