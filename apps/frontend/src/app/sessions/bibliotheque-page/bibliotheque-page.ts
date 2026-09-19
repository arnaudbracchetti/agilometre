import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzTableModule, NzTableSortFn } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { LigneListeSessionDto } from '@agilometre/shared';
import { SessionsService } from '../sessions.service';
import { CreerPage } from '../creer-page/creer-page';

@Component({
  selector: 'app-bibliotheque-page',
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    NzButtonModule,
    NzIconModule,
    NzInputModule,
    NzModalModule,
    NzPopconfirmModule,
    NzTableModule,
    NzTagModule,
    NzTooltipModule,
  ],
  templateUrl: './bibliotheque-page.html',
  styleUrl: './bibliotheque-page.scss',
})
export class BibliothequePage implements OnInit {
  private readonly sessionsService = inject(SessionsService);
  private readonly message = inject(NzMessageService);
  private readonly router = inject(Router);
  private readonly modal = inject(NzModalService);

  protected readonly lignes = signal<LigneListeSessionDto[]>([]);
  protected readonly chargementEnCours = signal(false);
  protected readonly filtre = signal('');

  /** Recherche côté client, sur les deux colonnes texte libre (Équipe, Modèle utilisé). */
  protected readonly lignesFiltrees = computed<LigneListeSessionDto[]>(() => {
    const terme = this.filtre().trim().toLowerCase();
    if (terme.length === 0) {
      return this.lignes();
    }
    return this.lignes().filter(
      (ligne) =>
        ligne.equipeNom.toLowerCase().includes(terme) ||
        (ligne.modeleCollecteNom ?? '').toLowerCase().includes(terme),
    );
  });

  protected readonly trierParEquipe: NzTableSortFn<LigneListeSessionDto> = (a, b) =>
    a.equipeNom.localeCompare(b.equipeNom);

  protected readonly trierParDate: NzTableSortFn<LigneListeSessionDto> = (a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime();

  protected readonly trierParNbQuestions: NzTableSortFn<LigneListeSessionDto> = (a, b) =>
    a.nbQuestions - b.nbQuestions;

  protected readonly trierParModele: NzTableSortFn<LigneListeSessionDto> = (a, b) =>
    (a.modeleCollecteNom ?? '').localeCompare(b.modeleCollecteNom ?? '');

  ngOnInit(): void {
    this.rafraichir();
  }

  private rafraichir(): void {
    this.chargementEnCours.set(true);
    this.sessionsService.lister().subscribe({
      next: (lignes) => {
        this.lignes.set(lignes);
        this.chargementEnCours.set(false);
      },
      error: () => {
        this.chargementEnCours.set(false);
        this.message.error('Impossible de charger la liste des Sessions.');
      },
    });
  }

  /** Modal plutôt que page routée (`/sessions/nouvelle` retirée) : reste au-dessus de la liste. */
  protected ouvrirCreation(): void {
    this.modal.create({
      nzTitle: 'Créer une session',
      nzContent: CreerPage,
      nzFooter: null,
      nzWidth: 760,
    });
  }

  protected voirDetail(id: string): void {
    this.router.navigate(['/sessions', id]);
  }

  /** Même action que le bouton « Ouvrir la séance » de l'écran de détail (ajustement-page). */
  protected lancer(id: string): void {
    this.sessionsService.ouvrir(id).subscribe({
      next: () => this.router.navigate(['/sessions', id, 'pilotage']),
      error: () => this.message.error('Cette Session ne peut plus être ouverte.'),
    });
  }

  /** Même garde que Session.estModifiable() côté domaine (docs/design/agregat-session.md). */
  protected estSupprimable(ligne: LigneListeSessionDto): boolean {
    return !ligne.verrouillee && ligne.statut !== 'CLOTUREE';
  }

  protected supprimer(id: string): void {
    this.sessionsService.supprimer(id).subscribe({
      next: () => {
        this.rafraichir();
        this.message.success('Session supprimée.');
      },
      error: () => {
        this.message.error('Impossible de supprimer cette Session.');
      },
    });
  }
}
