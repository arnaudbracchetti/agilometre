import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { StatutSession, SyntheseThemeDto } from '@agilometre/shared';
import { Chargement } from '../../shared/chargement/chargement';
import { ErrorMessage } from '../../shared/error-message/error-message';
import { SyntheseThemes } from '../../shared/synthese-themes/synthese-themes';
import { SessionsService } from '../sessions.service';
import { ADroit } from '../../auth/droits.directive';
import { GlossaireSynthese } from './glossaire-synthese';

/**
 * Écran de synthèse (cartes F3 #45, G1 #46, lecture par Thème #52) : un seul appel réseau
 * (`GET .../synthese`, qui porte désormais le contexte de la Session en plus des Thèmes — voir
 * `ContexteSyntheseSession` côté backend), et le bouton de clôture finale (« Terminer la
 * séance »). Le Palier par Thème triés par proximité de franchissement avec drill-down par
 * Question vit dans `SyntheseThemes`, partagé avec le Profil d'Équipe.
 *
 * L'ancien appel à `/pilotage` et la liste Traitée/Sautée qu'il alimentait ont été retirés (voir
 * critique #shiny-metcalfe) : le pilotage montre déjà ce détail, et la liste dupliquait 68% de la
 * hauteur de cet écran pour l'information la moins utile qu'il portait.
 */
@Component({
  selector: 'app-synthese-page',
  imports: [
    DatePipe,
    RouterLink,
    NzButtonModule,
    NzIconModule,
    NzModalModule,
    NzPopconfirmModule,
    ADroit,
    Chargement,
    ErrorMessage,
    SyntheseThemes,
  ],
  templateUrl: './synthese-page.html',
  styleUrl: './synthese-page.scss',
})
export class SynthesePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly sessionsService = inject(SessionsService);
  private readonly message = inject(NzMessageService);
  private readonly modal = inject(NzModalService);

  protected readonly sessionId = signal<string | null>(null);
  protected readonly equipeNom = signal('');
  protected readonly date = signal<string | null>(null);
  protected readonly statut = signal<StatutSession | null>(null);
  protected readonly seuilPalier = signal(0);
  protected readonly themes = signal<SyntheseThemeDto[]>([]);
  protected readonly palierGlobal = signal<1 | 2 | 3 | 4 | null>(null);
  protected readonly tauxApprocheGlobal = signal<number | null>(null);
  protected readonly margeAvantDescenteGlobal = signal<number | null>(null);

  protected readonly seuilPalierPourcent = computed(() => Math.round(this.seuilPalier() * 100));

  protected readonly chargementEnCours = signal(true);
  protected readonly inaccessible = signal(false);
  protected readonly terminerEnCours = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      return;
    }
    this.sessionId.set(id);

    this.sessionsService.obtenirSynthese(id).subscribe({
      next: (synthese) => {
        this.equipeNom.set(synthese.equipeNom);
        this.date.set(synthese.date);
        this.statut.set(synthese.statut);
        this.seuilPalier.set(synthese.seuilPalier);
        this.themes.set(synthese.themes);
        this.palierGlobal.set(synthese.palierGlobal);
        this.tauxApprocheGlobal.set(synthese.tauxApprocheGlobal);
        this.margeAvantDescenteGlobal.set(synthese.margeAvantDescenteGlobal);
        this.chargementEnCours.set(false);
      },
      error: () => {
        this.inaccessible.set(true);
        this.chargementEnCours.set(false);
      },
    });
  }

  protected ouvrirGlossaire(): void {
    this.modal.create({
      nzTitle: 'Comprendre les résultats',
      nzContent: GlossaireSynthese,
      nzData: { seuilPalierPourcent: this.seuilPalierPourcent() },
      nzFooter: null,
    });
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
