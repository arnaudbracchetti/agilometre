import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { PilotageSessionDto } from '@agilometre/shared';
import { sonder } from '../../shared/sondage-2s';
import { SessionsService } from '../sessions.service';

/**
 * Écran de pilotage (Coach) — sondage 2s, contenu réduit à la salle d'attente pour ce ticket
 * (#35) : le déroulé des Questions (#38 et suivants) enrichira ce même écran, jamais un autre.
 */
@Component({
  selector: 'app-pilotage-page',
  imports: [NzButtonModule],
  templateUrl: './pilotage-page.html',
  styleUrl: './pilotage-page.scss',
})
export class PilotagePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly sessionsService = inject(SessionsService);
  private readonly message = inject(NzMessageService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly sessionId = signal<string | null>(null);
  protected readonly statut = signal<PilotageSessionDto['statut'] | null>(null);
  protected readonly code = signal<string | null>(null);
  protected readonly nbDevicesConnectes = signal(0);
  protected readonly inaccessible = signal(false);
  protected readonly chargementEnCours = signal(true);

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
      this.statut.set(pilotage.statut);
      this.code.set(pilotage.code);
      this.nbDevicesConnectes.set(pilotage.nbDevicesConnectes);
      this.chargementEnCours.set(false);
    });
  }

  protected urlProjection(): string {
    const id = this.sessionId();
    return id ? `/projection/${id}` : '';
  }
}
