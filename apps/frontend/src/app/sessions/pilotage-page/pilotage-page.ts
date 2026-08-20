import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { PilotageSessionDto, QuestionCouranteDto, TourOuvertDto } from '@agilometre/shared';
import { LETTRES_OPTIONS } from '../../shared/lettres-options';
import { sonder } from '../../shared/sondage-2s';
import { StickyNote } from '../../shared/sticky-note/sticky-note';
import { ErrorMessage } from '../../shared/error-message/error-message';
import { SessionsService } from '../sessions.service';

/** Écran de pilotage (Coach) — sondage 2s (doc/spec/annexes/deroulement-session-animee.md). */
@Component({
  selector: 'app-pilotage-page',
  imports: [NzButtonModule, StickyNote, ErrorMessage],
  templateUrl: './pilotage-page.html',
  styleUrl: './pilotage-page.scss',
})
export class PilotagePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
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
  protected readonly inaccessible = signal(false);
  protected readonly chargementEnCours = signal(true);
  protected readonly avancerEnCours = signal(false);
  protected readonly tourEnCours = signal(false);

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

  private appliquer(pilotage: PilotageSessionDto): void {
    this.statut.set(pilotage.statut);
    this.code.set(pilotage.code);
    this.nbDevicesConnectes.set(pilotage.nbDevicesConnectes);
    this.questionCourante.set(pilotage.questionCourante);
    this.tourOuvert.set(pilotage.tourOuvert);
  }
}
