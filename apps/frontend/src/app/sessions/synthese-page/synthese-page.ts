import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import {
  PilotageSessionDto,
  ProgressionQuestionDto,
  StatutQuestionProgressionDto,
} from '@agilometre/shared';
import { ErrorMessage } from '../../shared/error-message/error-message';
import { libelleStatutProgression } from '../../shared/libelle-statut-progression';
import { SessionsService } from '../sessions.service';

/**
 * Écran de synthèse (cartes F3 #45 + G1 #46) : liste Traitée/Sautée sans détail par thème (hors
 * périmètre, cf. #46), et porte le bouton de clôture finale (« Terminer la séance ») depuis lequel
 * le Coach fait passer la Session à CLOTUREE.
 */
@Component({
  selector: 'app-synthese-page',
  imports: [RouterLink, NzButtonModule, NzPopconfirmModule, ErrorMessage],
  templateUrl: './synthese-page.html',
  styleUrl: './synthese-page.scss',
})
export class SynthesePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sessionsService = inject(SessionsService);
  private readonly message = inject(NzMessageService);

  protected readonly sessionId = signal<string | null>(null);
  protected readonly statut = signal<PilotageSessionDto['statut'] | null>(null);
  protected readonly progression = signal<ProgressionQuestionDto[]>([]);
  protected readonly chargementEnCours = signal(true);
  protected readonly inaccessible = signal(false);
  protected readonly terminerEnCours = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      return;
    }
    this.sessionId.set(id);

    this.sessionsService.obtenirPilotage(id).subscribe({
      next: (pilotage) => {
        this.statut.set(pilotage.statut);
        // Traitée/Sautée seulement — une visite avant que tout ne soit résolu (onglet resté
        // ouvert, retour arrière) ne doit pas montrer une Question encore À venir/Courante ici,
        // hors du périmètre annoncé de cet écran.
        this.progression.set(
          (pilotage.progression ?? []).filter(
            (p) => p.statut === 'TRAITEE' || p.statut === 'SAUTEE',
          ),
        );
        this.chargementEnCours.set(false);
      },
      error: () => {
        this.inaccessible.set(true);
        this.chargementEnCours.set(false);
      },
    });
  }

  protected libelleStatut(statut: StatutQuestionProgressionDto): string {
    return libelleStatutProgression(statut);
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
