import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { LigneBibliothequeModeleSessionDto } from '@agilometre/shared';
import { ModelesSessionService } from '../modeles-session.service';

const NOM_MODELE_PAR_DEFAUT = 'nouveau modèle';

@Component({
  selector: 'app-bibliotheque-page',
  imports: [
    DatePipe,
    RouterLink,
    NzButtonModule,
    NzIconModule,
    NzPopconfirmModule,
    NzTableModule,
    NzTagModule,
    NzTooltipModule,
  ],
  templateUrl: './bibliotheque-page.html',
  styleUrl: './bibliotheque-page.scss',
})
export class BibliothequePage implements OnInit {
  private readonly modelesSessionService = inject(ModelesSessionService);
  private readonly message = inject(NzMessageService);
  private readonly router = inject(Router);

  protected readonly lignes = signal<LigneBibliothequeModeleSessionDto[]>([]);
  protected readonly chargementEnCours = signal(false);
  protected readonly creationEnCours = signal(false);

  ngOnInit(): void {
    this.rafraichir();
  }

  private rafraichir(): void {
    this.chargementEnCours.set(true);
    this.modelesSessionService.listerBibliotheque().subscribe({
      next: (lignes) => {
        this.lignes.set(lignes);
        this.chargementEnCours.set(false);
      },
      error: () => {
        this.chargementEnCours.set(false);
        this.message.error('Impossible de charger la bibliothèque de Modèles.');
      },
    });
  }

  protected creerNouveauModele(): void {
    this.creationEnCours.set(true);
    this.modelesSessionService.creerModele(NOM_MODELE_PAR_DEFAUT).subscribe({
      next: (modele) => {
        this.router.navigate(['/modeles-session', modele.id]);
      },
      error: () => {
        this.creationEnCours.set(false);
        this.message.error('Impossible de créer ce Modèle de session.');
      },
    });
  }

  protected ouvrir(id: string): void {
    this.router.navigate(['/modeles-session', id]);
  }

  protected dupliquer(id: string): void {
    this.modelesSessionService.dupliquerModele(id).subscribe({
      next: () => {
        this.rafraichir();
        this.message.success('Modèle dupliqué.');
      },
      error: () => {
        this.message.error('Impossible de dupliquer ce Modèle.');
      },
    });
  }

  protected supprimer(id: string): void {
    this.modelesSessionService.supprimerModele(id).subscribe({
      next: () => {
        this.rafraichir();
        this.message.success('Modèle supprimé.');
      },
      error: () => {
        this.message.error('Impossible de supprimer ce Modèle.');
      },
    });
  }
}
