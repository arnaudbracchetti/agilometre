import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { QuestionCouranteDto } from '@agilometre/shared';
import { LETTRES_OPTIONS } from '../../shared/lettres-options';
import { sonder } from '../../shared/sondage-2s';
import { StickyNote } from '../../shared/sticky-note/sticky-note';
import { ErrorMessage } from '../../shared/error-message/error-message';
import { ProjectionService } from '../projection.service';

/** Écran de projection — public, sans compte, sondage 2s (doc/spec/annexes/deroulement-session-animee.md). */
@Component({
  selector: 'app-projection-page',
  imports: [StickyNote, ErrorMessage],
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
      this.chargementEnCours.set(false);
    });
  }
}
