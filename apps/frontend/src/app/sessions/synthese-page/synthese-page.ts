import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzCollapseModule } from 'ng-zorro-antd/collapse';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import {
  CranConsensusDto,
  PilotageSessionDto,
  ProgressionQuestionDto,
  StatutQuestionProgressionDto,
  SyntheseThemeDto,
} from '@agilometre/shared';
import { ErrorMessage } from '../../shared/error-message/error-message';
import { libelleStatutProgression } from '../../shared/libelle-statut-progression';
import { SessionsService } from '../sessions.service';

const LIBELLE_CONSENSUS: Record<CranConsensusDto, string> = {
  FORT: 'Consensus fort',
  MODERE: 'Consensus modéré',
  FAIBLE: 'Consensus faible',
};

/**
 * Écran de synthèse (cartes F3 #45, G1 #46, lecture par Thème #52) : Palier par Thème traité avec
 * drill-down par Question (Moyenne, cran de consensus, répartition par Niveau), liste
 * Traitée/Sautée, et porte le bouton de clôture finale (« Terminer la séance »).
 */
@Component({
  selector: 'app-synthese-page',
  imports: [RouterLink, NzButtonModule, NzCollapseModule, NzPopconfirmModule, ErrorMessage],
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
  protected readonly themes = signal<SyntheseThemeDto[]>([]);
  protected readonly chargementEnCours = signal(true);
  protected readonly inaccessible = signal(false);
  protected readonly terminerEnCours = signal(false);
  protected readonly niveaux = [1, 2, 3, 4] as const;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      return;
    }
    this.sessionId.set(id);

    forkJoin({
      pilotage: this.sessionsService.obtenirPilotage(id),
      synthese: this.sessionsService.obtenirSynthese(id),
    }).subscribe({
      next: ({ pilotage, synthese }) => {
        this.statut.set(pilotage.statut);
        // Traitée/Sautée seulement — une visite avant que tout ne soit résolu (onglet resté
        // ouvert, retour arrière) ne doit pas montrer une Question encore À venir/Courante ici,
        // hors du périmètre annoncé de cet écran.
        this.progression.set(
          (pilotage.progression ?? []).filter(
            (p) => p.statut === 'TRAITEE' || p.statut === 'SAUTEE',
          ),
        );
        this.themes.set(synthese.themes);
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

  protected libelleConsensus(consensus: CranConsensusDto | null): string {
    return consensus ? LIBELLE_CONSENSUS[consensus] : '';
  }

  /** % arrondi d'un Niveau dans la répartition d'une Question — 0 sur un effectif nul. */
  protected pourcentage(compte: number, effectif: number): number {
    return effectif === 0 ? 0 : Math.round((compte / effectif) * 100);
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
