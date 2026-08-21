import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { ProgressionQuestionDto, StatutQuestionProgressionDto } from '@agilometre/shared';
import { ErrorMessage } from '../../shared/error-message/error-message';
import { libelleStatutProgression } from '../../shared/libelle-statut-progression';
import { SessionsService } from '../sessions.service';

/**
 * Écran de synthèse (carte F3, #45) — stub minimal : liste Traitée/Sautée sans détail par thème,
 * juste assez pour que « Terminer la séance prématurément » ait une vraie destination. Le
 * contenu par thème et le bouton de clôture finale (CLOTUREE) relèvent de la carte G1 (#46), qui
 * enrichira cet écran plutôt que de le remplacer.
 */
@Component({
  selector: 'app-synthese-page',
  imports: [RouterLink, NzButtonModule, ErrorMessage],
  templateUrl: './synthese-page.html',
  styleUrl: './synthese-page.scss',
})
export class SynthesePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly sessionsService = inject(SessionsService);

  protected readonly sessionId = signal<string | null>(null);
  protected readonly progression = signal<ProgressionQuestionDto[]>([]);
  protected readonly chargementEnCours = signal(true);
  protected readonly inaccessible = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      return;
    }
    this.sessionId.set(id);

    this.sessionsService.obtenirPilotage(id).subscribe({
      next: (pilotage) => {
        // Stub minimal (carte F3) : Traitée/Sautée seulement — une visite avant que tout ne
        // soit résolu (onglet resté ouvert, retour arrière) ne doit pas montrer une Question
        // encore À venir/Courante ici, hors du périmètre annoncé de cet écran.
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
}
