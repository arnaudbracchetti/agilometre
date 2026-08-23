import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { CranConsensusDto, SyntheseThemeDto } from '@agilometre/shared';
import { ErrorMessage } from '../../shared/error-message/error-message';
import { LibelleConsensus } from '../../shared/libelle-consensus';
import { PourcentageRepartition } from '../../shared/pourcentage-repartition';
import { OrganisationService } from '../organisation.service';
import { CritereTriLectureFine, TrierQuestionsLectureFine } from './trier-questions-lecture-fine';

/**
 * Écran de Lecture fine : drill-down par Question — Moyenne, cran de consensus et répartition en
 * % par Niveau — sur la Portée périodique d'un Thème pour une Équipe, atteint depuis un axe du
 * radar Profil. Triable par score croissant ou dispersion décroissante.
 */
@Component({
  selector: 'app-lecture-fine-page',
  imports: [RouterLink, NzButtonModule, NzCollapseModule, ErrorMessage],
  templateUrl: './lecture-fine-page.html',
  styleUrl: './lecture-fine-page.scss',
})
export class LectureFinePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly organisationService = inject(OrganisationService);

  protected readonly equipeId = signal<string | null>(null);
  protected readonly chargementEnCours = signal(true);
  protected readonly inaccessible = signal(false);
  protected readonly themeIntrouvable = signal(false);
  protected readonly theme = signal<SyntheseThemeDto | null>(null);
  protected readonly tri = signal<CritereTriLectureFine>('moyenne');
  protected readonly niveaux = [1, 2, 3, 4] as const;

  protected readonly questionsTriees = computed(() => {
    const theme = this.theme();
    return theme ? TrierQuestionsLectureFine.executer(theme.questions, this.tri()) : [];
  });

  ngOnInit(): void {
    const equipeId = this.route.snapshot.paramMap.get('id');
    const themeId = this.route.snapshot.paramMap.get('themeId');
    if (!equipeId || !themeId) {
      return;
    }
    this.equipeId.set(equipeId);

    this.organisationService.obtenirProfil(equipeId).subscribe({
      next: (profil) => {
        const theme = profil.themes.find((t) => t.themeId === themeId) ?? null;
        this.theme.set(theme);
        this.themeIntrouvable.set(theme === null);
        this.chargementEnCours.set(false);
      },
      error: () => {
        this.inaccessible.set(true);
        this.chargementEnCours.set(false);
      },
    });
  }

  protected libelleConsensus(consensus: CranConsensusDto | null): string {
    return LibelleConsensus.pour(consensus);
  }

  protected pourcentage(compte: number, effectif: number): number {
    return PourcentageRepartition.executer(compte, effectif);
  }
}
