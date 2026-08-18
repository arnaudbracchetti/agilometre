import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { sonder } from '../../shared/sondage-2s';
import { ProjectionService } from '../projection.service';

/**
 * Écran de projection — public, sans compte, sondage 2s. Contenu réduit à la salle d'attente pour
 * ce ticket (#35) : Discussion/Vote/Clôture (#38 et suivants) enrichiront ce même écran.
 */
@Component({
  selector: 'app-projection-page',
  imports: [],
  templateUrl: './projection-page.html',
  styleUrl: './projection-page.scss',
})
export class ProjectionPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly projectionService = inject(ProjectionService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly code = signal<string | null>(null);
  protected readonly nbDevicesConnectes = signal(0);
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
      this.chargementEnCours.set(false);
    });
  }
}
