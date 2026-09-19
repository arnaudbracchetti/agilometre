import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzTooltipModule } from 'ng-zorro-antd/tooltip';
import { LigneBibliothequeModeleCollecteDto } from '@agilometre/shared';
import { ModelesCollecteService } from '../modeles-collecte.service';
import { couleurCategorielle } from '../../shared/couleur-categorielle';

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
    NzTooltipModule,
  ],
  templateUrl: './bibliotheque-page.html',
  styleUrl: './bibliotheque-page.scss',
})
export class BibliothequePage implements OnInit {
  private readonly modelesCollecteService = inject(ModelesCollecteService);
  private readonly message = inject(NzMessageService);
  private readonly router = inject(Router);

  protected readonly lignes = signal<LigneBibliothequeModeleCollecteDto[]>([]);
  protected readonly chargementEnCours = signal(false);
  protected readonly creationEnCours = signal(false);

  ngOnInit(): void {
    this.rafraichir();
  }

  private rafraichir(): void {
    this.chargementEnCours.set(true);
    this.modelesCollecteService.listerBibliotheque().subscribe({
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
    this.modelesCollecteService.creerModele(NOM_MODELE_PAR_DEFAUT).subscribe({
      next: (modele) => {
        this.router.navigate(['/modeles-collecte', modele.id]);
      },
      error: () => {
        this.creationEnCours.set(false);
        this.message.error('Impossible de créer ce Modèle de collecte.');
      },
    });
  }

  protected ouvrir(id: string): void {
    this.router.navigate(['/modeles-collecte', id]);
  }

  /** Couleur catégorielle d'un Thème (même repère que le composeur de session — DESIGN.md). */
  protected couleurTheme(position: number): string {
    return couleurCategorielle(position);
  }

  protected dupliquer(id: string): void {
    this.modelesCollecteService.dupliquerModele(id).subscribe({
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
    this.modelesCollecteService.supprimerModele(id).subscribe({
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
