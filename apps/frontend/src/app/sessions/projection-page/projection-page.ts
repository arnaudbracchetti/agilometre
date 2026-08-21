import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  QuestionCouranteDto,
  TourClosDto,
  TourOuvertDto,
} from '@agilometre/shared';
import { LETTRES_OPTIONS } from '../../shared/lettres-options';
import { sonder } from '../../shared/sondage-2s';
import { StickyNote } from '../../shared/sticky-note/sticky-note';
import { ProjectionService } from '../projection.service';

/** Écran de projection — public, sans compte, sondage 2s (doc/spec/annexes/deroulement-session-animee.md). */
@Component({
  selector: 'app-projection-page',
  imports: [StickyNote],
  templateUrl: './projection-page.html',
  styleUrl: './projection-page.scss',
})
export class ProjectionPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly projectionService = inject(ProjectionService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly lettres = LETTRES_OPTIONS;
  protected readonly code = signal<string | null>(null);
  protected readonly nbDevicesConnectes = signal(0);
  protected readonly questionCourante = signal<QuestionCouranteDto | null>(null);
  protected readonly tourOuvert = signal<TourOuvertDto | null>(null);
  protected readonly dernierTourClos = signal<TourClosDto | null>(null);
  protected readonly inaccessible = signal(false);
  protected readonly chargementEnCours = signal(true);
  /** URL à saisir par un participant pour rejoindre (doc "Écran de projection", état salle d'attente). */
  protected readonly urlDeJointure = signal(
    typeof window !== 'undefined' ? `${window.location.origin}/vote` : '',
  );

  ngOnInit(): void {
    const sessionId = this.route.snapshot.paramMap.get('sessionId');
    if (!sessionId) {
      this.inaccessible.set(true);
      this.chargementEnCours.set(false);
      return;
    }

    sonder(
      () => this.projectionService.obtenir(sessionId),
      () => {
        this.inaccessible.set(true);
        this.chargementEnCours.set(false);
      },
      this.destroyRef,
    ).subscribe((projection) => {
      this.code.set(projection.code);
      this.nbDevicesConnectes.set(projection.nbDevicesConnectes);
      this.questionCourante.set(projection.questionCourante);
      this.tourOuvert.set(projection.tourOuvert);
      this.dernierTourClos.set(projection.dernierTourClos);
      this.chargementEnCours.set(false);
    });
  }

  /** Le compte de l'Option à `index` se lit via son Niveau (index + 1, invariant monotone). */
  protected compteOption(index: number): number {
    const repartition = this.dernierTourClos()?.repartition;
    return repartition ? repartition[(index + 1) as 1 | 2 | 3 | 4] : 0;
  }

  /** Largeur de barre relative au plus haut compte, pour que l'écart entre Options se voie. */
  protected pourcentageOption(index: number): number {
    const repartition = this.dernierTourClos()?.repartition;
    if (!repartition) {
      return 0;
    }
    const max = Math.max(
      repartition[1],
      repartition[2],
      repartition[3],
      repartition[4],
    );
    return max === 0 ? 0 : (this.compteOption(index) / max) * 100;
  }

  /** scaleX() plutôt que width : anime transform (composited), jamais une propriété de layout. */
  protected fractionOption(index: number): number {
    return this.pourcentageOption(index) / 100;
  }
}
