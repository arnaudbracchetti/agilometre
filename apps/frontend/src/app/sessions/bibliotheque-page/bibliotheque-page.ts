import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { LigneListeSessionDto } from '@agilometre/shared';
import { SessionsService } from '../sessions.service';

@Component({
  selector: 'app-bibliotheque-page',
  imports: [DatePipe, RouterLink, NzButtonModule, NzTableModule, NzTagModule],
  templateUrl: './bibliotheque-page.html',
  styleUrl: './bibliotheque-page.scss',
})
export class BibliothequePage implements OnInit {
  private readonly sessionsService = inject(SessionsService);
  private readonly message = inject(NzMessageService);
  private readonly router = inject(Router);

  protected readonly lignes = signal<LigneListeSessionDto[]>([]);
  protected readonly chargementEnCours = signal(false);

  ngOnInit(): void {
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

  protected ouvrir(id: string): void {
    this.router.navigate(['/sessions', id]);
  }
}
