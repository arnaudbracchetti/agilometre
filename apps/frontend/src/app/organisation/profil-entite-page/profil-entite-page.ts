import { DatePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { ProfilEntiteDto } from '@agilometre/shared';
import { Chargement } from '../../shared/chargement/chargement';
import { ErrorMessage } from '../../shared/error-message/error-message';
import { PalierTheme } from '../../shared/palier-theme/palier-theme';
import { OrganisationService } from '../organisation.service';

/**
 * Palier agrégé d'une Entité (PRD §"Agrégation entité / BU"), navigable Période par Période comme
 * le Profil d'Équipe dont c'est le pendant au niveau Entité — mais sans détail par Thème/Question :
 * la vue Direction ne montre que le Palier global et son évolution (`app-palier-theme` réutilisé
 * directement, pas `app-synthese-themes` qui affiche aussi la liste par Thème). Monté par
 * `ProfilPage` (arbre de sélection partagé avec le Profil d'Équipe) dans son `<router-outlet>`.
 */
@Component({
  selector: 'app-profil-entite-page',
  imports: [DatePipe, NzButtonModule, NzIconModule, Chargement, ErrorMessage, PalierTheme],
  templateUrl: './profil-entite-page.html',
  styleUrl: './profil-entite-page.scss',
})
export class ProfilEntitePage {
  private readonly route = inject(ActivatedRoute);
  private readonly organisationService = inject(OrganisationService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly entiteId = signal<string | null>(null);
  protected readonly profil = signal<ProfilEntiteDto | null>(null);
  protected readonly offset = signal(0);
  protected readonly chargementEnCours = signal(false);
  protected readonly chargementPeriode = signal(false);
  protected readonly inaccessible = signal(false);

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = params.get('id');
      this.entiteId.set(id);
      this.profil.set(null);
      this.offset.set(0);
      this.inaccessible.set(false);
      if (id) {
        this.chargerProfil(id, 0);
      }
    });
  }

  protected periodePrecedente(): void {
    const id = this.entiteId();
    if (!id || this.chargementPeriode() || !this.profil()?.aPeriodePrecedente) {
      return;
    }
    const nouvelOffset = this.offset() + 1;
    this.offset.set(nouvelOffset);
    this.chargerProfil(id, nouvelOffset);
  }

  protected periodeSuivante(): void {
    const id = this.entiteId();
    if (!id || this.chargementPeriode() || this.offset() === -1) {
      return;
    }
    const nouvelOffset = this.offset() - 1;
    this.offset.set(nouvelOffset);
    this.chargerProfil(id, nouvelOffset);
  }

  private chargerProfil(id: string, offset: number): void {
    if (this.profil() === null) {
      this.chargementEnCours.set(true);
    } else {
      this.chargementPeriode.set(true);
    }
    this.organisationService.obtenirProfilEntite(id, offset).subscribe({
      next: (profil) => {
        this.profil.set(profil);
        this.chargementEnCours.set(false);
        this.chargementPeriode.set(false);
      },
      error: () => {
        this.inaccessible.set(true);
        this.chargementEnCours.set(false);
        this.chargementPeriode.set(false);
      },
    });
  }
}
